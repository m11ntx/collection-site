# Release Checklist — M11NTX Storefront (CS-17 · RC1 → 1.0.0)

Review-only sprint: no new features. This is the pre-launch QA record. Items are
✅ done, ⚠️ needs owner action, or ☐ to run in the deploy environment.

Reproduce the automated checks:
```
node tests/filters.test.js          # 14/14
node tests/search.test.js           # 16/16
python -m http.server 8000          # then browse http://localhost:8000
```

---

## TASK 01 — Navigation ✅
- ✅ **Internal links** — every `href="pages/*.html"` resolves to an existing file
  (10 targets verified); nav logo → `index.html`; breadcrumbs point to real pages.
- ✅ **404** — branded `404.html` added at the repo root (served at
  `/collection-site/…` with `<base href="/collection-site/">`, `noindex`), with nav,
  footer and a "Back to Collections" CTA. Unknown `?slug=` still renders the in-page
  "not found" state (`catalog.js`).
- ✅ **Buttons** — CTAs are real `<a>`/`<button>` with `aria-label` on icon-only
  controls; the disabled buy state was removed in CS-11 (intermediation model).
- ✅ **Breadcrumbs** — collection → club → jersey chain; institutional pages show
  `Home / <page>`.
- ✅ **Menus** — header + mobile menu identical across all pages
  (Collection · How It Works · FAQ · About · Contact); the old non-functional
  Clubs/Leagues placeholders were removed. Mobile menu closes on link click.
- Note: the frozen hero logo uses `href="#"` (scrolls to top) — intentional, part of
  the approved landing. Search overlay is intentionally "coming soon" (layout only).

## TASK 02 — Responsiveness ✅
- ✅ Breakpoints present and layered: `480 / 640 / 760 / 768 / 900 / 1024px`
  across `style.css` + additive sheets; `prefers-reduced-motion` respected.
- ✅ Grids reflow 3→2→1 (collections), card media use `aspect-ratio` (no reflow jank).
- ✅ Institutional footer stacks at ≤640px; nav collapses to the mobile menu.
- ☐ Final device pass (real iOS/Android + tablet) recommended before launch.

## TASK 03 — Accessibility ✅
- ✅ **Alt text** — decorative marks `alt=""`; logo has a descriptive alt; catalog/
  gallery images derive alt from the data (name).
- ✅ **Labels** — search input has a `<label>`; icon-only buttons use `aria-label`;
  landmarks (`header`/`nav`/`main`/`footer`) and a skip link on every page.
- ✅ **Contrast** — gold `#E2C15A` / white `#F4F4F4` on `#050505` are high-contrast;
  bumped the "last updated" gray to `#808080` for AA. Body gray `#9C9C9C` passes.
- ✅ **Keyboard** — focus outlines are the browser default (not globally removed);
  skip link works; `:focus-visible` on the hero CTA.
- ⚠️ The "coming soon" search input sets `outline:none` (frozen overlay) — revisit if
  search is shipped.

## TASK 04 — Visual consistency ✅
- ✅ Single design system (`style.css`); additive sheets reuse the same tokens
  (`--color-*`, `--transition`, `--container`). No visual redesign in RC1.
- ✅ Buttons (`btn--primary/secondary/ghost`), cards (collection/club/jersey),
  spacing and typography (Manrope scale) are consistent across new + old pages.
- ✅ Icons are inline SVG with consistent stroke; brand mark reused via `symbol.png`.

## TASK 05 — Copy ✅
- ✅ **Prazo** — "25–40 dias corridos" everywhere (8 occurrences, en-dash; no hyphen
  variant).
- ✅ **Intermediation** — the three statements present in the policy and echoed in
  About / How It Works / Terms.
- ✅ **Import messaging** — consistent ("Importação sob consulta", "sob consulta").
- ✅ No legacy residue ("Comprar na Feng", "Out of Stock", lorem, TODO).
- ✅ Tone: EN brand voice (About / How It Works headings); PT for operational/legal
  (FAQ, Contact, Privacy, Terms, Intermediation) — intentional for the BR audience.

## TASK 06 — Analytics ✅
- ✅ All 8 events defined and wired: `home_view`, `collection_view`, `club_view`,
  `jersey_view` (catalog inits); `search` (Search.mount, debounced); `filter`
  (Filters.mount); `instagram_click` + `faq_open` (delegated in analytics.js).
- ✅ Verified via the vm harness in CS-14 (fan-out to GA4 + Clarity, DNT respected,
  disabled → no-op).
- ⚠️ Live validation requires real ids: set `ga4.id` / `clarity.id` (+ `enabled:true`)
  in `config/site.js`, then confirm hits in GA4 Realtime / Clarity. `search`/`filter`
  fire only once the filters/search components are mounted on a catalog page (future).

## TASK 07 — Lighthouse ☐ (run in deploy env)
Automated Lighthouse cannot run in this environment (no browser). Run against the
deployed URL and record below:
```
npx lighthouse https://m11ntx.github.io/collection-site/ --view
# or Chrome DevTools → Lighthouse (Mobile) · or https://pagespeed.web.dev/
```
| Page | Perf | A11y | Best Pract. | SEO | LCP | INP | CLS |
|------|------|------|-------------|-----|-----|-----|-----|
| Home (index) | | | | | | | |
| Jersey | | | | | | | |
| How It Works | | | | | | | |

Expected: strong SEO (CS-13) and CLS≈0 (CS-15 aspect-ratio + intrinsic sizes);
LCP aided by preload/minification. Biggest lever if Perf is low: convert
`escudo.png` (~1.2 MB) / `symbol.png` (~557 KB) to WebP (needs sign-off — frozen
assets).

---

## Pre-launch owner actions ⚠️
- [ ] Confirm production URL (currently GitHub Pages `…/collection-site/`).
- [ ] Set GA4 + Clarity ids in `config/site.js` and enable them.
- [ ] Legal review of Privacy / Terms / Intermediation Policy copy.
- [ ] Submit `sitemap.xml` in Google Search Console (project-site robots caveat).
- [ ] Populate real product data + photography via the catalog-pipeline.
- [ ] Run Lighthouse and fill the table above.

## Build reminder
After editing any CSS/JS source or institutional content, regenerate artifacts:
```
node scripts/gen/minify.js       # *.min.css / *.min.js (loaded in prod)
node scripts/gen/gen_pages.js    # institutional pages
node scripts/gen/gen_sitemap.js  # sitemap.xml
```
