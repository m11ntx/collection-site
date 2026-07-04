/**
 * search.test.js
 * Zero-dependency tests for the smart search (CS-12).
 *
 * Run in Node:      node tests/search.test.js
 * Run in a browser: open tests/index.html
 *
 * Covers: empty search, search by club, search by season, search combined with
 * filters, no results — plus accent/case/whitespace insensitivity.
 */
(function (root, factory) {
    if (typeof module !== "undefined" && module.exports) {
        module.exports = factory(
            require("../assets/js/search.js"),
            require("../assets/js/filters.js"),
            require("./fixtures.js")
        );
    } else {
        root.SEARCH_TEST_REPORT = factory(root.Search, root.Filters, root.FILTERS_FIXTURES);
    }
})(typeof window !== "undefined" ? window : null, function (Search, Filters, FIX) {
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

    const items = Filters.enrich(FIX.products, FIX);
    function freshSearch() { return Search.create({ items: items }); }
    function freshEngine() {
        // engine wired with the accent-insensitive matcher (the real integration)
        return Filters.createEngine({ items: items, search: Search.matcher() });
    }

    /* ---- normalization: case · accents · extra spaces ---- */

    test("normalize lowercases, strips accents and collapses spaces", function () {
        eq(Search.normalize("  São   PAULO "), "sao paulo");
        eq(Search.normalize("Brasileirão"), "brasileirao");
        eq(Search.normalize("Atlético\tMadrid"), "atletico madrid");
    });

    test("accent-insensitive match (query without accents finds accented data)", function () {
        const item = { name: "Home", clubName: "São Paulo", collectionName: "Brasileirão" };
        ok(Search.match(item, "sao paulo"), "sao paulo");
        ok(Search.match(item, "SAO"), "SAO caps");
        ok(Search.match(item, "brasileirao"), "brasileirao");
    });

    /* ---- 1) empty search ---- */

    test("empty search returns everything (standalone)", function () {
        const s = freshSearch();
        eq(s.setQuery("").count, items.length, "empty");
        eq(s.setQuery("   ").count, items.length, "whitespace-only counts as empty");
    });

    test("empty search returns everything (engine)", function () {
        const e = freshEngine();
        eq(e.setQuery("").count, items.length);
    });

    /* ---- 2) search by club ---- */

    test("search by club: 'united' returns the Manchester United jerseys", function () {
        const res = freshSearch().setQuery("united");
        eq(res.count, 2, "count");
        ok(res.items.every((i) => i.clubName === "Manchester United"), "all united");
    });

    test("search by club: 'milan' returns the AC Milan jerseys", function () {
        eq(freshSearch().setQuery("milan").count, 2, "milan count");
    });

    /* ---- 3) search by season ---- */

    test("search by season: '1998' returns the 1998/99 jersey", function () {
        const res = freshSearch().setQuery("1998");
        eq(res.count, 1, "count");
        eq(res.items[0].season, "1998/99", "season");
    });

    /* ---- whitespace tolerance + multi-token (AND) ---- */

    test("extra spaces are ignored", function () {
        eq(freshSearch().setQuery("   united   ").count, 2, "trim/collapse");
    });

    test("multiple tokens must all match (AND)", function () {
        eq(freshSearch().setQuery("united home").count, 2, "both united home jerseys");
        eq(freshSearch().setQuery("milan away").count, 1, "only AC Milan away");
    });

    test("search matches manufacturer (brand)", function () {
        eq(freshSearch().setQuery("lotto").count, 2, "both AC Milan (Lotto)");
    });

    /* ---- 4) search combined with filters ---- */

    test("search + filter combine (AND) on one engine", function () {
        const e = freshEngine();
        e.setQuery("milan");                 // 2 AC Milan jerseys
        const res = e.toggle("version", "Fan"); // one of them is Fan
        eq(res.count, 1, "milan + Fan");
        eq(res.items[0].id, 107, "the away 95/96 (Fan)");
    });

    test("filter first, then search narrows further", function () {
        const e = freshEngine();
        e.toggle("collection", "premier-league"); // United, 2 jerseys
        const res = e.setQuery("1998");            // only the 1998/99
        eq(res.count, 1, "count");
        eq(res.items[0].slug, "man-united-home-1998-99", "slug");
    });

    /* ---- 5) no results ---- */

    test("no results: unknown term yields empty list (standalone)", function () {
        eq(freshSearch().setQuery("xyz-nao-existe").count, 0);
    });

    test("no results: search + contradictory filter", function () {
        const e = freshEngine();
        e.setQuery("milan");                        // AC Milan
        const res = e.toggle("manufacturer", "Umbro"); // Umbro is United only
        eq(res.count, 0, "empty");
    });

    /* ---- search state ---- */

    test("search state is readable and resettable", function () {
        const s = freshSearch();
        s.setQuery("united");
        eq(s.getQuery(), "united", "getQuery");
        eq(s.getState().query, "united", "getState");
        eq(s.reset().count, items.length, "reset clears");
        eq(s.getQuery(), "", "query cleared");
    });

    test("engine.reset() clears the query too", function () {
        const e = freshEngine();
        e.setQuery("milan");
        e.toggle("version", "Fan");
        const res = e.reset();
        eq(res.query, "", "query cleared");
        eq(res.count, res.total, "back to full list");
    });

    /* ---- report ---- */
    const passed = results.filter((r) => r.ok).length;
    const failed = results.length - passed;
    const lines = results.map((r) => (r.ok ? "  PASS " : "  FAIL ") + r.name +
        (r.ok ? "" : "\n        -> " + r.err));
    const summary = `\nSearch — ${passed}/${results.length} passed` +
        (failed ? `, ${failed} FAILED` : "") + "\n" + lines.join("\n") + "\n";

    if (typeof console !== "undefined") console.log(summary);
    if (typeof process !== "undefined" && failed) process.exitCode = 1;

    return { results: results, passed: passed, failed: failed, summary: summary };
});
