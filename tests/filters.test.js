/**
 * filters.test.js
 * Zero-dependency tests for the filter engine.
 *
 * Run in Node:      node tests/filters.test.js
 * Run in a browser: open tests/index.html
 *
 * Validates the CS-10 acceptance cases:
 *   - single filter          - multiple (combined) filters
 *   - no results             - reset
 * Plus enrichment/availability, live counts, and the Search hook.
 */
(function (root, factory) {
    if (typeof module !== "undefined" && module.exports) {
        module.exports = factory(require("../assets/js/filters.js"), require("./fixtures.js"));
    } else {
        root.FILTERS_TEST_REPORT = factory(root.Filters, root.FILTERS_FIXTURES);
    }
})(typeof window !== "undefined" ? window : null, function (Filters, FIX) {
    "use strict";

    /* ---- tiny assert harness (no deps) ---- */
    const results = [];
    function test(name, fn) {
        try { fn(); results.push({ name: name, ok: true }); }
        catch (e) { results.push({ name: name, ok: false, err: e.message }); }
    }
    function eq(actual, expected, msg) {
        if (actual !== expected) {
            throw new Error((msg || "") + ` expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
    }
    function ok(cond, msg) { if (!cond) throw new Error(msg || "expected truthy"); }

    function fresh() {
        const items = Filters.enrich(FIX.products, FIX);
        return Filters.createEngine({ items: items });
    }

    /* ---- enrichment / availability ---- */

    test("enrich joins club + collection onto each product", function () {
        const items = Filters.enrich(FIX.products, FIX);
        const milan = items.find((i) => i.id === 105);
        eq(milan.clubName, "AC Milan", "clubName");
        eq(milan.collectionSlug, "serie-a", "collectionSlug");
        eq(milan.collectionName, "Serie A", "collectionName");
    });

    test("availability is derived from stock (RN-006/007)", function () {
        const items = Filters.enrich(FIX.products, FIX);
        eq(items.find((i) => i.id === 105).available, true, "in stock");
        eq(items.find((i) => i.id === 103).available, false, "all sizes 0 -> out");
    });

    /* ---- 1) single filter ---- */

    test("single filter: brand = Umbro returns only Umbro jerseys", function () {
        const e = fresh();
        e.toggle("manufacturer", "Umbro");
        const res = e.result();
        eq(res.count, 2, "count");
        ok(res.items.every((i) => i.brand === "Umbro"), "all Umbro");
    });

    test("single filter: collection = serie-a", function () {
        const e = fresh();
        const res = e.toggle("collection", "serie-a");
        eq(res.count, 2, "count");
        ok(res.items.every((i) => i.collectionSlug === "serie-a"), "all serie-a");
    });

    test("OR within a facet: two clubs selected", function () {
        const e = fresh();
        e.toggle("club", "ac-milan");
        const res = e.toggle("club", "manchester-united");
        eq(res.count, 4, "both clubs -> all four");
    });

    /* ---- 2) multiple (combined) filters ---- */

    test("multiple filters combine with AND across facets", function () {
        const e = fresh();
        e.toggle("manufacturer", "Umbro");   // 2 united jerseys
        const res = e.toggle("availability", "in-stock"); // one is out of stock
        eq(res.count, 1, "Umbro AND in-stock");
        eq(res.items[0].slug, "man-united-home-1998-99", "the in-stock one");
    });

    test("availability = out-of-stock isolates the empty-stock jersey", function () {
        const e = fresh();
        const res = e.toggle("availability", "out-of-stock");
        eq(res.count, 1, "count");
        eq(res.items[0].id, 103, "the 0-stock jersey");
    });

    /* ---- 3) no results ---- */

    test("no results: contradictory combination yields empty list", function () {
        const e = fresh();
        e.toggle("collection", "serie-a");        // AC Milan only
        const res = e.toggle("manufacturer", "Umbro"); // Umbro is United only
        eq(res.count, 0, "count");
        eq(res.items.length, 0, "empty");
    });

    /* ---- 4) reset ---- */

    test("reset clears every selection and the query", function () {
        const e = fresh();
        e.toggle("collection", "serie-a");
        e.toggle("manufacturer", "Lotto");
        e.setQuery("milan");
        const res = e.reset();
        eq(res.count, res.total, "back to full list");
        eq(res.query, "", "query cleared");
        eq(Object.keys(res.selections).filter((k) => k !== "query").length, 0, "no selections");
    });

    /* ---- dynamic options + live counts ---- */

    test("facet options are derived from data (nothing hardcoded)", function () {
        const e = fresh();
        const brands = e.buildFacets().find((f) => f.key === "manufacturer");
        eq(brands.options.length, 2, "Lotto + Umbro");
        const labels = brands.options.map((o) => o.value).sort();
        eq(labels.join(","), "Lotto,Umbro", "brand values");
    });

    test("counts respect the other active facets", function () {
        const e = fresh();
        e.toggle("collection", "premier-league");    // United (2 jerseys)
        const avail = e.buildFacets().find((f) => f.key === "availability");
        const inStockOpt = avail.options.find((o) => o.value === "in-stock");
        const outOpt = avail.options.find((o) => o.value === "out-of-stock");
        eq(inStockOpt.count, 1, "in-stock within PL");
        eq(outOpt.count, 1, "out-of-stock within PL");
    });

    test("empty facet (league, no JSON) produces no options", function () {
        const e = fresh();
        const league = e.buildFacets().find((f) => f.key === "league");
        eq(league.options.length, 0, "no league data -> no options");
    });

    /* ---- Search hook (Fase 2 readiness) ---- */

    test("search query narrows results and combines with facets", function () {
        const e = fresh();
        let res = e.setQuery("milan");
        eq(res.count, 2, "both AC Milan jerseys");
        res = e.toggle("version", "Fan");
        eq(res.count, 1, "milan + Fan");
        eq(res.items[0].id, 107, "the away 95/96");
    });

    /* ---- subscribe ---- */

    test("subscribe fires on every change", function () {
        const e = fresh();
        let calls = 0, last = null;
        e.subscribe(function (r) { calls++; last = r; });
        e.toggle("manufacturer", "Umbro");
        eq(calls, 1, "one notification");
        eq(last.count, 2, "payload is the new result");
    });

    /* ---- report ---- */
    const passed = results.filter((r) => r.ok).length;
    const failed = results.length - passed;
    const lines = results.map((r) => (r.ok ? "  PASS " : "  FAIL ") + r.name +
        (r.ok ? "" : "\n        -> " + r.err));
    const summary = `\nFilters — ${passed}/${results.length} passed` +
        (failed ? `, ${failed} FAILED` : "") + "\n" + lines.join("\n") + "\n";

    if (typeof console !== "undefined") console.log(summary);
    if (typeof process !== "undefined" && failed) process.exitCode = 1;

    return { results: results, passed: passed, failed: failed, summary: summary };
});
