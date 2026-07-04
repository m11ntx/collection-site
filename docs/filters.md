# Filters — `assets/js/filters.js` (CS-10, Fase 1)

A reusable, **100% JSON-driven** filter system for M11NTX jerseys. No frameworks,
no dependencies, no build step. The engine is pure (no DOM), so it runs in the
browser and in Node tests alike.

```
data/*.json → API → Filters.enrich() → Filters.createEngine() → Filters.mount()
```

## Why it exists

The catalog is a living dataset. Filter options must never be hardcoded — they
are **derived from the JSON at runtime**. Add a club, a brand, or a season to the
data and its filter option appears automatically. Delete the last jersey using it
and the option disappears.

## Filters (facets)

Every facet is built dynamically from the data. Values with no data simply don't
appear (e.g. **League** is empty until `leagues.json` is populated).

| Facet | Source field (after enrichment) |
|-------|----------------------------------|
| Collection | `club.collection` → `collections.json` (name) |
| League | `club.league` / `collection.league` → `leagues.json` (name) |
| Club | `product.clubId` → `clubs.json` |
| Manufacturer | `product.brand` |
| Season | `product.season` |
| Version | `product.version` |
| Category | `product.category` |
| Gender | `product.gender` |
| Availability | derived from `sizes[].stock` (RN-006/007) |

**Combination logic:** OR *within* a facet (e.g. AC Milan **or** United), AND
*across* facets (e.g. Umbro **and** In Stock). Selecting a filter updates the
jersey list immediately — **no page reload**.

## API

### `Filters.enrich(products, { clubs, collections, leagues })`
Denormalizes the joins onto each product (adds `clubName`, `collectionSlug`,
`collectionName`, `leagueSlug/Name`, and `available`). Returns a new array.

### `Filters.createEngine({ items, facets?, search? })`
The pure engine. `items` are enriched products. Returns:

| Method | Purpose |
|--------|---------|
| `toggle(key, value)` | flip one option; returns the new result |
| `set(key, values[])` | replace a facet's selection |
| `clear(key)` | clear one facet |
| `reset()` | clear every facet **and** the query |
| `setQuery(str)` | set the search text (Fase 2 hook) |
| `apply()` | the current filtered array |
| `result()` | `{ items, count, total, query, selections, facets }` |
| `buildFacets()` | facets with dynamic `options[{value,label,count,active}]` |
| `getState()` / `setState(s)` | serialize / restore selections + query |
| `subscribe(fn)` | called with the result on every change; returns an unsubscribe |

Option **counts respect the other active facets** (classic faceted search): each
option shows how many jerseys you'd get if you selected it, given what's already
chosen elsewhere.

### `Filters.mount(engine, container, { onChange?, hideSingle? })`
Renders the reusable checkbox UI into `container` and re-renders on every change.
Fires `onChange(result)` and dispatches a `filters:change` DOM event. Styling is
in `assets/css/filters.css` (additive — touches no frozen CSS).

### `Filters.attach({ controls, list, data?, facets?, onChange? })`
One-call page wiring. Loads the JSON via `API` (or accepts `data`), enriches,
builds the engine, mounts the controls, and — if `Catalog` is present — renders
the filtered jerseys into `list` with `Catalog.renderJerseys`.

## Page integration (example)

```html
<link rel="stylesheet" href="assets/css/filters.css">

<div class="filters-layout">
  <aside id="filterControls"></aside>
  <div class="grid" id="jerseysGrid" role="list"></div>
</div>

<script src="assets/js/api.js"></script>
<script src="assets/js/image-loader.js"></script>
<script src="assets/js/catalog.js"></script>
<script src="assets/js/filters.js"></script>
<script>
  Filters.attach({ controls: "filterControls", list: "jerseysGrid" });
</script>
```

## Search readiness (Fase 2)

Search is already integrated into the engine. `setQuery(str)` is AND-combined
with the active facets; `Filters.defaultSearch` matches name, club, collection,
league, brand, type, category, season, version and gender. Wiring the existing
search overlay to `engine.setQuery` is all that Fase 2 requires — no engine
changes.

Provide a custom matcher via `createEngine({ search: (item, q) => boolean })`.

## Custom facets

`createEngine({ facets: [...] })` accepts custom facet definitions:

```js
{ key: "type", label: "Type", get: (item) => item.type }   // Home / Away / Third
```

`get` may return a string, a `{ value, label }` pair, or an array of either.
Empty/null values yield no option and never match — safe by construction.

## Tests

Zero-dependency, runnable two ways:

```bash
node tests/filters.test.js      # terminal
```
or open `tests/index.html` over HTTP. Covers the acceptance cases — **single
filter, multiple filters, no results, reset** — plus enrichment, availability,
dynamic options, live counts and the search hook.
