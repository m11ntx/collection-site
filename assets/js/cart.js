/**
 * cart.js — "monte seu pedido" (sem pagamento) para o M11NTX.
 * Autossuficiente: injeta o próprio botão flutuante, gaveta, checkout e estilos.
 * Monta o pedido no localStorage; ao finalizar, registra via a Edge Function
 * `create-order` do Supabase (que também avisa no Telegram) e abre um WhatsApp
 * pré-preenchido pra concluir. Config em window.CONFIG: whatsapp, supabaseUrl,
 * supabaseAnon, persoFee.
 *
 * Localizado via window.I18N (namespace cart.*), reage a "language:change".
 * Checkout ciente do PAÍS: Brasil usa CPF + CEP (ViaCEP) + UF; fora do Brasil
 * usa documento opcional + endereço/CEP genéricos. Cada item pode ter
 * personalização própria (nome/número, +persoFee por peça), mostrada junto do
 * produto certo na mensagem.
 */
(function () {
  "use strict";
  const cfg = window.CONFIG || {};
  const KEY = "m11ntx_cart_v1";
  const SID_KEY = "m11ntx_sid";
  const COUNTRY_KEY = "m11ntx_country";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const activeCur = () => (window.CurrencyService ? CurrencyService.getCurrency() : "BRL");
  function fmt(v, cur) {
    cur = cur || activeCur();
    const loc = (window.CurrencyService && CurrencyService.CURRENCY_TO_LOCALE && CurrencyService.CURRENCY_TO_LOCALE[cur]) || "pt-BR";
    try { return new Intl.NumberFormat(loc, { style: "currency", currency: cur }).format(Number(v) || 0); }
    catch (_) { return (cur === "BRL" ? "R$ " : cur + " ") + (Number(v) || 0).toFixed(2); }
  }
  const money = (v) => fmt(v, "BRL");
  const t = (k, vars) => (window.I18N ? window.I18N.t("cart." + k, vars) : k);
  const lang = () => (window.I18N ? window.I18N.getLang() : "pt");
  let items = load();
  let root;
  let _syncT = null;
  const openPerso = new Set(); // índices com o editor de personalização aberto

  /* ---------------- países ---------------- */
  const COUNTRY_CODES = ["BR", "US", "PT", "GB", "ES", "FR", "DE", "IT", "NL", "CH", "BE",
    "IE", "AR", "UY", "PY", "CL", "CO", "PE", "MX", "CA", "AU", "JP", "AE", "SA", "ZA",
    "AO", "MZ", "CV", "AT", "SE", "NO", "DK", "PL", "US"];
  const EN_NAMES = { BR: "Brazil", US: "United States", PT: "Portugal", GB: "United Kingdom",
    ES: "Spain", FR: "France", DE: "Germany", IT: "Italy", NL: "Netherlands", CH: "Switzerland",
    BE: "Belgium", IE: "Ireland", AR: "Argentina", UY: "Uruguay", PY: "Paraguay", CL: "Chile",
    CO: "Colombia", PE: "Peru", MX: "Mexico", CA: "Canada", AU: "Australia", JP: "Japan",
    AE: "United Arab Emirates", SA: "Saudi Arabia", ZA: "South Africa", AO: "Angola",
    MZ: "Mozambique", CV: "Cabo Verde", AT: "Austria", SE: "Sweden", NO: "Norway",
    DK: "Denmark", PL: "Poland" };
  function countryName(code) {
    try { return new Intl.DisplayNames([lang()], { type: "region" }).of(code) || EN_NAMES[code] || code; }
    catch (_) { return EN_NAMES[code] || code; }
  }
  function countryOptions(sel) {
    const seen = {};
    const list = COUNTRY_CODES.filter((c) => { if (seen[c]) return false; seen[c] = 1; return true; });
    const br = `<option value="BR"${sel === "BR" ? " selected" : ""}>${esc(countryName("BR"))}</option>`;
    const rest = list.filter((c) => c !== "BR").map((c) => ({ c, n: countryName(c) }))
      .sort((a, b) => a.n.localeCompare(b.n))
      .map((o) => `<option value="${o.c}"${sel === o.c ? " selected" : ""}>${esc(o.n)}</option>`).join("");
    return br + rest;
  }
  function initialCountry() {
    let c = ""; try { c = localStorage.getItem(COUNTRY_KEY) || ""; } catch (_) {}
    if (c) return c;
    return lang() === "en" ? "US" : "BR";
  }
  let countryCode = initialCountry();
  const isBR = () => countryCode === "BR";

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (_) { return []; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (_) {} }
  function persist() { save(); render(); syncCart(); }

  /* ---- CRM: salva o rascunho do carrinho (mesmo sem virar pedido) ---- */
  function getSid() {
    let s = ""; try { s = localStorage.getItem(SID_KEY) || ""; } catch (_) {}
    if (!s) {
      s = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
        : "s_" + Date.now() + "_" + Math.random().toString(36).slice(2);
      try { localStorage.setItem(SID_KEY, s); } catch (_) {}
    }
    return s;
  }
  function partialCustomer() {
    const f = root && root.querySelector("#m11-form"); if (!f) return {};
    const g = (k) => (f[k] && f[k].value ? f[k].value.trim() : "");
    return buildCustomer(g, true);
  }
  function syncCart(status) {
    if (!cfg.supabaseUrl || !cfg.supabaseAnon) return;
    const doIt = () => {
      if (!items.length && status !== "convertido" && status !== "ignorado") return;
      try {
        fetch(cfg.supabaseUrl + "/functions/v1/save-cart", {
          method: "POST", keepalive: true,
          headers: { "Content-Type": "application/json", "apikey": cfg.supabaseAnon, "Authorization": "Bearer " + cfg.supabaseAnon },
          body: JSON.stringify({ session_id: getSid(), items: payloadItems(), customer: partialCustomer(), status: status || "aberto" }),
        }).catch(() => {});
      } catch (_) {}
    };
    clearTimeout(_syncT);
    if (status) doIt(); else _syncT = setTimeout(doIt, 900);
  }
  const PERSO_FEE = Number.isFinite(cfg.persoFee) ? cfg.persoFee : 40; // R$ extra por peça personalizada
  const count = () => items.reduce((n, i) => n + (i.qty || 1), 0);
  const hasPerso = (p) => !!(p && (p.name || p.number));
  const feeOf = (i) => hasPerso(i.perso) ? PERSO_FEE : 0;                 // taxa em BRL (backend/Telegram)
  // Preço do item na moeda ATIVA (usa o preço já pré-calculado por moeda; sem
  // conversão). A taxa de personalização é convertida pelo mesmo câmbio do item.
  const priceIn = (i, cur) => (i.prices && typeof i.prices[cur] === "number") ? i.prices[cur] : (Number(i.price) || 0);
  function feeIn(i, cur) {
    if (!hasPerso(i.perso)) return 0;
    const brl = (i.prices && i.prices.BRL) || Number(i.price) || 0;
    return brl > 0 ? PERSO_FEE * (priceIn(i, cur) / brl) : PERSO_FEE;
  }
  const unitIn = (i, cur) => priceIn(i, cur) + feeIn(i, cur);
  const total = (cur) => { cur = cur || activeCur(); return items.reduce((s, i) => s + unitIn(i, cur) * (i.qty || 1), 0); };
  // backend/Telegram sempre em BRL (moeda da operação)
  const payloadItems = () => items.map((i) => ({ ...i, price: (i.prices && i.prices.BRL) || i.price || 0, persoFee: feeOf(i) }));

  function add(item) {
    if (!item || !item.id) return;
    const perso = hasPerso(item.perso) ? { name: item.perso.name || "", number: item.perso.number || "" } : null;
    const ex = perso ? null : items.find((i) => i.id === item.id && (i.size || "") === (item.size || "") && !hasPerso(i.perso));
    if (ex) ex.qty += (item.qty || 1);
    else items.push({ id: item.id, name: item.name || item.id, size: item.size || "",
                      qty: item.qty || 1, price: Number(item.price) || 0, image: item.image || "",
                      prices: (item.prices && typeof item.prices === "object") ? item.prices : null, perso });
    openPerso.clear(); persist(); openDrawer();
  }

  /* ---------------- máscaras / validações ---------------- */
  function maskPhone(v) {
    v = v.replace(/\D/g, "").slice(0, 11);
    if (v.length <= 2) return v ? `(${v}` : "";
    if (v.length <= 7) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
    return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  }
  function maskPhoneIntl(v) { return v.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "").slice(0, 20); }
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
      `<button id="m11-fab" aria-label="${esc(t("fab"))}">
         <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
         <span class="m11-fab-label"></span><span id="m11-count">0</span></button>
       <div id="m11-back"></div>
       <aside id="m11-drawer" role="dialog" aria-modal="true">
         <div class="m11-head"><strong class="m11-h-title"></strong><button id="m11-x" aria-label="Fechar">✕</button></div>
         <div id="m11-items"></div>
         <div id="m11-foot">
           <div class="m11-total"><span class="m11-t-total"></span><strong id="m11-total">R$ 0,00</strong></div>
           <p class="m11-note"></p>
           <button class="m11-primary" id="m11-checkout"></button>
         </div>
         <form id="m11-form" class="m11-hidden" novalidate autocomplete="on">
           <p class="m11-form-title" data-t="yourData"></p>
           <label id="lbl-country"><span class="lt"></span><select name="country">${countryOptions(countryCode)}</select></label>
           <label id="lbl-name"><span class="lt"></span><input name="name" required autocomplete="name"></label>
           <label id="lbl-doc"><span class="lt"></span> <span class="m11-opt lo"></span><input name="doc" autocomplete="off"></label>
           <label id="lbl-phone"><span class="lt"></span><input name="phone" required inputmode="tel" autocomplete="tel"></label>
           <label id="lbl-email"><span class="lt"></span><input name="email" required type="email" inputmode="email" autocomplete="email" placeholder="voce@email.com"></label>
           <p class="m11-form-title" data-t="deliveryAddress"></p>
           <div class="m11-row">
             <label id="lbl-postal"><span class="lt"></span><input name="postal" required inputmode="numeric" autocomplete="postal-code"></label>
             <label id="lbl-number" class="m11-uf"><span class="lt"></span><input name="number" required inputmode="numeric" placeholder="123"></label>
           </div>
           <div id="m11-cep-status" class="m11-cep-status"></div>
           <label id="lbl-street"><span class="lt"></span><input name="street" required autocomplete="address-line1"></label>
           <label id="lbl-neighborhood"><span class="lt"></span><input name="neighborhood" autocomplete="address-level3"></label>
           <div class="m11-row">
             <label id="lbl-city"><span class="lt"></span><input name="city" required autocomplete="address-level2"></label>
             <label id="lbl-state" class="m11-uf"><span class="lt"></span><input name="state" autocomplete="address-level1"></label>
           </div>
           <label id="lbl-complement"><span class="lt"></span> <span class="m11-opt lo"></span><input name="complement" autocomplete="address-line2"></label>
           <input type="text" name="_hp" tabindex="-1" autocomplete="off" aria-hidden="true">
           <div class="m11-total"><span class="m11-t-total"></span><strong id="m11-ftotal">R$ 0,00</strong></div>
           <p class="m11-priv" data-t="privacyNote"></p>
           <button class="m11-primary" type="submit" id="m11-send" data-t="submit"></button>
           <button class="m11-ghost" type="button" id="m11-back-btn" data-t="back"></button>
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
    f.country.addEventListener("change", () => {
      countryCode = f.country.value || "BR";
      try { localStorage.setItem(COUNTRY_KEY, countryCode); } catch (_) {}
      applyCountry();
    });
    f.phone.addEventListener("input", (e) => { e.target.value = isBR() ? maskPhone(e.target.value) : maskPhoneIntl(e.target.value); });
    f.doc.addEventListener("input", (e) => { if (isBR()) e.target.value = maskCPF(e.target.value); });
    f.email.addEventListener("input", (e) => { e.target.value = maskEmail(e.target.value); });
    f.postal.addEventListener("input", onPostalInput);
    f.number.addEventListener("input", (e) => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 6); });
    f.state.addEventListener("input", (e) => { if (isBR()) e.target.value = e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2); });
    f.addEventListener("input", () => syncCart());
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });
    document.addEventListener("language:change", () => { applyI18n(); applyCountry(); render(); });
    document.addEventListener("currency:change", render);
    applyI18n(); applyCountry(); render();
  }
  const openDrawer = () => document.body.classList.add("m11-open");
  const closeDrawer = () => document.body.classList.remove("m11-open");
  function toCheckout() {
    if (!items.length) return;
    document.getElementById("m11-items").classList.add("m11-hidden");
    document.getElementById("m11-foot").classList.add("m11-hidden");
    document.getElementById("m11-form").classList.remove("m11-hidden");
    document.getElementById("m11-drawer").scrollTop = 0;
  }
  function toCart() {
    document.getElementById("m11-form").classList.add("m11-hidden");
    document.getElementById("m11-items").classList.remove("m11-hidden");
    document.getElementById("m11-foot").classList.remove("m11-hidden");
  }

  function setLabel(id, text) { const el = root.querySelector("#" + id + " .lt"); if (el) el.textContent = text; }
  function setOpt(id, show) { const el = root.querySelector("#" + id + " .lo"); if (el) el.textContent = show ? t("optional") : ""; }
  function applyI18n() {
    if (!root) return;
    root.querySelector(".m11-fab-label").textContent = t("fab");
    root.querySelector("#m11-fab").setAttribute("aria-label", t("fab"));
    root.querySelector(".m11-h-title").textContent = t("title");
    root.querySelectorAll(".m11-t-total").forEach((e) => { e.textContent = "Total"; });
    root.querySelector(".m11-note").textContent = t("noPayNote");
    root.querySelector("#m11-checkout").textContent = t("checkout");
    root.querySelectorAll("[data-t]").forEach((e) => { e.textContent = t(e.getAttribute("data-t")); });
    setLabel("lbl-country", t("country"));
    setLabel("lbl-name", t("name"));
    setLabel("lbl-phone", t("phone"));
    setLabel("lbl-email", t("email"));
    setLabel("lbl-city", t("city"));
    // options de país re-localizadas
    const sel = root.querySelector("#lbl-country select");
    if (sel) sel.innerHTML = countryOptions(countryCode);
  }
  function applyCountry() {
    if (!root) return;
    const f = root.querySelector("#m11-form"); if (!f) return;
    const br = isBR();
    setLabel("lbl-doc", br ? t("cpf") : t("docIntl")); setOpt("lbl-doc", !br);
    f.doc.required = br; f.doc.placeholder = br ? "999.999.999-99" : "";
    f.doc.setAttribute("inputmode", br ? "numeric" : "text");
    if (br) f.doc.value = maskCPF(f.doc.value);
    setLabel("lbl-phone", t("phone"));
    f.phone.placeholder = br ? "(99) 99999-9999" : "+1 555 123 4567";
    setLabel("lbl-postal", br ? t("cep") : t("postal"));
    f.postal.placeholder = br ? "99999-999" : "";
    f.postal.setAttribute("inputmode", br ? "numeric" : "text");
    setLabel("lbl-number", t("number"));
    setLabel("lbl-street", br ? t("street") : t("addr1"));
    setLabel("lbl-neighborhood", t("neighborhood"));
    setLabel("lbl-state", br ? t("state") : t("stateIntl"));
    f.state.placeholder = br ? "SP" : "";
    f.state.maxLength = br ? 2 : 40;
    setLabel("lbl-complement", br ? t("complement") : t("addr2")); setOpt("lbl-complement", true);
    // campos só-Brasil
    root.querySelector("#lbl-number").style.display = br ? "" : "none";
    root.querySelector("#lbl-neighborhood").style.display = br ? "" : "none";
    f.number.required = br; f.neighborhood.required = br; f.state.required = br;
    const st = document.getElementById("m11-cep-status"); if (st) { st.textContent = ""; st.className = "m11-cep-status"; }
  }

  function persoSummary(it) {
    if (!hasPerso(it.perso)) return "";
    const cur = activeCur(); const p = it.perso;
    return `<div class="m11-perso-sum">✚ ${esc([p.name, p.number ? `nº ${p.number}` : ""].filter(Boolean).join(" "))} · +${fmt(feeIn(it, cur), cur)}</div>`;
  }
  function render() {
    if (!root) return;
    const n = count();
    const cur = activeCur();
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
           <div class="m11-price">${fmt(priceIn(it, cur), cur)}</div>
           <button type="button" class="m11-perso-tgl" data-perso="${i}">${hasPerso(it.perso) ? t("persoEdit") : t("persoAdd")}</button>
           <div class="m11-perso ${open ? "" : "m11-hidden"}">
             <input class="m11-pname" data-pi="${i}" maxlength="20" placeholder="${esc(window.I18N ? I18N.t("jerseyDetail.persoNamePlaceholder") : "Nome")}" value="${esc(p.name || "")}">
             <input class="m11-pnum" data-pi="${i}" maxlength="3" inputmode="numeric" placeholder="${esc(window.I18N ? I18N.t("jerseyDetail.persoNumberPlaceholder") : "Nº")}" value="${esc(p.number || "")}">
           </div>
         </div>
         <div class="m11-qty"><button data-dec="${i}" aria-label="−">−</button><span>${it.qty}</span><button data-inc="${i}" aria-label="+">+</button></div>
         <button class="m11-rm" data-rm="${i}" aria-label="${esc(t("remove"))}">✕</button>
       </div>`;
    }).join("") : `<div class="m11-empty">${t("empty")}</div>`;
    const tot = fmt(total(cur), cur);
    document.getElementById("m11-total").textContent = tot;
    document.getElementById("m11-ftotal").textContent = tot;
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
    save();
    document.getElementById("m11-count").textContent = count();
  }

  async function onPostalInput(e) {
    if (!isBR()) return; // ViaCEP só no Brasil
    e.target.value = maskCEP(e.target.value);
    const digits = e.target.value.replace(/\D/g, "");
    const st = document.getElementById("m11-cep-status");
    if (digits.length !== 8) { st.textContent = ""; st.className = "m11-cep-status"; return; }
    st.textContent = t("cepSearching"); st.className = "m11-cep-status";
    try {
      const r = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const j = await r.json();
      if (j.erro) { st.textContent = t("cepNotFound"); st.className = "m11-cep-status m11-err"; return; }
      const f = document.getElementById("m11-form");
      if (j.logradouro) f.street.value = j.logradouro;
      if (j.bairro) f.neighborhood.value = j.bairro;
      if (j.localidade) f.city.value = j.localidade;
      if (j.uf) f.state.value = j.uf;
      st.textContent = t("cepFilled"); st.className = "m11-cep-status m11-ok";
      if (!f.number.value) f.number.focus();
    } catch (_) { st.textContent = t("cepFail"); st.className = "m11-cep-status m11-err"; }
  }

  function buildCustomer(g, partial) {
    const c = { countryCode, country: countryName(countryCode), name: g("name"), phone: g("phone"), email: g("email") };
    if (isBR()) {
      c.cpf = g("doc"); c.cep = g("postal"); c.rua = g("street"); c.numero = g("number");
      c.bairro = g("neighborhood"); c.city = g("city"); c.uf = (g("state") || "").toUpperCase(); c.complemento = g("complement");
    } else {
      c.doc = g("doc"); c.postal = g("postal"); c.address1 = g("street"); c.address2 = g("complement");
      c.city = g("city"); c.state = g("state");
    }
    if (partial) Object.keys(c).forEach((k) => { if (!c[k]) delete c[k]; });
    return c;
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
    const br = isBR();
    const required = br
      ? [["name", "name"], ["doc", "cpf"], ["phone", "phone"], ["email", "email"], ["postal", "cep"],
         ["number", "number"], ["street", "street"], ["neighborhood", "neighborhood"], ["city", "city"], ["state", "state"]]
      : [["name", "name"], ["phone", "phone"], ["email", "email"], ["street", "addr1"], ["city", "city"], ["postal", "postal"]];
    for (const [fld, lbl] of required) { if (!g(fld)) return fail(f[fld], t("fill", { label: t(lbl) })); }
    if (br && !validCPF(g("doc"))) return fail(f.doc, t("invalidCPF"));
    if (g("phone").replace(/\D/g, "").length < (br ? 10 : 6)) return fail(f.phone, t("phoneShort"));
    if (!validEmail(g("email"))) return fail(f.email, t("invalidEmail"));
    if (br && g("postal").replace(/\D/g, "").length !== 8) return fail(f.postal, t("cepShort"));

    const customer = buildCustomer(g, false);
    const send = document.getElementById("m11-send"), msg = document.getElementById("m11-msg");
    send.disabled = true; msg.textContent = t("registering"); msg.className = "";
    try {
      if (cfg.supabaseUrl && cfg.supabaseAnon) {
        await fetch(cfg.supabaseUrl + "/functions/v1/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": cfg.supabaseAnon, "Authorization": "Bearer " + cfg.supabaseAnon },
          body: JSON.stringify({ items: payloadItems(), customer, _hp: f._hp.value || "" }),
        });
      }
    } catch (_) { /* não bloqueia o WhatsApp */ }
    if (cfg.whatsapp) window.open(waLink(customer), "_blank");
    syncCart("convertido");
    items = []; openPerso.clear(); persist(); f.reset(); send.disabled = false;
    f.country.value = countryCode; applyCountry();
    document.getElementById("m11-cep-status").textContent = "";
    msg.textContent = t("success"); msg.className = "m11-ok";
    setTimeout(() => { toCart(); closeDrawer(); msg.textContent = ""; }, 2600);
  }

  function itemLine(i, cur) {
    const perso = hasPerso(i.perso)
      ? ` | Perso: ${[i.perso.name, i.perso.number ? `nº ${i.perso.number}` : ""].filter(Boolean).join(" ")} (+${fmt(feeIn(i, cur), cur)})` : "";
    return `• ${i.qty}x ${i.name}${i.size ? ` (${i.size})` : ""}${perso} — ${fmt(unitIn(i, cur), cur)}`;
  }
  function addressText(c) {
    if (c.rua || c.countryCode === "BR") {
      return `${c.rua || ""}, ${c.numero || "s/n"}${c.complemento ? ` - ${c.complemento}` : ""} - ${c.bairro || ""} - ${c.city || ""}/${c.uf || ""} - CEP ${c.cep || ""}`;
    }
    const line = [c.address1, c.address2].filter(Boolean).join(", ");
    const cityState = [c.city, c.state].filter(Boolean).join(" - ");
    return [line, cityState, c.postal, c.country].filter(Boolean).join(", ");
  }
  function waLink(c) {
    const cur = activeCur();
    const lines = items.map((i) => itemLine(i, cur)).join("\n");
    const doc = c.cpf || c.doc;
    const dados = [
      `${t("name")}: ${c.name}`,
      doc ? `${c.cpf ? "CPF" : t("docIntl")}: ${doc}` : "",
      `${t("phone")}: ${c.phone}`,
      `${t("email")}: ${c.email}`,
      c.country ? `${t("country")}: ${c.country}` : "",
      `${t("addressLabel")}: ${addressText(c)}`,
    ].filter(Boolean).join("\n");
    const text = `${t("waGreeting")}\n\n${lines}\n\nTotal: ${fmt(total(cur), cur)}\n\n${dados}`;
    return `https://wa.me/${String(cfg.whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
  }

  const CSS = `
    #m11-cart *,#m11-cart *::before,#m11-cart *::after{ box-sizing:border-box; }
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
    #m11-drawer{ position:fixed; top:0; right:0; bottom:0; height:100vh; height:100dvh; z-index:62; width:min(420px,94vw); background:#141417; color:#ededf1;
      border-left:1px solid #2a2a33; box-shadow:-12px 0 40px rgba(0,0,0,.5); transform:translateX(100%); transition:transform .25s ease;
      display:flex; flex-direction:column; font-family:system-ui,sans-serif; overflow-x:hidden; }
    body.m11-open #m11-back{ opacity:1; visibility:visible; }
    body.m11-open #m11-drawer{ transform:none; }
    #m11-drawer .m11-head{ display:flex; align-items:center; justify-content:space-between; padding:1rem 1.2rem; border-bottom:1px solid #2a2a33; }
    #m11-x{ background:none; border:0; color:#9a9aa4; font-size:1.2rem; cursor:pointer; }
    #m11-items{ flex:1; overflow:auto; padding:.6rem 1rem; }
    .m11-empty{ color:#9a9aa4; text-align:center; padding:2.5rem 1rem; line-height:1.5; }
    .m11-item{ display:grid; grid-template-columns:52px 1fr auto auto; gap:.6rem; align-items:start; padding:.7rem 0; border-bottom:1px solid #23232a; }
    .m11-thumb{ width:52px; height:52px; border-radius:8px; overflow:hidden; background:#000; }
    .m11-thumb img{ width:100%; height:100%; object-fit:cover; }
    .m11-info{ min-width:0; }
    .m11-name{ font-size:.85rem; font-weight:600; line-height:1.2; overflow-wrap:anywhere; }
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
    #m11-form{ overflow:auto; flex:1; }
    .m11-total{ display:flex; justify-content:space-between; font-size:1rem; } .m11-total strong{ color:#d4af5f; }
    .m11-note{ font-size:.75rem; color:#9a9aa4; margin:0; }
    .m11-primary{ background:linear-gradient(180deg,#d4af5f,#b8924a); color:#17130c; border:0; border-radius:10px; padding:.75rem; font-weight:800; cursor:pointer; }
    .m11-primary:disabled{ opacity:.6; cursor:default; }
    .m11-ghost{ background:none; border:0; color:#9a9aa4; cursor:pointer; padding:.3rem; }
    .m11-form-title{ margin:.3rem 0 0; font-weight:700; font-size:.9rem; color:#ededf1; }
    #m11-form label{ display:grid; gap:.3rem; font-size:.78rem; color:#9a9aa4; }
    .m11-opt{ color:#6f6f78; font-weight:400; }
    .m11-row{ display:grid; grid-template-columns:1fr 96px; gap:.7rem; }
    #m11-form input,#m11-form select,#m11-form textarea{ width:100%; min-width:0; background:#1e1e24; color:#ededf1; border:1px solid #35353d; border-radius:8px; padding:.55rem .7rem; font:inherit; }
    #m11-form input[name="_hp"]{ position:absolute; left:-9999px; }
    #m11-form input:focus,#m11-form select:focus,#m11-form textarea:focus{ outline:none; border-color:#d4af5f; }
    .m11-priv{ font-size:.72rem; color:#6f6f78; margin:0; }
    .m11-cep-status{ font-size:.74rem; color:#9a9aa4; min-height:1em; }
    .m11-cep-status.m11-ok{ color:#8fe0a4; } .m11-cep-status.m11-err{ color:#f0a08f; }
    #m11-msg{ font-size:.82rem; } #m11-msg.m11-ok{ color:#8fe0a4; } #m11-msg.m11-err{ color:#f0a08f; }
    .m11-hidden{ display:none !important; }`;

  window.Cart = { add, open: openDrawer, count };
  if (document.readyState !== "loading") mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
