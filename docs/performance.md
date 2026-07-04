# Performance & Core Web Vitals (CS-15)

Performance work with **zero visual change**. Everything here is loading
strategy, minification and layout-stability hints — no restyling.

## What was done

### Minification (`scripts/gen/minify.js`)
Dependency-free minifier generating `*.min.css` and `*.min.js` next to the
sources. The HTML references the `.min` files; the sources stay the editable
truth.

| Asset | Source → min |
|-------|--------------|
| style.css | 32.7 KB → 23.3 KB (−29%) |
| journey.css / filters.css | −33% / −38% |
| catalog.js | 29.9 KB → 20.7 KB (−31%) |
| filters.js / search.js / seo.js | −44% / −53% / −44% |
| analytics.js / ui.js / api.js / main.js / config | −38% … −75% |

The CSS pass is string-aware (drops comments, collapses whitespace, trims spaces
around `{ } ; ,` — keeps `calc()` and combinators). The JS pass is a
conservative scanner that preserves strings, **template literals (incl. nested
`${}`)** and **regex literals** verbatim, drops comments, and **keeps newlines**
so Automatic Semicolon Insertion is never affected.

> **Re-run `node scripts/gen/minify.js` after editing any CSS/JS.** The `.min`
> files are generated artifacts.

### Resource hints (index.html `<head>`)
- **preconnect** to the font origins (already present).
- **preload**: `hero-background.webp` (`fetchpriority="high"`), `logo-horizontal.png`,
  `style.min.css`, and the Google Fonts stylesheet.
- **prefetch**: `pages/collection.html` (the reused collection template) — warms
  the first catalog navigation.
- Subpages preload `style.min.css` + the fonts stylesheet.

### Prefetch on intent (`ui.js`)
Hovering/focusing a Collection, Club or Jersey card link prefetches its target
(once, deduped) — the next page is often already cached when clicked. Progressive
enhancement, no visual change.

### Images
- **Dynamic images** (cards, gallery thumbs) already render with
  `loading="lazy"` + `decoding="async"` via `image-loader.js`. The gallery main
  image stays eager (it's the jersey LCP).
- **Static images** got explicit intrinsic `width`/`height` (logo 1560×294,
  crest 697×925, mark 855×596) so the browser reserves space → no layout shift.
  Above-the-fold hero images use `decoding="async"` (+ `fetchpriority="high"` on
  the logo); the footer mark is `loading="lazy"`.

### Unused code
- CSS/JS load **per page**: `journey.css` only on the jersey page; `filters.css`,
  `filters.js` and `search.js` are not loaded on any current page (they're ready
  for the future catalog page) — so nothing unused ships today. Every module a
  page loads is used.
- Minification strips the dead weight (comments/indentation). Individual CSS
  rules were **not** pruned: the design system is frozen and rule-level removal
  risks visual regressions — use Chrome DevTools **Coverage** before any pruning.

## Core Web Vitals

Automated Lighthouse wasn't run in this environment; below is the design
rationale + how to measure.

| Metric | How it's protected |
|--------|--------------------|
| **LCP** | Hero LCP is the `THE COLLECTION` heading (system-fast text) / logo; hero image + logo are preloaded, fonts preloaded (`display=swap`), CSS minified + preloaded. |
| **CLS** | All card media use CSS `aspect-ratio` with `position:absolute; inset:0` images; static images carry intrinsic `width`/`height`. Expected ≈ 0. |
| **INP** | Very little JS; listeners are delegated and light; search/filter are O(n) over small arrays; reveal uses `IntersectionObserver`; prefetch is idle/hover-driven. |

### How to measure
- **Lab**: Chrome DevTools → Lighthouse (Mobile), or `npx lighthouse <url>`.
- **PageSpeed Insights**: https://pagespeed.web.dev/ (lab + field data).
- **Field**: the `web-vitals` library, or GA4 (already integrated — see
  [analytics.md](analytics.md)) which reports CWV automatically.

## Remaining opportunities (need sign-off — touch frozen assets)
- `escudo.png` (~1.2 MB) and `symbol.png` (~557 KB) are large for their rendered
  size. Converting to **WebP/AVIF** (visually identical) would cut hero bytes
  significantly. Left out of CS-15 because they're approved/frozen brand assets.
- A dedicated **1200×630 OG image** (also noted in [seo.md](seo.md)).
- GitHub Pages already serves gzip/Brotli over the wire, compounding minification.
