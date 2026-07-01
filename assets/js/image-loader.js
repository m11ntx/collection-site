/**
 * image-loader.js
 * Centralized asset pipeline for M11NTX.
 *
 * Responsibilities:
 *   - getImage()      resolve an image path by category + name
 *   - lazy loading    native loading="lazy" + decoding="async"
 *   - placeholder     images fade in on load (container shows the placeholder)
 *   - error handling  swap to a branded fallback once, no loops
 *
 * Built to scale to thousands of images: native offscreen deferral,
 * a single idempotent hydrate pass per render, one listener per <img>.
 */

const ImageLoader = (() => {
    const BASE = "assets/images/";
    const DEFAULT_EXT = "webp";
    const FALLBACK = BASE + "symbol.png";

    const CATEGORIES = [
        "collections", "clubs", "jerseys",
        "players", "badges", "manufacturers", "countries"
    ];

    function slugify(value) {
        return String(value)
            .normalize("NFD").replace(/[̀-ͯ]/g, "") // strip accents
            .toLowerCase().trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    function esc(value) {
        return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[c]));
    }

    /**
     * Resolve an image path.
     * @param {string} category one of CATEGORIES
     * @param {string} name     slug / id / filename / path
     * @param {string} [ext]    extension (default "webp")
     * @returns {string} resolved path (branded fallback if invalid)
     */
    function getImage(category, name, ext = DEFAULT_EXT) {
        if (!name) return FALLBACK;
        // already a path or a filename with extension -> use as-is
        if (name.indexOf("/") !== -1 || /\.[a-z0-9]{2,4}$/i.test(name)) return name;
        if (CATEGORIES.indexOf(category) === -1) return FALLBACK;
        return `${BASE}${category}/${slugify(name)}.${ext}`;
    }

    /**
     * Build a lazy <img> tag string.
     * @param {string} src
     * @param {{alt?:string,className?:string,width?:number,height?:number}} [opts]
     */
    function imageTag(src, opts = {}) {
        const { alt = "", className = "", width, height } = opts;
        const dims = (width && height) ? ` width="${width}" height="${height}"` : "";
        const cls = ("img-lazy " + className).trim();
        return `<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}"${dims} ` +
               `loading="lazy" decoding="async">`;
    }

    /** Swap to the branded fallback exactly once; never leave it hidden. */
    function handleError(img) {
        if (img.dataset.fallback === "done") {
            img.classList.add("is-loaded");
            return;
        }
        img.dataset.fallback = "done";
        img.classList.add("is-fallback");
        // reveal once the fallback resolves (or even if it also fails)
        img.addEventListener("load", () => img.classList.add("is-loaded"), { once: true });
        img.addEventListener("error", () => img.classList.add("is-loaded"), { once: true });
        img.src = FALLBACK;
    }

    /**
     * Hydrate lazy images inside a root: fade in on load, fallback on error.
     * Idempotent — safe to call after every render.
     * @param {ParentNode} [root]
     */
    function hydrate(root = document) {
        const imgs = root.querySelectorAll("img.img-lazy:not([data-hydrated])");
        imgs.forEach((img) => {
            img.dataset.hydrated = "true";
            // already finished before hydrate ran?
            if (img.complete) {
                if (img.naturalWidth > 0) img.classList.add("is-loaded");
                else handleError(img);
                return;
            }
            img.addEventListener("load", () => img.classList.add("is-loaded"), { once: true });
            img.addEventListener("error", () => handleError(img), { once: true });
        });
    }

    return { getImage, imageTag, hydrate, slugify, CATEGORIES, FALLBACK };
})();

window.ImageLoader = ImageLoader;
window.getImage = ImageLoader.getImage;
