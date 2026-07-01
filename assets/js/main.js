/**
 * main.js
 * Application bootstrap for M11NTX.
 *
 * Wiring: API (data)  ->  Catalog (render)  ->  UI (behavior)
 * UI is initialized first so its "collections:rendered" listener is ready
 * before Catalog renders and dispatches. Catalog pulls data through API.
 */

document.addEventListener("DOMContentLoaded", () => {
    if (window.UI) UI.init();          // scroll, hover, animations, menu, search
    if (window.Catalog) Catalog.init(); // fetch via API + render the grid
});
