# M11NTX — Collection Site

**Premium Soccer Culture.** *Wear the manto.*

A fast, dependency-free landing page and living catalog for the M11NTX brand.
Built with vanilla HTML5, CSS3 and ES6 — no frameworks, no build step — and
deployed on GitHub Pages.

**Status: 1.0.0 — ready for launch** (pending owner actions). See the
[launch report](docs/launch-report.md), [launch checklist](docs/launch-checklist.md)
and [RC1 QA](docs/release-checklist.md).

> **Resuming / new session? Start here:** [`docs/PROJECT-STATUS.md`](docs/PROJECT-STATUS.md)
> (current state, pages, how to run, next steps) and [`CHANGELOG.md`](CHANGELOG.md) (history).

---

## Highlights

- **Editorial hero** (approved, frozen) — dark/gold identity, leather crest, refined micro-interactions.
- **Living catalog** — the Collections grid is rendered entirely from JSON. No card is hardcoded.
- **Advanced filters** — a reusable, 100% JSON-driven filter engine (collection, league, club, manufacturer, season, version, category, gender, availability) that combines freely and updates the list without a reload. See [`docs/filters.md`](docs/filters.md).
- **Smart search** — fast, **accent-insensitive** search over the loaded JSON that shares the filter engine, so filters + search work together in real time. See [`docs/search.md`](docs/search.md).
- **Customer journey** — M11NTX is an **intermediary** (no direct sales). The Jersey page has a "How It Works" timeline, Import Information (25–40 dias corridos) and an FAQ; every CTA is **Consultar Disponibilidade**, which opens the official Instagram. Nothing resembles a traditional e-commerce.
- **SEO-ready** — per-page title/description/canonical, Open Graph + Twitter Cards (generated dynamically for `?slug=` pages), JSON-LD (Organization, WebSite, BreadcrumbList), `robots.txt` and a JSON-driven `sitemap.xml` — all without touching the layout. See [`docs/seo.md`](docs/seo.md).
- **Analytics-ready** — a decoupled telemetry layer (`trackEvent`) for the whole user journey (home/collection/club/jersey views, search, filter, Instagram click, FAQ open), with Google Analytics 4 + Microsoft Clarity toggled from one config file. See [`docs/analytics.md`](docs/analytics.md).
- **Fast** — minified CSS/JS, preload/prefetch of critical resources, lazy images with intrinsic `width`/`height` (≈0 CLS), and prefetch-on-intent — no visual change. See [`docs/performance.md`](docs/performance.md).
- **Institutional** — About, How It Works, FAQ, Contact, Privacy, Terms and Intermediation Policy pages, on the approved design system, with header + footer links for trust and transparency.
- **Asset pipeline** — centralized image loading with lazy loading, fade-in, and a branded fallback.
- **Scalable** — data- and asset-driven, prepared for thousands of records and images.
- **Quality** — semantic HTML, accessible, responsive, `prefers-reduced-motion`, built for Lighthouse 95+.

---

## Architecture

```
HTML  →  JSON  →  API  →  Catalog  →  UI  →  Screen
```

- **JSON** (`data/*.json`) — the single source of truth for content.
- **`api.js`** — `fetch()`-based data layer (no libraries). Empty/missing files resolve to `[]`.
- **`image-loader.js`** — asset pipeline: `getImage()`, lazy loading, placeholder, error fallback.
- **`catalog.js`** — renders the Collections grid from `collections.json` (single DOM write; scales).
- **`ui.js`** — behavior: sticky/reveal nav, mobile menu, search overlay, scroll-reveal animations.
- **`main.js`** — bootstrap. Initializes **UI**, then **Catalog** (which pulls data through **API**).

---

## Project structure

```
collection-site/
├── index.html                   # landing + collections grid
├── 404.html                     # branded not-found page
├── .nojekyll                    # serve all files verbatim on GitHub Pages
├── robots.txt                   # crawl directives + sitemap pointer
├── sitemap.xml                  # generated from data/*.json
├── config/
│   └── site.js                  # single source: URLs + analytics ids/toggles
├── pages/
│   ├── collection.html          # dynamic collection detail (?slug=…)
│   ├── club.html                # dynamic club page + jerseys (?slug=…)
│   ├── jersey.html              # dynamic jersey detail + gallery (?slug=…)
│   ├── about.html · how-it-works.html · faq.html · contact.html   # institutional (generated)
│   └── privacy.html · terms.html · intermediation-policy.html      # institutional (generated)
├── assets/
│   ├── css/                     # sources (edit these); *.min.css are generated + loaded in prod
│   │   ├── style.css            # design system + all sections (frozen)
│   │   ├── filters.css          # filters component (additive)
│   │   ├── journey.css          # customer journey: CTA, timeline, FAQ (additive)
│   │   └── institutional.css    # full footer + institutional prose (additive)
│   ├── js/                      # sources (edit these); *.min.js are generated + loaded in prod
│   │   ├── api.js               # data layer (fetch)
│   │   ├── image-loader.js      # asset pipeline (getImage, lazy, fallback)
│   │   ├── catalog.js           # data-driven Collections rendering
│   │   ├── filters.js           # JSON-driven filter engine + UI
│   │   ├── search.js            # accent-insensitive smart search (integrates with filters)
│   │   ├── seo.js               # dynamic SEO: meta/canonical/OG/Twitter + JSON-LD
│   │   ├── analytics.js         # decoupled telemetry: trackEvent + GA4/Clarity
│   │   ├── ui.js                # nav, menu, search, animations
│   │   └── main.js              # bootstrap
│   ├── images/
│   │   ├── collections/         # ← category folders (lazy-loaded assets)
│   │   ├── clubs/
│   │   ├── jerseys/
│   │   ├── players/
│   │   ├── badges/
│   │   ├── manufacturers/
│   │   ├── countries/
│   │   └── (brand assets: logo, hero, escudo, symbol, favicons…)
│   └── icons/                   # favicon pack + webmanifest
├── data/
│   ├── collections.json         # collections (populated)
│   ├── clubs.json               # clubs, linked to collections (populated)
│   ├── products.json            # jerseys, linked to clubs (populated)
│   └── leagues.json             # []  (ready)
├── components/                  # reserved
├── tests/                       # zero-dep tests (Node + browser)
│   ├── filters.test.js
│   ├── search.test.js
│   ├── fixtures.js
│   └── index.html
├── docs/
│   ├── DESIGN_SYSTEM.md
│   ├── filters.md               # filter system reference
│   ├── search.md                # smart search reference
│   ├── customer-journey.md      # jersey journey (CTA, FAQ)
│   ├── seo.md                   # SEO & metadata reference
│   ├── analytics.md             # analytics & telemetry reference
│   ├── performance.md           # performance & Core Web Vitals
│   ├── release-checklist.md     # pre-launch QA (RC1)
│   ├── launch-checklist.md      # production validation (1.0.0)
│   ├── launch-report.md         # final launch report
│   ├── end-to-end-validation.md # platform E2E validation (MI-01)
│   └── integration-report.md    # pipeline ↔ site integration report (MI-01)
└── scripts/
    └── gen/                     # generators
        ├── apply_assets.py      # brand assets (Pillow)
        ├── gen_sitemap.js       # sitemap.xml from data/*.json
        ├── gen_pages.js         # institutional pages (About, FAQ, Terms…) from one template
        └── minify.js            # *.min.css / *.min.js (run after editing CSS/JS)
```

---

## Data model

### Collection (`data/collections.json`)

| field         | type    | description                          |
|---------------|---------|--------------------------------------|
| `id`          | number  | unique id                            |
| `slug`        | string  | url-safe identifier                  |
| `name`        | string  | competition name                     |
| `country`     | string  | country                              |
| `period`      | string  | historical period (e.g. `1988 – 1998`) |
| `description` | string  | short description                    |
| `image`       | string  | image name/slug/path (empty = branded placeholder) |
| `featured`    | boolean | highlight flag                       |

### Club (`data/clubs.json`)

| field        | type    | description                                   |
|--------------|---------|-----------------------------------------------|
| `id`         | number  | unique id                                     |
| `slug`       | string  | url-safe identifier                           |
| `name`       | string  | club name                                     |
| `collection` | string  | parent collection slug (used to filter)       |
| `country`    | string  | country                                       |
| `founded`    | number  | year founded                                  |
| `image`      | string  | image name/slug/path (empty = branded placeholder) |

### Jersey / product (`data/products.json`)

| field       | type    | description                                   |
|-------------|---------|-----------------------------------------------|
| `id`        | number  | unique id                                     |
| `clubId`    | number  | parent club id (used to filter)               |
| `slug`      | string  | url-safe identifier                           |
| `name`      | string  | jersey name (e.g. `Home 1998/99`)             |
| `brand`     | string  | manufacturer (e.g. `Umbro`)                   |
| `type`      | string  | Home / Away / Third / …                       |
| `category`  | string  | Retro / Authentic / …                         |
| `season`    | string  | season (e.g. `1998/99`)                       |
| `image`     | string  | card thumbnail (empty = branded placeholder)  |
| `images`    | array   | gallery images (empty = branded placeholder)  |
| `buyUrl`    | string  | external "Comprar na Feng" link               |

---

## Pages & navigation

```
Landing (index)
  → Collection detail  (pages/collection.html?slug=…)
    → Club             (pages/club.html?slug=…)
      → Jersey         (pages/jersey.html?slug=…)
```

- The Collections grid on `index.html` links each card to
  `pages/collection.html?slug=<slug>`.
- **Collection detail** reads `slug` from the URL, looks it up in
  `collections.json`, renders the banner (image, name, country, period,
  description), then renders clubs from `clubs.json` filtered by
  `collection === slug`. Each club links to its club page.
- **Club page** reads `slug`, looks up the club in `clubs.json`, resolves its
  league name from `collections.json`, then renders the crest, name, league,
  jersey count and the jersey grid from `products.json` filtered by
  `clubId === club.id`.
- **Jersey page** reads `slug`, looks up the jersey in `products.json`, resolves
  its club and league, and renders the details (name, club, league, brand, type,
  category, season) with a **premium gallery** (main image + thumbnails, fade
  swap and cursor-follow zoom — no libraries). Following the **intermediation
  model** (M11NTX does not sell directly), the CTA is **Consultar
  Disponibilidade** — it opens the official Instagram — and the page carries a
  "How It Works" timeline, an Import Information block (25–40 dias corridos) and
  an FAQ. There is no stock badge or checkout; availability is confirmed during
  service. See [`docs/customer-journey.md`](docs/customer-journey.md).
- Unknown slugs render a graceful "not found" state.
- Subpages reuse the navbar and footer via `<base href="../">` so all paths
  resolve from the site root.

---

## Asset pipeline

All images flow through **`image-loader.js`**.

```js
// resolve a path by category + name (accent- and space-safe)
getImage("clubs", "AC Milan");        // → assets/images/clubs/ac-milan.webp
getImage("collections", "Brasileirão"); // → assets/images/collections/brasileirao.webp
getImage("clubs", "custom/path.png"); // → custom/path.png  (paths pass through)
```

- Categories: `collections`, `clubs`, `jerseys`, `players`, `badges`, `manufacturers`, `countries`.
- Every rendered image uses **`loading="lazy"`** and **`decoding="async"`**.
- Images **fade in** on load; a failed image **falls back** to the branded mark once (never left hidden).
- When a collection has no `image`, the card shows the branded placeholder — the approved design is unchanged.

To add images, drop files into the matching `assets/images/<category>/` folder
(named after the slug, e.g. `serie-a.webp`) and set the `image` field.

---

## Run locally

The catalog uses `fetch()`, so it must be served over HTTP (not `file://`):

```bash
python -m http.server 8000
# open http://localhost:8000
```

GitHub Pages serves it over HTTP automatically — no configuration needed.

### Tests

Zero-dependency tests for the filter engine and the smart search:

```bash
node tests/filters.test.js      # filters (single/multiple/no-results/reset…)
node tests/search.test.js       # search (empty/club/season/combined/no-results, accents)
# or open tests/index.html over HTTP for both suites in the browser
```

---

## Conventions

- No frameworks, no dependencies. Optional one-step minification (no bundler):
  edit the CSS/JS **sources**, then run `node scripts/gen/minify.js` — the HTML
  loads the generated `*.min` files in production.
- Reusable components (Section, Card, Button, Badge, Skeleton) live in `style.css`.
- The **hero / landing is frozen** — do not restyle it.
- See [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) for palette, type and brand assets,
  and [`CHANGELOG.md`](CHANGELOG.md) for the sprint history.

---

## Architecture (current + future)

**Today** — a fully static, JSON-driven storefront:

```
data/*.json  →  api.js  →  catalog.js  →  ui.js  →  screen
```

**Next** — a **Catalog Pipeline** that will generate `data/*.json` from external
sources. It is documented but not implemented; the storefront is already ready
to consume its output with no refactoring (JSON stays the single source of truth):

```
Sources → Adapters → Parser → Validator → Assets → Generator → Publisher → data/*.json
```

See [`docs/catalog-pipeline.md`](docs/catalog-pipeline.md) for the full design and
[`docs/BUSINESS-RULES.md`](docs/BUSINESS-RULES.md) for the canonical rules
(RN-001 … RN-012) that both the storefront and the pipeline follow.

---

## Roadmap

| Sprint | Status | Scope |
|--------|--------|-------|
| 1–2 | ✅ | Landing / hero, branding, design system |
| 3 | ✅ | Catalog infrastructure (nav, menu, search, components) |
| 4–5 | ✅ | Collections section, data-driven catalog |
| 6 | ✅ | Asset pipeline (`image-loader.js`, `getImage()`) |
| 7 | ✅ | Collection details + clubs |
| 8 | ✅ | Club catalog + jerseys |
| 9 | ✅ | Jersey product experience (gallery, sizes, stock, buy) + pipeline docs |
| CS-10 | ✅ | Advanced filters (Fase 1) — reusable JSON-driven engine + tests + docs |
| CS-11 | ✅ | Customer journey — How It Works, Import Information, FAQ; CTA → Instagram (intermediation model) |
| CS-12 | ✅ | Smart search — accent-insensitive, integrated with the filters engine + tests + docs |
| CS-13 | ✅ | SEO & metadata — dynamic title/desc/canonical/OG/Twitter, JSON-LD, robots.txt, sitemap.xml |
| CS-14 | ✅ | Analytics & telemetry — decoupled `trackEvent`, GA4 + Clarity, config-driven toggles |
| CS-15 | ✅ | Performance & Core Web Vitals — minification, preload/prefetch, lazy images, CLS hints (no visual change) |
| CS-16 | ✅ | Institutional experience — About, How It Works, FAQ, Contact, Privacy, Terms, Intermediation Policy + header/footer links |
| CS-17 | ✅ | Release Candidate (RC1) — nav/responsive/a11y/copy/analytics review, 404 page |
| CS-18 | ✅ | Launch preparation — full production validation, launch checklist + report, `1.0.0` |
| MI-01 | ✅ | End-to-end validation — pipeline↔site contract audit (gap found), E2E + integration reports |

### Next sprints

- **Catalog Pipeline** — implement Adapters → Parser → Validator → Assets → Generator → Publisher.
- **Catalog page** — mount the filters + search components on a dedicated catalog
  page (`Filters.attach({ controls, list, searchInput })`) and wire the nav search
  overlay to it. The engine already combines filters + search.
- **Clubs / Leagues / About** — dedicated index pages (nav links are ready).
- **Jersey detail** — real photography via the pipeline; size selection & cart hooks.
