// Supabase Edge Function: save-cart
// Recebe o "rascunho" do carrinho do storefront (mesmo sem virar pedido) e faz
// upsert na tabela `carts` por session_id — é o que permite ver carrinhos
// abandonados + leads no /admin. Chamado de forma throttled pelo cart.js.
//
// Deploy: Edge Functions -> Deploy a new function -> nome "save-cart" -> cole
//   isto. IMPORTANTE: desligue "Verify JWT" (é público).
//   CLI: `supabase functions deploy save-cart --no-verify-jwt`.
// (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já são injetados automaticamente.)

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "método inválido" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: "json inválido" }, 400); }

  const session_id = String(body?.session_id || "").slice(0, 80);
  if (!session_id) return json({ ok: false, error: "sem session_id" }, 400);

  const items = Array.isArray(body?.items) ? body.items : [];
  const customer = body?.customer && typeof body.customer === "object" ? body.customer : {};
  const status = ["aberto", "convertido", "ignorado"].includes(body?.status) ? body.status : "aberto";
  const total_brl = items.reduce((s: number, it: any) => s + ((Number(it.price) || 0) + (Number(it.persoFee) || 0)) * (Number(it.qty) || 1), 0);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // upsert por session_id (precisa de UNIQUE em session_id — ver SQL)
  const row = { session_id, items, customer, total_brl, status, updated_at: new Date().toISOString() };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/carts?on_conflict=session_id`, {
    method: "POST",
    headers: {
      "apikey": SERVICE, "Authorization": `Bearer ${SERVICE}`,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) return json({ ok: false, error: "falha ao salvar: " + (await res.text()) }, 502);
  return json({ ok: true });
});
