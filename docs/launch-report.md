# Launch Report — M11NTX Storefront 1.0.0 (CS-18)

**Verdict: READY FOR LAUNCH**, conditional on the owner actions below. This sprint
was validation-only — no new features were added.

## Scope
Full production review of the static storefront (vanilla HTML/CSS/ES6, GitHub
Pages). Twelve pages audited: `index`, `404`, `collection`, `club`, `jersey`, and
the 7 institutional pages (`about`, `how-it-works`, `faq`, `contact`, `privacy`,
`terms`, `intermediation-policy`).

## Results

| Area | Result | Notes |
|------|--------|-------|
| SEO | ✅ | title/desc/canonical/robots on all indexable pages; JSON-LD (Org/WebSite/Breadcrumb) via `seo.js` |
| Analytics | ✅ code / ⚠️ ids | 8 events wired, DNT respected; set GA4/Clarity ids in `config/site.js` |
| Clarity | ✅ code / ⚠️ id | loader ready; add project id + enable |
| Open Graph | ✅ | full OG + Twitter, absolute image URLs (all 12 pages) |
| Instagram | ✅ | single source in config; 13/13 anchors `rel="noopener"` |
| Links | ✅ | all internal links resolve; menus/breadcrumbs consistent |
| Performance | ✅ / ☐ | minified assets + preload/prefetch + lazy/CLS hints; run Lighthouse on deploy |
| Responsiveness | ✅ | 6 breakpoints + reduced-motion; final device pass advised |
| Accessibility | ✅ | alt/labels/landmarks/skip-link/keyboard; AA contrast (gray → `#808080`) |
| Sitemap | ✅ | valid, 53 URLs (incl. institutional) |
| Robots | ✅ | `Allow: /` + Sitemap pointer |
| Favicon | ✅ | full pack referenced everywhere |
| Manifest | ✅ | valid; start_url/scope `/collection-site/`, maskable icon |
| Tests | ✅ | filters 14/14, search 16/16 |
| HTTP smoke | ✅ | 14 routes → 200 (incl. 404 page, robots, sitemap) |

**Automated audit:** all checks green except `canonical` and `og:url` on `404.html`,
which are **intentionally omitted** (a `noindex` 404 has no canonical URL).

## What shipped (0.x → 1.0.0)
Landing/hero + design system · living catalog (collections/clubs/jerseys) · asset
pipeline · CS-10 filters · CS-11 customer journey (intermediation) · CS-12 smart
search · CS-13 SEO · CS-14 analytics · CS-15 performance · CS-16 institutional
pages · CS-17 RC1 · CS-18 launch prep.

## Conditions before public launch (owner)
1. Set + enable GA4 and Clarity ids in `config/site.js`.
2. Confirm the production URL / custom domain.
3. Legal review of Privacy / Terms / Intermediation Policy.
4. Populate real product data + photography (catalog-pipeline).
5. Run Lighthouse on the deployed URL; submit the sitemap in Search Console.
6. Optional polish: 1200×630 OG image; WebP for `escudo.png` / `symbol.png`.

## Post-launch watch
- GA4 Realtime + Clarity for first-session behavior and the journey events.
- Search Console for indexing/coverage of the `?slug=` pages.

_Details and reproduction steps: [`launch-checklist.md`](launch-checklist.md) and
[`release-checklist.md`](release-checklist.md)._
