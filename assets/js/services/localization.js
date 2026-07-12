/**
 * assets/js/services/localization.js
 * MI-03 -- page bootstrap tying LocationService/LanguageService/
 * CurrencyService together: resolves the visitor's language + currency once
 * (stored preference -> IP -> navigator -> default, see locationService.js),
 * applies them with no page reload, and wires the header's language/currency
 * selectors ([data-lang-select]/[data-currency-select]) to the same
 * reload-free API -- any number of instances (desktop nav, mobile menu) stay
 * in sync via the "language:change"/"currency:change" events.
 *
 * Never blocks first paint: a returning visitor's stored preference applies
 * on the next microtask (no network); a first-time visitor's IP lookup runs
 * in the background and whatever already rendered re-renders itself in
 * place the instant it resolves (see catalog.js's event listeners).
 */
(function (root, factory) {
    "use strict";
    const api = factory(
        typeof window !== "undefined" ? window.LocationService : null,
        typeof window !== "undefined" ? window.LanguageService : null,
        typeof window !== "undefined" ? window.CurrencyService : null
    );
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    if (root) root.Localization = api;
})(typeof window !== "undefined" ? window : null, function (LocationService, LanguageService, CurrencyService) {
    "use strict";

    function applyResult(result) {
        if (!result) return result;
        LanguageService.setLanguage(result.language);
        CurrencyService.setCurrency(result.currency);
        return result;
    }

    function wireGroup(selector, getCurrent, apply, eventName, detailKey) {
        if (typeof document === "undefined") return;
        document.querySelectorAll(selector).forEach((el) => {
            if (el.dataset.wired) return;
            el.dataset.wired = "1";
            el.value = getCurrent();
            el.addEventListener("change", () => apply(el.value));
        });
        document.addEventListener(eventName, (e) => {
            const value = e.detail && e.detail[detailKey];
            if (!value) return;
            document.querySelectorAll(selector).forEach((el) => { el.value = value; });
        });
    }

    /** Wires every language/currency selector on the page (desktop nav +
     * mobile menu, or however many the markup has) -- idempotent, safe to
     * call more than once (e.g. after the mobile menu is injected later). */
    function wireSelectors() {
        if (!LanguageService || !CurrencyService) return;
        wireGroup("[data-lang-select]", LanguageService.getLanguage, LanguageService.setLanguage,
            "language:change", "locale");
        wireGroup("[data-currency-select]", CurrencyService.getCurrency, CurrencyService.setCurrency,
            "currency:change", "currency");
    }

    function init() {
        wireSelectors();
        if (!LocationService) return Promise.resolve(null);
        return LocationService.resolve().then(applyResult);
    }

    return { init: init, wireSelectors: wireSelectors, applyResult: applyResult };
});
