/**
 * main.js
 * Application bootstrap for M11NTX.
 *
 * Wiring: API (data) -> Catalog (render) -> UI (behavior)
 * UI is initialized first so its "collections:rendered" listener is ready
 * before Catalog renders. The right Catalog entry point is chosen by page.
 */

// One bootstrap step throwing must never block the rest (same "isolate
// failures" spirit as the pipeline's per-stage error capture) -- a bug in,
// say, the MI-03 localization bootstrap must not be able to take the whole
// catalog grid down with it.
function safeInit(label, fn) {
    try { fn(); } catch (e) { if (window.console) console.error("main.js: " + label + " failed", e); }
}

document.addEventListener("DOMContentLoaded", () => {
    safeInit("Localization.init", () => {
        if (window.Localization) Localization.init();  // MI-03: resolve + apply language/currency
    });                                                  // (stored pref -> IP -> navigator -> default)
    safeInit("I18N.init", () => { if (window.I18N) I18N.init(); });           // language switch (CS-19)
    safeInit("SEO.initGlobal", () => { if (window.SEO) SEO.initGlobal(); });  // Organization + WebSite JSON-LD
    safeInit("Analytics.init", () => { if (window.Analytics) Analytics.init(); }); // providers + auto-events
    safeInit("UI.init", () => { if (window.UI) UI.init(); });

    safeInit("Catalog", () => {
        if (!window.Catalog) return;
        if (document.getElementById("catalogGrid")) Catalog.init();            // index
        if (document.getElementById("collectionDetail")) Catalog.initDetail();  // collection
        if (document.getElementById("leagueDetail")) Catalog.initLeaguePage();  // league
        if (document.getElementById("regionDetail")) Catalog.initRegionPage();  // region (Brasileirão, MI-06)
        if (document.getElementById("clubDetail")) Catalog.initClubPage();      // club
        if (document.getElementById("jerseyDetail")) Catalog.initJerseyPage();  // jersey
        if (document.getElementById("filterControls")) Catalog.initCatalogPage(); // catalog (filters)
        if (document.getElementById("reviewsPage")) Catalog.initReviewsPage();  // reviews menu (CS)
        if (document.getElementById("searchInput")) Catalog.initSiteSearch();   // global search overlay
    });
});
