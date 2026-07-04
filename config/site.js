/**
 * config/site.js
 * Single source of truth for site-wide IDs and toggles (CS-14).
 * Loaded first on every page, before any other script. No IDs should be
 * hardcoded anywhere else — read them from `window.CONFIG`.
 *
 * How to enable analytics:
 *   1. Fill in the GA4 `id` ("G-XXXXXXXXXX") and/or Clarity `id`.
 *   2. Set that provider's `enabled: true`.
 *   3. Keep `analytics.enabled: true` (master switch).
 * With ids empty or providers disabled, no external script loads and
 * trackEvent() simply no-ops — the platform stays instrumented but silent.
 */
(function (root) {
    "use strict";
    const CONFIG = {
        // Production canonical base (also used by seo.js when present)
        url: "https://m11ntx.github.io/collection-site",

        // Official channel — the only place the Instagram URL should live
        instagram: "https://www.instagram.com/m11ntx/",

        // Contact email (used by the footer + contact page).
        email: "hello.m11ntx@gmail.com",

        analytics: {
            enabled: true,      // master switch for the whole analytics layer
            respectDNT: true,   // honor the browser's Do Not Track setting
            debug: false,       // console.debug every tracked event

            // Google Analytics 4
            ga4: {
                enabled: false,          // flip to true once `id` is set
                id: ""                   // "G-XXXXXXXXXX"
            },

            // Microsoft Clarity
            clarity: {
                enabled: false,          // flip to true once `id` is set
                id: ""                   // Clarity project id, e.g. "abcd1234"
            }
        }
    };

    if (root) root.CONFIG = CONFIG;
    if (typeof module !== "undefined" && module.exports) module.exports = CONFIG;
})(typeof window !== "undefined" ? window : null);
