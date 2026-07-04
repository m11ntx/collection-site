# CHANGELOG

## 1.0.0 — Launch

First public release of the M11NTX storefront. Review-only sprints (CS-17 RC1 +
CS-18 launch prep): no new features — navigation, responsiveness, accessibility,
visual consistency, copy, SEO/OG, analytics and the sitemap/robots/favicon/manifest
were audited; only QA fixes were applied.

### Added
- `404.html`: branded not-found page (nav + full footer, `noindex`, Open Graph/Twitter,
  back-to-Collections CTA)
- `docs/release-checklist.md`: pre-launch QA record (CS-17)
- `docs/launch-checklist.md` + `docs/launch-report.md`: production validation + final report (CS-18)

### Fixed / QA
- Accessibility: raised the "last updated" gray to `#808080` (AA contrast)
- Verified across all 12 pages: canonical / Open Graph (absolute) / Twitter / robots /
  theme-color / favicon / manifest present; `.min` CSS+JS loaded; internal links + breadcrumbs
  + menus consistent; no legacy copy; "25–40 dias corridos" consistent; 8 analytics events wired;
  sitemap (53 URLs) + robots + manifest valid; all 13 Instagram links `rel="noopener"`

### Feature history (0.x sprints)
- Landing/hero, design system, living catalog, asset pipeline, collection/club/jersey
  pages (Sprints 1–9)
- CS-10 filters · CS-11 customer journey · CS-12 smart search · CS-13 SEO ·
  CS-14 analytics · CS-15 performance · CS-16 institutional pages

### Known / pre-launch (owner)
- Set GA4/Clarity ids in `config/site.js`; legal review of Privacy/Terms/Intermediation;
  run Lighthouse on the deployed URL; populate real product data via the catalog-pipeline.

---

## CS-16 - Institutional Experience

### Added
- 7 institutional pages (pages/): about, how-it-works, faq, contact, privacy, terms, intermediation-policy
- scripts/gen/gen_pages.js: generates the institutional pages from one template (consistent nav/footer/SEO)
- assets/css/institutional.css: full institutional footer + prose typography (additive; reuses tokens)
- Full institutional footer (About/How It Works/FAQ/Contact/Privacy/Terms/Intermediation + Instagram/Email)
  on all content pages (collection/club/jersey + institutional)
- config/site.js: `email`; ui.js: syncs [data-config="instagram|email"] links from CONFIG (single source)
- Institutional routes added to sitemap.xml (now 53 URLs)

### Changed
- Header nav (all pages) + mobile menu: replaced the non-functional Clubs/Leagues placeholders with
  working links — Collection · How It Works · FAQ · About · Contact
- README updated (highlights, structure, roadmap)

### Preserved
- Frozen landing kept its minimal footer (institutional footer applies to content pages only)
- Design System reused as-is (only additive CSS); catalog-pipeline untouched

## CS-15 - Performance & Core Web Vitals

### Added
- scripts/gen/minify.js: dependency-free CSS + JS minifier (string/template/regex-aware, keeps newlines)
- Generated *.min.css / *.min.js; all pages now load the minified assets (sources stay editable)
- Preload of critical resources (hero image, logo, main CSS, fonts) + fetchpriority on the logo
- Prefetch of the reused collection template; prefetch-on-intent (hover/focus) for cards in ui.js
- docs/performance.md; README updated (highlights, structure, conventions, roadmap)

### Changed
- Static images got intrinsic width/height (logo/crest/mark) to prevent CLS; decoding="async" added;
  footer mark lazy-loaded. Dynamic images already used loading="lazy" + decoding="async".

### Preserved
- No visual change — only loading strategy, minification and layout-stability hints
- Design System / layout untouched; catalog-pipeline untouched

## CS-14 - Analytics & Telemetry

### Added
- config/site.js: single source of truth for URLs + analytics ids/toggles (loaded first on every page)
- assets/js/analytics.js: decoupled layer — trackEvent() fans out to Google Analytics 4 + Microsoft Clarity
- Providers toggled purely via config (enabled flags + ids); with ids empty nothing loads and trackEvent no-ops
- Events: home_view, collection_view, club_view, jersey_view, search, filter, instagram_click, faq_open
- instagram_click + faq_open auto-bound by delegated listeners (no markup changes); respects Do Not Track
- docs/analytics.md; README updated (highlights, structure, roadmap)

### Changed
- main.js calls Analytics.init(); catalog.js fires *_view; filters.js fires filter; search.js fires search (debounced)
- Instagram URL now sourced from config/site.js (catalog.js CTA + seo.js) — no more hardcoded copies

### Preserved
- Design System / layout untouched (analytics only loads scripts + reads the DOM)
- catalog-pipeline untouched; JSON remains the single source of truth

## CS-13 - SEO & Metadata

### Added
- assets/js/seo.js: centralized SEO — upserts title/description/canonical/OG/Twitter; injects JSON-LD
- JSON-LD: Organization + WebSite (every page via SEO.initGlobal in main.js); BreadcrumbList (detail pages)
- Dynamic per-page title/description/canonical/OG image for ?slug= pages (collection/club/jersey) from JSON
- Static <head> SEO standardized on all pages: canonical, robots, author, full Open Graph + Twitter Cards (absolute URLs)
- robots.txt (with sitemap pointer + GitHub Pages caveat) and sitemap.xml (46 URLs)
- scripts/gen/gen_sitemap.js: generates sitemap.xml from data/*.json (scales with the catalog)
- webmanifest enriched: start_url/scope/id/lang + maskable icon purpose
- docs/seo.md; README updated (highlights, structure, roadmap)

### Changed
- catalog.js inits call SEO.set()/SEO.breadcrumb() once the slug data resolves; not-found → noindex
- Production canonical base: https://m11ntx.github.io/collection-site (single source in seo.js + gen_sitemap.js)
- No Product/Offer schema by design (intermediation model — not an e-commerce)

### Preserved
- Layout / Design System untouched — SEO writes only to <head>
- catalog-pipeline untouched; JSON remains the single source of truth

## CS-12 - Smart Search

### Added
- assets/js/search.js: fast, accent-insensitive search over the loaded JSON (no deps, no index)
- Searches name, club, league, collection, manufacturer, season, version, category, gender
- Normalization: case-insensitive · strips accents (NFD) · collapses/trims whitespace; multi-token = AND
- Search.matcher() (for Filters.createEngine), Search.create() (standalone state), Search.mount() (real-time input, no new CSS)
- tests/search.test.js: empty, by club, by season, combined with filters, no results, accents, state (16 passing)
- tests/index.html now runs both Filters + Search suites
- docs/search.md; README updated (highlights, structure, tests, roadmap)

### Changed
- filters.js Filters.attach(): auto-uses Search.matcher() when search.js is loaded, and binds
  config.searchInput in real time — filters + search share one engine (search AND facets)

### Preserved
- Design system untouched (no new CSS — Search.mount reuses existing input styles)
- catalog-pipeline untouched; JSON remains the single source of truth

## CS-11 - Customer Journey

### Added
- Jersey page: "How It Works" section — 5-step vertical timeline (Explore → Contact → Availability → Import → Delivery)
- Import Information block: M11NTX as intermediary + availability confirmed before service + 25–40 dias corridos
- FAQ (native <details>, no JS): Prazo, Disponibilidade, Como funciona, Atendimento
- assets/css/journey.css: additive styles (CTA, timeline, import card, FAQ accordion) reusing the design tokens
- INSTAGRAM_URL constant in catalog.js — single source of truth for the official channel

### Changed
- CTA: any buy button replaced by "Consultar Disponibilidade", which opens the official M11NTX Instagram
- Intermediation model: no direct sales. Removed In/Out of Stock badge and per-size stock state from the jersey page
  (availability is confirmed during service); size grid is now reference-only. Added a discreet import note.

### Preserved
- Hero, navbar, footer, Collections grid, design system unchanged (style.css untouched — journey.css is additive)
- catalog-pipeline untouched; JSON remains the single source of truth. Nothing resembles a traditional e-commerce.

## CS-10 - Advanced Filters (Fase 1)

### Added
- assets/js/filters.js: reusable, 100% JSON-driven filter system (no hardcoded options)
- Facets: Collection, League, Club, Manufacturer, Season, Version, Category, Gender, Availability
- Pure engine (no DOM): enrich() joins, createEngine() state (toggle/set/clear/reset/setQuery/subscribe)
- Combination logic: OR within a facet, AND across facets; live option counts respect other facets
- Availability derived from stock (RN-006/007); League facet lights up when leagues.json is populated
- Search hook baked into the engine (setQuery + defaultSearch) — Fase 2 is a UI-only wiring
- Filters.mount() reusable checkbox UI + Filters.attach() one-call page wiring (renders via Catalog)
- assets/css/filters.css: additive component styles reusing the approved design tokens
- tests/: zero-dependency tests (Node + browser) — single/multiple filters, no results, reset (14 passing)
- docs/filters.md: full reference; README updated (highlights, structure, tests, roadmap)

### Preserved
- Hero, navbar, footer, Collections grid, design system, all pages and data unchanged
- catalog-pipeline untouched; JSON remains the single source of truth

## Sprint 09 - Jersey Product Experience + Pipeline Ready

### Added
- pages/jersey.html: dynamic jersey detail page (reads ?slug= from URL)
- Renders name, league, club, brand, season, category, type, version, gender
- Premium gallery (main image + thumbnails, fade swap, cursor-follow zoom) — no libraries
- Sizes from the official sizes[] structure `[{ size, stock }]` (renders only existing sizes)
- Stock-aware: `available` computed from stock; OUT OF STOCK badge + disabled buy (RN-006/007)
- Breadcrumb Collection > Club > Jersey; "Comprar na Feng" button (buyUrl)
- Docs: docs/BUSINESS-RULES.md (RN-001…RN-012) applied; docs/catalog-pipeline.md (future architecture)
- README: Architecture (current + future), Roadmap, next sprints

### Changed
- Jersey card "View Details" links to the jersey page (flow completed)
- products.json: sizes as {size, stock}, plus version, gender, images[], buyUrl
- catalog.js: initJerseyPage() + gallery/stock templates; ui.js: gallery interactions

### Preserved
- Landing, Collections, Collection detail, Club catalog, navbar, footer, design unchanged

## Sprint 08 - Club Catalog

### Added
- pages/club.html: dynamic club page (reads ?slug= from URL)
- Club hero (crest, name, league, jersey count) from clubs.json + collections.json
- Jersey grid rendered from products.json, filtered by clubId
- Jersey card: image, name, brand, type, category, season + View Details
- data/products.json seeded (jerseys across several clubs); empty archive state
- Navigation chain live: Collection -> Club -> Jerseys (Jersey detail future)

### Changed
- Club cards on the collection page link to the club page (stretched link)
- catalog.js: added initClubPage() + jersey rendering (reusable helpers)

### Preserved
- Landing, Collections, navbar, footer, design, architecture unchanged

## Sprint 07 - Collection Details

### Added
- pages/collection.html: dynamic collection detail page (reads ?slug= from URL)
- Banner (image, name, country, period, description) rendered from collections.json
- Club cards rendered from clubs.json, filtered by collection slug ("Jerseys soon")
- data/clubs.json seeded (24 clubs across the 6 collections)
- Breadcrumb + navigation chain: Collection -> Club -> (Jersey future)
- Graceful "not found" state for unknown slugs

### Changed
- Collection cards link to the detail page (whole card clickable via stretched link)
- catalog.js: added initDetail(), club rendering; reveal generalized to any .reveal
- Navbar reused on subpages (always visible when there is no hero)

### Preserved
- Landing, navbar, footer, Collections grid, design system unchanged

## Sprint 06 - Asset Pipeline

### Added
- assets/images category folders: collections, clubs, jerseys, players, badges, manufacturers, countries
- image-loader.js: getImage() helper, lazy loading, fade-in placeholder, branded error fallback
- All rendered images use loading="lazy" + decoding="async"

### Changed
- catalog.js renders images through the asset pipeline (ImageLoader)
- README.md rewritten as full project documentation

### Preserved
- Landing, Collections, Cards, Navbar, Footer, design unchanged

## Sprint 05 - Living Catalog

### Added
- data/collections.json (6 collections) + empty leagues/clubs/products arrays
- api.js (fetch data layer), catalog.js renders every card from JSON (no hardcoded cards)
- ui.js scroll-reveal animation; main.js bootstraps API -> Catalog -> UI

## Sprint 04 - Collections Experience

### Added
- Collections section below the landing (grid 3/2/1)
- Collection card component (placeholder, era, name, description, Explore)
- Hover: image zoom, gold border, sliding arrow

## Sprint 03 - Catalog Infrastructure

### Added
- Fixed navigation (revealed on scroll: black 90% + blur + discreet gold border)
- Mobile menu (hamburger + overlay)
- Search overlay (layout only, not functional yet)
- Collections section below the landing (title + subtitle + responsive grid)
- Reusable components: Section, Card, Button (primary/secondary/ghost), Badge, Skeleton
- 6 empty skeleton cards (no products, no mock data)
- JS organized: api.js (data layer), catalog.js (rendering), ui.js (events), main.js (bootstrap)
- SEO (Open Graph / Twitter), skip link, reduced-motion support

### Preserved
- Landing / Hero unchanged (nav stays hidden over the hero)

### Removed
- pages/collection.html and assets/js/collection.js (catalog now lives on index.html)

### Next Sprint
- Populate the catalog from data/*.json
- Wire the search
- Clubs / Leagues / About pages

## Sprint 02 - Landing V3

### Added
- Hero institucional
- Novo slogan: Wear The Manto.
- CTA preparado para Sprint 3
- Design System v1.0

### Changed
- Nova identidade visual
- Paleta oficial
- Layout editorial

### Next Sprint
- Catálogo
- Navegação
- Produtos
