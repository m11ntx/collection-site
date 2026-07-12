/**
 * tests/localization.test.js
 * Zero-dependency tests for the MI-03 localization stack: LocationService +
 * LanguageService + CurrencyService, wired together as they run in the
 * browser (priority chain, persistence, manual override).
 *
 * Run in Node: node tests/localization.test.js
 *
 * Simulates access from Brazil, USA, Germany, Portugal, France, Japan,
 * Australia and Mexico -- validating language/currency selection and
 * persistence per the official rule table:
 *   Brazil -> pt-BR/BRL | any EU country -> en-US/EUR | USA -> en-US/USD
 *   | any other country -> en-US/USD.
 * navigator.language must NEVER be the primary signal -- see the
 * "dangerous example" tests below.
 */
(function () {
    "use strict";

    // Node-only: this suite mocks window/navigator/fetch/document via
    // Node's `global` object to exercise LocationService's real fetch/
    // storage code paths without a jsdom dependency. A real browser already
    // has its own (non-overridable) navigator/window, so running this file
    // there would throw -- skip cleanly and report zero tests instead of
    // crashing tests/index.html. `node tests/localization.test.js` is the
    // authoritative way to run this suite (see CLAUDE.md's run/verify list).
    if (typeof global === "undefined") {
        const emptyReport = { results: [], passed: 0, failed: 0,
            summary: "\nLocalization — skipped (Node-only suite; run via `node tests/localization.test.js`)\n" };
        if (typeof window !== "undefined") {
            window.LOCALIZATION_TEST_REPORT = emptyReport;
            window.LOCALIZATION_TEST_REPORT_READY = Promise.resolve(emptyReport);
        }
        return;
    }

    /* ---- minimal browser-global shims (no jsdom dependency) ---- */

    function FakeStorage() {
        this._data = Object.create(null);
    }
    FakeStorage.prototype.getItem = function (k) {
        return Object.prototype.hasOwnProperty.call(this._data, k) ? this._data[k] : null;
    };
    FakeStorage.prototype.setItem = function (k, v) { this._data[k] = String(v); };
    FakeStorage.prototype.removeItem = function (k) { delete this._data[k]; };
    FakeStorage.prototype.clear = function () { this._data = Object.create(null); };

    class FakeCustomEvent {
        constructor(type, opts) { this.type = type; this.detail = (opts && opts.detail) || {}; }
    }

    function installGlobals() {
        global.window = global.window || {};
        global.window.localStorage = new FakeStorage();
        global.CustomEvent = FakeCustomEvent;
        // Modern Node ships a read-only built-in `navigator` global -- redefine
        // it (configurable) so tests can control navigator.language freely.
        Object.defineProperty(global, "navigator", {
            value: { language: "en-US" }, configurable: true, writable: true,
        });
        let fetchCalls = 0;
        let fetchResponder = function () { return Promise.resolve(null); };
        global.fetch = function (url, opts) {
            fetchCalls++;
            return fetchResponder(url, opts);
        };
        const listeners = {};
        global.document = {
            documentElement: { setAttribute: function () {} },
            addEventListener: function (type, fn) {
                (listeners[type] = listeners[type] || []).push(fn);
            },
            dispatchEvent: function (evt) {
                (listeners[evt.type] || []).forEach(function (fn) { fn(evt); });
                return true;
            },
            querySelectorAll: function () { return []; },
        };
        return {
            storage: global.window.localStorage,
            setFetchResponder: function (fn) { fetchResponder = fn; },
            getFetchCalls: function () { return fetchCalls; },
            resetFetchCalls: function () { fetchCalls = 0; },
        };
    }

    function ipResponds(countryCode) {
        return function () {
            return Promise.resolve({
                ok: true,
                json: function () { return Promise.resolve({ country_code: countryCode }); },
            });
        };
    }
    function ipFails() {
        return function () { return Promise.resolve({ ok: false }); };
    }

    const env = installGlobals();

    // One require is enough -- these modules read window/navigator/fetch at
    // CALL time, not at require time, so per-test state lives in `env` and
    // is reset via reset() below, not by re-requiring.
    const LanguageService = require("../assets/js/services/languageService.js");
    const CurrencyService = require("../assets/js/services/currencyService.js");
    const LocationService = require("../assets/js/services/locationService.js");

    /* ---- tiny assert harness (same pattern as filters.test.js) ----
       Async tests are QUEUED (not started) here and run strictly one at a
       time later -- they share mutable global state (fetch responder, fake
       storage, navigator.language), so running them concurrently would let
       a later test's reset() clobber an earlier test's in-flight assertions. */
    const results = [];
    const asyncQueue = [];
    function test(name, fn) {
        try { fn(); results.push({ name: name, ok: true }); }
        catch (e) { results.push({ name: name, ok: false, err: e.message }); }
    }
    function asyncTest(name, fn) {
        asyncQueue.push({ name: name, fn: fn });
    }
    function runAsyncQueueSequentially() {
        return asyncQueue.reduce(function (chain, item) {
            return chain.then(function () {
                return item.fn().then(
                    function () { results.push({ name: item.name, ok: true }); },
                    function (e) { results.push({ name: item.name, ok: false, err: e.message }); }
                );
            });
        }, Promise.resolve());
    }
    function eq(actual, expected, msg) {
        if (actual !== expected) {
            throw new Error((msg || "") + ` expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
    }
    function ok(cond, msg) { if (!cond) throw new Error(msg || "expected truthy"); }

    function reset(navigatorLang) {
        env.storage.clear();
        env.resetFetchCalls();
        global.navigator.language = navigatorLang || "en-US";
    }

    /* ---- country rule table (the official spec) ---- */
    const COUNTRY_CASES = [
        { country: "BR", label: "Brazil", language: "pt-BR", currency: "BRL" },
        { country: "US", label: "USA", language: "en-US", currency: "USD" },
        { country: "DE", label: "Germany (EU)", language: "en-US", currency: "EUR" },
        { country: "PT", label: "Portugal (EU)", language: "en-US", currency: "EUR" },
        { country: "FR", label: "France (EU)", language: "en-US", currency: "EUR" },
        { country: "JP", label: "Japan", language: "en-US", currency: "USD" },
        { country: "AU", label: "Australia", language: "en-US", currency: "USD" },
        { country: "MX", label: "Mexico", language: "en-US", currency: "USD" },
    ];

    COUNTRY_CASES.forEach(function (c) {
        asyncTest(`IP=${c.country} (${c.label}) resolves to ${c.language}/${c.currency}`, function () {
            reset("en-US");
            env.setFetchResponder(ipResponds(c.country));
            return LocationService.resolve().then(function (result) {
                eq(result.language, c.language, "language");
                eq(result.currency, c.currency, "currency");
                eq(result.country, c.country, "country");
                eq(result.source, "ip", "source");
            });
        });
    });

    /* ---- navigator.language must NEVER be the primary signal ---- */

    asyncTest("Brazilian browsing in English from Brazil still gets pt-BR/BRL", function () {
        reset("en-US"); // navigator says English...
        env.setFetchResponder(ipResponds("BR")); // ...but IP says Brazil
        return LocationService.resolve().then(function (result) {
            eq(result.language, "pt-BR", "language must follow IP, not navigator");
            eq(result.currency, "BRL");
        });
    });

    asyncTest("American browsing in Portuguese still gets en-US/USD", function () {
        reset("pt-BR"); // navigator says Portuguese...
        env.setFetchResponder(ipResponds("US")); // ...but IP says USA
        return LocationService.resolve().then(function (result) {
            eq(result.language, "en-US", "language must follow IP, not navigator");
            eq(result.currency, "USD");
        });
    });

    asyncTest("German browsing in Portuguese gets en-US/EUR", function () {
        reset("pt-BR"); // navigator says Portuguese...
        env.setFetchResponder(ipResponds("DE")); // ...but IP says Germany
        return LocationService.resolve().then(function (result) {
            eq(result.language, "en-US", "EU country still gets English, not its native language");
            eq(result.currency, "EUR");
        });
    });

    /* ---- priority fallback chain ---- */

    asyncTest("IP failure falls back to navigator.language (still not primary)", function () {
        reset("pt-BR");
        env.setFetchResponder(ipFails());
        return LocationService.resolve().then(function (result) {
            eq(result.source, "navigator");
            eq(result.language, "pt-BR", "navigator's own region (BR) used only as last resort");
            eq(result.currency, "BRL");
        });
    });

    asyncTest("IP failure + no usable navigator region falls back to default", function () {
        reset("en"); // no region subtag
        env.setFetchResponder(ipFails());
        return LocationService.resolve().then(function (result) {
            eq(result.source, "default");
            eq(result.language, "en-US");
            eq(result.currency, "USD");
        });
    });

    /* ---- persistence ---- */

    asyncTest("first resolution persists language, currency AND country", function () {
        reset("en-US");
        env.setFetchResponder(ipResponds("BR"));
        return LocationService.resolve().then(function () {
            eq(env.storage.getItem("m11ntx_lang"), "pt");
            eq(env.storage.getItem("m11ntx_currency"), "BRL");
            eq(env.storage.getItem("m11ntx_country"), "BR");
        });
    });

    asyncTest("a stored preference is used without calling the IP service again", function () {
        reset("en-US");
        env.setFetchResponder(ipResponds("BR"));
        return LocationService.resolve().then(function () {
            const callsAfterFirst = env.getFetchCalls();
            ok(callsAfterFirst >= 1, "first resolution did call the IP service");
            return LocationService.resolve().then(function (result) {
                eq(env.getFetchCalls(), callsAfterFirst, "no additional IP call on second resolve()");
                eq(result.source, "stored");
                eq(result.language, "pt-BR");
                eq(result.currency, "BRL");
            });
        });
    });

    /* ---- manual override takes absolute priority forever after ---- */

    test("manual language override persists and is never auto-overridden", function () {
        reset("en-US");
        LanguageService.setLanguage("pt-BR");
        eq(env.storage.getItem("m11ntx_lang"), "pt");
        eq(LanguageService.getLanguage(), "pt-BR");
        eq(LocationService.hasStoredPreference(), false, "currency not yet set -- not a full stored pref yet");
    });

    test("manual currency override persists independently", function () {
        reset("en-US");
        CurrencyService.setCurrency("EUR");
        eq(env.storage.getItem("m11ntx_currency"), "EUR");
        eq(CurrencyService.getCurrency(), "EUR");
    });

    asyncTest("after a manual override, resolve() honors it over IP", function () {
        reset("en-US");
        LanguageService.setLanguage("pt-BR");
        CurrencyService.setCurrency("BRL");
        env.setFetchResponder(ipResponds("JP")); // IP would say Japan -> en-US/USD
        return LocationService.resolve().then(function (result) {
            eq(result.source, "stored");
            eq(result.language, "pt-BR", "manual choice wins over IP");
            eq(result.currency, "BRL");
            eq(env.getFetchCalls(), 0, "IP is never even called once a preference is stored");
        });
    });

    /* ---- currency <-> formattedPrice locale mapping (no client math) ---- */

    test("formattedPriceFor reads the pipeline's pre-formatted string, never computes", function () {
        const product = {
            price: { BRL: 159.90, USD: 29.90, EUR: 27.90 },
            formattedPrice: { "pt-BR": "R$ 159,90", "en-US": "US$ 29.90", "en-EU": "€ 27.90" },
        };
        eq(CurrencyService.formattedPriceFor(product, "BRL"), "R$ 159,90");
        eq(CurrencyService.formattedPriceFor(product, "USD"), "US$ 29.90");
        eq(CurrencyService.formattedPriceFor(product, "EUR"), "€ 27.90");
    });

    test("formattedPriceFor returns null when the pipeline hasn't priced the product yet", function () {
        const product = { price: {}, formattedPrice: { "pt-BR": "", "en-US": "", "en-EU": "" } };
        eq(CurrencyService.formattedPriceFor(product, "BRL"), null);
    });

    /* ---- report ----
       Unlike filters.test.js/search.test.js (synchronous), this suite is
       async (real Promise chains) -- the report is only ready once
       LOCALIZATION_TEST_REPORT_READY resolves. tests/index.html awaits it
       before rendering. */
    const ready = runAsyncQueueSequentially().then(function () {
        const passed = results.filter((r) => r.ok).length;
        const failed = results.length - passed;
        const lines = results.map((r) => (r.ok ? "  PASS " : "  FAIL ") + r.name +
            (r.ok ? "" : "\n        -> " + r.err));
        const summary = `\nLocalization — ${passed}/${results.length} passed` +
            (failed ? `, ${failed} FAILED` : "") + "\n" + lines.join("\n") + "\n";

        if (typeof console !== "undefined") console.log(summary);
        if (typeof process !== "undefined" && failed) process.exitCode = 1;

        const report = { results: results, passed: passed, failed: failed, summary: summary };
        if (typeof window !== "undefined") window.LOCALIZATION_TEST_REPORT = report;
        if (typeof module !== "undefined" && module.exports) module.exports = report;
        return report;
    });
    if (typeof window !== "undefined") window.LOCALIZATION_TEST_REPORT_READY = ready;
})();
