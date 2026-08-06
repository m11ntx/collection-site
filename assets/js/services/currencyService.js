/**
 * assets/js/services/currencyService.js
 * MI-03 -- picks which precomputed price to display. NEVER computes or
 * converts a price: every BRL/USD/EUR amount (product.price) and every
 * pre-formatted display string (product.formattedPrice) already exists in
 * data/products.json, written by the pipeline's Pricing Engine (see
 * catalog-pipeline/pricing/). This service only selects the right
 * precomputed field for the active currency and lets it be switched live,
 * no page reload, no re-fetch of the catalog.
 */
(function (root, factory) {
    "use strict";
    const api = factory();
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    if (root) root.CurrencyService = api;
})(typeof window !== "undefined" ? window : null, function () {
    "use strict";

    const STORAGE_KEY = "m11ntx_currency";
    const DEFAULT_CURRENCY = "BRL";
    const SUPPORTED_CURRENCIES = ["BRL", "USD", "EUR"];
    const SYMBOLS = { BRL: "R$", USD: "US$", EUR: "€" };
    // Every currency the Pricing Engine generates maps to exactly one
    // formattedPrice locale key -- there is no independent client-side
    // number formatting; picking a currency also picks its formatting.
    const CURRENCY_TO_LOCALE = { BRL: "pt-BR", USD: "en-US", EUR: "en-EU" };

    // European Union member states (ISO 3166-1 alpha-2) -- per the
    // localization spec's rule table: EU -> English + EUR; everyone else
    // not Brazil -> English + USD.
    const EU_COUNTRIES = new Set([
        "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
        "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
        "SI", "ES", "SE",
    ]);

    function currencyForCountry(countryCode) {
        const cc = String(countryCode || "").toUpperCase();
        if (cc === "BR") return "BRL";
        if (EU_COUNTRIES.has(cc)) return "EUR";
        return "USD";
    }

    function getCurrency() {
        if (typeof window === "undefined" || !window.localStorage) return DEFAULT_CURRENCY;
        const saved = window.localStorage.getItem(STORAGE_KEY);
        return SUPPORTED_CURRENCIES.indexOf(saved) !== -1 ? saved : DEFAULT_CURRENCY;
    }

    /** Manual override, absolute priority from now on (persisted), NO
     * reload: fires "currency:change" so any rendered price re-renders
     * itself from already-fetched product data. */
    function setCurrency(currency) {
        if (SUPPORTED_CURRENCIES.indexOf(currency) === -1) return false;
        if (typeof window !== "undefined" && window.localStorage) {
            window.localStorage.setItem(STORAGE_KEY, currency);
        }
        if (typeof document !== "undefined" && typeof CustomEvent !== "undefined") {
            document.dispatchEvent(new CustomEvent("currency:change", { detail: { currency: currency } }));
        }
        return true;
    }

    /** Seeds an initial currency on a first-ever visit only -- a no-op if
     * the visitor already has a stored preference. */
    function seedInitialCurrency(countryCode) {
        if (typeof window === "undefined" || !window.localStorage) return false;
        if (window.localStorage.getItem(STORAGE_KEY)) return false;
        window.localStorage.setItem(STORAGE_KEY, currencyForCountry(countryCode));
        return true;
    }

    /** `product` is a raw entry from data/products.json. Returns
     * {amount, currency, symbol} or null (never computes -- only reads
     * what the pipeline already precomputed on product.price). */
    function priceFor(product, currency) {
        const cur = currency || getCurrency();
        const amount = product && product.price && typeof product.price[cur] === "number"
            ? product.price[cur] : null;
        if (amount == null) return null;
        return { amount: amount, currency: cur, symbol: SYMBOLS[cur] || "" };
    }

    /** The pipeline's own pre-formatted string for the active currency
     * (e.g. "R$ 159,90"/"US$ 29.90"/"€ 27.90") -- the only price string
     * ever shown on the storefront; no number formatting happens here. */
    function formattedPriceFor(product, currency) {
        const cur = currency || getCurrency();
        const locale = CURRENCY_TO_LOCALE[cur] || CURRENCY_TO_LOCALE[DEFAULT_CURRENCY];
        const text = product && product.formattedPrice && product.formattedPrice[locale];
        return typeof text === "string" && text ? text : null;
    }

    /** The pre-formatted ORIGINAL ("de") price for the active currency, present
     * only when an operator override/promotion lowered the price. Returned only
     * when it's genuinely higher than the current price (a real markdown); null
     * otherwise, so the caller shows a strike-through only when it makes sense. */
    function compareAtFormattedFor(product, currency) {
        const cur = currency || getCurrency();
        const locale = CURRENCY_TO_LOCALE[cur] || CURRENCY_TO_LOCALE[DEFAULT_CURRENCY];
        const text = product && product.compareAtFormatted && product.compareAtFormatted[locale];
        if (typeof text !== "string" || !text) return null;
        const now = product.price && product.price[cur];
        const was = product.compareAtPrice && product.compareAtPrice[cur];
        return (typeof now === "number" && typeof was === "number" && was > now) ? text : null;
    }

    /** Same contract as formattedPriceFor(), for the personalization
     * surcharge (product.personalizationFormattedPrice) -- null when the
     * product has no personalization option. */
    function personalizationFormattedPriceFor(product, currency) {
        const cur = currency || getCurrency();
        const locale = CURRENCY_TO_LOCALE[cur] || CURRENCY_TO_LOCALE[DEFAULT_CURRENCY];
        const text = product && product.personalizationFormattedPrice
            && product.personalizationFormattedPrice[locale];
        return typeof text === "string" && text ? text : null;
    }

    return {
        STORAGE_KEY: STORAGE_KEY,
        DEFAULT_CURRENCY: DEFAULT_CURRENCY,
        SUPPORTED_CURRENCIES: SUPPORTED_CURRENCIES.slice(),
        CURRENCY_TO_LOCALE: CURRENCY_TO_LOCALE,
        currencyForCountry: currencyForCountry,
        getCurrency: getCurrency,
        setCurrency: setCurrency,
        seedInitialCurrency: seedInitialCurrency,
        priceFor: priceFor,
        formattedPriceFor: formattedPriceFor,
        compareAtFormattedFor: compareAtFormattedFor,
        personalizationFormattedPriceFor: personalizationFormattedPriceFor,
    };
});
