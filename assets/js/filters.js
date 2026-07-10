/**
 * filters.js
 * Reusable, JSON-driven filtering for M11NTX jerseys.
 *
 * Flow: data/*.json -> API -> Filters.enrich() -> Filters.createEngine()
 *                                              -> Filters.mount() (optional UI)
 *
 * Design goals (CS-10, Fase 1):
 *   - Nothing is hardcoded. Every filter option is derived from the JSON.
 *   - Filters combine freely (OR within a facet, AND across facets).
 *   - Pure engine (no DOM) so it is testable in Node and reusable anywhere.
 *   - A search hook is baked into the engine so Fase 2 (Search) is a drop-in.
 *
 * The engine is framework-free and has no dependencies. It is exported both to
 * `window.Filters` (browser) and `module.exports` (Node tests).
 */
(function (root, factory) {
    "use strict";
    const api = factory();
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    if (root) root.Filters = api;
})(typeof window !== "undefined" ? window : null, function () {
    "use strict";

    /* ============================================================
       Utils
    ============================================================ */

    function norm(v) {
        return String(v == null ? "" : v).trim();
    }

    /** Index an array by a key for O(1) joins. */
    function indexBy(arr, key) {
        const map = Object.create(null);
        (Array.isArray(arr) ? arr : []).forEach((item) => {
            if (item && item[key] != null) map[item[key]] = item;
        });
        return map;
    }

    /* ============================================================
       Availability (RN-006 / RN-007)
       A jersey is available when at least one size has stock.
       Availability is DERIVED from stock, never trusted as input.
    ============================================================ */

    function inStock(product) {
        const sizes = Array.isArray(product && product.sizes) ? product.sizes : [];
        return sizes.some((s) =>
            (typeof s === "string" ? 1 : Number(s && s.stock) || 0) > 0
        );
    }

    /* ============================================================
       Enrichment
       Denormalize the joins (club -> collection -> league) so every
       facet can read a flat field off a single product record.
    ============================================================ */

    function enrich(products, refs) {
        refs = refs || {};
        products = Array.isArray(products) ? products : [];

        const clubsById = indexBy(refs.clubs, "id");
        const collectionsBySlug = indexBy(refs.collections, "slug");
        const leaguesBySlug = indexBy(refs.leagues, "slug");

        return products.map((p) => {
            const club = clubsById[p.clubId] || null;
            const collectionSlug = club ? club.collection : (p.collection || "");
            const collection = collectionsBySlug[collectionSlug] || null;

            // League: joined only when the data exists. Clubs/collections may
            // carry a `league` slug; leagues.json is the label source. Absent
            // today -> the league facet simply has no options (hidden by UI).
            const leagueSlug =
                (club && club.league) || (collection && collection.league) || p.league || "";
            const league = leaguesBySlug[leagueSlug] || null;

            return Object.assign({}, p, {
                available: inStock(p),
                clubSlug: club ? club.slug : "",
                clubName: club ? club.name : "",
                clubCountry: club ? club.country : "",
                collectionSlug: collectionSlug || "",
                collectionName: collection ? collection.name : "",
                leagueSlug: leagueSlug || "",
                leagueName: league ? league.name : ""
            });
        });
    }

    /* ============================================================
       Facet definitions
       Each facet declares how to read its value(s) from an enriched
       product. `get` may return a string, a {value,label} pair, or an
       array of either. Empty/null values are ignored (no option, no match).
    ============================================================ */

    function pair(value, label) {
        value = norm(value);
        if (!value) return null;
        return { value: value, label: norm(label) || value };
    }

    // Availability is ordered; everything else sorts alphabetically by label,
    // except season which reads best newest-first.
    const AVAILABILITY_ORDER = { "in-stock": 0, "out-of-stock": 1 };

    const DEFAULT_FACETS = [
        { key: "collection",   label: "Collection",   get: (i) => pair(i.collectionSlug, i.collectionName) },
        { key: "league",       label: "League",       get: (i) => pair(i.leagueSlug, i.leagueName) },
        { key: "club",         label: "Club",         get: (i) => pair(i.clubSlug, i.clubName) },
        { key: "manufacturer", label: "Manufacturer", get: (i) => pair(i.brand, i.brand) },
        { key: "season",       label: "Season",       get: (i) => pair(i.season, i.season),
          sort: (a, b) => b.label.localeCompare(a.label) },
        { key: "version",      label: "Version",      get: (i) => pair(i.version, i.version) },
        { key: "category",     label: "Category",     get: (i) => pair(i.category, i.category) },
        { key: "gender",       label: "Gender",       get: (i) => pair(i.gender, i.gender) },
        { key: "availability", label: "Availability",
          get: (i) => i.available ? pair("in-stock", "In Stock") : pair("out-of-stock", "Out of Stock"),
          sort: (a, b) => (AVAILABILITY_ORDER[a.value] - AVAILABILITY_ORDER[b.value]) }
    ];

    /** Normalize a facet's get() result into an array of {value,label}. */
    function valuesFor(def, item) {
        let raw = def.get(item);
        if (raw == null) return [];
        if (!Array.isArray(raw)) raw = [raw];
        const out = [];
        for (const r of raw) {
            const p = typeof r === "string" ? pair(r, r) : (r && pair(r.value, r.label));
            if (p) out.push(p);
        }
        return out;
    }

    /* ============================================================
       Search (Fase 2 hook)
       Baked into the engine so enabling Search is only a UI concern.
       Every whitespace-separated token must appear in the haystack.
    ============================================================ */

    function defaultSearch(item, query) {
        const q = norm(query).toLowerCase();
        if (!q) return true;
        const hay = [
            item.name, item.clubName, item.collectionName, item.leagueName,
            item.brand, item.type, item.category, item.season, item.version, item.gender
        ].map(norm).join(" ").toLowerCase();
        return q.split(/\s+/).every((tok) => hay.indexOf(tok) !== -1);
    }

    /* ============================================================
       Engine (pure, no DOM)
    ============================================================ */

    function createEngine(config) {
        config = config || {};
        const items = Array.isArray(config.items) ? config.items : [];
        const facets = config.facets || DEFAULT_FACETS;
        const search = typeof config.search === "function" ? config.search : defaultSearch;

        // state.selections: { facetKey: Set(values) }, state.query: string
        const selections = Object.create(null);
        facets.forEach((f) => { selections[f.key] = new Set(); });
        let query = "";

        const listeners = [];

        function emit() {
            const snapshot = result();
            listeners.forEach((fn) => fn(snapshot));
            return snapshot;
        }

        /** Does an item pass a single facet's selected values? */
        function passesFacet(def, item) {
            const selected = selections[def.key];
            if (!selected || selected.size === 0) return true;
            return valuesFor(def, item).some((v) => selected.has(v.value));
        }

        /** Items passing every facet EXCEPT the named one (for live counts). */
        function itemsExcept(exceptKey) {
            return items.filter((item) => {
                if (!search(item, query)) return false;
                return facets.every((f) => f.key === exceptKey || passesFacet(f, item));
            });
        }

        /** The current filtered list (all facets + query applied). */
        function apply() {
            return items.filter((item) =>
                search(item, query) && facets.every((f) => passesFacet(f, item))
            );
        }

        /** Facets with dynamic options + counts that respect the OTHER facets. */
        function buildFacets() {
            return facets.map((def) => {
                const base = itemsExcept(def.key);
                const byValue = new Map();
                base.forEach((item) => {
                    valuesFor(def, item).forEach((v) => {
                        const o = byValue.get(v.value) || { value: v.value, label: v.label, count: 0 };
                        o.count += 1;
                        byValue.set(v.value, o);
                    });
                });
                const selected = selections[def.key];
                const options = Array.from(byValue.values());
                options.sort(def.sort || ((a, b) => a.label.localeCompare(b.label)));
                options.forEach((o) => { o.active = selected.has(o.value); });
                return { key: def.key, label: def.label, options: options };
            });
        }

        function result() {
            const list = apply();
            return {
                items: list,
                count: list.length,
                total: items.length,
                query: query,
                selections: getState(),
                facets: buildFacets()
            };
        }

        /* ---- state mutations ---- */

        function toggle(key, value) {
            const set = selections[key];
            if (!set) return emit();
            value = norm(value);
            if (set.has(value)) set.delete(value); else set.add(value);
            return emit();
        }

        function set(key, values) {
            const s = selections[key];
            if (!s) return emit();
            s.clear();
            (Array.isArray(values) ? values : [values]).forEach((v) => {
                v = norm(v);
                if (v) s.add(v);
            });
            return emit();
        }

        function clear(key) {
            if (selections[key]) selections[key].clear();
            return emit();
        }

        function setQuery(q) {
            query = norm(q);
            return emit();
        }

        function reset() {
            facets.forEach((f) => selections[f.key].clear());
            query = "";
            return emit();
        }

        /** Serializable snapshot of the active selections + query. */
        function getState() {
            const out = { query: query };
            facets.forEach((f) => {
                const arr = Array.from(selections[f.key]);
                if (arr.length) out[f.key] = arr;
            });
            return out;
        }

        function setState(state) {
            state = state || {};
            facets.forEach((f) => {
                selections[f.key].clear();
                (state[f.key] || []).forEach((v) => selections[f.key].add(norm(v)));
            });
            query = norm(state.query);
            return emit();
        }

        function subscribe(fn) {
            if (typeof fn === "function") listeners.push(fn);
            return function unsubscribe() {
                const i = listeners.indexOf(fn);
                if (i !== -1) listeners.splice(i, 1);
            };
        }

        return {
            apply, result, buildFacets,
            toggle, set, clear, reset,
            setQuery, getState, setState,
            subscribe,
            facets: facets, items: items
        };
    }

    /* ============================================================
       UI component (browser only) — reusable, self-contained.
       Renders the controls into `container`; the host renders the list
       via opts.onChange(result) / the "filters:change" event. Styling
       lives in assets/css/filters.css (additive; touches no frozen CSS).
    ============================================================ */

    function esc(str) {
        return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[c]));
    }

    // I18N is optional (Node tests / any host without it never load i18n.js) --
    // every lookup below degrades to a plain English default so filters.js
    // stays "reusable anywhere" per its own header, per-facet-key translation
    // uses the same controlled-value dictionaries catalog.js already relies
    // on (properNoun for collection/league/club names, fieldLabel for the
    // enum-like facets), so a jersey's Club filter option reads "Germany"
    // in en the same way its club-page title does.
    const I18N_LABEL_DEFAULTS = {
        collection: "Collection", league: "League", club: "Club",
        manufacturer: "Manufacturer", season: "Season", version: "Version",
        category: "Category", gender: "Gender", availability: "Availability"
    };

    function t(path, vars) {
        if (typeof window !== "undefined" && window.I18N) return window.I18N.t(path, vars);
        if (!vars) return path;
        return path.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
    }

    function facetLabel(f) {
        if (typeof window !== "undefined" && window.I18N) {
            const v = window.I18N.t("filters.label." + f.key);
            if (v !== "filters.label." + f.key) return v;
        }
        return I18N_LABEL_DEFAULTS[f.key] || f.label;
    }

    function optionLabel(f, o) {
        if (typeof window === "undefined" || !window.I18N) return o.label;
        switch (f.key) {
            case "collection": case "league": case "club":
                return window.I18N.properNoun(o.label);
            case "version": case "category": case "gender": case "availability":
                return window.I18N.fieldLabel(f.key, o.label);
            default:
                return o.label;
        }
    }

    function mount(engine, container, opts) {
        opts = opts || {};
        if (typeof document === "undefined" || !container) return null;
        const hideSingle = opts.hideSingle === true; // hide facets with <2 options

        // Manually-toggled open/closed state per facet, keyed by facet key --
        // survives the full innerHTML rebuild every render triggers (CS-56).
        // A facet not yet touched by the user defaults open only while it has
        // an active selection, so checking one box elsewhere doesn't quietly
        // collapse an already-filtered group.
        const manualOpen = new Map();

        function isOpen(f) {
            if (manualOpen.has(f.key)) return manualOpen.get(f.key);
            return f.options.some((o) => o.active);
        }

        function groupHtml(f) {
            if (!f.options.length) return "";
            if (hideSingle && f.options.length < 2) return "";
            const rows = f.options.map((o) => `
                <label class="filters__option">
                    <input type="checkbox" class="filters__checkbox"
                           data-facet="${esc(f.key)}" value="${esc(o.value)}"
                           ${o.active ? "checked" : ""}>
                    <span class="filters__option-label">${esc(optionLabel(f, o))}</span>
                    <span class="filters__count">${o.count}</span>
                </label>`).join("");
            const activeCount = f.options.filter((o) => o.active).length;
            return `
                <details class="filters__group" data-facet="${esc(f.key)}" ${isOpen(f) ? "open" : ""}>
                    <summary class="filters__legend">
                        ${esc(facetLabel(f))}
                        ${activeCount ? `<span class="filters__legend-badge">${activeCount}</span>` : ""}
                    </summary>
                    <div class="filters__options">${rows}</div>
                </details>`;
        }

        function render(res) {
            const groups = res.facets.map(groupHtml).join("");
            const hasSelection = Object.keys(res.selections).some((k) => k !== "query");
            container.innerHTML = `
                <div class="filters" role="region" aria-label="Jersey filters">
                    <div class="filters__head">
                        <p class="filters__result" aria-live="polite">
                            <!-- bolds the leading number; both pt/en resultCount strings
                                 start with {count} by design -->
                            ${t("filters.resultCount", { count: res.count, total: res.total })
                                .replace(/^(\S+)/, "<strong>$1</strong>")}
                        </p>
                        <button type="button" class="filters__reset btn btn--ghost"
                                ${hasSelection || res.query ? "" : "disabled"}>${esc(t("filters.reset"))}</button>
                    </div>
                    ${groups || `<p class="filters__empty">${esc(t("filters.empty"))}</p>`}
                </div>`;
        }

        // Delegated events — survive re-renders (innerHTML is replaced each change).
        container.addEventListener("change", (e) => {
            const cb = e.target.closest(".filters__checkbox");
            if (!cb) return;
            engine.toggle(cb.getAttribute("data-facet"), cb.value);
            if (typeof Analytics !== "undefined") {
                Analytics.track.filter(cb.getAttribute("data-facet"), cb.value, cb.checked);
            }
        });
        container.addEventListener("click", (e) => {
            if (e.target.closest(".filters__reset")) engine.reset();
        });
        // <details>'s "toggle" event doesn't bubble -- listen on the capture
        // phase so one delegated listener still catches every group.
        container.addEventListener("toggle", (e) => {
            const el = e.target.closest && e.target.closest(".filters__group");
            if (!el) return;
            manualOpen.set(el.getAttribute("data-facet"), el.open);
        }, true);

        function onResult(res) {
            render(res);
            if (typeof opts.onChange === "function") opts.onChange(res);
            document.dispatchEvent(new CustomEvent("filters:change", { detail: res }));
        }

        engine.subscribe(onResult);
        render(engine.result());          // initial paint
        onResult(engine.result());        // initial notify (list + event)
        return { render };
    }

    /* ============================================================
       attach() — one-call wiring for a page.
       Enriches products, builds the engine, mounts controls, and (if
       Catalog is present) renders the filtered jerseys into `list`.
    ============================================================ */

    async function attach(config) {
        config = config || {};
        const controls = typeof config.controls === "string"
            ? document.getElementById(config.controls) : config.controls;
        const list = typeof config.list === "string"
            ? document.getElementById(config.list) : config.list;

        const src = config.data || (typeof API !== "undefined" ? {
            products: await API.getProducts(),
            clubs: await API.getClubs(),
            collections: await API.getCollections(),
            leagues: await API.getLeagues()
        } : { products: [] });

        const items = enrich(src.products, src);

        // Smart search (CS-12): use the accent-insensitive matcher from search.js
        // when available, so filters + search share one engine. Falls back to the
        // built-in defaultSearch if search.js isn't loaded.
        const search = config.search ||
            (typeof Search !== "undefined" && Search.matcher ? Search.matcher() : undefined);
        const engine = createEngine({ items: items, facets: config.facets, search: search });

        function paintList(res) {
            if (list && typeof Catalog !== "undefined" && Catalog.renderJerseys) {
                Catalog.renderJerseys(list, res.items);
            }
            if (typeof config.onChange === "function") config.onChange(res);
        }

        if (controls) mount(engine, controls, { onChange: paintList, hideSingle: config.hideSingle });
        else engine.subscribe(paintList), paintList(engine.result());

        // Bind a search input in real time (id or element), if provided.
        const searchInput = typeof config.searchInput === "string"
            ? document.getElementById(config.searchInput) : config.searchInput;
        if (searchInput && typeof Search !== "undefined" && Search.mount) {
            Search.mount(engine, searchInput, { debounce: config.searchDebounce });
        }

        return engine;
    }

    /* ============================================================
       Public surface
    ============================================================ */

    return {
        enrich: enrich,
        inStock: inStock,
        createEngine: createEngine,
        defaultSearch: defaultSearch,
        DEFAULT_FACETS: DEFAULT_FACETS,
        mount: mount,
        attach: attach
    };
});
