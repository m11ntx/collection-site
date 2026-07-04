# CLAUDE.md — M11NTX Storefront (collection-site)

Static storefront for M11NTX: vanilla **HTML5 / CSS3 / ES6, no frameworks, no
build step**, deployed on GitHub Pages. Data pipeline is a separate project
(`../catalog-pipeline`); the only integration is the JSON in `data/`.

## Start here (before any task)
Read **`docs/PROJECT-STATUS.md`** (pages, data, JS layers, how to run, next steps)
and **`CHANGELOG.md`** (history). Design detail in `docs/DESIGN_SYSTEM.md`.

## Non-negotiable rules
- **The hero / landing is FROZEN** — approved design; do not restyle it. Also
  approved: navbar, footer, Collections grid, design system, palette, typography.
- **JSON is the single source of truth** — never hardcode catalog data
  (render from `data/*.json` via `api.js` → `catalog.js`).
- No frameworks, no dependencies, no build step.
- Subpages resolve paths via `<base href="../">`.

## Architecture
`data/*.json → api.js → catalog.js → ui.js → screen`
Pages: `index.html` (hero + collections) → `pages/collection.html?slug=` →
`pages/club.html?slug=` → `pages/jersey.html?slug=`.

## Run
Uses `fetch()`, so serve over HTTP (not file://):
```
python -m http.server 8000     # http://localhost:8000
```

## Working agreement
- One task per session; keep prompts scoped. Reference files by path (don't paste them).
- Verify visual changes before claiming done; at the end of a session, update
  `CHANGELOG.md` and `docs/PROJECT-STATUS.md`.
- Commit/push only when asked. Repo: https://github.com/m11ntx/collection-site
