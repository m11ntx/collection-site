# M11NTX — Collection Site

**Premium Soccer Culture.** *Wear the manto.*

A fast, dependency-free landing page and living catalog for the M11NTX brand.
Built with vanilla HTML5, CSS3 and ES6 — no frameworks, no build step — and
deployed on GitHub Pages.

---

## Highlights

- **Editorial hero** (approved, frozen) — dark/gold identity, leather crest, refined micro-interactions.
- **Living catalog** — the Collections grid is rendered entirely from JSON. No card is hardcoded.
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
├── pages/
│   ├── collection.html          # dynamic collection detail (?slug=…)
│   └── club.html                # dynamic club page + jerseys (?slug=…)
├── assets/
│   ├── css/
│   │   └── style.css            # design system + all sections
│   ├── js/
│   │   ├── api.js               # data layer (fetch)
│   │   ├── image-loader.js      # asset pipeline (getImage, lazy, fallback)
│   │   ├── catalog.js           # data-driven Collections rendering
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
├── docs/
│   └── DESIGN_SYSTEM.md
└── scripts/
    └── gen/                     # asset generators (Pillow)
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
| `image`     | string  | image name/slug/path (empty = branded placeholder) |

---

## Pages & navigation

```
Landing (index)
  → Collection detail  (pages/collection.html?slug=…)
    → Club             (pages/club.html?slug=…)
      → Jersey         (View Details — future)
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

---

## Conventions

- No frameworks, no dependencies, no build step.
- Reusable components (Section, Card, Button, Badge, Skeleton) live in `style.css`.
- The **hero / landing is frozen** — do not restyle it.
- See [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) for palette, type and brand assets,
  and [`CHANGELOG.md`](CHANGELOG.md) for the sprint history.
