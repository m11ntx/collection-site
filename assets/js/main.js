/**
 * main.js
 * Application bootstrap for M11NTX.
 * Initializes the UI interactions and the catalog infrastructure.
 */

document.addEventListener("DOMContentLoaded", () => {
    if (window.UI) UI.init();
    if (window.Catalog) Catalog.init();
});
