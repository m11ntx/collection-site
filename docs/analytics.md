# Analytics & Telemetry (CS-14)

A **decoupled** analytics layer. Every event goes through one function —
`Analytics.trackEvent()` — which fans out to the enabled providers
(**Google Analytics 4** and **Microsoft Clarity**). Providers are toggled from
`config/site.js`; no IDs are hardcoded anywhere. The layout is never touched.

```
config/site.js (window.CONFIG) → analytics.js → GA4 / Clarity
        ↑ ids + toggles                 ↑ trackEvent() called from catalog/filters/search
```

## Configuration — `config/site.js`

The single source of truth (loaded first on every page):

```js
window.CONFIG = {
  url: "https://m11ntx.github.io/collection-site",
  instagram: "https://www.instagram.com/m11ntx/",
  analytics: {
    enabled: true,       // master switch for the whole layer
    respectDNT: true,    // honor the browser's Do Not Track
    debug: false,        // console.debug every event
    ga4:     { enabled: false, id: "" },   // "G-XXXXXXXXXX"
    clarity: { enabled: false, id: "" }    // Clarity project id
  }
};
```

**To enable a provider:** set its `id`, set its `enabled: true`, keep
`analytics.enabled: true`. With ids empty / providers off, no external script
loads and `trackEvent()` no-ops — the platform stays instrumented but silent.
Setting `analytics.enabled: false` disables everything at once.

`config/site.js` is also the single home for the **Instagram URL** — `catalog.js`
(the CTA) and `seo.js` read it from `CONFIG` (with a safe fallback). Don't
duplicate IDs/URLs elsewhere.

## Events

| Event | Fires when | Params | Where |
|-------|-----------|--------|-------|
| `home_view` | landing renders | — | `catalog.js` `init()` |
| `collection_view` | collection page renders | `slug` | `catalog.js` `initDetail()` |
| `club_view` | club page renders | `slug` | `catalog.js` `initClubPage()` |
| `jersey_view` | jersey page renders | `slug`, `club`, `brand` | `catalog.js` `initJerseyPage()` |
| `search` | user pauses typing (600 ms), non-empty | `query`, `results` | `search.js` `Search.mount()` |
| `filter` | a filter checkbox toggles | `facet`, `value`, `active` | `filters.js` `Filters.mount()` |
| `instagram_click` | any link to the official Instagram | `context` (page) | `analytics.js` (delegated) |
| `faq_open` | an FAQ item opens | `question` | `analytics.js` (delegated `toggle`) |

`instagram_click` and `faq_open` are **auto-bound** by `analytics.js` via
delegated listeners — no markup changes. `context` is derived from the page
(`home` / `collection` / `club` / `jersey`).

## API

| Function | Purpose |
|----------|---------|
| `Analytics.init()` | binds auto-events; loads providers if enabled (called by `main.js`) |
| `Analytics.trackEvent(name, params)` | the central entry point; fans out to GA4 + Clarity |
| `Analytics.track.*` | typed helpers: `homeView`, `collectionView(slug)`, `clubView(slug)`, `jerseyView(slug, extra)`, `search(q, n)`, `filter(facet, value, active)`, `instagramClick(ctx)`, `faqOpen(q)` |
| `Analytics.enabled()` | `true` when the master switch is on and DNT allows it |

Custom events are trivial: `Analytics.trackEvent("my_event", { any: "param" })`.

## Provider integration

- **GA4** — loads `gtag.js` for the configured id, sets
  `config <id> { send_page_view: false }` (we emit our own `*_view` events), and
  every `trackEvent` becomes `gtag('event', name, params)`.
- **Clarity** — loads the Clarity tag for the project id; every `trackEvent`
  becomes `clarity('event', name)` plus `clarity('set', key, value)` tags.

Events fired before a provider's remote script finishes are safely queued
(`dataLayer` / `clarity.q`) and flushed on load.

## Privacy

`respectDNT: true` (default) means nothing loads and nothing is tracked when the
browser sends Do Not Track. The whole layer can be disabled with one flag.

## Verifying

Open a page with `debug: true` and watch the console for `[analytics] <event>`
lines, or set real ids and confirm hits in GA4 Realtime / the Clarity dashboard.
