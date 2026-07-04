# Launch Checklist — M11NTX Storefront (CS-18 · 1.0.0)

Production readiness validation. No new features. Legend: ✅ verified ·
⚠️ owner action · ☐ run in deploy env. Results are from the automated audit over
all **12 pages** (index, 404, 3 catalog, 7 institutional).

Reproduce:
```
node tests/filters.test.js && node tests/search.test.js     # 14/14 + 16/16
python -m http.server 8000                                   # browse http://localhost:8000
```

## SEO ✅
- ✅ Unique `<title>` + `<meta description>` per page.
- ✅ `<link rel="canonical">` on all indexable pages (dynamic pages refined by
  `seo.js` with the `?slug=` URL). 404 omits canonical by design (`noindex`).
- ✅ `robots` meta `index, follow` (404 = `noindex, follow`).
- ✅ JSON-LD injected at runtime by `seo.js`: Organization + WebSite on every page,
  BreadcrumbList on detail pages. `seo.min.js` loads on all 12 pages.

## Analytics + Clarity ✅ / ⚠️
- ✅ Decoupled layer (`analytics.js`) loads on all 12 pages; 8 events wired
  (home/collection/club/jersey view, search, filter, instagram_click, faq_open).
- ✅ `respectDNT: true`; disabled → no-op (verified via vm harness, CS-14).
- ⚠️ **Set real ids** in `config/site.js`: `analytics.ga4.id` + `analytics.clarity.id`
  and flip each `enabled: true`. Then confirm in GA4 Realtime + Clarity dashboard.

## Open Graph / Twitter ✅
- ✅ `og:type/site_name/locale/title/description/url/image/image:alt` + Twitter
  `summary_large_image` on all pages; **image URLs are absolute**.
- ⚠️ Optional polish: a dedicated 1200×630 OG image (currently reuses the 512px icon).

## Instagram ✅
- ✅ Single source in `config/site.js` (`instagram`); `catalog.js` CTA + `seo.js`
  read it; `ui.js` syncs `[data-config="instagram"]` links.
- ✅ All 13 Instagram anchors use `target="_blank" rel="noopener"`.

## Links ✅
- ✅ Every internal `href` resolves (verified); breadcrumbs + header + mobile menus
  consistent across all pages; no dead `data-soon` placeholders. Search overlay is
  intentionally "coming soon".

## Performance ✅ / ☐
- ✅ HTML loads minified CSS/JS (`.min`); preload (hero image, logo, CSS, fonts) +
  prefetch (collection template + on-intent).
- ✅ Images: `loading="lazy"` + `decoding="async"`; static images carry intrinsic
  `width`/`height`; cards use `aspect-ratio` → CLS ≈ 0.
- ☐ Run Lighthouse on the deployed URL (see `release-checklist.md` table). Biggest
  lever if needed: WebP for `escudo.png`/`symbol.png` (frozen assets — needs sign-off).

## Responsiveness ✅
- ✅ Breakpoints 480/640/760/768/900/1024 + `prefers-reduced-motion`; grids reflow
  3→2→1; institutional footer stacks ≤640; nav → mobile menu.
- ☐ Final real-device pass (iOS/Android/tablet) recommended.

## Accessibility ✅
- ✅ Alt text (decorative `""`, descriptive logo, data-driven catalog images);
  labels + landmarks + skip link on every page; keyboard focus preserved (default
  outlines); AA contrast (gold/white on black; secondary gray bumped to `#808080`).

## Sitemap ✅
- ✅ `sitemap.xml` valid, **53 URLs** (home + 7 institutional + 6 collections + 24
  clubs + 15 jerseys). Regenerate with `node scripts/gen/gen_sitemap.js`.
- ⚠️ Submit in Google Search Console (GitHub Pages project-site robots caveat).

## Robots ✅
- ✅ `robots.txt` present: `Allow: /` + `Sitemap:` pointer. (On a project site,
  crawlers read the host-root robots — documented in `docs/seo.md`.)

## Favicon ✅
- ✅ Full pack in `assets/icons/` (ico + 16/32 + apple-touch + 192/512) referenced
  on all pages.

## Manifest ✅
- ✅ `site.webmanifest` valid JSON: `name/short_name/description/lang/id/start_url/
  scope=/collection-site/`, `theme_color`/`background_color` `#050505`, 3 icons incl.
  `maskable`. Referenced on all pages.

---

## Go / No-Go — owner actions before public launch ⚠️
- [ ] Confirm production URL / custom domain (currently `…/collection-site/`).
- [ ] GA4 + Clarity ids set and enabled in `config/site.js`.
- [ ] Legal review of Privacy / Terms / Intermediation Policy.
- [ ] Populate real product data + photography (catalog-pipeline).
- [ ] Run Lighthouse; submit sitemap in Search Console.
- [ ] (Optional) 1200×630 OG image; WebP for heavy hero assets.

## Regenerate artifacts after any source edit
```
node scripts/gen/minify.js        # *.min.css / *.min.js
node scripts/gen/gen_pages.js     # institutional pages
node scripts/gen/gen_sitemap.js   # sitemap.xml
```
