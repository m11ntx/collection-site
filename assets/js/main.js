/**
 * main.js
 * Application bootstrap for M11NTX.
 *
 * Wiring: API (data) -> Catalog (render) -> UI (behavior)
 * UI is initialized first so its "collections:rendered" listener is ready
 * before Catalog renders. The right Catalog entry point is chosen by page.
 */

document.addEventListener("DOMContentLoaded", () => {
    if (window.UI) UI.init();

    if (window.Catalog) {
        if (document.getElementById("catalogGrid")) Catalog.init();            // index
        if (document.getElementById("collectionDetail")) Catalog.initDetail();  // collection
        if (document.getElementById("clubDetail")) Catalog.initClubPage();      // club
        if (document.getElementById("jerseyDetail")) Catalog.initJerseyPage();  // jersey
    }
});
