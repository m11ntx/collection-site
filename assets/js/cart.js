/**
 * cart.js — "monte seu pedido" (sem pagamento) para o M11NTX.
 * Autossuficiente: injeta o próprio botão flutuante, gaveta, checkout e estilos.
 * Monta o pedido no localStorage; ao finalizar, registra via a Edge Function
 * `create-order` do Supabase (que também avisa no Telegram) e abre um WhatsApp
 * pré-preenchido pra concluir. Config em window.CONFIG: whatsapp, supabaseUrl,
 * supabaseAnon.
 *
 * Cada item pode ter personalização própria (nome/número), mostrada junto do
 * produto certo na mensagem. Endereço completo com autopreenchimento por CEP
 * (ViaCEP, grátis, sem chave). Máscaras em WhatsApp, CPF, CEP; CPF validado.
 */
(function () {
  "use strict";
  const cfg = window.CONFIG || {};
  const KEY = "m11ntx_cart_v1";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (v) => "R$ " + (Number(v) || 0).toFixed(2).replace(".", ",");
  let items = load();
  let root;
  const openPerso = new Set(); // índices com o editor de personalização aberto

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (_) { return []; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (_) {} }
  function persist() { save(); render(); }
  const count = () => items.reduce((n, i) => n + (i.qty || 1), 0);
  const total = () => items.reduce((s, i) => s + (Number(i.price) || 0) * (i.qty || 1), 0);
  const hasPerso = (p) => !!(p && (p.name || p.number));
  const persoKey = (p) => hasPerso(p) ? `${p.name || ""}#${p.number || ""}` : "";

  function add(item) {
    if (!item || !item.id) return;
    const perso = hasPerso(item.perso) ? { name: item.perso.name || "", number: item.perso.number || "" } : null;
    // Só junta quantidade quando o item é idêntico (mesmo tamanho E mesma
    // personalização); personalizações diferentes = linhas separadas.
    const ex = perso ? null : items.find((i) => i.id === item.id && (i.size || "") === (item.size || "") && !hasPerso(i.perso));
    if (ex) ex.qty += (item.qty || 1);
    else items.push({ id: item.id, name: item.name || item.id, size: item.size || "",
                      qty: item.qty || 1, price: Number(item.price) || 0, image: item.image || "", perso });
    openPerso.clear(); persist(); openDrawer();
  }

  /* ---------------- máscaras / validações ---------------- */
  function maskPhone(v) {
    v = v.replace(/\D/g, "").slice(0, 11);
    if (v.length <= 2) return v ? `(${v}` : "";
    if (v.length <= 7) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
    return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  }
  function maskCPF(v) {
    v = v.replace(/\D/g, "").slice(0, 11);
    if (v.length > 9) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`;
    if (v.length > 6) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`;
    if (v.length > 3) return `${v.slice(0, 3)}.${v.slice(3)}`;
    return v;
  }
  function maskCEP(v) { v = v.replace(/\D/g, "").slice(0, 8); return v.length > 5 ? `${v.slice(0, 5)}-${v.slice(5)}` : v; }
  const maskEmail = (v) => v.replace(/\s+/g, "").toLowerCase();
  const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  function validCPF(cpf) {
    cpf = String(cpf).replace(/\D/g, "");
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let s = 0; for (let i = 0; i < 9; i++) s += +cpf[i] * (10 - i);
    let d1 = (s * 10) % 11; if (d1 === 10) d1 = 0; if (d1 !== +cpf[9]) return false;
    s = 0; for (let i = 0; i < 10; i++) s += +cpf[i] * (11 - i);
    let d2 = (s * 10) % 11; if (d2 === 10) d2 = 0; return d2 === +cpf[10];
  }

  /* ---------------- UI ---------------- */
  function mount() {
    const style = document.createElement("style"); style.textContent = CSS; document.head.appendChild(style);
    root = document.createElement("div"); root.id = "m11-cart";
    root.innerHTML =
      `<button id="m11-fab" aria-label="Meu pedido">
         <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
         <span class="m11-fab-label">Meu pedido</span><span id="m11-count">0</span></button>
       <div id="m11-back"></div>
       <aside id="m11-drawer" role="dialog" aria-modal="true" aria-label="Meu pedido">
         <div class="m11-head"><strong>Meu pedido</strong><button id="m11-x" aria-label="Fechar">✕</button></div>
         <div id="m11-items"></div>
         <div id="m11-foot">
           <div class="m11-total"><span>Total</span><strong id="m11-total">R$ 0,00</strong></div>
           <p class="m11-note">Sem pagamento agora — você finaliza o pedido pelo WhatsApp.</p>
           <button class="m11-primary" id="m11-checkout">Finalizar pedido</button>
         </div>
         <form id="m11-form" class="m11-hidden" novalidate autocomplete="on">
           <p class="m11-form-title">Seus dados</p>
           <label>Nome completo<input name="name" required autocomplete="name"></label>
           <label>CPF<input name="cpf" required inputmode="numeric" placeholder="999.999.999-99"></label>
           <label>WhatsApp<input name="phone" required inputmode="tel" autocomplete="tel" placeholder="(99) 99999-9999"></label>
           <label>E-mail<input name="email" required type="email" inputmode="email" autocomplete="email" placeholder="voce@email.com"></label>
           <p class="m11-form-title">Endereço de entrega</p>
           <div class="m11-row">
             <label>CEP<input name="cep" required inputmode="numeric" autocomplete="postal-code" placeholder="99999-999"></label>
             <label class="m11-uf">Número<input name="numero" required inputmode="numeric" placeholder="123"></label>
           </div>
           <div id="m11-cep-status" class="m11-cep-status"></div>
           <label>Rua<input name="rua" required autocomplete="address-line1"></label>
           <label>Bairro<input name="bairro" required></label>
           <div class="m11-row">
             <label>Cidade<input name="city" required autocomplete="address-level2"></label>
             <label class="m11-uf">UF<input name="uf" required maxlength="2" autocomplete="address-level1" placeholder="SP"></label>
           </div>
           <label>Complemento <span class="m11-opt">(opcional)</span><input name="complemento" autocomplete="address-line2" placeholder="Apto, bloco…"></label>
           <input type="text" name="_hp" tabindex="-1" autocomplete="off" aria-hidden="true">
           <div class="m11-total"><span>Total</span><strong id="m11-ftotal">R$ 0,00</strong></div>
           <button class="m11-primary" type="submit" id="m11-send">Registrar e abrir o WhatsApp</button>
           <button class="m11-ghost" type="button" id="m11-back-btn">Voltar</button>
           <div id="m11-msg"></div>
         </form>
       </aside>`;
    document.body.appendChild(root);
    document.getElementById("m11-fab").onclick = openDrawer;
    document.getElementById("m11-x").onclick = closeDrawer;
    document.getElementById("m11-back").onclick = closeDrawer;
    document.getElementById("m11-checkout").onclick = toCheckout;
    document.getElementById("m11-back-btn").onclick = toCart;
    const itemsBox = document.getElementById("m11-items");
    itemsBox.addEventListener("click", onItemsClick);
    itemsBox.addEventListener("input", onPersoInput);
    const f = document.getElementById("m11-form");
    f.addEventListener("submit", onSubmit);
    f.phone.addEventListener("input", (e) => { e.target.value = maskPhone(e.target.value); });
    f.cpf.addEventListener("input", (e) => { e.target.value = maskCPF(e.target.value); });
    f.email.addEventListener("input", (e) => { e.target.value = maskEmail(e.target.value); });
    f.cep.addEventListener("input", onCEPInput);
    f.numero.addEventListener("input", (e) => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 6); });
    f.uf.addEventListener("input", (e) => { e.target.value = e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });
    render();
  }
  const openDrawer = () => document.body.classList.add("m11-open");
  const closeDrawer = () => document.body.classList.remove("m11-open");
  function toCheckout() { if (!items.length) return; document.getElementById("m11-form").classList.remove("m11-hidden"); document.getElementById("m11-foot").classList.add("m11-hidden"); }
  function toCart() { document.getElementById("m11-form").classList.add("m11-hidden"); document.getElementById("m11-foot").classList.remove("m11-hidden"); }

  function persoSummary(it) {
    if (!hasPerso(it.perso)) return "";
    const p = it.perso;
    return `<div class="m11-perso-sum">✚ ${esc([p.name, p.number ? `nº ${p.number}` : ""].filter(Boolean).join(" "))}</div>`;
  }
  function render() {
    if (!root) return;
    const n = count();
    document.getElementById("m11-count").textContent = n;
    document.getElementById("m11-fab").style.display = n ? "flex" : "none";
    document.getElementById("m11-items").innerHTML = items.length ? items.map((it, i) => {
      const open = openPerso.has(i);
      const p = it.perso || {};
      return `<div class="m11-item">
         <div class="m11-thumb">${it.image ? `<img src="${esc(it.image)}" alt="" loading="lazy">` : ""}</div>
         <div class="m11-info">
           <div class="m11-name">${esc(it.name)}</div>
           ${it.size ? `<div class="m11-sz">Tam: ${esc(it.size)}</div>` : ""}
           ${persoSummary(it)}
           <div class="m11-price">${money(it.price)}</div>
           <button type="button" class="m11-perso-tgl" data-perso="${i}">${hasPerso(it.perso) ? "✎ editar personalização" : "✚ personalizar (nome/nº)"}</button>
           <div class="m11-perso ${open ? "" : "m11-hidden"}">
             <input class="m11-pname" data-pi="${i}" maxlength="20" placeholder="Nome (ex.: VINI JR)" value="${esc(p.name || "")}">
             <input class="m11-pnum" data-pi="${i}" maxlength="3" inputmode="numeric" placeholder="Nº" value="${esc(p.number || "")}">
           </div>
         </div>
         <div class="m11-qty"><button data-dec="${i}" aria-label="menos">−</button><span>${it.qty}</span><button data-inc="${i}" aria-label="mais">+</button></div>
         <button class="m11-rm" data-rm="${i}" aria-label="Remover">✕</button>
       </div>`;
    }).join("") : `<div class="m11-empty">Seu pedido está vazio.<br>Adicione camisas pelo botão “Adicionar ao pedido”.</div>`;
    document.getElementById("m11-total").textContent = money(total());
    document.getElementById("m11-ftotal").textContent = money(total());
  }
  function onItemsClick(e) {
    const inc = e.target.closest("[data-inc]"), dec = e.target.closest("[data-dec]"),
      rm = e.target.closest("[data-rm]"), pt = e.target.closest("[data-perso]");
    if (inc) { items[+inc.dataset.inc].qty++; persist(); }
    else if (dec) { const i = +dec.dataset.dec; items[i].qty = Math.max(1, items[i].qty - 1); persist(); }
    else if (rm) { items.splice(+rm.dataset.rm, 1); openPerso.clear(); persist(); }
    else if (pt) { const i = +pt.dataset.perso; openPerso.has(i) ? openPerso.delete(i) : openPerso.add(i); render(); }
  }
  function onPersoInput(e) {
    const nameEl = e.target.closest(".m11-pname"), numEl = e.target.closest(".m11-pnum");
    const el = nameEl || numEl; if (!el) return;
    const i = +el.dataset.pi; if (!items[i]) return;
    if (numEl) numEl.value = numEl.value.replace(/\D/g, "").slice(0, 3);
    const box = el.parentElement;
    const name = box.querySelector(".m11-pname").value.trim();
    const number = box.querySelector(".m11-pnum").value.trim();
    items[i].perso = (name || number) ? { name, number } : null;
    save(); // sem render (não perder o foco enquanto digita)
    document.getElementById("m11-count").textContent = count();
  }

  async function onCEPInput(e) {
    e.target.value = maskCEP(e.target.value);
    const digits = e.target.value.replace(/\D/g, "");
    const st = document.getElementById("m11-cep-status");
    if (digits.length !== 8) { st.textContent = ""; st.className = "m11-cep-status"; return; }
    st.textContent = "Buscando endereço…"; st.className = "m11-cep-status";
    try {
      const r = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const j = await r.json();
      if (j.erro) { st.textContent = "CEP não encontrado — preencha manualmente."; st.className = "m11-cep-status m11-err"; return; }
      const f = document.getElementById("m11-form");
      if (j.logradouro) f.rua.value = j.logradouro;
      if (j.bairro) f.bairro.value = j.bairro;
      if (j.localidade) f.city.value = j.localidade;
      if (j.uf) f.uf.value = j.uf;
      st.textContent = "Endereço preenchido ✓"; st.className = "m11-cep-status m11-ok";
      if (!f.numero.value) f.numero.focus();
    } catch (_) { st.textContent = "Não deu pra buscar o CEP — preencha manualmente."; st.className = "m11-cep-status m11-err"; }
  }

  function fail(field, message) {
    const msg = document.getElementById("m11-msg");
    msg.textContent = message; msg.className = "m11-err";
    if (field) field.focus();
  }
  async function onSubmit(e) {
    e.preventDefault();
    if (!items.length) return;
    const f = e.target;
    const g = (k) => (f[k] ? f[k].value.trim() : "");
    const customer = {
      name: g("name"), cpf: g("cpf"), phone: g("phone"), email: g("email"),
      cep: g("cep"), rua: g("rua"), numero: g("numero"), bairro: g("bairro"),
      city: g("city"), uf: g("uf").toUpperCase(), complemento: g("complemento"),
    };
    const required = [["name", "Nome completo"], ["cpf", "CPF"], ["phone", "WhatsApp"], ["email", "E-mail"],
      ["cep", "CEP"], ["numero", "Número"], ["rua", "Rua"], ["bairro", "Bairro"], ["city", "Cidade"], ["uf", "UF"]];
    for (const [k, label] of required) { if (!customer[k]) return fail(f[k], `Preencha: ${label}.`); }
    if (!validCPF(customer.cpf)) return fail(f.cpf, "CPF inválido.");
    if (customer.phone.replace(/\D/g, "").length < 10) return fail(f.phone, "WhatsApp incompleto.");
    if (!validEmail(customer.email)) return fail(f.email, "E-mail inválido.");
    if (customer.cep.replace(/\D/g, "").length !== 8) return fail(f.cep, "CEP incompleto.");

    const send = document.getElementById("m11-send"), msg = document.getElementById("m11-msg");
    send.disabled = true; msg.textContent = "Registrando…"; msg.className = "";
    try {
      if (cfg.supabaseUrl && cfg.supabaseAnon) {
        await fetch(cfg.supabaseUrl + "/functions/v1/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": cfg.supabaseAnon, "Authorization": "Bearer " + cfg.supabaseAnon },
          body: JSON.stringify({ items, customer, _hp: f._hp.value || "" }),
        });
      }
    } catch (_) { /* não bloqueia o WhatsApp */ }
    if (cfg.whatsapp) window.open(waLink(customer), "_blank");
    items = []; openPerso.clear(); persist(); f.reset(); send.disabled = false;
    document.getElementById("m11-cep-status").textContent = "";
    msg.textContent = "Pedido registrado! Abrimos o WhatsApp pra você concluir."; msg.className = "m11-ok";
    setTimeout(() => { toCart(); closeDrawer(); msg.textContent = ""; }, 2600);
  }

  function itemLine(i) {
    const perso = hasPerso(i.perso)
      ? ` | Perso: ${[i.perso.name, i.perso.number ? `nº ${i.perso.number}` : ""].filter(Boolean).join(" ")}` : "";
    return `• ${i.qty}x ${i.name}${i.size ? ` (${i.size})` : ""}${perso} — ${money(i.price)}`;
  }
  function waLink(c) {
    const lines = items.map(itemLine).join("\n");
    const endereco = `${c.rua}, ${c.numero}${c.complemento ? ` - ${c.complemento}` : ""} - ${c.bairro} - ${c.city}/${c.uf} - CEP ${c.cep}`;
    const dados = [`Nome: ${c.name}`, `CPF: ${c.cpf}`, `WhatsApp: ${c.phone}`, `E-mail: ${c.email}`, `Endereço: ${endereco}`].join("\n");
    const text = `Olá! Quero finalizar meu pedido M11NTX:\n\n${lines}\n\nTotal: ${money(total())}\n\n${dados}`;
    return `https://wa.me/${String(cfg.whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
  }

  const CSS = `
    #m11-fab{ position:fixed; right:20px; bottom:20px; z-index:60; display:none; align-items:center; gap:.55rem;
      background:linear-gradient(145deg,#e6c476,#c69a4c); color:#1a1509; border:0; border-radius:999px;
      padding:.72rem 1.15rem; font:700 .92rem system-ui,sans-serif; cursor:pointer;
      box-shadow:0 10px 28px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.35); transition:transform .15s,box-shadow .15s; }
    #m11-fab:hover{ transform:translateY(-2px); box-shadow:0 14px 32px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.35); }
    #m11-fab svg{ display:block; }
    .m11-fab-label{ letter-spacing:.01em; }
    #m11-count{ display:grid; place-items:center; min-width:22px; height:22px; padding:0 6px; border-radius:999px; background:#1a1509; color:#e6c476; font-size:.76rem; font-weight:800; }
    @media (max-width:420px){ .m11-fab-label{ display:none; } #m11-fab{ padding:.72rem .8rem; } }
    #m11-back{ position:fixed; inset:0; z-index:61; background:rgba(0,0,0,.55); opacity:0; visibility:hidden; transition:opacity .2s; }
    #m11-drawer{ position:fixed; top:0; right:0; bottom:0; z-index:62; width:min(420px,94vw); background:#141417; color:#ededf1;
      border-left:1px solid #2a2a33; box-shadow:-12px 0 40px rgba(0,0,0,.5); transform:translateX(100%); transition:transform .25s ease;
      display:flex; flex-direction:column; font-family:system-ui,sans-serif; }
    body.m11-open #m11-back{ opacity:1; visibility:visible; }
    body.m11-open #m11-drawer{ transform:none; }
    #m11-drawer .m11-head{ display:flex; align-items:center; justify-content:space-between; padding:1rem 1.2rem; border-bottom:1px solid #2a2a33; }
    #m11-x{ background:none; border:0; color:#9a9aa4; font-size:1.2rem; cursor:pointer; }
    #m11-items{ flex:1; overflow:auto; padding:.6rem 1rem; }
    .m11-empty{ color:#9a9aa4; text-align:center; padding:2.5rem 1rem; line-height:1.5; }
    .m11-item{ display:grid; grid-template-columns:52px 1fr auto auto; gap:.6rem; align-items:start; padding:.7rem 0; border-bottom:1px solid #23232a; }
    .m11-thumb{ width:52px; height:52px; border-radius:8px; overflow:hidden; background:#000; }
    .m11-thumb img{ width:100%; height:100%; object-fit:cover; }
    .m11-name{ font-size:.85rem; font-weight:600; line-height:1.2; }
    .m11-sz{ font-size:.72rem; color:#9a9aa4; margin-top:.1rem; }
    .m11-perso-sum{ font-size:.72rem; color:#d4af5f; margin-top:.15rem; }
    .m11-price{ font-size:.8rem; color:#d4af5f; font-weight:700; margin-top:.15rem; }
    .m11-perso-tgl{ background:none; border:0; color:#8f8fa0; font-size:.72rem; cursor:pointer; padding:.25rem 0 0; text-align:left; }
    .m11-perso-tgl:hover{ color:#d4af5f; }
    .m11-perso{ display:flex; gap:.4rem; margin-top:.35rem; }
    .m11-perso input{ background:#1e1e24; color:#ededf1; border:1px solid #35353d; border-radius:7px; padding:.4rem .5rem; font:inherit; font-size:.8rem; min-width:0; }
    .m11-perso .m11-pname{ flex:1; } .m11-perso .m11-pnum{ width:52px; }
    .m11-qty{ display:flex; align-items:center; gap:.3rem; }
    .m11-qty button{ width:24px; height:24px; border-radius:6px; border:1px solid #35353d; background:#1e1e24; color:#ededf1; cursor:pointer; }
    .m11-qty span{ min-width:18px; text-align:center; font-size:.85rem; }
    .m11-rm{ background:none; border:0; color:#9a9aa4; cursor:pointer; font-size:.9rem; }
    #m11-foot,#m11-form{ padding:1rem 1.2rem; border-top:1px solid #2a2a33; display:flex; flex-direction:column; gap:.7rem; }
    #m11-form{ overflow:auto; }
    .m11-total{ display:flex; justify-content:space-between; font-size:1rem; } .m11-total strong{ color:#d4af5f; }
    .m11-note{ font-size:.75rem; color:#9a9aa4; margin:0; }
    .m11-primary{ background:linear-gradient(180deg,#d4af5f,#b8924a); color:#17130c; border:0; border-radius:10px; padding:.75rem; font-weight:800; cursor:pointer; }
    .m11-primary:disabled{ opacity:.6; cursor:default; }
    .m11-ghost{ background:none; border:0; color:#9a9aa4; cursor:pointer; padding:.3rem; }
    .m11-form-title{ margin:.3rem 0 0; font-weight:700; font-size:.9rem; color:#ededf1; }
    #m11-form label{ display:grid; gap:.3rem; font-size:.78rem; color:#9a9aa4; }
    .m11-opt{ color:#6f6f78; font-weight:400; }
    .m11-row{ display:grid; grid-template-columns:1fr 96px; gap:.7rem; }
    #m11-form input,#m11-form textarea{ background:#1e1e24; color:#ededf1; border:1px solid #35353d; border-radius:8px; padding:.55rem .7rem; font:inherit; }
    #m11-form input[name="_hp"]{ position:absolute; left:-9999px; }
    #m11-form input:focus,#m11-form textarea:focus{ outline:none; border-color:#d4af5f; }
    .m11-cep-status{ font-size:.74rem; color:#9a9aa4; min-height:1em; }
    .m11-cep-status.m11-ok{ color:#8fe0a4; } .m11-cep-status.m11-err{ color:#f0a08f; }
    #m11-msg{ font-size:.82rem; } #m11-msg.m11-ok{ color:#8fe0a4; } #m11-msg.m11-err{ color:#f0a08f; }
    .m11-hidden{ display:none !important; }`;

  window.Cart = { add, open: openDrawer, count };
  if (document.readyState !== "loading") mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
