# CHANGELOG

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
