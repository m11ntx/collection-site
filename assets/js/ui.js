/**
 * ui.js
 * UI interactions: sticky navigation, mobile menu and search overlay.
 * Vanilla ES6, no dependencies.
 */

const UI = (() => {

    /* ---------- sticky / reveal navigation ---------- */
    function initNav() {
        const nav = document.getElementById("siteNav");
        const landing = document.getElementById("top");
        if (!nav) return;

        // Subpages (no hero): keep the bar visible at all times.
        if (!landing) {
            nav.classList.add("is-stuck");
            return;
        }

        // Home: reveal the bar only after the hero has been scrolled past,
        // so the approved landing stays untouched at the top.
        const threshold = () => landing.offsetHeight - 90;

        let ticking = false;
        function update() {
            nav.classList.toggle("is-stuck", window.scrollY > threshold());
            ticking = false;
        }
        window.addEventListener("scroll", () => {
            if (!ticking) {
                window.requestAnimationFrame(update);
                ticking = true;
            }
        }, { passive: true });
        window.addEventListener("resize", update);
        update();
    }

    /* ---------- mobile menu ---------- */
    function initMobileMenu() {
        const toggle = document.getElementById("menuToggle");
        const menu = document.getElementById("mobileMenu");
        const closeBtn = document.getElementById("menuClose");
        if (!toggle || !menu) return;

        function open() {
            menu.classList.add("is-open");
            menu.setAttribute("aria-hidden", "false");
            toggle.setAttribute("aria-expanded", "true");
            document.body.classList.add("no-scroll");
        }
        function close() {
            menu.classList.remove("is-open");
            menu.setAttribute("aria-hidden", "true");
            toggle.setAttribute("aria-expanded", "false");
            document.body.classList.remove("no-scroll");
        }

        toggle.addEventListener("click", open);
        if (closeBtn) closeBtn.addEventListener("click", close);

        // Close when a real navigation link is used (not the search button).
        menu.querySelectorAll("a.mobile-menu__link").forEach((link) => {
            link.addEventListener("click", close);
        });

        UI._closeMenu = close;
    }

    /* ---------- search overlay (layout only) ---------- */
    function initSearch() {
        const overlay = document.getElementById("searchOverlay");
        const openBtn = document.getElementById("searchOpen");
        const openBtnMobile = document.getElementById("searchOpenMobile");
        const closeBtn = document.getElementById("searchClose");
        const input = document.getElementById("searchInput");
        if (!overlay) return;

        function open() {
            if (UI._closeMenu) UI._closeMenu();
            overlay.classList.add("is-open");
            overlay.setAttribute("aria-hidden", "false");
            document.body.classList.add("no-scroll");
            if (input) window.setTimeout(() => input.focus(), 260);
        }
        function close() {
            overlay.classList.remove("is-open");
            overlay.setAttribute("aria-hidden", "true");
            document.body.classList.remove("no-scroll");
        }

        if (openBtn) openBtn.addEventListener("click", open);
        if (openBtnMobile) openBtnMobile.addEventListener("click", open);
        if (closeBtn) closeBtn.addEventListener("click", close);

        // Click on the dimmed backdrop closes the overlay.
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) close();
        });

        UI._closeSearch = close;
    }

    /* ---------- global keyboard: Esc closes overlays ---------- */
    function initKeyboard() {
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                if (UI._closeSearch) UI._closeSearch();
                if (UI._closeMenu) UI._closeMenu();
            }
        });
    }

    /* ---------- placeholder links (sections not built yet) ----------
       Delegated so it also covers cards rendered later from JSON. */
    function initPlaceholders() {
        document.addEventListener("click", (e) => {
            const el = e.target.closest("[data-soon]");
            if (el) e.preventDefault();
        });
    }

    /* ---------- scroll-reveal animation for rendered cards ----------
       Catalog dispatches "collections:rendered" after painting the grid. */
    function initReveal() {
        document.addEventListener("collections:rendered", (e) => {
            const grid = (e.detail && e.detail.grid) || document;
            const cards = grid.querySelectorAll(".reveal");

            if (!("IntersectionObserver" in window)) {
                cards.forEach((c) => c.classList.remove("reveal"));
                return;
            }

            const io = new IntersectionObserver((entries, obs) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    const card = entry.target;
                    card.classList.add("is-visible");
                    obs.unobserve(card);
                    // clean up so hover transforms aren't delayed/overridden
                    card.addEventListener("transitionend", function done() {
                        card.classList.remove("reveal", "is-visible");
                        card.style.transitionDelay = "";
                    }, { once: true });
                });
            }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

            cards.forEach((card, i) => {
                card.style.transitionDelay = (i % 3) * 70 + "ms"; // subtle per-row stagger
                io.observe(card);
            });
        });
    }

    /* ---------- premium jersey gallery (swap · fade) ----------
       Cursor-follow zoom removed (CS-55): source photos are ~480px, so
       scaling them up on hover only made the low resolution more obvious
       instead of showing real extra detail. */
    function initGallery() {
        document.addEventListener("jersey:rendered", (e) => {
            const root = (e.detail && e.detail.root) || document;
            const img = root.querySelector("#galleryImg");
            const thumbs = root.querySelectorAll(".gallery__thumb");

            // thumbnail -> swap main image with a fade
            thumbs.forEach((thumb) => {
                thumb.addEventListener("click", () => {
                    const src = thumb.getAttribute("data-src");
                    if (!img || !src || src === img.getAttribute("src")) return;
                    img.classList.add("is-fading");
                    window.setTimeout(() => {
                        img.setAttribute("src", src);
                        img.classList.remove("is-fading");
                    }, 180);
                    thumbs.forEach((t) => t.classList.remove("is-active"));
                    thumb.classList.add("is-active");
                });
            });
        });
    }

    /* ---------- prefetch on intent (perf) ----------
       Warm the next navigation when the user hovers/focuses a Collection or
       Club card link. Progressive enhancement — no visual change. */
    function initPrefetch() {
        const done = new Set();
        function prefetch(href) {
            if (!href || done.has(href)) return;
            done.add(href);
            const l = document.createElement("link");
            l.rel = "prefetch";
            l.href = href;
            document.head.appendChild(l);
        }
        function onIntent(e) {
            const a = e.target.closest &&
                e.target.closest("a.collection-card__cta, a.club-card__cta, a.jersey-card__cta");
            if (a) prefetch(a.getAttribute("href"));
        }
        document.addEventListener("mouseover", onIntent, { passive: true });
        document.addEventListener("focusin", onIntent);
    }

    /* ---------- config-driven links ----------
       Keep the Instagram/email single source (config/site.js). Elements with
       data-config="instagram|email" get their href from CONFIG (with the static
       href as a no-JS fallback). Used by the footer + contact page. */
    function initConfigLinks() {
        const cfg = window.CONFIG || {};
        document.querySelectorAll('[data-config="instagram"]').forEach((a) => {
            if (cfg.instagram) a.setAttribute("href", cfg.instagram);
        });
        document.querySelectorAll('[data-config="email"]').forEach((a) => {
            if (cfg.email) a.setAttribute("href", "mailto:" + cfg.email);
        });
    }

    function init() {
        initNav();
        initMobileMenu();
        initSearch();
        initKeyboard();
        initPlaceholders();
        initReveal();
        initGallery();
        initPrefetch();
        initConfigLinks();
    }

    return { init };
})();

window.UI = UI;
