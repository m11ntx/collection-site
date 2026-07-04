/**
 * analytics.js
 * Decoupled analytics / telemetry layer for M11NTX (CS-14).
 *
 * - trackEvent(name, params) centralizes every event and fans it out to the
 *   enabled providers (Google Analytics 4, Microsoft Clarity).
 * - Providers are toggled purely from config/site.js (window.CONFIG.analytics);
 *   no IDs are hardcoded here. With providers off / ids empty, nothing loads and
 *   trackEvent() no-ops — the platform stays instrumented but silent.
 * - Honors Do Not Track when configured. Never touches the layout.
 *
 * Events: home_view, collection_view, club_view, jersey_view, search, filter,
 *         instagram_click, faq_open.
 *
 * Exported to window.Analytics (and module.exports for tooling/tests).
 */
(function (root, factory) {
    "use strict";
    const api = factory(root);
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    if (root) root.Analytics = api;
})(typeof window !== "undefined" ? window : null, function (root) {
    "use strict";

    function cfg() {
        return (root && root.CONFIG && root.CONFIG.analytics) || {};
    }

    function dntOn() {
        if (typeof navigator === "undefined") return false;
        const v = navigator.doNotTrack || (root && root.doNotTrack) || navigator.msDoNotTrack;
        return v === "1" || v === "yes";
    }

    function enabled() {
        const c = cfg();
        if (!c.enabled) return false;
        if (c.respectDNT && dntOn()) return false;
        return true;
    }

    /* ---------- provider loaders (only when enabled + id present) ---------- */

    function loadGA4() {
        const c = cfg().ga4 || {};
        if (!c.enabled || !c.id || typeof document === "undefined") return;
        root.dataLayer = root.dataLayer || [];
        root.gtag = function () { root.dataLayer.push(arguments); };
        root.gtag("js", new Date());
        // We emit our own *_view events, so disable GA4's automatic page_view.
        root.gtag("config", c.id, { send_page_view: false });
        const s = document.createElement("script");
        s.async = true;
        s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(c.id);
        document.head.appendChild(s);
    }

    function loadClarity() {
        const c = cfg().clarity || {};
        if (!c.enabled || !c.id || typeof document === "undefined") return;
        (function (w, d, a, r, i) {
            w[a] = w[a] || function () { (w[a].q = w[a].q || []).push(arguments); };
            const t = d.createElement(r); t.async = 1;
            t.src = "https://www.clarity.ms/tag/" + i;
            const y = d.getElementsByTagName(r)[0];
            y.parentNode.insertBefore(t, y);
        })(root, document, "clarity", "script", c.id);
    }

    /* ---------- core ---------- */

    function trackEvent(name, params) {
        if (!name || !enabled()) return;
        params = params || {};

        // Google Analytics 4
        if (typeof root.gtag === "function") root.gtag("event", name, params);

        // Microsoft Clarity — custom event + string tags
        if (typeof root.clarity === "function") {
            try {
                root.clarity("event", name);
                Object.keys(params).forEach(function (k) {
                    if (params[k] != null) root.clarity("set", k, String(params[k]));
                });
            } catch (e) { /* clarity not ready yet — ignore */ }
        }

        if (cfg().debug && typeof console !== "undefined") {
            console.debug("[analytics]", name, params);
        }
    }

    /* ---------- named event helpers ---------- */

    const track = {
        homeView: function () { trackEvent("home_view", {}); },
        collectionView: function (slug) { trackEvent("collection_view", { slug: slug }); },
        clubView: function (slug) { trackEvent("club_view", { slug: slug }); },
        jerseyView: function (slug, extra) {
            trackEvent("jersey_view", Object.assign({ slug: slug }, extra || {}));
        },
        search: function (query, results) { trackEvent("search", { query: query, results: results }); },
        filter: function (facet, value, active) {
            trackEvent("filter", { facet: facet, value: value, active: !!active });
        },
        instagramClick: function (context) { trackEvent("instagram_click", { context: context }); },
        faqOpen: function (question) { trackEvent("faq_open", { question: question }); }
    };

    /* ---------- auto-bound events (delegated, no markup changes) ---------- */

    function pageContext() {
        if (typeof document === "undefined") return "site";
        if (document.getElementById("jerseyDetail")) return "jersey";
        if (document.getElementById("clubDetail")) return "club";
        if (document.getElementById("collectionDetail")) return "collection";
        if (document.getElementById("catalogGrid")) return "home";
        return "site";
    }

    function bindAutoEvents() {
        if (typeof document === "undefined") return;

        // instagram_click — any link to the official Instagram
        document.addEventListener("click", function (e) {
            const a = e.target.closest && e.target.closest('a[href*="instagram.com"]');
            if (a) track.instagramClick(pageContext());
        });

        // faq_open — native <details> (the 'toggle' event does not bubble, so capture)
        document.addEventListener("toggle", function (e) {
            const d = e.target;
            if (d && d.classList && d.classList.contains("faq__item") && d.open) {
                const q = d.querySelector(".faq__q");
                track.faqOpen(q ? q.textContent.trim() : "");
            }
        }, true);
    }

    /* ---------- init ---------- */

    function init() {
        bindAutoEvents();          // always bind — track.* no-ops when disabled
        if (!enabled()) {
            if (cfg().debug && typeof console !== "undefined") console.debug("[analytics] disabled");
            return;
        }
        loadGA4();
        loadClarity();
    }

    return {
        init: init,
        trackEvent: trackEvent,
        track: track,
        enabled: enabled,
        pageContext: pageContext
    };
});
