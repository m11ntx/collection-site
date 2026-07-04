# End-to-End Validation — M11NTX Platform (MI-01)

Validation of the whole platform, from the **catalog-pipeline** (data producer)
through the **collection-site** (consumer) to the published site. This is a
validation record — no code was modified in either project (the pipeline is
read-only per the platform contract).

Environment note: the pipeline is a Python project that scrapes a live source and
requires network + credentials; it was **not executed** in this validation
environment. Instead the **integration contract** (its JSON output shape) was
verified against the site's consumption, and the site was validated end-to-end
against the current `data/*.json`.

Reproduce the site-side checks:
```
node tests/filters.test.js && node tests/search.test.js   # 14/14 + 16/16
python -m http.server 8000                                 # browse locally
```

---

## 1. Data contract (JSON) ✅
Validated `data/{collections,clubs,products,leagues}.json`:
- Counts: **6 collections · 24 clubs · 15 jerseys · 0 leagues** (leagues empty by design).
- Unique `id` + `slug` across every entity (no duplicates).
- Referential integrity: every `club.collection` → an existing collection slug;
  every `product.clubId` → an existing club id. **No orphans.**
- Required fields present on every record (collections: id/slug/name/country/period/
  description; clubs: id/slug/name/collection/country; products: id/clubId/slug/name/
  brand/type/category/season/version/gender/sizes).
- `sizes` is always `[{ size, stock }]` (RN-006). Availability derives correctly:
  **13 in stock · 2 out of stock.**

## 2. Enrichment · Search · Filters ✅
- `Filters.enrich()` joins club + collection onto all 15 jerseys (clubName +
  collectionName resolved for every item).
- Facets built from data: collection 5 · club 5 · manufacturer 5 · season 12 ·
  version 2 · category 1 · gender 2 · availability 2. Nothing hardcoded.
- Search over real data: `milan`→3, `umbro`→6, `1998`→3 (accent/case-insensitive).

## 3. End-to-end render (data → API → catalog → UI) ✅
Rendered the real pages from the real data (minified bundles):
- **Collection** (`?slug=serie-a`): banner shows "Serie A"; club cards render (AC Milan).
- **Club** (`?slug=manchester-united`): hero shows the club; jersey cards render
  ("Home 1998/99") and link to the jersey page.
- **Jersey** (`?slug=man-united-home-1998-99`): title + club, CTA → Instagram,
  How It Works + FAQ journey, breadcrumb chain (Premier League → Man United).

## 4. SEO ✅
Per-page title/description/canonical/robots + Open Graph/Twitter (absolute image
URLs) on all 12 pages; JSON-LD Organization/WebSite (every page) + BreadcrumbList
(detail pages) via `seo.js`. See `docs/seo.md`, `docs/launch-checklist.md`.

## 5. Analytics ✅ (ids pending)
8 events wired (home/collection/club/jersey view, search, filter, instagram_click,
faq_open); fan-out to GA4 + Clarity, DNT respected. Set real ids in
`config/site.js` to go live. See `docs/analytics.md`.

## 6. Instagram ✅
Single source in `config/site.js`; CTA + footer + contact links; 13/13 anchors
`target="_blank" rel="noopener"`; `ui.js` syncs `data-config` links.

## 7. FAQ ✅
FAQ page + jersey-page FAQ use native `<details>` (7 + 4 items); `faq_open`
analytics event fires on open.

## 8. Links / Nav ✅
All internal links resolve; header + mobile menu consistent; breadcrumbs correct;
`404.html` present; no dead placeholders.

## 9. Responsiveness ✅
Breakpoints 480/640/760/768/900/1024 + reduced-motion; grids reflow 3→2→1; cards
use `aspect-ratio`. (Final real-device pass recommended.)

## 10. Performance ✅ (Lighthouse pending on deploy)
Minified CSS/JS loaded; preload/prefetch; lazy images + intrinsic sizes (CLS≈0).
Run Lighthouse on the deployed URL. See `docs/performance.md`.

## 11. Images ✅ (branded placeholders until real assets)
Every image flows through `image-loader.js` (`getImage` + lazy + fade + branded
fallback). Catalog data currently has empty `image`/`images` → branded
placeholders render (no broken images). Real photography comes from the pipeline.

---

## Pipeline ↔ Site integration contract ⚠️ (gap found)

The pipeline (Sprint 21, 141 tests passing) emits a **canonical** model
(`schemas/*.schema.json`) and its publisher syncs `workspace/json/` →
`../collection-site/data/` and images → `assets/images/` (git add/commit/push,
manifest-gated, idempotent). It requires network + a live source and was **not
executed** here.

**Finding: the pipeline's canonical output is _not drop-in_ with the site's
current reader.** The site's hand-seeded `data/*.json` uses a flatter shape. Field
mapping required before the pipeline can feed the live site:

| Entity | Pipeline emits (canonical) | Site reads today | Action |
|--------|----------------------------|------------------|--------|
| Collection | `id, slug, name, country, image, description, featured` | + `period` | `period` not emitted → derive/drop |
| League | `id, collectionId, slug, name, country, image` | leagues empty; facet derives from club | numeric FK vs slug — resolve on load |
| Club | `id, leagueId, slug, name, country, badge, image` | `id, slug, name, collection(slug), country, founded, image(crest)` | `leagueId`→collection slug; crest from `badge`; no `founded` |
| Product | `id(str), source, price, currency, available, inventoryTracked, manufacturerId, clubId, category, gender, version, season, sizes[{size,stock,available}], variants[], images[{url,alt,position,primary}], buyUrl` | `id(num), clubId, brand, type, category, season, version, gender, sizes[{size,stock}], image, images[str], buyUrl` | `brand`←`manufacturerId`→name; **`type` (Home/Away/Third) has no canonical field**; `image`←primary image `url`; `images[]`←`.url`; availability must honor `sizes[].available` |

### Concrete compatibility issues
1. **Images shape** — pipeline `images: [{url,alt,position,primary}]`; the site
   reads `images` as filename **strings** and `image` (single). `getImage()` on an
   object breaks. → map to `img.url`; set card `image` from the `primary` image.
2. **Brand** — site shows `product.brand` (string); pipeline has `manufacturerId`
   → must resolve via `manufacturers.json`.
3. **Type** — site shows `type` (Home/Away/Third); **no canonical field** — must be
   derived (name/variant options) or added upstream (pipeline change, out of scope).
4. **Availability** — site's `inStock` treats `stock:null` as 0 → *out of stock*.
   The pipeline emits `stock:null, available:true` for untracked inventory, so the
   site would wrongly hide it. → honor `size.available` when `stock` is null.
5. **Club→Collection link** — site groups by `club.collection` (slug); pipeline
   links `club.leagueId`→league→`collectionId`. → resolve to a collection slug.

### Recommended resolution (follow-up — e.g. MI-02, not this sprint)
Add a thin **adapter in `assets/js/api.js`** that maps canonical → the site shape
on load (resolve `manufacturerId`/`leagueId`, flatten `images`, pick primary,
compute availability from `available||stock`). Pipeline stays untouched; site
changes stay localized. `type` derivation is the one open item needing a decision.

**Until the adapter exists, do NOT run the pipeline publisher against the live
site** — it would overwrite `data/*.json` with a shape the current reader can't
render. The site today runs correctly on its seed data.

