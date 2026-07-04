# Integration Report — M11NTX Platform (MI-01)

**Scope:** end-to-end validation across `catalog-pipeline` (data producer) and
`collection-site` (consumer). Validation only — neither project's logic was
modified (the pipeline is read-only per the platform contract). Added only launch
hygiene on the site: `.nojekyll`.

## Verdict
🟡 **Platform validated in both halves; not yet integrated end-to-end via the
pipeline's live output.**
- ✅ **collection-site** runs correctly end-to-end on its current seed data.
- ✅ **catalog-pipeline** is production-complete (Sprint 21, 141 tests) and emits
  valid canonical JSON.
- ⚠️ **Contract gap:** the pipeline's canonical schema is **not drop-in** with the
  site's current reader. A small mapping adapter is required before the pipeline
  can feed the live site. Details in [`end-to-end-validation.md`](end-to-end-validation.md).

## Method
- Mapped the pipeline output contract from `schemas/*.schema.json` + docs
  (read-only). The pipeline was **not executed** here (it scrapes a live source and
  needs network + credentials).
- Validated the site's `data/*.json` for structure + referential integrity, then
  the enrichment/search/filter layers, then the full data→UI render for
  collection/club/jersey using the minified bundles.

## Results

| Item | Status |
|------|--------|
| JSON (structure, ids, refs, required fields) | ✅ 6 collections · 24 clubs · 15 jerseys · 0 orphans |
| Images | ✅ pipeline via `image-loader.js`; empty → branded placeholders (no broken images) |
| Links / Nav / Breadcrumbs | ✅ all resolve; menus consistent; 404 present |
| Search | ✅ accent/case-insensitive over real data |
| Filters | ✅ 8 dynamic facets built from data |
| Collections / Clubs / Jerseys render | ✅ banner + club cards + jersey cards + detail (real data) |
| SEO | ✅ meta/canonical/OG/Twitter + JSON-LD on all 12 pages |
| Analytics | ✅ 8 events wired (GA4/Clarity ids pending) |
| Instagram | ✅ single-source config; 13/13 anchors `rel="noopener"` |
| FAQ | ✅ native `<details>`; `faq_open` event |
| Responsiveness | ✅ 6 breakpoints + reduced-motion |
| Performance | ✅ minified + preload/prefetch + CLS≈0 (Lighthouse pending on deploy) |
| Tests | ✅ filters 14/14 · search 16/16 |
| Pipeline → site schema contract | ⚠️ mapping adapter required (see below) |

## The contract gap (blocking full integration)
Pipeline emits `manufacturerId` (not `brand`), `images:[{url,…}]` (not filename
strings), no top-level `image`, `sizes:[{size,stock,available}]` with nullable
stock, `club.leagueId` (not `collection` slug), no product `type`, no collection
`period`. The site reads the flatter seed shape. **Recommended fix:** a thin
adapter in `assets/js/api.js` (canonical → site shape) — pipeline untouched, site
changes localized. One open decision: how to source jersey **type**
(Home/Away/Third), which has no canonical field.

## Publication (GitHub Pages) — owner-gated ⚠️
- The site repo (`m11ntx/collection-site`, branch `main`, no custom domain →
  `https://m11ntx.github.io/collection-site/`) has **57 uncommitted files** — the
  entire CS-10…CS-18 body of work is local and **not yet pushed**.
- `.nojekyll` added so GitHub Pages serves every file (incl. `config/`) verbatim.
- Publishing = commit + push `main`. The **site as-is (seed data) is safe to
  publish**. Do **not** run the pipeline publisher against the live site until the
  adapter lands (it would overwrite `data/*.json` with an unrenderable shape).
- Open pre-launch gates still apply (GA4/Clarity ids, legal review, real data) —
  see [`launch-report.md`](launch-report.md).

**To publish the current validated site (when authorized):**
```
git add -A
git commit -m "release: M11NTX storefront 1.0.0"
git push origin main
# then enable GitHub Pages (Settings → Pages → branch: main / root) if not already
```

## Recommended next steps
1. Decision: publish the current seed-data site now, or hold for real data.
2. MI-02: implement the `api.js` canonical→site adapter + resolve `type` sourcing,
   then dry-run the pipeline (`python main.py --dry-run --no-push`) and re-validate.
3. Wire the pipeline publisher (`GIT_ENABLED`) once the adapter is verified.
