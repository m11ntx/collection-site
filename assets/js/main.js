/**
 * main.js
 * Application bootstrap for M11NTX.
 *
 * Wiring: API (data) -> Catalog (render) -> UI (behavior)
 * UI is initialized first so its "collections:rendered" listener is ready
 * before Catalog renders. The right Catalog entry point is chosen by page.
 */

document.addEventListener("DOMContentLoaded", () => {
    if (window.I18N) I18N.init();           // language switch: static strings + nav toggle (CS-19)
    if (window.SEO) SEO.initGlobal();       // Organization + WebSite JSON-LD (every page)
    if (window.Analytics) Analytics.init(); // load providers (if enabled) + bind auto-events
    if (window.UI) UI.init();

    if (window.Catalog) {
        if (document.getElementById("catalogGrid")) Catalog.init();            // index
        if (document.getElementById("collectionDetail")) Catalog.initDetail();  // collection
        if (document.getElementById("leagueDetail")) Catalog.initLeaguePage();  // league
        if (document.getElementById("regionDetail")) Catalog.initRegionPage();  // region (Brasileirão, MI-06)
        if (document.getElementById("clubDetail")) Catalog.initClubPage();      // club
        if (document.getElementById("jerseyDetail")) Catalog.initJerseyPage();  // jersey
        if (document.getElementById("filterControls")) Catalog.initCatalogPage(); // catalog (filters)
        if (document.getElementById("searchInput")) Catalog.initSiteSearch();   // global search overlay
    }
});
