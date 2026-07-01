/**
 * catalog.js
 * Renders the Collections grid entirely from data/collections.json.
 * No card is hardcoded — the flow is: JSON -> API -> Catalog -> UI -> screen.
 * Built to scale: a single string build + one DOM write per render.
 */

const Catalog = (() => {
    const SKELETON_COUNT = 6;

    /* ---------- templates (reusable component markup) ---------- */

    function skeletonCard() {
        return `
            <article class="collection-card" aria-hidden="true">
                <div class="collection-card__media skeleton"></div>
                <div class="collection-card__body">
                    <span class="skeleton skeleton--line skeleton--short"></span>
                    <span class="skeleton skeleton--line"></span>
                    <span class="skeleton skeleton--line"></span>
                </div>
            </article>`;
    }

    function media(c) {
        if (c.image) {
            return `<img class="collection-card__photo" src="${esc(c.image)}"
                         alt="${esc(c.name)}" loading="lazy" decoding="async">`;
        }
        // no image yet -> branded placeholder (matches the approved design)
        return `<img class="collection-card__mark" src="assets/images/symbol.png"
                     alt="" width="150" height="105" loading="lazy" decoding="async">`;
    }

    function collectionCard(c) {
        const name = esc(c.name);
        return `
            <article class="collection-card reveal" role="listitem"
                     data-slug="${esc(c.slug)}" data-featured="${c.featured ? "true" : "false"}">
                <div class="collection-card__media">
                    <div class="collection-card__img">${media(c)}</div>
                </div>
                <div class="collection-card__body">
                    <p class="collection-card__era">${esc(c.period)}</p>
                    <h3 class="collection-card__title">${name}</h3>
                    <p class="collection-card__desc">${esc(c.description)}</p>
                    <a class="btn btn--secondary collection-card__cta" href="#" data-soon
                       aria-label="Explore ${name}">
                        Explore <span class="arrow" aria-hidden="true">&rarr;</span>
                    </a>
                </div>
            </article>`;
    }

    /* ---------- render helpers ---------- */

    function renderSkeletons(grid, n = SKELETON_COUNT) {
        if (!grid) return;
        grid.setAttribute("aria-busy", "true");
        grid.innerHTML = Array.from({ length: n }, skeletonCard).join("");
    }

    /** Render a list of collections. One build, one DOM write. */
    function renderCollections(grid, list = []) {
        if (!grid) return;
        grid.innerHTML = list.map(collectionCard).join("");
        grid.setAttribute("aria-busy", "false");
        // hand off to UI for reveal animations
        document.dispatchEvent(new CustomEvent("collections:rendered", { detail: { grid } }));
    }

    function renderEmpty(grid) {
        if (!grid) return;
        grid.setAttribute("aria-busy", "false");
        grid.innerHTML = `<p class="catalog__empty">No collections available yet.</p>`;
    }

    function esc(str) {
        return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[c]));
    }

    /* ---------- init ---------- */

    async function init() {
        const grid = document.getElementById("catalogGrid");
        if (!grid) return;

        renderSkeletons(grid);
        const collections = await API.getCollections();

        if (Array.isArray(collections) && collections.length) {
            renderCollections(grid, collections);
        } else {
            renderEmpty(grid);
        }
    }

    return { init, renderSkeletons, renderCollections, renderEmpty };
})();

window.Catalog = Catalog;
