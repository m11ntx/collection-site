/**
 * search.js
 * Fast, accent-insensitive smart search for M11NTX jerseys.
 *
 * Uses only the JSON already loaded (no network, no index build). It is the
 * source of the search matching logic and integrates with filters.js so that
 * filters + search work together on the same engine:
 *
 *   const engine = Filters.createEngine({ items, search: Search.matcher() });
 *   Filters.mount(engine, controls);
 *   Search.mount(engine, inputEl);      // typing updates results in real time
 *
 * It also runs standalone (Search.create) as a reusable component, and in Node
 * for tests. Exported to `window.Search` and `module.exports`.
 *
 * Search is: case-insensitive · accent-insensitive · whitespace-tolerant.
 * Every whitespace-separated token must be found (AND across tokens).
 */
(function (root, factory) {
    "use strict";
    const api = factory();
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    if (root) root.Search = api;
})(typeof window !== "undefined" ? window : null, function () {
    "use strict";

    /* ============================================================
       Fields searched (on an enriched product — see Filters.enrich)
       Requested: name, club, league, collection, manufacturer,
                  season, version, category, gender.
       A field may be a key string or an accessor function.
    ============================================================ */
    const SEARCH_FIELDS = [
        "name",            // jersey name
        "clubName",        // club
        "leagueName",      // league
        "collectionName",  // collection
        "brand",           // manufacturer
        "season",
        "version",
        "category",
        "gender"
    ];

    /* ============================================================
       Normalization
       lowercase · strip diacritics (accents) · collapse whitespace · trim
    ============================================================ */
    // U+0300–U+036F is the "Combining Diacritical Marks" Unicode block —
    // what NFD leaves behind after splitting an accented character.
    const DIACRITICS = /[̀-ͯ]/g;

    function normalize(str) {
        return String(str == null ? "" : str)
            .normalize("NFD")                 // split base char + accent
            .replace(DIACRITICS, "")          // drop the accents
            .toLowerCase()
            .replace(/\s+/g, " ")             // collapse extra spaces
            .trim();
    }

    /** Build a normalized haystack string from an item's searchable fields. */
    function buildHaystack(item, fields) {
        const list = fields || SEARCH_FIELDS;
        const parts = list.map((f) => (typeof f === "function" ? f(item) : item[f]));
        return normalize(parts.join(" "));
    }

    /** True when every token of `query` appears in the item's haystack. */
    function match(item, query, fields) {
        const q = normalize(query);
        if (!q) return true;                  // empty search matches everything
        const hay = buildHaystack(item, fields);
        return q.split(" ").every((tok) => hay.indexOf(tok) !== -1);
    }

    /** A matcher `(item, query) => boolean` to pass to Filters.createEngine. */
    function matcher(fields) {
        return function (item, query) { return match(item, query, fields); };
    }

    /* ============================================================
       Standalone search state (reusable component, no filters)
       Same shape as the filter engine's search surface: setQuery /
       getQuery / reset / subscribe / results — so Search.mount works
       with either a filter engine or a standalone search.
    ============================================================ */
    function create(config) {
        config = config || {};
        const items = Array.isArray(config.items) ? config.items : [];
        const test = matcher(config.fields);
        let query = String(config.query == null ? "" : config.query);
        const listeners = [];

        function results() {
            const list = items.filter((i) => test(i, query));
            return { items: list, count: list.length, total: items.length, query: query };
        }
        function emit() {
            const r = results();
            listeners.forEach((fn) => fn(r));
            return r;
        }
        function setQuery(v) { query = String(v == null ? "" : v); return emit(); }
        function getQuery() { return query; }
        function reset() { query = ""; return emit(); }
        function getState() { return { query: query }; }
        function setState(s) { query = String((s && s.query) || ""); return emit(); }
        function subscribe(fn) {
            if (typeof fn === "function") listeners.push(fn);
            return function () {
                const i = listeners.indexOf(fn);
                if (i !== -1) listeners.splice(i, 1);
            };
        }
        return {
            results: results, setQuery: setQuery, getQuery: getQuery, reset: reset,
            getState: getState, setState: setState, subscribe: subscribe,
            match: test, items: items
        };
    }

    /* ============================================================
       UI binding (browser) — reusable, no new CSS.
       Binds an <input> to engine.setQuery in real time. Works with a
       filter engine or a standalone Search.create(). If `target` is not
       an <input>, it uses/creates one inside it (reusing existing styles).
    ============================================================ */
    function currentQuery(engine) {
        if (typeof engine.getQuery === "function") return engine.getQuery();
        if (typeof engine.getState === "function") return engine.getState().query || "";
        return "";
    }

    function mount(engine, target, opts) {
        opts = opts || {};
        if (typeof document === "undefined" || !engine || !target) return null;

        let input = target;
        if (!input.tagName || input.tagName.toLowerCase() !== "input") {
            input = target.querySelector("input");
            if (!input) {
                input = document.createElement("input");
                input.type = "search";
                input.className = opts.className || "search__input";
                input.setAttribute("placeholder", opts.placeholder || "Search jerseys…");
                input.setAttribute("aria-label", opts.ariaLabel || "Search jerseys");
                input.autocomplete = "off";
                target.appendChild(input);
            }
        }

        const debounce = Number(opts.debounce) || 0; // 0 = real time
        let timer = null, aTimer = null;

        // Analytics: fire one "search" event after the user pauses typing (not
        // per keystroke), and only for non-empty queries. Guarded — optional.
        function trackSearch(res) {
            if (typeof Analytics === "undefined") return;
            if (aTimer) clearTimeout(aTimer);
            aTimer = setTimeout(function () {
                const q = ((res && res.query) || input.value || "").trim();
                if (q) Analytics.track.search(q, res ? res.count : undefined);
            }, 600);
        }
        function run() { trackSearch(engine.setQuery(input.value)); }

        input.addEventListener("input", function () {
            if (!debounce) return run();
            if (timer) clearTimeout(timer);
            timer = setTimeout(run, debounce);
        });

        // Reflect external changes (e.g. reset) without fighting the caret.
        engine.subscribe(function (res) {
            if (document.activeElement !== input && input.value !== res.query) {
                input.value = res.query;
            }
            if (typeof opts.onChange === "function") opts.onChange(res);
        });

        input.value = currentQuery(engine); // initial sync
        return { input: input, focus: function () { input.focus(); } };
    }

    /* ============================================================
       Public surface
    ============================================================ */
    return {
        SEARCH_FIELDS: SEARCH_FIELDS,
        normalize: normalize,
        buildHaystack: buildHaystack,
        match: match,
        matcher: matcher,
        create: create,
        mount: mount
    };
});
