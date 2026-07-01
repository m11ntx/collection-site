# M11NTX — Catalog Pipeline (Architecture)

> **Status: documentation only.** This describes the future pipeline that will
> feed `data/*.json`. It is **not** implemented in this sprint. The storefront
> is already prepared to consume its output without refactoring — JSON remains
> the single source of truth (RN-012).

## Purpose

Turn external product sources (e.g. the Feng catalog) into the clean,
validated, WebP-backed JSON the storefront already renders — incrementally,
idempotently, and without ever touching the approved front-end.

## Flow

```
 Source(s)
    │
    ▼
┌──────────┐   ┌────────┐   ┌───────────┐   ┌────────┐   ┌───────────┐   ┌───────────┐
│ Adapters │─▶ │ Parser │─▶ │ Validator │─▶ │ Assets │─▶ │ Generator │─▶ │ Publisher │
└──────────┘   └────────┘   └───────────┘   └────────┘   └───────────┘   └───────────┘
    fetch        normalize     enforce         images        write            deploy
                              business rules   (WebP)         JSON
                                                              │
                                                              ▼
                                                        data/*.json  ──▶  storefront
```

## Stages

### 1. Adapters
Source-specific connectors that fetch raw product data (HTML/API/feed) and hand
it off in a common shape. One adapter per source; adding a source never changes
downstream stages.

### 2. Parser
Normalizes raw records into the canonical model (collection, club, product),
generates slugs (RN-009), and maps sizes into the official `sizes[]` structure
`[{ size, stock }]` (RN-006).

### 3. Validator
Enforces the business rules before anything is written:
- computes `available` from stock (RN-007);
- requires a slug (RN-009);
- drops nothing — unavailable products are kept and flagged (RN-002);
- guarantees every image is referenced by a product (RN-008).

### 4. Assets
Manages images: downloads only what is missing (RN-003), converts to WebP
(RN-010), and reuses the cache so existing images are never regenerated
(RN-011). Files are named by slug and placed under `assets/images/<category>/`.

### 5. Generator
Emits the final JSON (`collections.json`, `clubs.json`, `products.json`, …)
using incremental writes — only new or changed records are rewritten (RN-004).
Output matches exactly what `api.js` / `catalog.js` already expect.

### 6. Publisher
Commits the regenerated JSON and assets and deploys (GitHub Pages). Because the
storefront reads only JSON, publishing new data requires **no** front-end change.

## Contract with the storefront

- The pipeline's **only** output that the site depends on is `data/*.json`
  (and the referenced images). — RN-012
- Schemas are the ones documented in the [README](../README.md) data model.
- The storefront already renders availability, sizes and stock from this data,
  so the pipeline can be built and iterated independently.

See [business rules](BUSINESS-RULES.md) for the authoritative rule definitions.
