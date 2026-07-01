/**
 * catalog.js
 * Catalog rendering layer.
 *
 * Sprint 3: infrastructure only. The grid ships with static skeleton
 * cards (see index.html); no products are rendered yet and no mock data
 * is used. The render helpers below are ready for the next sprint, when
 * API.getProducts() returns real items.
 */

const Catalog = (() => {
    const SKELETON_COUNT = 6;

    /** Skeleton card markup (used for the loading state). */
    function skeletonCard() {
        return `
            <article class="card card--skeleton" aria-hidden="true">
                <div class="card__media skeleton"></div>
                <div class="card__body">
                    <span class="skeleton skeleton--line"></span>
                    <span class="skeleton skeleton--line skeleton--short"></span>
                </div>
            </article>`;
    }

    /** Fill a grid with N skeleton cards. */
    function renderSkeletons(grid, n = SKELETON_COUNT) {
        if (!grid) return;
        grid.setAttribute("aria-busy", "true");
        grid.innerHTML = Array.from({ length: n }, skeletonCard).join("");
    }

    /** Real product card markup (prepared for the next sprint). */
    function productCard(product) {
        const name = escapeHtml(product.name || "");
        const club = escapeHtml(product.club || "");
        return `
            <article class="card" role="listitem">
                <div class="card__media"></div>
                <div class="card__body">
                    <h3 class="card__title">${name}</h3>
                    <p class="card__meta">${club}</p>
                </div>
            </article>`;
    }

    /** Render real products into a grid (prepared for the next sprint). */
    function renderProducts(grid, products = []) {
        if (!grid) return;
        grid.setAttribute("aria-busy", "false");
        grid.setAttribute("role", "list");
        grid.innerHTML = products.map(productCard).join("");
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, (c) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[c]));
    }

    /**
     * Initialize the catalog.
     * Sprint 3 keeps the static skeleton grid in place (no products yet).
     * The wiring for real data is intentionally left ready but inert:
     *
     *   const products = await API.getProducts();
     *   if (products.length) renderProducts(grid, products);
     */
    async function init() {
        const grid = document.getElementById("catalogGrid");
        if (!grid) return;
        // Infrastructure only — nothing to render this sprint.
    }

    return { init, renderSkeletons, renderProducts };
})();

window.Catalog = Catalog;
