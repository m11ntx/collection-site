// Supabase Edge Function: create-order
// Recebe um pedido do storefront (sem pagamento), grava na tabela `orders`
// (usando a service role, então o cliente anônimo não escreve direto no banco)
// e AVISA você na hora via Telegram. Retorna o id do pedido.
//
// Deploy: Dashboard -> Edge Functions -> Deploy a new function -> nome
//   "create-order" -> cole isto. IMPORTANTE: desligue "Verify JWT" (é público,
//   o cliente não está logado). Via CLI: `supabase functions deploy create-order --no-verify-jwt`.
//
// Secrets (Edge Functions -> Secrets):
//   TELEGRAM_BOT_TOKEN   token do @BotFather (obrigatório p/ notificar)
//   TELEGRAM_CHAT_ID     seu chat id (obrigatório p/ notificar)
// (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já são injetados automaticamente.)

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });

function money(v: unknown) {
  const n = Number(v || 0);
  return "R$ " + n.toFixed(2).replace(".", ",");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "método inválido" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: "json inválido" }, 400); }

  // honeypot anti-spam: campo invisível que só bot preenche
  if (body && body._hp) return json({ ok: true });

  const items = Array.isArray(body?.items) ? body.items : [];
  const customer = body?.customer || {};
  const phone = customer.phone || customer.contact; // aceita os dois nomes
  if (!items.length) return json({ ok: false, error: "pedido vazio" }, 400);
  if (!customer.name || !phone) return json({ ok: false, error: "informe nome e WhatsApp" }, 400);

  // preço unitário já inclui a taxa de personalização (persoFee) enviada pelo cliente
  const unit = (it: any) => (Number(it.price) || 0) + (Number(it.persoFee) || 0);
  const total = items.reduce((s: number, it: any) => s + unit(it) * (Number(it.qty) || 1), 0);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // grava o pedido (service role ignora RLS)
  const row = { items, customer, total_brl: total };
  const ins = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
    method: "POST",
    headers: {
      "apikey": SERVICE, "Authorization": `Bearer ${SERVICE}`,
      "Content-Type": "application/json", "Prefer": "return=representation",
    },
    body: JSON.stringify(row),
  });
  if (!ins.ok) return json({ ok: false, error: "falha ao salvar: " + (await ins.text()) }, 502);
  const saved = (await ins.json())?.[0] || {};

  // notifica no Telegram (não bloqueia o pedido se falhar)
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chat = Deno.env.get("TELEGRAM_CHAT_ID");
  if (token && chat) {
    // moeda que o cliente viu (BRL/USD/EUR); valores *_cur vêm do carrinho
    const cur = String(body.currency || customer.currency || "BRL");
    const isBRL = cur === "BRL";
    const LOC: Record<string, string> = { BRL: "pt-BR", USD: "en-US", EUR: "de-DE" };
    const fmtC = (v: unknown) => {
      try { return new Intl.NumberFormat(LOC[cur] || "en-US", { style: "currency", currency: cur }).format(Number(v) || 0); }
      catch (_) { return (isBRL ? "R$ " : cur + " ") + (Number(v) || 0).toFixed(2); }
    };
    const lines = items.map((it: any) => {
      const feeBRL = Number(it.persoFee) || 0;
      const feeShow = isBRL ? feeBRL : (Number(it.feeCur) || 0);
      const unitShow = isBRL ? unit(it) : ((Number(it.priceCur) || 0) + (Number(it.feeCur) || 0));
      const p = it.perso && (it.perso.name || it.perso.number)
        ? ` | Perso: ${[it.perso.name, it.perso.number ? `nº ${it.perso.number}` : ""].filter(Boolean).join(" ")}${feeBRL ? ` (+${fmtC(feeShow)})` : ""}` : "";
      return `• ${it.qty || 1}x ${it.name}${it.size ? ` (${it.size})` : ""}${p} — ${fmtC(unitShow)}`;
    });
    const totalShow = isBRL ? total : (Number(body.total_cur) || 0);
    const totalLine = `*Total:* ${fmtC(totalShow)}${isBRL ? "" : ` (${money(total)})`}`;
    const isBR = customer.countryCode === "BR" || !!customer.rua;
    const endereco = isBR
      ? `${customer.rua || ""}, ${customer.numero || "s/n"}${customer.complemento ? ` - ${customer.complemento}` : ""} - ${customer.bairro || ""} - ${customer.city || ""}/${customer.uf || ""} - CEP ${customer.cep || ""}`
      : [[customer.address1, customer.address2].filter(Boolean).join(", "),
         [customer.city, customer.state].filter(Boolean).join(" - "),
         customer.postal, customer.country].filter(Boolean).join(", ");
    const doc = customer.cpf || customer.doc;
    const fields: [string, string][] = [
      ["Cliente", customer.name],
      [customer.cpf ? "CPF" : "Documento", doc],
      ["WhatsApp", phone],
      ["E-mail", customer.email],
      ["País", customer.country],
      ["Endereço", endereco],
      ["Obs", customer.note],
    ].filter(([, v]) => v) as [string, string][];
    const text =
      `🛒 *Novo pedido M11NTX*\n\n` +
      lines.join("\n") +
      `\n\n${totalLine}\n` +
      fields.map(([k, v]) => `*${k}:* ${v}`).join("\n") +
      `\n\n_id: ${saved.id || "?"}_`;
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chat, text, parse_mode: "Markdown" }),
      });
    } catch (_) { /* ignore */ }
  }

  return json({ ok: true, id: saved.id });
});
