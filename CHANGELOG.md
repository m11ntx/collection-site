# CHANGELOG

## CS-64 - Brasileirão skips its region-card level, lists clubs directly

Validated locally, then approved. `assets/js/catalog.js`'s `initLeaguePage()`
gained `SKIP_REGIONS_FOR_LEAGUES = ["brasileirao"]` -- for any league id in
that list, its region cards are never fetched/rendered, and it falls
straight to listing clubs, same as every other (non-region) league already
does. Region *data* is completely untouched (`catalog-pipeline` still
generates `regions.json`/`club.regionId` exactly as before, per MI-06 --
see its `docs/collection-site-adapter.md` for the pipeline-side note); this
is a display-only decision on one specific league's own page. To extend the
same treatment to another region-bearing league later, add its id to that
one array -- nothing else needs to change on either side.

## CS-63 - Always-visible mobile search bar (no menu tap needed)

Adds a second, always-visible row under the main mobile nav bar -- a
`<button>` styled to read as a real search field (avoids the on-screen-
keyboard flicker of a real `<input>` briefly gaining then losing focus) --
that opens the exact same search overlay/engine as the desktop search
button and the one still inside the hamburger menu (kept as-is, per
explicit request: it can stay there too, just also be always visible). No
search logic duplicated -- `ui.js`'s `initSearch()` gained a third trigger
(`#searchOpenMobileBar`) wired to the identical `open()` closure.

Applied to all 14 pages carrying the nav header: `scripts/gen/gen_pages.js`'s
`NAV` template (regenerates the 7 institutional pages) plus a bulk patch of
the other 7 hand-authored pages (`index.html`, catalog/club/collection/
jersey/league/region). `.detail`'s mobile top padding bumped (`5.5rem` →
`9rem`) to clear the extra row -- unverified in a real browser this
session (no browser automation tool available); flagged for a visual
mobile pass to fine-tune if the spacing looks off.

## CS-62 - NBA + Acessórios: a separate "Outros" section for the 163 products with no club

163 products (126 NBA jerseys, 37 generic accessories) had no `clubId` at
all -- basketball and generic accessories were never modeled in this
futebol-only catalog. catalog-pipeline now resolves them to two new flat
collections (`nba`, `acessorios` -- no leagues/clubs, per the user's own
choice of a single list over per-team pages). On the storefront:

- `index.html` gained a second grid (`#catalogGridOther`, hidden unless
  populated) below the existing 4 futebol collection cards, under an
  "Outros" heading -- driven entirely by the pipeline's new
  `collection.group === "outros"` field, never a hardcoded assumption
  about which/how many collections exist.
- `catalog.js`'s collection detail page (`detailTemplate`/`initDetail`) now
  branches on whether a collection has any leagues: if not, it lists the
  collection's jerseys directly (same flat-archive section as a club page,
  scoped by `collectionId` instead of `clubId`) instead of an empty
  leagues grid.

## CS-61 - Mobile: breadcrumb overflow was widening the whole page; jersey card CTA button now fits the card

Two real mobile bugs reported after CS-59/CS-60 shipped:

1. **Page-wide horizontal overflow on the jersey detail page.**
   `.breadcrumb` used `display:flex` with no wrap; a long product title in
   the final (non-link) breadcrumb segment couldn't wrap, forcing the row
   -- and with no `overflow-x` safety net on `html`/`body`, the whole page
   -- wider than the viewport (matched the reported symptom: had to drag
   the screen sideways to see the nav). Fixed the root cause (breadcrumb
   wraps, the current segment can break mid-word) and added
   `overflow-x:hidden` on `html`/`body` as a defensive net against the same
   class of bug elsewhere.
2. **"Ver Detalhes" button wider than its card.** `.jersey-card__cta` was
   `align-self:flex-start` (shrinks to its own content) -- on a narrow
   2-column mobile grid, the button's padding pushed it wider than the
   card, visibly overflowing the card's border. Now `width:100%`, same
   pattern as the jersey detail page's own full-width buy button.

## CS-60 - Language change now re-renders the current page, not just the nav; personalization note on jersey detail

**Bug fix (reported after CS-58 shipped):** switching language only updated
the nav/footer (`data-i18n` attributes, refreshed by `I18N.applyStatic()`) --
every other page's dynamic content (collection/league/region/club detail,
the catalog/filters page) is injected once as `root.innerHTML =
someTemplate(...)`, built from `I18N.t()` calls evaluated at that one render
time, so it stayed frozen in whatever language was active on first paint.
Added a generic `_lastPageRerender` closure in `catalog.js`, set at the end
of every `init*()` page entry point, called on `"language:change"`/
`"currency:change"` (same event, same "never re-fetch, only re-render"
contract the jersey grid already had). `filters.js`'s sidebar (facet
labels/counts/reset button) got the same treatment, keyed off its own last
result instead of re-filtering.

**Personalization note (jersey detail page):** when the pipeline's new
`personalizationAvailable`/`personalizationFormattedPrice` fields are set,
shows "this jersey can be personalized with name and number (+price)" in
pt-BR/en-US, using the pipeline's pre-formatted surcharge string --
`currencyService.js` gained `personalizationFormattedPriceFor()`, mirroring
`formattedPriceFor()`'s contract exactly (no client-side price math). See
`catalog-pipeline`'s CHANGELOG for the pricing side (M11NTX's own fixed
R$30 surcharge, replacing the source's scraped ~R$16 delta).

## CS-59 - Fourth correction on seleções card images: horizontal mis-centering (root cause found)

Three prior rounds this cycle fixed the *vertical* framing of all 168 club/
seleção cards (ring flush at top, ball visible at bottom) and a specific
row2/row3 seam defect on 3 sheets. A 4th, independent defect surfaced after
those landed: on `selecoes2.png` only, the shared `C1` crop-box x-coordinates
(copy-pasted from a different source sheet without being re-measured for this
one) were centered ~35px left of the badge ring's true center, cropping
Argentina/Canada/Colombia/Curaçao with excess dark background on the left and
the ring crowding/touching the right edge.

**Root cause, precisely isolated:** only `selecoes2.png`'s **C1** column (row
positions of Argentina, Canada, Colombia, Curaçao) was affected. Its **C2**
column (Brasil, Chile, Costa Rica, Equador) and all 6 other `selecoes*.png`
sheets measured correctly centered — this was a single miscalibrated
coordinate pair, not a systemic template issue.

**Method (learned from the prior round's repeat misses):** eyeballing a
rendered crop was unreliable twice before. This time the ring's true center
was located numerically — the flag disk's brightest horizontal band was
measured across 4 independent rows/flags (Argentina, Canada, Colombia,
Curaçao), all 4 independently converging on the same true center (x≈418-419
in the 1536px source sheet, vs. the assumed x=384, a consistent +34 to +35.5
px offset) — then verified a second way with a center-line overlay on the
re-cropped output, confirming near-zero offset (0, -1, -1, +0.5 px) on all 4.
A full 49-image sweep (same numeric method plus manual visual check on the 2
flag designs the method can't measure reliably — asymmetric cantons/wedges
like Czech Republic and USA) found no other sheet or column affected.

### Fixed
- `argentina.webp`, `canada.webp`, `colombia.webp`, `curacao.webp` — re-cropped
  with the corrected `selecoes2.png` C1 box, ring now centered.

### Verification
- Numeric: flag-disk-center measurement on all 4 re-cropped images shows
  ≤1px residual offset (was +34 to +35.5px).
- Visual: center-line overlay on each of the 4 confirms symmetric margins.
- Full 49-national-team sweep re-run post-fix: no other image flagged
  (2 automatic false positives from asymmetric flag designs were manually
  confirmed centered by direct visual inspection).

## CS-58 - MI-03 localization: price display, IP-priority language/currency, reload-free switching

Wires up the storefront half of catalog-pipeline's MI-03 Pricing &
Internationalization Engine, which now ships `product.price` as a per-
currency object (`{BRL,USD,EUR}`) and `product.formattedPrice` as pre-
formatted display strings (`{"pt-BR","en-US","en-EU"}`) — no price
calculation or number formatting ever happens in the browser.

### Added
- Price display on `jerseyCard()` (catalog grid) and `jerseyDetailTemplate()`
  (detail page), reading `product.formattedPrice` directly via
  `CurrencyService.formattedPriceFor()` — a plain price line, consistent
  with the existing no-e-commerce-cue design language (no buy button, no
  stock badge).
- Header language (🇧🇷 Português / 🇺🇸 English) and currency
  (R$ / US$ / €) `<select>`s, in the desktop nav and mobile menu
  (`[data-lang-select]`/`[data-currency-select]`), wired via the new
  `assets/js/services/localization.js` bootstrap — any number of instances
  stay in sync via the `language:change`/`currency:change` events.
- `assets/js/services/locationService.js` rewritten: resolves language +
  currency by strict priority — (1) saved preference, (2) IP → country
  (ipapi.co), (3) `navigator.language` (last resort ONLY, never primary),
  (4) default (en-US/USD) — and persists all three (language, currency,
  country) after first detection.
- `assets/js/services/currencyService.js` rewritten to read the new
  `product.price`/`product.formattedPrice` shape (previously
  `product.metadata.pricing`, now removed from the pipeline's canonical
  output shape).
- `tests/localization.test.js` (Node-only, `node tests/localization.test.js`):
  20 tests simulating access from Brazil, USA, Germany, Portugal, France,
  Japan, Australia and Mexico, plus the "navigator.language must never be
  primary" dangerous-example cases and persistence/manual-override behavior.

### Changed
- `assets/js/i18n.js`'s `setLang()` no longer reloads the page: persists,
  re-renders every `[data-i18n*]` element in place, updates `<html lang>`,
  and fires `language:change` so dynamically-rendered content (product
  cards, detail pages) can re-render itself from already-fetched data —
  the catalog is never re-fetched on a language or currency change. Also
  fixes a latent stale-closure bug in `initLangToggle()`'s click handler.
- `catalog.js` tracks the most-recently-rendered jersey grid/detail and
  re-renders them (from the same in-memory data, no re-fetch) on
  `language:change`/`currency:change`.
- `scripts/gen/gen_pages.js`'s shared `NAV` template and `scripts/gen/
  minify.js`'s `JS_FILES` updated; institutional pages + `index.html`/
  `404.html`/the 6 hand-authored `pages/*.html` all re-generated with the
  new header markup and script includes.

### Removed
- The old PT/EN-only `.js-lang-toggle` button (replaced by the language
  `<select>` above) and `currencyService.js`'s client-side `format()`
  helper (computed `symbol + amount.toFixed(2)` — replaced by
  `formattedPriceFor()`, which only ever reads a pipeline-precomputed string).

### Verification
`node tests/localization.test.js` (20/20), `node tests/filters.test.js`,
`node tests/search.test.js` all green. `node tests/i18n.test.js` has one
pre-existing, unrelated failure (a translation-dictionary coverage gap for
3 product names — "Bordô"/"já"/"Calça" — not touched by this change).
Full visual/browser verification not performed in this session (no browser
automation tool available) — logic verified via the Node suite instead;
recommend a manual pass (`tests/index.html` + a local static server) before
relying on this in production.

## CS-57 - Sync MI-40's image-collision fix (374 products) + clubId=null recovery

Data-only sync of catalog-pipeline's MI-40 fix. User-reported mismatched
product photos (a Curaçao kids kit showing a Brazil basketball tank top,
etc.) traced to 374 products silently sharing one image file per (missing-
league, missing-club, season, version) bucket — every one now has its own
unique image path. A follow-up sweep also recovered 47 more products onto
real clubs (6 new MLS clubs added: CF Montréal, Colorado Rapids, New York
City FC, Real Salt Lake, San Jose Earthquakes, St. Louis City) that had
been sitting unattributed since before those clubs existed in the catalog.

### Changed
- `data/*.json` regenerated (2727 → 2726, net -1: a keychain accessory
  correctly excluded, same policy as every other non-jersey item under a
  menu-covered club); `assets/images/jerseys/**` refreshed for every
  affected league (bundesliga, eredivisie, libertadores, ligue-1, mls,
  premier-league, primeira-liga, saudi-pro-league, selecoes, serie-a, and
  the generic "sem-liga" bucket for the 158 products that genuinely have
  no club — mostly NBA jerseys and standalone sock/short accessories this
  catalog was never meant to attribute to a football club).
### Verification
Full catalog-pipeline suite (300 tests) + collection-site's 3 Node suites
green. Re-fetched the exact 2 screenshotted products and confirmed their
images now show the correct item (Curaçao kids kit, Brazil training
jersey) instead of the previously-shared wrong photo.

## CS-56 - Filters sidebar: translated + collapsible facet groups

User reported the Catalog page's filter sidebar (a) wasn't translated to
English at all and (b) had grown too tall (every facet — Collection,
League, Club with 157+ options, Manufacturer, Season, Version, Category,
Gender, Availability — always fully expanded).

### Changed
- `assets/js/filters.js` — `mount()`'s facet section labels and option
  labels (collection/league/club via `I18N.properNoun()`, version/
  category/gender/availability via `I18N.fieldLabel()`) now translate the
  same way every other card on the site already does; "Reset"/result-count/
  empty-state strings too. The pure `createEngine()` engine (tested in
  Node without i18n.js) is untouched — translation only happens in the
  browser-only UI layer, degrading to plain English if `I18N` isn't loaded.
- Facet groups converted from a plain `<fieldset>` to a native `<details>/
  <summary>` disclosure — collapsed by default, auto-open only for a facet
  with an active selection, manual open/close persisted across re-renders
  (a small `manualOpen` map, since the whole sidebar's `innerHTML` is
  rebuilt on every filter change). `.filters__options` also gets its own
  scroll region (`max-height: 260px`) so even the 157-option Club facet
  doesn't blow out the page when expanded.
- `assets/js/i18n.js` — new `STRINGS.filters` block (reset/resultCount/
  empty/9 facet labels, pt+en).
### Verification
All 3 Node suites green (Filters 14/14 unaffected — pure engine untouched;
I18N 21/21; Search 16/16). Rendered the filters UI in Node with an active
Club selection: confirmed only that facet auto-opens, "Alemanha" reads
"Germany", and section labels translate correctly.

## CS-55 - Product page UI/UX: real filter styling, fully-clickable jersey cards, cleaner gallery

Three user-reported UI/UX issues on the club/jersey pages.

### Segment tabs didn't look like filters
Root cause: `pages/club.html` never loaded `assets/css/filters.css` — the
only stylesheet defining `.segment-tabs`/`.segment-tabs__btn` — so the
Fan/Player/Women/Retro/Kids pills rendered with zero custom styling.
`filters.css` design was actually fine on paper; it just never reached the
page. Added the missing `<link>` and polished the component while at it:
wrapped it in a labeled `.segment-tabs-wrap` surface (small "Filter" label +
bordered/background container) so it reads as a filter control rather than
loose buttons, gave the count a distinct pill/chip background instead of
plain dim text, and added a `:focus-visible` outline.

### Jersey cards only clickable via "View Details"
Every other card type (`collection-card`, `club-card`/`league-card`/
`region-card`) uses a stretched-link trick — `position:relative` on the
`<article>` + `<a>.__cta::after{position:absolute;inset:0}` — to make the
whole card a click target while keeping one real, accessible link.
`.jersey-card` had the `position:relative` half but was missing the
`::after` rule entirely. Added the matching `.jersey-card__cta::after`
block; now behaves exactly like every other card on the site.

### Jersey gallery: removed hover-zoom, reduced display size, fixed cropping
Source photos are natively ~480×480px with no higher-resolution master
anywhere in the pipeline. The old `.gallery__main` had no `max-width` (grew
to fill its grid column, often 500-600px+) and used `aspect-ratio:3/4` +
`object-fit:cover` (stretching/cropping a roughly-square photo into a
taller box), then a cursor-follow `transform:scale(2.2)` zoom on top of
that — compounding blur on an already-upscaled image. Removed the zoom
entirely (`assets/js/ui.js`'s `initGallery()`, the `mousemove`/`mouseleave`
handlers); capped `.gallery__main`/`.gallery__thumbs` to `max-width:440px`
so the image is no longer displayed larger than its source resolution;
switched to `aspect-ratio:1/1` + `object-fit:contain` so the full photo
shows uncropped and unstretched. Thumbnails shrunk to match (72×88 → 64×64
square, `object-fit:contain`).

### Verification
All 3 Node suites green (Filters 14/14, I18N 21/21, Search 16/16).
Rendered a jersey card in Node to confirm the stretched-link markup;
reviewed the segment-tabs template output against the new CSS by hand.

## CS-54 - Structural: fewer top-level cards (América do Sul folded in, Lançamentos retired) (MI-39)

User asked to simplify the homepage collection grid. Libertadores moved into
Resto do Mundo (América do Sul had no other league, so the card is gone);
Lançamentos retired as a card/page entirely — its products now live only
under their real club/seleção pages, same Fan/Player/Women/Retro/Kids tabs
as everything else.

### Changed
- `data/collections.json`: 6 → 4 entries (Brasil, Europa, Resto do Mundo,
  Seleções). `data/regions.json`: +1 (Oceania, for Nova Zelândia — the first
  Oceania nation on the source). `data/clubs.json`: +9 (Áustria, Islândia,
  Malásia, Ucrânia, Filipinas, Paraguai, Curaçau, República Tcheca, Nova
  Zelândia — genuine 26/27 national-team items that were only ever crawled
  via the now-removed Lançamentos page and never resolved to a club).
- `assets/js/catalog.js`: `collectionHref()` simplified (no more `virtual`/
  `?launch=true` special case); `initCatalogPage()`'s isLaunch-driven
  title/eyebrow/subtitle swap and product pre-filter removed.
- `assets/js/i18n.js`: removed `catalogPage.launch{Eyebrow,Title,Subtitle}`
  (pt+en) and the now-unused `"América do Sul"`/`"Lançamentos"` `PROPER_NOUNS`
  entries; added `"Oceania"` and the 9 new country names.
- `sitemap.xml` regenerated (4 collections, 11 regions, 157 clubs, same 2727
  jerseys — no product count change, this was pure reclassification).
### Verification
Full catalog-pipeline suite (300 tests) + collection-site's 3 Node suites
green. Rendered the collections grid and a sample club card in Node:
confirmed only 4 collection cards remain (all routing to normal collection
pages, no `?launch=true` link survives), and Nova Zelândia renders correctly
under the new Oceania region ("New Zealand" in EN mode).

## CS-53 - Lançamentos card: 15 user-reported missing products added (MI-38)

User noticed real products on the source's Lançamentos page missing from
our card. Investigated in `catalog-pipeline`: not a stale crawl (the launch
page's own URL list was current) — 22 of 160 launch URLs had no product in
the catalog at all. 15 were genuine gaps (new 26/27-season items, mostly
Women's kits crawled off the wrong menu branch, plus 2 retitled "-copia"
listings) and were reattributed + imported; 4 were confirmed duplicates via
photo (already in the catalog under a different slug) and 3 were already-
known deliberate exclusions — correctly left out either way.

### Changed
- `data/*.json` regenerated (2712 → 2727 products, all 15 new ones flagged
  `isLaunch=true`); `assets/images/jerseys/{brasileirao,selecoes}/**`
  refreshed.
### Verification
Full catalog-pipeline suite (300 tests) + collection-site's 3 Node suites
green. Independently re-confirmed after the fix: every Lançamentos URL not
in the catalog is either a known exclusion or a photo-confirmed duplicate —
no unaccounted-for gaps remain.

## CS-52 - Full i18n translation sweep: club/league proper nouns + expanded product-name vocabulary

Now that every menu (Fan/Player/Women/Retro/Kids) is imported (CS-51), did a
full pass of the site for untranslated Portuguese cards in EN mode.

### Found and fixed
- **Structural gap**: `club.name`/`league.name` were never wrapped in
  `I18N.properNoun()` anywhere in `catalog.js` (unlike `collection.name`/
  `region.name`, which already were) — harmless for real clubs (language-
  neutral proper nouns) but broke the Seleções league: all 39 national-team
  "clubs" showed their raw PT country name on cards/breadcrumbs/detail pages
  (e.g. "Alemanha" instead of "Germany"), and the "Seleções" league card/tab
  itself never translated to "National Teams". Fixed by routing every
  `club.name`/`league.name`/`region.name` used in visible markup through
  `I18N.properNoun()` (`assets/js/catalog.js`), and adding the 4 missing
  collections, 3 missing continent regions, and 30 national-team country
  names to `PROPER_NOUNS` (`assets/js/i18n.js`).
- **Vocabulary gap**: `NAME_DICTIONARY` (the jersey free-text `name`
  translator) covered only a fixed ~20-word list — apparel/segment words
  (Jogador, Treino, Goleiro, Regata...), most colors (Rosa, Roxo, Laranja,
  Dourado...), sponsorship-patch spelling variants, commemorative/edition
  words (Edição, Especial, Aniversário...), pattern words, prepositions, and
  ~30 country names inside product titles (e.g. "Seleção da Alemanha") were
  all leaking through untranslated. Added ~110 new entries; verified against
  every one of the 2,712 real product names — reduced untranslated leftover
  tokens from 81 distinct words down to 0 (remaining accented tokens are all
  genuine proper nouns: club/place/person names, a kept-as-is league name
  matching the Bundesliga/La Liga convention, and one known upstream
  `&quot;`-entity data bug in 2 product names, flagged for catalog-pipeline).
- **Missing controlled-value labels**: `category: "Manga Longa"` (12
  products) and `type: "Goalkeeper"` (99 products) had no `FIELD_LABELS`
  entry, so spec rows/card meta showed the raw value in both languages.
- **Static-fallback bug**: `scripts/gen/gen_pages.js`'s How It Works page
  generator hardcoded "Consultar Disponibilidade" for the CTA button instead
  of reading `I18N.STRINGS[FALLBACK_LANG].jerseyDetail.consultCta` like
  every other string on the page — invisible once JS ran (client-side
  `applyStatic()` overwrote it), but wrong in the pre-JS static HTML.
- **Upstream data bug, fixed at the root** (`catalog-pipeline` MI-37): 2
  products had a literal `&quot;` instead of a real quote mark (a
  never-decoded HTML entity from `og:title`) — fixed in the parser, not
  patched around here. Fixing it surfaced a second, real i18n bug of its
  own: `translateName()`'s `phraseRegex()` required a space/comma/hyphen
  immediately before/after a matched word, so the word right after an
  opening quote (`"México` in `"México de Oro"`) silently stopped
  translating once the quote became a real character. Fixed by widening the
  boundary character class to include quote marks (`"`, `'`, `"`, `"`).

### Changed
- `assets/js/i18n.js` — `PROPER_NOUNS` (+37 entries), `FIELD_LABELS`
  (+2 entries), `NAME_DICTIONARY` (+~110 entries).
- `assets/js/catalog.js` — `clubMedia`, `clubCard`, `leagueMedia`,
  `leagueCard`, `regionMedia`, `detailMedia`, `clubCrest`,
  `leagueDetailTemplate`, `regionDetailTemplate`, `clubDetailTemplate`,
  `jerseyDetailTemplate` now route club/league/region names through
  `I18N.properNoun()`. `document.title`/`SEO.set()` calls intentionally left
  untouched (documented `<head>` exclusion, docs/i18n.md).
- `scripts/gen/gen_pages.js` — fixed the hardcoded CTA fallback; regenerated
  all 7 institutional pages.
- `tests/i18n.test.js` — added a second, broader leftover-vocabulary test
  (any unexpected accented token, not just a fixed 20-word blocklist) so
  future data additions with new PT vocabulary fail loudly instead of
  shipping untranslated cards silently.
- `docs/i18n.md` — documented the club/league `PROPER_NOUNS` wiring and the
  new test's allowlist-maintenance workflow.

### Verification
All 3 Node suites green (Filters 14/14, I18N 21/21 — up from 20, Search
16/16). Manually rendered real card templates in Node (`clubCard`/
`leagueCard`/`collectionCard`) for a Seleções club, the Seleções league, and
a virtual collection: confirmed "Alemanha" → "Germany" in `en`/unchanged in
`pt`, "Seleções" → "National Teams", "Resto do Mundo" → "Rest of the World".

## CS-51 - Kit Infantil data live; last planned segment tab now has real content (MI-36)

No site code changed — CS-48's segment tabs handle this automatically.
Last of the 5 planned segments (Fan, Player, Women, Retro, Kids). This
import also traced and fixed the exact contamination example that
originally motivated the whole menu-driven import project: Real Madrid's
own Kit Infantil category page had bulk-miscategorized kids kits from 24
other clubs/nations (AC Milan among them — the founding example).

### Changed
- `data/*.json` regenerated (Kids products added across every league, 26
  reattributions, 2 untracked-club exclusions); `assets/images/jerseys/**`
  refreshed for every affected league (2569 → 2712 products).
### Verification
Full catalog-pipeline suite (298 tests) + collection-site's Node suites
green. Confirmed via the running localhost server: Real Madrid's Kids
roster is now clean (10 genuine items, contamination gone), and every
reattributed club (AC Milan, Colombia, Liverpool, Alemanha, etc.) shows
its new item correctly.

## CS-50 - Retrô data live; the Retro segment tab now has real content (MI-35)

No site code changed — CS-48's segment tabs handle this automatically.
The single biggest data jump this session (2134 → 2569 products).
Rangers and Celtic give Scottish Premiership its first real clubs.

### Changed
- `data/*.json` regenerated (Retro products added across every league,
  6 new small clubs/nations, 1 reattribution); `assets/images/jerseys/**`
  refreshed for every affected league.
### Verification
Full catalog-pipeline suite (298 tests) + collection-site's Node suites
green. Confirmed via the running localhost server: Manchester United
shows 59 Retro items, Real Madrid 50 — both alongside their intact
Fan/Player counts from CS-48/49, confirming MI-34's collision-safety fix
held through this much larger import.

## CS-49 - Femininas data live; the Women segment tab now has real content (MI-34)

No site code changed — CS-48's segment tabs already handle this
automatically (a tab only renders once its club has ≥1 matching product).
Real Madrid's club page briefly would have shown 0 Fan jerseys due to a
pipeline-side data-corruption bug caught and fixed before this data ever
reached the site (see catalog-pipeline MI-34) — confirmed via the running
localhost server: Real Madrid now correctly shows 22 Fan + 11 Player,
Flamengo shows 77 Men + 16 Women.

### Changed
- `data/*.json` regenerated (Women products added across every league,
  4 more via reattribution); `assets/images/jerseys/**` refreshed for
  every affected league.
### Verification
Full catalog-pipeline suite (298 tests) + collection-site's Node suites
green.

## CS-48 - Segment tabs: Fan/Player/Women/Retro/Kids inside a club page (MI-33)

First step of the full Fan/Torcida, Player/Jogador, Women/Femininas,
Retro, Infantil split the user asked to plan for. Chose tabs inside the
club page over a new hierarchy level or homepage cards (a real decision,
confirmed with the user) — a club's jerseys are already fetched once;
switching segments just re-filters and re-renders the same grid, no
navigation, no new page.

### Changed
- `assets/js/catalog.js`: new `SEGMENTS` (fan/player/women/retro/kids,
  each a predicate over `version`/`gender`/`category` — fields the
  canonical model already has), `filterBySegment()`, `segmentTabsTemplate()`,
  `mountSegmentTabs()`; `initClubPage()` mounts tabs instead of calling
  `renderJerseys` directly. A segment tab only renders if the club has ≥1
  matching product today — Player/Women/Retro/Kids appear on their own as
  those menus get imported, zero per-club hardcoding.
- `pages/club.html`: added a `#segmentTabs` container above the jersey
  grid; added `id`s to the section eyebrow/title/subtitle (reused by
  MI-32's catalog page too).
- `assets/css/filters.css`: new `.segment-tabs` pill-button component.
- `assets/js/i18n.js`: new `clubDetail.segment{All,Fan,Player,Women,Retro,Kids}`
  keys (pt/en).
- `data/*.json` regenerated (Jogador products added across every league —
  see catalog-pipeline MI-33); `assets/images/jerseys/**` refreshed for
  every affected league.
### Verification
Full catalog-pipeline suite (297 tests) + collection-site's Node suites
green. Confirmed via the running localhost server: Flamengo now has 73
Fan + 18 Player products, exactly the real mix the tabs are meant to
split. No browser tool available to click through the tabs interactively
— verified via code review (event wiring, re-render, image re-hydration
via the existing `collections:rendered` event) + live data checks instead,
same limitation as every prior collection-site UI change this project.

## CS-47 - Lançamentos: a cross-cutting "new releases" showcase (MI-32)

First real site code change since the menu-driven-import work started
(CS-41 through CS-46 were all data-only). A "Lançamentos" card on the
homepage grid, generically named so future seasons reuse it without a
rename — it's a `"virtual": true` collection (see catalog-pipeline MI-32),
never a real parent of any league/club, so its CTA links to
`pages/catalog.html?launch=true` instead of a collection detail page.

### Changed
- `assets/js/catalog.js`: `collectionHref(c)` routes virtual collections to
  the flat catalog with a `launch=true` query param instead of
  `collection.html`; `initCatalogPage()` reads that param, pre-filters
  products to `isLaunch === true`, and swaps the page's eyebrow/title/
  subtitle/SEO copy accordingly (same Filters UI, same page, different
  product set).
- `pages/catalog.html`: added `id`s to the eyebrow/subtitle elements so the
  launch-mode copy swap can target them directly.
- `assets/js/i18n.js`: new `catalogPage.launch{Eyebrow,Title,Subtitle}` keys
  (pt/en).
- `data/*.json` regenerated; `data/collections.json` gains the
  `lancamentos` entry; `data/products.json` gains `isLaunch` on every
  product; `assets/images/jerseys/{brasileirao,selecoes}/**` refreshed
  (13 products reattributed to their real club during the import — see
  catalog-pipeline MI-32).
### Verification
Full catalog-pipeline suite (295 tests) + collection-site's Node suites
(filters/i18n/search) green. Confirmed via the running localhost server:
`collections.json` includes `lancamentos` with `virtual: true`;
`products.json` has 126 `isLaunch` products correctly spread across their
real clubs (not stripped into a fake "lancamentos" bucket).
### Not automatable end-to-end
No browser tool available this session to click through the homepage card
→ filtered catalog flow interactively — verified via code review + live
JSON checks instead, same limitation noted in every prior collection-site
UI change this project.

## CS-46 - Resto do Mundo: MLS, Libertadores, Saudi Pro League (MI-31)

No site code changed. 33 new clubs: MLS (20, incl. Inter Miami, LAFC,
Toronto FC — new `resto-do-mundo` collection), Libertadores (12 South/
Central American clubs — the long-empty `america-do-sul` collection
placeholder finally populated), Saudi Pro League (Al Hilal, Al Nassr).
See catalog-pipeline MI-31 for two real bugs found along the way (a
category-leaf alias collision, and a dangling `regionId` leaking the
source's own bucket names).

### Changed
- `data/*.json` regenerated (2 new collections/leagues, 33 clubs, no new
  regions); `assets/images/jerseys/{mls,libertadores,saudi-pro-league}/**`
  added; `selecoes/**` refreshed (2 reattributed México items).
### Verification
Full catalog-pipeline suite (288 tests) + collection-site's Node suites all
green. Confirmed via the running localhost server: all 33 clubs resolve
their correct `collection`/`league`, product total 1888 → 1890.

## CS-45 - Seleções: 32 national teams, new collection wired up (MI-30)

No site code changed — same reasoning as CS-41 (Europa): a league with no
`regions.json` entries renders as a flat club grid, and Seleções *does*
have regions (continents), so it renders the same region-card flow already
built for Brasileirão with zero changes. 32 national teams across 4
continents (Alemanha, Argentina, Brasil, Japão, Portugal, and 28 more —
see catalog-pipeline MI-30 for the full list and the real collectionId bug
found/fixed along the way).

### Changed
- `data/*.json` regenerated (new `selecoes` league + 4 continent regions +
  32 clubs); `assets/images/jerseys/selecoes/**` added; `brasileirao/**`
  refreshed (1 reattributed São Paulo item).
### Verification
Full catalog-pipeline suite (288 tests) + collection-site's Node suites
(filters/i18n/search) all green. Confirmed via the running localhost
server: `clubs.json` entries for the new nations correctly resolve
`collection: "selecoes"` (not the club-league `"europa"` collection they
briefly collided with before the pipeline-side fix).

## CS-44 - Bayer Leverkusen: 6 national-team jerseys sanitized (MI-29)

No site code changed. 6 national team jerseys (Turkey x2, Bosnia and
Herzegovina, Haiti, Panama, Norway) removed from Bayer Leverkusen's
listing -- genuinely crawled from the club's own category page on the
source, but not club products. See catalog-pipeline MI-29. Bayer
Leverkusen: 10 -> 4 products. Catalog-wide sweep for the same pattern
found no other affected club.

## CS-43 - Europa: every remaining club synced, 4 new leagues (MI-28)

No site code changed. 17 new clubs across the 5 already-piloted leagues
(Aston Villa, Crystal Palace, Everton, Leeds United, Newcastle United,
Nottingham Forest, Wolverhampton Wanderers, Athletic Bilbao, Lazio, Napoli,
AS Roma, 1. FC Heidenheim, Eintracht Frankfurt, RB Leipzig, Lille, Lorient,
Olympique Lyonnais) plus 8 more across 4 brand-new leagues (`eredivisie`,
`primeira-liga`, `scottish-premiership`, `super-lig`: Ajax, PSV Eindhoven,
Benfica, FC Porto, Sporting CP, Celtic, Galatasaray) and Real Betis (folded
into the existing La Liga). See catalog-pipeline MI-28 for the full
composition-guardrail and cross-club-mismatch work behind these numbers.

### Changed
- `data/*.json` regenerated; `assets/images/jerseys/{premier-league,
  la-liga,serie-a,bundesliga,ligue-1,eredivisie,primeira-liga,
  scottish-premiership,super-lig}/**` refreshed (overlay copy, not
  delete-then-copy this round -- see "Flagged" below).
- Arsenal, Chelsea, Manchester City, Manchester United, Tottenham, Atlético
  Madrid, Barcelona, Inter Milan, AC Milan, Borussia Dortmund: old
  breadcrumb-era buckets re-evaluated against their real menu crawl and
  sanitized down to just their genuine current-branch inventory (e.g.
  Arsenal 73→13, Manchester United 126→11, Barcelona 129→13).
- A 2026/27 Manchester United kit, bulk-miscategorized under Arsenal on the
  source, reattributed to Manchester United.
### Verification
Full catalog-pipeline suite (286 tests) + collection-site's zero-dependency
Node suites (filters/i18n/search) all green. Cross-club mismatch sweep
clean across all 9 Europa leagues after the one fix above. Spot-checked via
the running localhost server: product counts for the new clubs match the
regenerated data exactly.
### Flagged, not actioned
~335 orphaned image directories (old retro-season folders for
Barcelona/Real Madrid/Bayern Munich/Borussia Dortmund whose buckets just
got sanitized) are pure disk-space cleanup with zero functional impact --
left in place rather than bulk-deleted without explicit sign-off.

## CS-42 - Juventus da Mooca removed: a real club-name collision (MI-27)

"Camisa Juventus da Mooca Home 24/25" was showing under Juventus — a real
São Paulo amateur club sharing the literal name "Juventus" with the Italian
club, crawled from the Italian club's own category page on the source. No
site code changed; excluded at the pipeline level (see catalog-pipeline
MI-27) and re-synced. Juventus: 13 → 12 products; orphaned image directory
removed.

## CS-41 - Europa menu, first pilot: 5 clubs across 4 leagues (MI-26)

No site code changed — the existing league-detail page already renders a
flat club grid (not region cards) for any league with no matching entry
in `regions.json`, which is exactly the case for every European league
(regions are Brazil-only) — verified by reading `initLeaguePage()`'s
`hasRegions` computation, not just assumed. Second menu, same rules as
the Brasileirão sweep: piloted Liverpool, Real Madrid, Juventus, Bayern
Munich, and Paris Saint-Germain before touching the rest. See
`catalog-pipeline` MI-26 for two real bugs found (a systemic hyphen-vs-
space matching bug, and the source calling Ligue 1 "League One").

### Changed
- `data/products.json` + `assets/images/jerseys/{premier-league/liverpool,
  la-liga/real-madrid,serie-a/juventus,bundesliga/bayern-munich,ligue-1/
  paris-saint-germain}/**` + a few kids'-kit images reattributed to AC
  Milan/Arsenal/Manchester United/Tottenham: Liverpool 65 (old) → 8, Real
  Madrid 171 → 22, Juventus 54 → 13, Bayern Munich 62 → 15, PSG 56 → 15.
  Catalog total: 2770 → 2438 (a real decrease — these clubs' old data was
  mostly retro/training-gear noise from before the menu-driven approach).
### Verification
Full Node suite green; zero gender leaks, zero image collisions, zero
cross-club mismatches within this batch.
### Still open
`outras-ligas`/Championship/League Two need new league configs before
they can be piloted; the rest of the "main 4" leagues' clubs haven't been
run yet.

## CS-40 - Cross-club mismatch sweep recovers 15 lost products, incl. Ceará (MI-25)

No site code changed — data-only. Direct response to the observation that
a Ceará jersey had been seen under another club while Ceará's own menu
showed nothing: built a reusable sweep that checks every club's crawl for
products whose title names a *different* club, confirmed 15 real products
were being correctly rejected from the wrong club but never recovered
under the right one. See `catalog-pipeline` MI-25 for the full mechanism
(a new `reattributed_products.json`, symmetric to the existing exclusion
list) and a real bug it caught before shipping.

### Changed
- `data/products.json` + `assets/images/jerseys/brasileirao/{athletico-
  paranaense,sao-paulo,vasco-da-gama,ceara,atletico-mineiro,bragantino,
  gremio,chapecoense,flamengo,paysandu}/**`: **Ceará 0 → 1** (previously
  had zero real products despite the club existing), plus one or two
  recovered products each for the other 9 clubs. Catalog total: 2770.
### Verification
Full Node suite green.

## CS-39 - Remaining 14 active Brasileirão clubs (batch pilot, MI-24)

No site code changed — data-only. Completes the Brasileirão club sweep:
checked all 21 not-yet-piloted clubs, found 7 with zero current inventory
in the men's torcedor menu (Guarani, Avaí, Criciuma, Figueirense, Ceará,
CSA, Goiás — genuinely no products there right now, confirmed not a bug),
imported the other 14. See `catalog-pipeline` MI-24 for two more real
cross-club leaks found and fixed (Bahia had 3 national-team jerseys;
Coritiba's and Remo's crawls each contained another piloted club's
products, both correctly caught by the existing club-mismatch logic).

### Changed
- `data/products.json` + `assets/images/jerseys/brasileirao/{bragantino,
  atletico-mineiro,america-mineiro,athletico-paranaense,chapecoense,bahia,
  sport,fortaleza,nautico,santa-cruz,vitoria,paysandu,remo}/**`: see
  `catalog-pipeline` MI-24 for full per-club before/after counts. Coritiba
  ended up with 0 real products (its only crawled item was actually a São
  Paulo product). Catalog total: 2815 → 2755.
### Verification
Full Node suite green; zero image collisions, zero gender leaks, zero
cross-batch reattributions.

## CS-38 - São Paulo data correction (source-side category page investigated, MI-23)

No site code changed — data-only. Investigated directly per request
("acessar o menu site feng e validar"): confirmed via live HTTP fetches
(bypassing cache) that São Paulo's own category page genuinely lists just
1 product, while 25 already exist with consistent breadcrumbs — a
source-side inconsistency, not a bug in our crawler. Two more crawl-
mechanism bugs found and fixed along the way (see `catalog-pipeline`
MI-23): a bare "browse the São Paulo region" URL was being crawled as if
it were São Paulo FC's own page (they share an id), and the coverage-ratio
guardrail (added last session) correctly stopped an unattended run from
treating the genuinely-thin crawl as complete.

### Changed
- `data/products.json` + `assets/images/jerseys/brasileirao/sao-paulo/**`:
  São Paulo 25 (old) → **12**, imported via the pre-menu-crawl
  breadcrumb+title path (deliberately not given a menu attribution, since
  that would have triggered MI-08's "not found in a complete crawl" rule
  against its own real products). That path was upgraded first: the
  men's-only gender policy and the title-confirmation warning now both
  apply even without a menu crawl. Catalog total: 2828 → 2815.
### Verification
Full Node suite green.

## CS-37 - Corinthians, Vasco da Gama, Fluminense, Grêmio (batch pilot, MI-22)

No site code changed — data-only. Fourth batch of clubs run through the
menu-driven import; São Paulo was deliberately NOT run — a new automatic
safety check caught a source-side category-page anomaly for it (see
`catalog-pipeline` MI-22 for the investigation and three underlying
crawl-mechanism bugs found and fixed along the way).

### Changed
- `data/products.json` + `assets/images/jerseys/brasileirao/{corinthians,
  vasco-da-gama,fluminense,gremio}/**`: Corinthians 72 (old) → 22 (one
  genuine miscategorization — a German national team item — found via
  photo and excluded), Vasco da Gama 47 → 23, Fluminense 45 → 22, Grêmio
  36 → 19. Catalog total: 2828.
### Still pending
São Paulo needs a manual look at its real category page before it can be
run — flagged, not guessed at.
### Verification
Full Node suite green; zero image collisions, zero gender leaks, zero
cross-club reattributions this round.

## CS-36 - Palmeiras data (sixth club pilot, MI-20)

No site code changed — data-only. First fully clean pilot: no new gaps,
no manual exclusions needed. See `catalog-pipeline` MI-20.

### Changed
- `data/products.json` + `assets/images/jerseys/brasileirao/palmeiras/**`:
  Palmeiras 85 (old, union) → **33** approved. Catalog total: 2942.
### Verification
Full Node suite green; zero image collisions, zero gender leaks.

## CS-35 - Flamengo data (fifth club pilot, MI-19)

No site code changed — data-only. Flamengo is the largest, noisiest club
piloted so far (83 real URLs across multiple crawl pages — the first
branch where pagination actually mattered). Same club-check gap as CS-34
recurred with a different club ("AS Roma"), closed the same way.

### Changed
- `data/products.json` + `assets/images/jerseys/brasileirao/flamengo/**` +
  `assets/images/jerseys/brasileirao/vasco-da-gama/**`: Flamengo 183 (old)
  → **78**. One product was correctly reattributed to Vasco da Gama (not
  dropped) by the existing title-override logic, so its own image folder
  is included too. Catalog total: 2994.
### Verification
Full Node suite green; zero image collisions, zero women/kids-gendered
leaks in Flamengo's 78.

## CS-34 - Internacional data (fourth club pilot, MI-18)

No site code changed — data-only. Fourth club, new region (Sul). All prior
mechanisms worked without changes; one new gap found and closed the same
way as CS-31 (manual exclusion) — see `catalog-pipeline` MI-18.

### Changed
- `data/products.json` + `assets/images/jerseys/brasileirao/internacional/**`
  + `assets/images/jerseys/premier-league/liverpool/**`: Internacional
  43 (old) → **21**. One item ("Kit Liverpool I Infantil") was correctly
  reattributed to Liverpool by the existing title-override logic, not
  dropped — its own image folder is included too. Catalog total: 3098.
### Found, flagged (not fixed here)
Arsenal's club config lists a bare `"afc"` alias, which could cause a false
match for any unrelated "AFC <something>" product in a future Arsenal
pilot. Didn't cause a wrong result this time (an "AFC Richmond" product
still got correctly rejected from Internacional), but noted in
`catalog-pipeline` MI-18 for awareness.
### Verification
Full Node suite green; no image collisions in Internacional's 21.

## CS-33 - Revert Jogador/Retro/Manga Longa filter; keep gender only (MI-17)

No site code changed — data-only. The user tried CS-32's filter in
practice and had it partially reverted: the planned Jogador/Retro/Manga
Longa menus don't reliably list every real item yet, so excluding those
types from the fan/torcedor menu risked a product not appearing anywhere
on the site. Gender (Feminina/Kit Infantil) stays rejected — no equivalent
risk there. See `catalog-pipeline` MI-17.

### Changed
- `data/products.json` + `assets/images/jerseys/brasileirao/{santos,
  botafogo,cruzeiro}/**`: Santos 16 → **20** (4 retro items restored),
  Botafogo unaffected (still 20), Cruzeiro 28 → **31** (2 jogador + 1
  manga-longa item restored). Catalog total: 3119.
### Verification
Full Node suite green; confirmed zero women/kids-gendered products remain
in any of the three clubs (gender filter still active).

## CS-32 - Retro/Manga Longa filter across all three piloted clubs (MI-16)

No site code changed — data-only. New policy, applied retroactively to
every already-piloted club: the fan/torcedor menu will have sibling menus
for Jogador, Feminina, Kit Infantil, Retro and Manga Longa, so items of
those types must not appear here. Jogador/Feminina/Kit Infantil were
already covered by earlier fixes; Retro and Manga Longa needed a new
category-mismatch check (`catalog-pipeline` MI-16).

### Changed
- `data/products.json` + `assets/images/jerseys/brasileirao/{santos,
  botafogo,cruzeiro}/**`: Santos 20 → **16** (4 retro items removed),
  Botafogo unaffected (still 20), Cruzeiro 29 → **28** (1 manga-longa item
  removed). Catalog total: 3112.
### Verification
Full Node suite green.

## CS-31 - Cruzeiro data correction #3 (manual exclusion, MI-15)

No site code changed — data-only. The one remaining case from CS-30 (a
Palmeiras women's listing re-titled to a Cruzeiro product, undetectable by
text) is now permanently excluded via `catalog-pipeline`'s new manual
exclusion list — removed now and kept out of every future re-run.

### Changed
- `data/products.json` + `assets/images/jerseys/brasileirao/cruzeiro/**`:
  Cruzeiro 30 → **29**. Catalog total: 3117.
### Verification
Full Node suite green; confirmed the product no longer appears in
`data/products.json`.

## CS-30 - Cruzeiro data correction #2 (title-priority gender + player-version filter, MI-14)

No site code changed — data-only. Two more screenshots from the user showed
remaining issues: two visibly women's-cut jerseys still on the Cruzeiro
page, and player-version ("Jogador") items that shouldn't be in this menu
(a separate Jogador menu is planned). See `catalog-pipeline` MI-14 for the
root causes and fixes.

### Changed
- `data/products.json` + `assets/images/jerseys/brasileirao/cruzeiro/**`:
  Cruzeiro 33 → **30**. Catalog total: 3118.
### Known remaining issue — flagged, not fixed
One Cruzeiro product ("Camisa Adidas Cruzeiro Brasil 26/27 - Detalhes em
azul e verde") is still a visible women's-cut jersey in its photo, but its
title/breadcrumb/description contain no gender signal at all — its
`buyUrl` is a re-titled Palmeiras women's listing whose images were never
swapped. Not detectable by any text-based rule; needs a manual call (see
`catalog-pipeline` MI-14).
### Verification
Full Node suite green.

## CS-29 - Cruzeiro data correction (gender sanitize, MI-13)

No site code changed — data-only. Following up on CS-28's open question,
the user confirmed gender should be sanitized too, the same as club.

### Changed
- `data/products.json` + `assets/images/jerseys/brasileirao/cruzeiro/**`:
  Cruzeiro 36 → **33**, now matching the user's manual count of the real
  site menu exactly. Catalog total: 3121.
### Verification
Full Node suite green.

## CS-28 - Cruzeiro data (third club pilot, MI-12)

No site code changed — data-only. Third club, requested as a stress test
for cross-club contamination: the source's Cruzeiro category page mixes in
jerseys from other clubs (Atlético-MG, Bragantino, Ceará, Flamengo, Grêmio,
São Paulo, Vasco). The pipeline's sanitize logic correctly rejected all of
them plus off-branch Cruzeiro items (retro, infantil, etc.) — 36 approved
out of 64 candidates.

### Changed
- `data/products.json` + `assets/images/jerseys/brasileirao/cruzeiro/**`:
  Cruzeiro now 36 products, all genuinely Cruzeiro. Catalog total: 3124.
### Open question
User counted 33 masculine jerseys on the real site; we got 36 (a few
feminina-titled items are embedded in the source's own "masculina" category
page). See `catalog-pipeline` MI-12 — not filtered out yet, pending the
user's call on whether to add gender filtering within an already-matched
branch.
### Verification
Full Node suite green; no image directory collisions among Cruzeiro's 36.

## CS-27 - Botafogo data correction #2 (id collision fix, MI-11)

No site code changed — data-only. CS-26's 19-product Botafogo page was
missing one real product: two distinct training-shirt listings on the
source share an identical title, so they generated the same id and the
second one was silently dropped (`catalog-pipeline` MI-11 fix, requested
directly by the user: "precisa trazer todos os produtos da página").

### Changed
- `data/products.json` + `assets/images/jerseys/brasileirao/botafogo/**`:
  Botafogo 19 → **20** (matches the real source menu exactly now). The
  previously-dropped listing now has its own disambiguated id/slug and its
  own image directory. Catalog total: 3151 → 3152.
### Verification
- Full Node suite green.

## CS-26 - Botafogo data (second club pilot, MI-10)

No site code changed — data-only. Second club run through the menu-driven
import (after Santos), in a different region (Rio de Janeiro vs. São
Paulo), to confirm the MI-09 fixes generalize. They did, with two extra
pipeline-side bugs found and fixed along the way (see `catalog-pipeline`
CHANGELOG MI-10): the attribution report was being overwritten per club
instead of merged, and stale-product re-evaluation must use each product's
real `buyUrl`, not a slug-guessed URL.

### Changed
- `data/{products,clubs,collections,leagues,regions}.json` + `assets/images/
  jerseys/brasileirao/botafogo/**`: Botafogo 34 → 19 products (real "Torcedor
  Masculina" menu is 20; one pair of source listings shares an identical
  title and collapses under the pipeline's existing "duplicate id, first
  wins" policy — pre-existing behavior, not part of this fix). Catalog
  total: 3166 → 3151.
### Verification
- Full Node suite green; visually confirmed a Botafogo I 24/25 jersey photo
  matches its own listing (no cross-product image collision).

## CS-25 - Santos data correction #2 (single-branch menu + image collision fix, MI-09)

No site code changed — data-only refresh from `catalog-pipeline`'s MI-09.
CS-24's 36-product Santos page was still wrong: the source's real "Santos"
menu (Brasil > Brasileirão > São Paulo > Santos) is exactly one category
branch (Torcedor Masculina), not the union of all 5 — confirmed title-for-
title against real screenshots. Also found (catalog-wide, not Santos-
specific): the image pipeline stored files per league/club/season/version,
but `version` never distinguishes Home/Away/Third, so same-season jerseys
collided into one directory and silently overwrote each other's photos
(e.g. the white Santos I 24/25 was serving the yellow Santos III 24/25
photo). Both fixed in `catalog-pipeline`.

### Changed
- `data/{products,clubs,collections,leagues,regions}.json` + `assets/images/
  jerseys/brasileirao/santos/**`: re-adapted from the corrected pipeline run.
  Santos: 36 → **20** (exact match to the source menu). Catalog total: 3182
  → 3166. Every non-Santos product's data is unchanged.
### Verification
- `node tests/filters.test.js && node tests/search.test.js && node tests/i18n.test.js`
  — no regressions. `node scripts/gen/minify.js` re-run (required after every
  `assets/js`/`css` touch — not needed this time since no JS changed, but
  images/data always need the local server's files refreshed).
- Confirmed via the running local server: `data/products.json` serves 20
  Santos products; visually confirmed the white Santos I 24/25 card now
  shows its own (white) photo instead of another jersey's.
### Still open
- The image-collision fix has only been applied to Santos so far; the rest
  of the catalog (~3146 products) still has the old, potentially-colliding
  image paths until `catalog-pipeline` runs a full-catalog image
  reprocessing pass (flagged there, not run automatically — it's an
  unscoped full-catalog operation).
- The rest of Brasileirão, then other leagues, still need the same
  single-branch menu-driven treatment.

## CS-24 - Santos data correction (menu-driven import pilot, MI-08)

No site code changed — this is a data-only refresh from `catalog-pipeline`'s
MI-07/MI-08 work. Browser QA found the Santos club page showed 37 jerseys
(including a "Chaveiro Santos" keychain) while the source's own Santos menu
shows 20 in its single largest branch (the source has no unified "Santos"
page — it's split across 5 version/gender category branches). The pipeline
now crawls those branches directly (instead of trusting each product's own,
sometimes-wrong, breadcrumb) and discards anything that doesn't genuinely
belong, rather than guessing.

### Changed
- `data/{products,clubs,collections,leagues,regions}.json`: re-adapted from
  a scoped, merged pipeline re-run. Santos: 37 → 36 (the keychain removed;
  every real jersey confirmed against the union of Santos's 5 real category
  branches). Every other club's data is byte-identical — the scoped run
  (`--urls-file` + `--merge`, see MI-08) only touched Santos.
### Verification
- `node tests/filters.test.js && node tests/search.test.js && node tests/i18n.test.js`
  — no regressions.
- Confirmed via the running local server: `data/products.json` serves 36
  Santos products, no keychain; every other club's count unchanged
  (Flamengo still 184, etc.).
### Still open
- The rest of Brasileirão, then other leagues, need the same club-by-club
  menu-driven treatment — see `catalog-pipeline`'s MI-08 CHANGELOG "Explicit
  exclusions" for the exact next steps.

## CS-23 - Region as a real level (Brasileirão trial) + newest-first sorting

The user compared the source site's real "Brasileirão" menu (screenshot: 7
regions — Rio de Janeiro, São Paulo, Minas Gerais, Sul, Nordeste, Norte,
Centro Oeste — ~32 clubs) against the catalog, which only showed 5
Brasileirão clubs, and asked — explicitly step by step, trialing Brasileirão
only before any other league — for the region grouping to be a real,
clickable level (League card → Region cards → Club cards → jerseys), sourced
by reading the site's own menu structure rather than inventing one, plus
jerseys sorted newest-season-first. See `catalog-pipeline`'s MI-06 CHANGELOG
entry for the pipeline-side work (new `Region` canonical entity, expanded
`config/normalization/clubs.json`) that this consumes.

### Added
- `pages/region.html` (new) + `Catalog.initRegionPage()` — mirrors
  `pages/league.html`/`initLeaguePage()`: fetches a region by slug, lists its
  clubs via the **existing, unchanged** `clubCard()`/`renderClubs()`.
- `assets/js/catalog.js`'s `leagueDetailTemplate()`/`initLeaguePage()`: when
  a league has regions (Brasileirão today), renders a "Regions" section
  (`regionCard()`, reusing `.club-card` CSS — zero new styles) instead of
  listing clubs directly; every league without regions is unaffected
  (verified: Premier League's page renders identically to before).
- `API.getRegions()` (`assets/js/api.js`); `assets/js/image-loader.js`'s
  `CATEGORIES` gains `"regions"`.
- Region breadcrumb crumb added to `clubCrumbs`/`jerseyCrumbs` (SEO JSON-LD)
  and to the club/jersey pages' own visible breadcrumb nav — same optional
  `if (region) ...` shape already used for the optional League crumb.
- `seasonSortKey(season)` (`catalog.js`): parses free-text `season` ("24/25",
  "2010/2011", "1998") into a comparable year for a most-recent-first sort.
  Applied to the club page's jersey grid and the Catalog page's default
  (unfiltered) order.
- New i18n keys: `nav`/`leagueDetail.regions*`, `regionDetail.eyebrow`,
  `regionCard.viewClubs`, `common.labelRegion`; `Sul`/`Nordeste`/`Norte`/
  `Centro-Oeste` added to `PROPER_NOUNS` for EN display (place names like
  "Rio de Janeiro" need no entry — `properNoun()` already passes unknown
  values through unchanged).
- `scripts/gen/gen_sitemap.js` includes region URLs.
### Real-data result (informational)
- The full re-import (`catalog-pipeline` MI-06) resolved **26 of 32
  configured Brasileirão clubs across 6 of 7 regions** — Goiás/Guarani/CSA/
  Criciúma/Figueirense are configured correctly but currently sell nothing on
  the source, so they don't appear (by the existing orphan-removal design,
  same as any other empty entity) — they'll show up automatically the moment
  the source lists a product for them.
### Verification
- `node tests/filters.test.js && node tests/search.test.js && node tests/i18n.test.js`
  — 14/16/20 passing, no regressions (the i18n test reads the real, now
  larger `products.json` and still finds no leftover PT vocabulary).
- Node `vm`-sandbox render against the real regenerated data: the
  Brasileirão league page renders exactly 6 region cards; the Rio de Janeiro
  region page renders its real 4 clubs (Botafogo, Flamengo, Fluminense,
  Vasco da Gama) with correct names; Premier League's page is byte-for-byte
  unaffected (flat 6-club grid, no regions section); Flamengo's club page
  carries the new region breadcrumb link and its 184 jerseys render
  newest-season-first; `seasonSortKey()` checked directly against Flamengo's
  real season strings.
- No browser click-through performed (no browser tool available this
  session) — flagged as the one remaining manual check, same as every prior
  navigation change this project.

## CS-22 - Full-catalog data + dedicated Catalog/filters page

The `catalog-pipeline` ran its first full-scale import (all 3268 products on
the source sitemap, see its own CHANGELOG MI-05) while this session's other
work was in progress. This entry covers what changed on the site side to
receive that data and make it browsable, plus a real-data bug the swap
exposed in the CS-19 i18n dictionary.

### Added
- `pages/catalog.html` + `Catalog.initCatalogPage()`: a dedicated "browse
  everything" page wiring the already-tested `Filters.attach()` (CS-10) —
  full facet sidebar (collection/league/club/manufacturer/season/version/
  category/gender/availability) plus the CS-21 search box, both against the
  same enriched-product engine. Linked from the primary nav (desktop +
  mobile) on every page, right after "Collection". New `nav.catalog` /
  `catalogPage.eyebrow/title/subtitle` i18n keys.
- `assets/css/filters.css`'s existing (previously unused) `.filters-layout`
  two-column grid is now actually in use.
### Changed
- `data/{collections,leagues,clubs,products}.json` + `assets/images/jerseys/`
  replaced with the full pipeline output: **3 collections, 6 leagues, 20
  clubs, 3183 products** (was the smaller 2/4/7/21 real-photo sample from
  the previous session). The prior smaller set is backed up outside the repo
  (session scratchpad), not durable.
- `assets/js/i18n.js`'s `translateName()`: added a generic `"Seleção" ->
  "National Team"` fallback (the dictionary only had the exact phrase
  "Seleção Brasileira" before). The full catalog's national-team jerseys
  ("Seleção de Portugal", "Seleção da Holanda", …) surfaced this as a real
  `tests/i18n.test.js` failure — the existing "no leftover PT vocabulary"
  test caught it correctly once real data replaced the small demo sample.
### Known gaps (not fixed this session)
- **51% of the real catalog (1622/3183 products) has no resolved `clubId`**
  (see `catalog-pipeline`'s MI-05 entry) — those products render fine in
  this new Catalog page (filters/search don't require a club) but have no
  club-card home anywhere in the Collection→League→Club nav.
- The Catalog page renders all matching jerseys in one unpaginated grid —
  fine at today's ~3200 products, but `jerseysGrid` produces a very large
  DOM (~3.8MB of HTML unfiltered in the vm-sandbox check below). Pagination
  or lazy rendering is worth a follow-up if the catalog keeps growing.
- Colors outside the small `NAME_DICTIONARY` set (e.g. "Laranja", "Roxa",
  "Rosa") still pass through untranslated in EN — not caught by the current
  test's fixed word list, a real but lower-priority quality gap.
### Verification
- `node tests/filters.test.js && node tests/search.test.js && node tests/i18n.test.js`
  — 14/16/20 passing (the i18n fix above was required to get back to green).
- Node `vm`-sandbox execution of `Catalog.initCatalogPage()` against the
  real `data/*.json`: 9 facet groups render, all 3183 jerseys render
  unfiltered, result count reads "3183 of 3183" — no crash at full scale.
- Confirmed via the running local server that `pages/catalog.html` is
  reachable and loads `filters.min.css`/`catalog.min.js`.
- No browser click-through performed (no browser tool available).

## CS-21 - Generic placeholder art + working site search

Two follow-ups after validating the real-photo catalog: collections/leagues/
clubs without a photo fell back to a washed-out generic brand mark, and the
search overlay was a static "coming soon" placeholder even though the
`Filters`/`Search` engines (CS-12) had been tested and ready since before this
catalog existed. Both had to scale to an unknown, growing number of future
continents/leagues/clubs — no per-entity assets or hardcoded lookups.

### Added
- `assets/js/image-loader.js`: `genericMark(name, opts)` — a deterministic,
  name-based placeholder (hash → HSL hue in a gold/amber on-brand range +
  initials monogram, inline SVG). Same output for the same name every time;
  no new image assets, no per-entity configuration, so it scales to any
  number of future collections/leagues/clubs automatically.
- `assets/js/catalog.js`: `brandedMark()` now takes the entity's `name` and
  delegates to `ImageLoader.genericMark` (falls back to the plain brand mark
  if `ImageLoader` is unavailable). Wired at all 7 call sites (collection,
  club, league, detail, club crest, jersey, gallery placeholder).
- `.is-generic` CSS modifier on `.collection-card__mark` / `.club-card__mark`
  / `.detail__mark` / `.club-hero__mark` / `.jersey-card__mark` /
  `.gallery__mark`: restores full opacity for the generated monogram without
  touching the (intentionally faint) watermark opacity used for the plain
  brand-mark fallback.
- `Catalog.initSiteSearch()` / `renderSearchResults()` / `searchResultRow()`:
  wires the existing, already-tested `Filters.enrich()` + `Search.create()` +
  `Search.mount()` engine (CS-12) to the nav search overlay's `#searchInput`
  live, on every page. Results render as a scrollable list (jersey thumbnail
  + name + club/league/season), capped at 8 rows, with dedicated empty-query
  and no-results states.
- `assets/css/style.css`: `.search__results/__count/__list/__item/__result*`
  rules for the results dropdown.
- New i18n keys: `search.hint` (replaces `search.comingSoon`),
  `search.noResults`, `search.resultSingular`/`resultPlural`.
- `filters.min.js` / `search.min.js` / `catalog.min.js` (+ `api.min.js` /
  `image-loader.min.js` where missing) now load on **every** page, including
  the 7 institutional pages generated by `scripts/gen/gen_pages.js` — search
  works consistently everywhere the overlay is presented, not just on the 5
  main catalog pages.
### Changed
- `index.html` + `pages/{collection,club,jersey,league}.html` +
  `scripts/gen/gen_pages.js`'s shared nav template: the static search hint
  paragraph is now wrapped in `<div id="searchResults" aria-live="polite">`
  so results can be rendered into it.
- `assets/js/main.js`: calls `Catalog.initSiteSearch()` whenever `#searchInput`
  exists (every page).
### Verification
- `node tests/filters.test.js && node tests/search.test.js && node tests/i18n.test.js`
  — no regressions (14/16/20 passing).
- Node `vm`-sandbox execution (not just a syntax check) of `Filters.enrich()`
  + `Search.create()` against the real `data/*.json`: "barcelona" correctly
  returns the 3 real Barcelona jerseys (including the known duplicate-listing
  pair), an empty query returns all 21 products, a nonsense query returns 0.
- Separate `vm`-sandbox run of `catalog.js` itself (real `fetch` backed by the
  actual JSON files) driving `Catalog.initSiteSearch()` end-to-end: typing
  "barcelona" renders the expected 3-row result list with correct links/markup,
  a nonsense query renders the localized no-results message.
- Confirmed via the running local server that the regenerated institutional
  pages now request `catalog.min.js`/`search.min.js`/etc., and that the
  updated bundles are served without a restart.
- No browser click-through was performed (no browser tool available this
  session) — flagged as the one remaining manual check.

## CS-20 - Collection → League → Club navigation

The site nav jumped straight from Collection to Club, skipping League, even
though the canonical pipeline model already treats League as its own level.
The bug lived entirely in `collection_site_adapter.py` (fixed in
`catalog-pipeline`, see its CHANGELOG) plus this site's own hand-curated
sample data, which was a level flatter than even the adapter intended
(`data/collections.json` held what were actually leagues). Collections and
clubs also showed a year range that didn't make sense for either.

### Added
- `pages/league.html` + `Catalog.initLeaguePage()`: a league detail page
  (banner + its clubs), the same pattern as the collection/club pages one
  level down. Reuses `.club-card` CSS for league cards (no new styles) and
  the existing `collectionDetail.clubsEyebrow/clubsTitle/clubsSubtitle/
  clubsEmpty` i18n keys (already language-generic: "The clubs that shaped
  {name}." reads the same for a league or a collection).
- `data/leagues.json`: now populated (6 leagues, was `[]`), each with a
  `collection` field. `API.getLeagues()` (already existed, unused) is now
  live.
- New i18n keys: `collectionDetail.leaguesEyebrow/leaguesTitle/
  leaguesSubtitle/leaguesEmpty`, `leagueCard.viewClubs`, `leagueDetail.eyebrow`,
  `common.labelLeague`.
### Changed
- `data/collections.json`: now the real top level (2 entries: Europa/Brasil,
  matching `catalog-pipeline`'s actual collection ids) instead of 6
  league-named entries. No `period` field.
- `data/clubs.json`: `collection` (was actually a league slug) renamed to
  `league`; a new `collection` field added (the real top-level slug); `founded`
  removed.
- Collection page (`detailTemplate()`) now lists **Leagues**, not clubs
  directly; the club list moved one level down to the league page.
- Club and jersey page breadcrumbs gain a League crumb
  (Collections → Collection → League → Club [→ Jersey]); the club page's
  eyebrow now shows the *correctly*-joined league name (same UI, correct data
  — it was accidentally right before only because the old sample data
  conflated league and collection).
- `assets/js/image-loader.js`: added `"leagues"` to the category whitelist.
- `scripts/gen/gen_sitemap.js`: includes league URLs.
### Removed
- The "period" year-range shown on collection cards/detail
  (`collection-card__era`, `.detail__meta`'s period span) and the "Founded
  {year}" line on the club page — didn't make sense for a region or a club
  respectively, and `founded` was never a canonical field to begin with.
### Verification
- `node tests/filters.test.js && node tests/search.test.js && node tests/i18n.test.js`
  — unaffected (use synthetic fixtures, not `data/*.json`).
- Real execution (Node `vm` sandbox, not just a syntax check) of the full
  Collection → League → Club → Jersey chain against the actual new
  `data/*.json`, in both languages: breadcrumbs, counts, eyebrows and
  not-found states all verified correct. No browser tool was available this
  session for an interactive click-through — flagged as the one remaining
  manual check.

## CS-19 - i18n PT/EN

A client-side language switch (PT/EN) — dictionary + `localStorage`, no
routing, no build step. Default is EN. The frozen `index.html` hero/landing is
never translated (hardcoded English, unchanged) — its nav+toggle are hidden
until the user scrolls past it, so there's no visible way to know/change the
language while looking at it; EN is the site-wide default specifically so it
never looks mismatched against the rest of the page.

### Added
- `assets/js/i18n.js`: the dictionary (`STRINGS`, `FIELD_LABELS`,
  `SIZE_LABELS`, `PROPER_NOUNS`, `NAME_DICTIONARY`) + `t()`/`getLang()`/
  `setLang()`/`fieldLabel()`/`sizeLabel()`/`properNoun()`/`translateName()`/
  `applyStatic()`. Exported to `window.I18N` and `module.exports`
  (Node-testable, and `require()`-able from `scripts/gen/gen_pages.js` at
  build time).
- `sizeLabel()`: Brazilian size letters (`P`/`M`/`G`/`GG`/`XG`/`2GG`/`3GG`/
  `4GG`) → the equivalent EN scheme (`S`/`M`/`L`/`XL`/`XL`/`2XL`/`3XL`/`4XL`)
  for the jersey-page size chips. Case-insensitive, falls through unchanged
  for anything unrecognized.
- A `PT`/`EN` toggle button in the navbar (desktop + mobile), wired via
  `.js-lang-toggle`. Additive `.nav__lang`/`.mobile-menu__lang` CSS.
- `translateName()`: rule-based PT→EN phrase/word substitution for the
  free-text jersey `name` field, covering every word in today's
  `data/products.json` (verified by `tests/i18n.test.js` against all real
  product names, not just samples).
- `tests/i18n.test.js`: STRINGS pt/en key-shape parity, `translateName()`
  against real data, `fieldLabel`/`properNoun` fallback behavior.
- `docs/i18n.md`: architecture, the `translateName()` trade-off, explicit
  scope exclusions, how to add a new string.
### Changed
- `catalog.js`: every hardcoded UI string now reads from `I18N.t()`; jersey
  names/`type`/`category`/`gender`/`version`/collection names route through
  `translateName()`/`fieldLabel()`/`properNoun()`.
- `scripts/gen/gen_pages.js`: institutional pages (About/How It Works/FAQ/
  Contact/Privacy/Terms/Intermediation Policy) now carry `data-i18n*` hooks;
  the generator `require()`s `i18n.js` to build the static fallback (in
  whatever `I18N`'s default language is) instead of holding its own copy of
  the copy.
- Unified "How It Works" steps and FAQ, previously **3-4 divergent copies**
  across `pages/how-it-works.html`, `pages/faq.html`, and `catalog.js`'s
  embedded jersey-page journey section (different item counts, different
  wording) — now one source (`STRINGS.journey.steps`/`.faq`), rendered by
  `I18N.renderStepsHtml()`/`renderFaqHtml()` everywhere.
- Fixed `pages/how-it-works.html` declaring `<html lang="en">` despite fully
  PT body copy — `<html lang>` is now set dynamically from the active language.
### Excluded (by design — see docs/i18n.md)
- `filters.js`/`search.js` facet labels (not mounted on any shipped page yet).
- SEO `<head>` meta/OG/Twitter/JSON-LD (no server-side language negotiation
  on static GitHub Pages; only visible body content switches client-side).
- `catalog-pipeline`/canonical data model — untouched, pure display layer.

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
