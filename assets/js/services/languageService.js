/**
 * assets/js/services/languageService.js
 * MI-03 -- maps a detected country to a site language and applies a
 * language change with NO page reload (persists to i18n.js's own storage
 * key, re-renders static i18n markup in place, and fires "language:change"
 * so any dynamically-rendered content -- e.g. product cards -- can
 * re-render itself from already-fetched data, never re-fetching the
 * catalog).
 *
 * Rule (per the localization spec): Brazil -> Portuguese; every other
 * country (including every EU member state) -> English. This does NOT
 * replace assets/js/i18n.js (the site's existing, working UI-string engine)
 * -- it drives it: both read/write the exact same "m11ntx_lang" key.
 */
(function (root, factory) {
    "use strict";
    const api = factory();
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    if (root) root.LanguageService = api;
})(typeof window !== "undefined" ? window : null, function () {
    "use strict";

    // assets/js/i18n.js's own storage key (see getLang()/setLang()) -- kept
    // in sync here deliberately rather than importing, since this service
    // must also work loaded standalone (e.g. in tests, under Node).
    const EXISTING_LANG_KEY = "m11ntx_lang";

    /** ISO country code -> site language ("pt-BR" | "en-US"). */
    function languageForCountry(countryCode) {
        return String(countryCode || "").toUpperCase() === "BR" ? "pt-BR" : "en-US";
    }

    /** "pt-BR"/"en-US" -> the two-letter code assets/js/i18n.js understands. */
    function siteLangFor(locale) {
        return locale === "pt-BR" ? "pt" : "en";
    }

    /** Fast, synchronous, no-network guess from the browser's own locale.
     * Exposed for callers that need an instant guess with no async wait --
     * NEVER used as the primary detection signal (see locationService.js). */
    function detectFromNavigator() {
        const nav = (typeof navigator !== "undefined" && navigator.language) || "en-US";
        return nav.toLowerCase().indexOf("pt") === 0 ? "pt-BR" : "en-US";
    }

    /** Seeds i18n.js's localStorage key -- a no-op if the visitor already
     * has a stored preference (never overrides an explicit choice). */
    function seedInitialLanguage(locale) {
        if (typeof window === "undefined" || !window.localStorage) return false;
        if (window.localStorage.getItem(EXISTING_LANG_KEY)) return false;
        window.localStorage.setItem(EXISTING_LANG_KEY, siteLangFor(locale));
        return true;
    }

    /** Current language as a locale ("pt-BR" | "en-US"). */
    function getLanguage() {
        try {
            const saved = typeof window !== "undefined" && window.localStorage
                && window.localStorage.getItem(EXISTING_LANG_KEY);
            return saved === "pt" ? "pt-BR" : "en-US";
        } catch (e) {
            return "en-US";
        }
    }

    /** Manual override, absolute priority from now on (persisted), NO page
     * reload. Delegates to assets/js/i18n.js's own setLang() -- the single
     * place that persists, re-renders static i18n markup, updates
     * <html lang>/[data-lang], and fires "language:change" -- so there is
     * exactly one code path for a language change, whether it started here
     * (locale-aware callers, e.g. the header currency/language selectors)
     * or from i18n.js's own toggle. */
    function setLanguage(locale) {
        const site = siteLangFor(locale);
        if (typeof window !== "undefined" && window.I18N && typeof window.I18N.setLang === "function") {
            window.I18N.setLang(site);
            return true;
        }
        // i18n.js not loaded (e.g. this service used standalone/under tests):
        // persist directly so getLanguage() reflects the change either way.
        try {
            if (typeof window !== "undefined" && window.localStorage) {
                window.localStorage.setItem(EXISTING_LANG_KEY, site);
            }
        } catch (e) { /* no-op */ }
        return true;
    }

    return {
        EXISTING_LANG_KEY: EXISTING_LANG_KEY,
        languageForCountry: languageForCountry,
        siteLangFor: siteLangFor,
        detectFromNavigator: detectFromNavigator,
        seedInitialLanguage: seedInitialLanguage,
        getLanguage: getLanguage,
        setLanguage: setLanguage,
    };
});
