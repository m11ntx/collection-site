/**
 * assets/js/services/locationService.js
 * MI-03 -- resolves the visitor's language + currency by strict priority:
 *   1. saved user preference (LocalStorage)
 *   2. IP -> country lookup: same-origin Cloudflare `/cdn-cgi/trace` first,
 *      then the free, keyless ipapi.co as a second attempt
 *   3. navigator.language (last resort only -- NEVER the primary signal)
 *   4. default (en-US / USD)
 *
 * Two IP methods, not one: real-world testing (Firefox Private Browsing,
 * which defaults to Strict tracking protection, plus some VPN/ad-blocker
 * filter lists) found the ipapi.co request silently blocked as a known
 * "IP lookup" tracker -- falling straight through to navigator.language and
 * showing the visitor's OS/browser language instead of their real location.
 * `/cdn-cgi/trace` is same-origin (collection-site's own CDN, since the site
 * is served through Cloudflare) so it is never third-party traffic and is
 * not on any tracker blocklist; ipapi.co stays as a second attempt for the
 * (rare) case the site is ever served from a non-Cloudflare host.
 *
 * Official country rules (delegated to LanguageService/CurrencyService so
 * there is exactly one place each lives):
 *   Brazil -> pt-BR/BRL | any EU country -> en-US/EUR | USA -> en-US/USD
 *   | any other country -> en-US/USD.
 *
 * Once resolved (by IP or navigator), the result is persisted -- language,
 * currency AND country -- so every later visit (and every other page this
 * session) reads step 1 and never calls the IP service again. A manual
 * change via the header selectors (LanguageService.setLanguage/
 * CurrencyService.setCurrency) writes the same keys and therefore takes
 * absolute priority forever after, exactly like an auto-detected result.
 */
(function (root, factory) {
    "use strict";
    const deps = (typeof module !== "undefined" && module.exports)
        ? { LanguageService: require("./languageService.js"), CurrencyService: require("./currencyService.js") }
        : { LanguageService: root && root.LanguageService, CurrencyService: root && root.CurrencyService };
    const api = factory(deps.LanguageService, deps.CurrencyService);
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    if (root) root.LocationService = api;
})(typeof window !== "undefined" ? window : null, function (LanguageService, CurrencyService) {
    "use strict";

    // Same-origin first (no CORS, not third-party -- see file header for why
    // this exists ahead of ipapi.co). Plain-text response, one "key=value"
    // pair per line; the line we want is "loc=<ISO alpha-2>".
    const CF_TRACE_URL = "/cdn-cgi/trace";
    // Free, keyless IP-geolocation, second attempt. (The spec also allows
    // Cloudflare's own geo headers, GeoJS or ipinfo -- ipapi.co was picked
    // for its generous no-signup free tier and plain JSON response.)
    const GEO_URL = "https://ipapi.co/json/";
    const FETCH_TIMEOUT_MS = 3000;

    // Same key i18n.js already owns ("m11ntx_lang", two-letter "en"/"pt") and
    // the one currencyService.js already owns ("m11ntx_currency") -- reused
    // here, never duplicated, so a visitor's existing stored preference is
    // never lost by this rewrite. COUNTRY_KEY is new (MI-03: persist country too).
    const COUNTRY_KEY = "m11ntx_country";

    function storage() {
        try { return (typeof window !== "undefined" && window.localStorage) || null; }
        catch (e) { return null; }
    }

    function hasStoredPreference() {
        const s = storage();
        if (!s) return false;
        return !!(s.getItem(LanguageService.EXISTING_LANG_KEY) && s.getItem(CurrencyService.STORAGE_KEY));
    }

    function storedPreference() {
        const s = storage();
        const siteLang = s && s.getItem(LanguageService.EXISTING_LANG_KEY);
        return {
            language: siteLang === "pt" ? "pt-BR" : "en-US",
            currency: (s && s.getItem(CurrencyService.STORAGE_KEY)) || CurrencyService.DEFAULT_CURRENCY,
            country: (s && s.getItem(COUNTRY_KEY)) || "",
            source: "stored",
        };
    }

    function persist(result) {
        const s = storage();
        if (!s) return;
        s.setItem(LanguageService.EXISTING_LANG_KEY, LanguageService.siteLangFor(result.language));
        s.setItem(CurrencyService.STORAGE_KEY, result.currency);
        if (result.country) s.setItem(COUNTRY_KEY, result.country);
    }

    /** Best-effort country guess from navigator.language's region subtag
     * ("en-US" -> "US", "pt-BR" -> "BR"). Deliberately only ever called as
     * the LAST resort, after a real IP lookup has failed -- never primary. */
    function countryFromNavigator() {
        const nav = (typeof navigator !== "undefined" && navigator.language) || "";
        const parts = nav.split("-");
        return parts.length > 1 ? parts[1].toUpperCase() : "";
    }

    function withTimeout(promiseFactory) {
        if (typeof fetch !== "function") return Promise.resolve(null);
        const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        const timer = setTimeout(function () { if (controller) controller.abort(); }, FETCH_TIMEOUT_MS);
        return promiseFactory(controller ? controller.signal : undefined)
            .then(function (v) { clearTimeout(timer); return v; })
            .catch(function () { clearTimeout(timer); return null; });
    }

    /** Parses Cloudflare's `/cdn-cgi/trace` plain-text body ("k=v" per line)
     * for the "loc=" line. Returns "" if the line is missing/malformed. */
    function parseCfTraceLoc(text) {
        const match = typeof text === "string" && text.match(/^loc=([A-Za-z]{2})$/m);
        return match ? match[1].toUpperCase() : "";
    }

    function detectCountryViaCfTrace() {
        return withTimeout(function (signal) {
            return fetch(CF_TRACE_URL, { signal: signal })
                .then(function (res) { return res.ok ? res.text() : null; })
                .then(function (text) { return parseCfTraceLoc(text); });
        }).then(function (v) { return v || ""; });
    }

    function detectCountryViaIpapi() {
        return withTimeout(function (signal) {
            return fetch(GEO_URL, { signal: signal })
                .then(function (res) { return res.ok ? res.json() : null; })
                .then(function (data) { return (data && data.country_code) || ""; });
        }).then(function (v) { return v || ""; });
    }

    /** IP -> country lookup, same-origin method first (see file header).
     * Resolves to an ISO alpha-2 string, or "" if both methods fail
     * (network, CORS, rate-limit, ad-blocker/tracking-protection) -- never
     * rejects. */
    function detectCountryViaIp() {
        return detectCountryViaCfTrace().then(function (country) {
            if (country) return country;
            return detectCountryViaIpapi();
        });
    }

    function finalize(countryCode, source) {
        const language = LanguageService.languageForCountry(countryCode);
        const currency = CurrencyService.currencyForCountry(countryCode);
        const result = { language: language, currency: currency, country: countryCode || "", source: source };
        persist(result);
        return result;
    }

    /** Resolves to {language, currency, country, source}. Always resolves,
     * never rejects. Calls the IP service at most once per visitor -- only
     * when there is no stored preference yet. */
    function resolve() {
        if (hasStoredPreference()) return Promise.resolve(storedPreference());
        return detectCountryViaIp().then(function (country) {
            if (country) return finalize(country, "ip");
            const navCountry = countryFromNavigator();
            if (navCountry) return finalize(navCountry, "navigator");
            return finalize("", "default");
        });
    }

    return {
        CF_TRACE_URL: CF_TRACE_URL,
        GEO_URL: GEO_URL,
        COUNTRY_KEY: COUNTRY_KEY,
        hasStoredPreference: hasStoredPreference,
        detectCountryViaIp: detectCountryViaIp,
        detectCountryViaCfTrace: detectCountryViaCfTrace,
        detectCountryViaIpapi: detectCountryViaIpapi,
        parseCfTraceLoc: parseCfTraceLoc,
        countryFromNavigator: countryFromNavigator,
        resolve: resolve,
    };
});
