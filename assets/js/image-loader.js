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

    // Catalog images/videos live on the CDN (Cloudflare R2); the repo only keeps
    // small brand assets. assetUrl() rewrites a repo-relative "assets/..." path
    // to the CDN when a base is configured (config/site.js `assetBase`); anything
    // already absolute (http/https/data) or non-asset is left untouched. Empty
    // base = serve from the repo (local dev / fallback).
    const ASSET_BASE = ((typeof window !== "undefined" && window.CONFIG
        && window.CONFIG.assetBase) || "").replace(/\/+$/, "");
    function assetUrl(path) {
        if (!ASSET_BASE || typeof path !== "string") return path;
        return path.slice(0, 7) === "assets/" ? ASSET_BASE + "/" + path : path;
    }

    const CATEGORIES = [
        "collections", "leagues", "regions", "clubs", "jerseys",
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
        return assetUrl(rawImage(category, name, ext));
    }
    function rawImage(category, name, ext) {
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

    /**
     * A generic, on-brand placeholder for any entity that has no real image
     * yet (collection, league, club, jersey) — a jersey-shirt icon + a
     * short monogram, colored with a hue derived from the entity's own
     * name. Deterministic (same name -> same look every render) and
     * name-driven rather than a fixed per-entity lookup, so it scales to
     * any number of collections/leagues/clubs without new artwork or a
     * catalog of hardcoded images — new continents/leagues just work.
     */
    function hashCode(str) {
        let h = 0;
        const s = String(str || "");
        for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
        return Math.abs(h);
    }

    function initials(name) {
        const words = String(name || "").trim().split(/\s+/).filter(Boolean);
        if (!words.length) return "M11";
        if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
        return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }

    /**
     * @param {string} name        the entity's own name (drives color + monogram)
     * @param {{className?:string,width?:number,height?:number}} [opts]
     */
    function genericMark(name, opts = {}) {
        const { className = "", width = 150, height = 105 } = opts;
        const hash = hashCode(name);
        const hue = 34 + (hash % 26); // 34-60deg: gold -> amber only, stays on-brand
        const stroke = `hsl(${hue} 42% 52%)`;
        const fill = `hsl(${hue} 55% 70%)`;
        return `<svg class="${esc(className)} is-generic" viewBox="0 0 64 64" width="${width}" height="${height}" ` +
            `role="img" aria-label="${esc(name || "M11NTX")}" preserveAspectRatio="xMidYMid meet">` +
            `<rect x="20" y="20" width="24" height="32" rx="2" fill="none" stroke="${stroke}" stroke-width="1.6" opacity=".55"/>` +
            `<polygon points="20,20 10,26 14,34 20,30" fill="none" stroke="${stroke}" stroke-width="1.6" opacity=".55"/>` +
            `<polygon points="44,20 54,26 50,34 44,30" fill="none" stroke="${stroke}" stroke-width="1.6" opacity=".55"/>` +
            `<path d="M27 20 L32 26 L37 20" fill="none" stroke="${stroke}" stroke-width="1.6" opacity=".55"/>` +
            `<text x="32" y="39" text-anchor="middle" font-family="Manrope, sans-serif" font-weight="800" ` +
            `font-size="15" fill="${fill}">${esc(initials(name))}</text>` +
            `</svg>`;
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

    return { getImage, imageTag, hydrate, slugify, genericMark, assetUrl, CATEGORIES, FALLBACK };
})();

window.ImageLoader = ImageLoader;
window.getImage = ImageLoader.getImage;
