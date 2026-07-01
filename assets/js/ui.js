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

        // Reveal the bar only after the hero has been scrolled past,
        // so the approved landing stays untouched at the top.
        const threshold = () =>
            (landing ? landing.offsetHeight - 90 : window.innerHeight * 0.7);

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

    /* ---------- placeholder links (sections not built yet) ---------- */
    function initPlaceholders() {
        document.querySelectorAll("[data-soon]").forEach((el) => {
            el.addEventListener("click", (e) => e.preventDefault());
        });
    }

    function init() {
        initNav();
        initMobileMenu();
        initSearch();
        initKeyboard();
        initPlaceholders();
    }

    return { init };
})();

window.UI = UI;
