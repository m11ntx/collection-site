# Smart Search — `assets/js/search.js` (CS-12)

Fast, **accent-insensitive** search for M11NTX jerseys, using only the JSON
already loaded (no network, no search index to build). It integrates with the
filter engine so that **filters + search work together** on one engine, updating
results in real time — no page reload. No frameworks, no dependencies, no build
step. Runs in the browser and in Node tests.

```
data/*.json → Filters.enrich() → Filters.createEngine({ search: Search.matcher() })
                                              ↑
                              Search.mount(engine, input)   (types → setQuery)
```

## What it searches

On an enriched product (see [`filters.md`](filters.md)):

| Requested field | Item field |
|-----------------|------------|
| name | `name` |
| club | `clubName` |
| league | `leagueName` |
| collection | `collectionName` |
| manufacturer | `brand` |
| season | `season` |
| version | `version` |
| category | `category` |
| gender | `gender` |

The field list is configurable — see *Custom fields* below.

## How matching works

- **Case-insensitive**, **accent-insensitive** (`São` = `sao`), and
  **whitespace-tolerant** (extra spaces are collapsed and trimmed).
- Normalization: `NFD` → strip combining diacritics → lowercase → collapse
  whitespace → trim.
- The query is split into tokens; **every token must be found** (AND). So
  `united home` matches only jerseys whose text contains both.
- An **empty** query (or whitespace only) matches everything.

## API

### Core (pure)
| Function | Purpose |
|----------|---------|
| `Search.normalize(str)` | lowercase, strip accents, collapse spaces, trim |
| `Search.match(item, query, fields?)` | `true` if every token is found |
| `Search.matcher(fields?)` | returns `(item, query) => boolean` for the engine |
| `Search.buildHaystack(item, fields?)` | the normalized searchable string |
| `Search.SEARCH_FIELDS` | the default field list |

### Standalone component — `Search.create({ items, fields?, query? })`
A reusable search with its own state (no filters):

| Method | Purpose |
|--------|---------|
| `setQuery(str)` | set the query; returns `{ items, count, total, query }` |
| `getQuery()` | current query |
| `results()` | current result snapshot |
| `reset()` | clear the query |
| `getState()` / `setState(s)` | serialize / restore the search state |
| `subscribe(fn)` | called with the result on every change; returns unsubscribe |

### UI binding — `Search.mount(engine, target, opts?)`
Binds an `<input>` to `engine.setQuery` in **real time**. Works with a filter
engine *or* a standalone `Search.create()` (both expose `setQuery`/`subscribe`).
If `target` isn't an `<input>`, it uses/creates one inside it (reusing the
existing `search__input` style — no new CSS). Options: `debounce` (ms, default
`0`), `placeholder`, `ariaLabel`, `className`, `onChange(res)`.

## Integration with filters

`search.js` is the source of the accent-insensitive matcher; the filter engine
accepts it via `createEngine({ search })`. `Filters.attach` wires it
automatically when `search.js` is loaded:

```html
<script src="assets/js/api.js"></script>
<script src="assets/js/catalog.js"></script>
<script src="assets/js/filters.js"></script>
<script src="assets/js/search.js"></script>
<script>
  Filters.attach({
    controls: "filterControls",
    list: "jerseysGrid",
    searchInput: "searchInput"   // <input> bound in real time
  });
</script>
```

Manual wiring (full control):

```js
const items  = Filters.enrich(products, { clubs, collections, leagues });
const engine = Filters.createEngine({ items, search: Search.matcher() });
Filters.mount(engine, document.getElementById("filterControls"));
Search.mount(engine, document.getElementById("searchInput"));
```

Because both filters and search live on the **same engine**, every keystroke and
every checkbox recomputes one combined result (`search AND facets`), and the
`filters:change` event / `onChange` fire with the merged list.

> Without `search.js`, the engine falls back to `Filters.defaultSearch`
> (case-insensitive but **not** accent-insensitive). Load `search.js` for the
> full behavior.

## Search state

The query is part of the engine state: `getState()/setState()` include it, and
`reset()` clears it along with the filters. Standalone `Search.create()` mirrors
the same surface.

## Custom fields

Pass a field list (keys or accessor functions) to `matcher`, `match`, or
`create`:

```js
Search.matcher(["name", "clubName", (i) => i.type]);   // also search Home/Away
```

## Tests

Zero-dependency, runnable two ways:

```bash
node tests/search.test.js       # terminal
```
or open `tests/index.html` over HTTP (runs Filters + Search suites). Covers
**empty search, search by club, search by season, search combined with filters,
no results**, plus accent/case/whitespace insensitivity and search state.
