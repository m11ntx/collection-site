/**
 * api.js
 * Data access layer for M11NTX.
 *
 * Prepared to read the JSON sources under /data. No mock data:
 * empty or missing files simply resolve to an empty array, so the
 * UI can decide what to render (skeletons, empty state, products).
 */

const API = (() => {
    const BASE = "data/";

    /**
     * Fetch and parse a JSON file, tolerating empty/missing files.
     * @param {string} file
     * @returns {Promise<any[]>}
     */
    async function loadJSON(file) {
        try {
            const res = await fetch(BASE + file, { cache: "no-store" });
            if (!res.ok) return [];
            const text = (await res.text()).trim();
            return text ? JSON.parse(text) : [];
        } catch (err) {
            console.warn(`[API] Could not load ${file}:`, err.message);
            return [];
        }
    }

    return {
        getProducts:    () => loadJSON("products.json"),
        getClubs:       () => loadJSON("clubs.json"),
        getLeagues:     () => loadJSON("leagues.json"),
        getRegions:     () => loadJSON("regions.json"),
        getCollections: () => loadJSON("collections.json"),
    };
})();

window.API = API;
