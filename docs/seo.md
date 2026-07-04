# SEO & Metadata (CS-13)

The whole platform is prepared for search-engine indexing **without any layout
change**. SEO lives in `<head>` only: static tags per page + a dynamic layer
(`assets/js/seo.js`) that refines the `?slug=` pages from the JSON.

## What's implemented

| Item | Where |
|------|-------|
| Meta Title | static per page + dynamic (`SEO.set`) |
| Meta Description | static per page + dynamic |
| Canonical URL | static default + dynamic (normalized, includes `?slug=`) |
| Open Graph | static + dynamic (`og:type/site_name/locale/title/description/url/image/image:alt`) |
| Twitter Cards | static + dynamic (`summary_large_image`, `site/title/description/image`) |
| Robots | `index, follow` (dynamic `noindex, follow` on *not found*) |
| Theme Color | `<meta name="theme-color" content="#050505">` (all pages) |
| Favicon / Apple Touch / Manifest | `assets/icons/` (all pages) |
| JSON-LD | Organization + WebSite (every page) · BreadcrumbList (detail pages) |
| Sitemap | `sitemap.xml` (generated from JSON) |
| Robots file | `robots.txt` |

## Production URL

`https://m11ntx.github.io/collection-site/` (GitHub Pages project site). This is
the single source of truth in two places — keep them in sync:

- `assets/js/seo.js` → `SITE.url`
- `scripts/gen/gen_sitemap.js` → `SITE`

If a custom root domain is adopted later, update both and re-generate the
sitemap. The static `<head>` tags also hardcode the absolute base — search &
replace `https://m11ntx.github.io/collection-site` across the HTML.

## Dynamic layer — `assets/js/seo.js`

Loaded on every page (before `main.js`). `main.js` calls `SEO.initGlobal()`
(injects Organization + WebSite). `catalog.js` calls, once the `?slug=` data is
resolved:

```js
SEO.set({ title, description, canonical, image, imageAlt });  // title/desc/canonical/OG/Twitter
SEO.breadcrumb([{ name, url }, …]);                            // BreadcrumbList JSON-LD
```

`SEO.set` **upserts** each tag (creates if missing, updates if present), so the
static tags are safe defaults and the dynamic call refines them. Canonical/OG
URLs are always **absolute**.

### Per page
- **Home** — static head + `SEO.set({ canonical: "/" })`.
- **Collection** — title `M11NTX | <name>`, description = collection description,
  breadcrumb Home › Collections › <collection>.
- **Club** — generated description (league + jersey count), breadcrumb
  Home › Collections › <collection> › <club>.
- **Jersey** — title includes the club, generated description (name · club ·
  season · brand · type + "Importação sob consulta"), breadcrumb down to the
  jersey. No Product/Offer schema — M11NTX is an intermediary, not an
  e-commerce (see [customer-journey.md](customer-journey.md)).

> Google renders JS, so dynamic titles/descriptions are indexed. Non-JS social
> scrapers read the **static** OG tags (generic per page type) — acceptable for
> a static-hosted, `?slug=`-driven site. To give social previews per-jersey
> without JS you'd need pre-rendered pages (future pipeline concern).

## Sitemap

`sitemap.xml` is generated from the JSON, so it scales with the catalog:

```bash
node scripts/gen/gen_sitemap.js   # home + collections + clubs + jerseys
```

Re-run after the catalog data changes. Priorities: home `1.0`, collections
`0.8`, clubs `0.6`, jerseys `0.5`.

## robots.txt — GitHub Pages caveat

On a GitHub Pages **project** site, crawlers fetch `robots.txt` from the **host
root** (`https://m11ntx.github.io/robots.txt`), which belongs to the org's root
repo — not this repo. So `collection-site/robots.txt` is served at
`/collection-site/robots.txt` and is authoritative only under a custom root
domain. Regardless, **submit the sitemap** in Google Search Console:
`https://m11ntx.github.io/collection-site/sitemap.xml`.

## Notes / future improvements

- A dedicated **1200×630 OG image** would improve social previews (currently the
  512×512 app icon is reused).
- `WebSite` JSON-LD omits `SearchAction` because search is client-side
  (`?slug=`), with no query-string search URL to advertise.
