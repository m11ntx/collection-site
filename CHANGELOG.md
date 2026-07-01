# CHANGELOG

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
