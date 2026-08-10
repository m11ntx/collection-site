/**
 * catalog.js
 * Data-driven rendering for M11NTX.
 *   - Collections grid  (index.html)          -> Catalog.init()
 *   - Collection detail (pages/collection.html) -> Catalog.initDetail()
 *
 * Flow: JSON -> API -> Catalog -> UI -> screen. No hardcoded content.
 * Built to scale: single string build + one DOM write per render.
 */

const Catalog = (() => {
    const SKELETON_COUNT = 6;

    // Official M11NTX Instagram — the single channel for the customer journey.
    // Sourced from config/site.js (window.CONFIG). Never hardcode it elsewhere.
    const INSTAGRAM_URL =
        (typeof window !== "undefined" && window.CONFIG && window.CONFIG.instagram) ||
        "https://www.instagram.com/m11ntx/";

    /* ---------- utils ---------- */

    function esc(str) {
        return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[c]));
    }

    function getParam(name) {
        return new URLSearchParams(window.location.search).get(name);
    }

    // Most-recent-first sort key for a free-text `season` field (CS-23).
    // "24/25" -> 2024, "2010/2011" -> 2010, "1998" -> 1998; unparseable/absent
    // sorts last (-Infinity), same "never invents, degrades gracefully"
    // spirit as everywhere else season is handled in this codebase.
    function seasonSortKey(season) {
        const m = String(season == null ? "" : season).match(/(\d{2,4})/);
        if (!m) return -Infinity;
        let year = parseInt(m[1], 10);
        if (m[1].length === 2) year += year <= 30 ? 2000 : 1900; // "24" -> 2024, "97" -> 1997
        return year;
    }

    // `addedAt` is when a product first entered our catalog (products.json,
    // stamped once by the pipeline and preserved -- NOT createdAt, which is just
    // the run time). Products predating the field have no addedAt.
    //
    // Two SEPARATE behaviors, deliberately decoupled:
    //  - the "Novo" BADGE is time-limited (isNew: within NEW_WINDOW_DAYS), so it
    //    disappears on its own after the window;
    //  - the ORDERING is PERMANENT: products sort by addedAt (newest first) and
    //    never fall back down when the badge expires. A just-added jersey floats
    //    to the top regardless of whether its title carries a year/season (which
    //    otherwise sinks it via seasonSortKey), and stays in recency order
    //    afterwards; the baseline (no addedAt) keeps season-descending order
    //    below it.
    const NEW_WINDOW_DAYS = 30;
    function addedAtKey(p) {
        const t = p && p.addedAt ? Date.parse(p.addedAt) : NaN;
        return isNaN(t) ? 0 : t;
    }
    function isNew(p) {
        const t = addedAtKey(p);
        return t > 0 && (Date.now() - t) <= NEW_WINDOW_DAYS * 86400000;
    }
    function productSort(a, b) {
        const aa = addedAtKey(a), ba = addedAtKey(b);
        if (aa !== ba) return ba - aa;                 // added first, newest addedAt first (permanent)
        return seasonSortKey(b.season) - seasonSortKey(a.season);  // baseline/tie: by season
    }

    // RN-001: browse surfaces list only AVAILABLE jerseys. Availability is read
    // per size, honouring RN-007 — `stock: null` means UNTRACKED (still
    // sellable), so only a size explicitly flagged unavailable (stock 0) counts
    // as out of stock. A jersey is browsable when at least one size is sellable;
    // with no sizes we fall back to the product flag. This deliberately does NOT
    // use Filters.inStock, which treats null stock as 0 and would wrongly hide
    // every untracked jersey. A product the pipeline marked unavailable (every
    // size stock 0 — left the source, or a duplicate the operator consolidated
    // via disabled_products.json) drops out of every listing here while its
    // record and its direct detail link survive (RN-002). Detail lookups (by
    // slug) intentionally do NOT filter.
    function isBrowsable(p) {
        const sizes = Array.isArray(p && p.sizes) ? p.sizes : [];
        if (sizes.length) return sizes.some((s) => s && s.available !== false);
        return !p || p.available !== false;
    }

    // Generic, name-driven placeholder (jersey icon + monogram) for any
    // entity without a real image yet — scales to any number of
    // collections/leagues/clubs, no per-entity artwork needed. Falls back to
    // the plain brand mark if ImageLoader isn't available for some reason.
    function brandedMark(cls, size, name) {
        if (window.ImageLoader && ImageLoader.genericMark) {
            return ImageLoader.genericMark(name, { className: cls, width: size[0], height: size[1] });
        }
        return `<img class="${cls}" src="assets/images/symbol.png" alt="" ` +
               `width="${size[0]}" height="${size[1]}" loading="lazy" decoding="async">`;
    }

    /* ---------- SEO helpers (CS-13) ---------- */

    // Resolve an OG image path for a category asset, or null (SEO falls back
    // to the brand default). Paths are relative; SEO.abs() makes them absolute.
    function seoImage(category, name) {
        if (!name) return null;
        return window.ImageLoader
            ? ImageLoader.getImage(category, name)
            : `assets/images/${category}/${name}`;
    }

    function leagueCrumbs(collection, league) {
        const items = [{ name: "Home", url: "/" }, { name: "Collections", url: "/#collections" }];
        if (collection) {
            items.push({ name: collection.name, url: `/pages/collection.html?slug=${encodeURIComponent(collection.slug)}` });
        }
        items.push({ name: league.name, url: `/pages/league.html?slug=${encodeURIComponent(league.slug)}` });
        return items;
    }

    function regionCrumbs(collection, league, region) {
        const items = leagueCrumbs(collection, league);
        items.push({ name: region.name, url: `/pages/region.html?slug=${encodeURIComponent(region.slug)}` });
        return items;
    }

    function clubCrumbs(collection, league, region, club) {
        const items = [{ name: "Home", url: "/" }, { name: "Collections", url: "/#collections" }];
        if (collection) {
            items.push({ name: collection.name, url: `/pages/collection.html?slug=${encodeURIComponent(collection.slug)}` });
        }
        if (league) {
            items.push({ name: league.name, url: `/pages/league.html?slug=${encodeURIComponent(league.slug)}` });
        }
        if (region) {
            items.push({ name: region.name, url: `/pages/region.html?slug=${encodeURIComponent(region.slug)}` });
        }
        items.push({ name: club.name, url: `/pages/club.html?slug=${encodeURIComponent(club.slug)}` });
        return items;
    }

    function jerseyCrumbs(collection, league, region, club, jersey) {
        const items = club ? clubCrumbs(collection, league, region, club)
                           : [{ name: "Home", url: "/" }, { name: "Collections", url: "/#collections" }];
        items.push({ name: jersey.name, url: `/pages/jersey.html?slug=${encodeURIComponent(jersey.slug)}` });
        return items;
    }

    /* ---------- collection card (index grid) ---------- */

    function collectionMedia(c) {
        if (c.image && window.ImageLoader) {
            return ImageLoader.imageTag(ImageLoader.getImage("collections", c.image), {
                alt: c.name, className: "collection-card__photo"
            });
        }
        return brandedMark("collection-card__mark", [150, 105], I18N.properNoun(c.name));
    }

    function collectionHref(c) {
        return `pages/collection.html?slug=${encodeURIComponent(c.slug)}`;
    }

    function collectionCard(c) {
        const name = esc(I18N.properNoun(c.name));
        const cta = I18N.t("collections.exploreCta");
        return `
            <article class="collection-card reveal" role="listitem"
                     data-slug="${esc(c.slug)}" data-featured="${c.featured ? "true" : "false"}">
                <div class="collection-card__media">
                    <div class="collection-card__img">${collectionMedia(c)}</div>
                </div>
                <div class="collection-card__body">
                    <h3 class="collection-card__title">${name}</h3>
                    <p class="collection-card__desc">${esc(c.description)}</p>
                    <a class="btn btn--secondary collection-card__cta"
                       href="${collectionHref(c)}"
                       aria-label="${cta} ${name}">
                        ${cta} <span class="arrow" aria-hidden="true">&rarr;</span>
                    </a>
                </div>
            </article>`;
    }

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

    /* ---------- club card (detail grid) ---------- */

    function clubMedia(club) {
        const name = I18N.properNoun(club.name);
        if (club.image && window.ImageLoader) {
            return ImageLoader.imageTag(ImageLoader.getImage("clubs", club.image), {
                alt: name, className: "club-card__photo"
            });
        }
        return brandedMark("club-card__mark", [80, 56], name);
    }

    function clubCard(club) {
        const name = esc(I18N.properNoun(club.name));
        const meta = esc(club.country);
        const cta = I18N.t("clubCard.viewJerseys");
        return `
            <article class="club-card reveal" role="listitem" data-slug="${esc(club.slug)}">
                <div class="club-card__media">
                    <div class="club-card__img">${clubMedia(club)}</div>
                </div>
                <div class="club-card__body">
                    <h3 class="club-card__name">${name}</h3>
                    <p class="club-card__meta">${meta}</p>
                    <a class="club-card__cta" href="pages/club.html?slug=${encodeURIComponent(club.slug)}"
                       aria-label="${cta} — ${name}">
                        ${cta} <span class="arrow" aria-hidden="true">&rarr;</span>
                    </a>
                </div>
            </article>`;
    }

    /* ---------- league card (collection detail grid) ----------
       Visually a league is a named entity within a collection, same shape as
       a club within a league — reuses .club-card CSS, no new styles needed. */

    function leagueMedia(league) {
        const name = I18N.properNoun(league.name);
        if (league.image && window.ImageLoader) {
            return ImageLoader.imageTag(ImageLoader.getImage("leagues", league.image), {
                alt: name, className: "club-card__photo"
            });
        }
        return brandedMark("club-card__mark", [80, 56], name);
    }

    function leagueCard(league) {
        const name = esc(I18N.properNoun(league.name));
        const cta = I18N.t("leagueCard.viewClubs");
        return `
            <article class="club-card reveal" role="listitem" data-slug="${esc(league.slug)}">
                <div class="club-card__media">
                    <div class="club-card__img">${leagueMedia(league)}</div>
                </div>
                <div class="club-card__body">
                    <h3 class="club-card__name">${name}</h3>
                    <p class="club-card__meta">${esc(league.country)}</p>
                    <a class="club-card__cta" href="pages/league.html?slug=${encodeURIComponent(league.slug)}"
                       aria-label="${cta} — ${name}">
                        ${cta} <span class="arrow" aria-hidden="true">&rarr;</span>
                    </a>
                </div>
            </article>`;
    }

    /* ---------- region card (league detail grid, Brasileirão only — MI-06/CS-23) ----------
       Same shape as club/league cards — reuses .club-card CSS, no new styles. */

    function regionMedia(region) {
        const name = I18N.properNoun(region.name);
        if (region.image && window.ImageLoader) {
            return ImageLoader.imageTag(ImageLoader.getImage("regions", region.image), {
                alt: name, className: "club-card__photo"
            });
        }
        return brandedMark("club-card__mark", [80, 56], name);
    }

    function regionCard(region) {
        const name = esc(I18N.properNoun(region.name));
        const cta = I18N.t("regionCard.viewClubs");
        return `
            <article class="club-card reveal" role="listitem" data-slug="${esc(region.slug)}">
                <div class="club-card__media">
                    <div class="club-card__img">${regionMedia(region)}</div>
                </div>
                <div class="club-card__body">
                    <h3 class="club-card__name">${name}</h3>
                    <a class="club-card__cta" href="pages/region.html?slug=${encodeURIComponent(region.slug)}"
                       aria-label="${cta} — ${name}">
                        ${cta} <span class="arrow" aria-hidden="true">&rarr;</span>
                    </a>
                </div>
            </article>`;
    }

    /* ---------- generic render helpers ---------- */

    function renderSkeletons(grid, n = SKELETON_COUNT) {
        if (!grid) return;
        grid.setAttribute("aria-busy", "true");
        grid.innerHTML = Array.from({ length: n }, skeletonCard).join("");
    }

    function fillGrid(grid, list, template, emptyMsg) {
        if (!grid) return;
        grid.innerHTML = list.length
            ? list.map(template).join("")
            : `<p class="catalog__empty">${emptyMsg}</p>`;
        grid.setAttribute("aria-busy", "false");
        if (window.ImageLoader) ImageLoader.hydrate(grid);
        document.dispatchEvent(new CustomEvent("collections:rendered", { detail: { grid } }));
    }

    function renderCollections(grid, list = []) {
        fillGrid(grid, list, collectionCard, I18N.t("collections.empty"));
    }

    function renderClubs(grid, list = []) {
        fillGrid(grid, list, clubCard, I18N.t("collectionDetail.clubsEmpty"));
    }

    function renderLeagues(grid, list = []) {
        fillGrid(grid, list, leagueCard, I18N.t("collectionDetail.leaguesEmpty"));
    }

    function renderRegions(grid, list = []) {
        fillGrid(grid, list, regionCard, I18N.t("leagueDetail.regionsEmpty"));
    }

    /* ---------- detail page ---------- */

    function detailMedia(c, category = "collections") {
        const name = I18N.properNoun(c.name);
        if (c.image && window.ImageLoader) {
            return ImageLoader.imageTag(ImageLoader.getImage(category, c.image), {
                alt: name, className: "detail__photo"
            });
        }
        return brandedMark("detail__mark", [220, 154], name);
    }

    function detailTemplate(c, hasLeagues = true, jerseyCount = 0) {
        const name = esc(I18N.properNoun(c.name));
        // A collection with no leagues/clubs of its own (NBA, Acessórios)
        // lists its jerseys directly instead -- same "flat archive" section
        // as a club page, just scoped by collectionId (CS-62).
        const countLabel = jerseyCount === 1
            ? I18N.t("clubDetail.jerseySingular") : `${jerseyCount} ${I18N.t("clubDetail.jerseyPlural")}`;
        const listSection = hasLeagues
            ? `<section class="section" aria-labelledby="leaguesTitle">
                    <div class="section__inner">
                        <header class="section__head">
                            <p class="section__eyebrow">${I18N.t("collectionDetail.leaguesEyebrow")}</p>
                            <h2 class="section__title" id="leaguesTitle">${I18N.t("collectionDetail.leaguesTitle")}</h2>
                            <div class="section__divider"></div>
                            <p class="section__subtitle">${I18N.t("collectionDetail.leaguesSubtitle", { name })}</p>
                        </header>
                        <div class="grid" id="leaguesGrid" role="list" aria-busy="true"></div>
                    </div>
               </section>`
            : `<section class="section" aria-labelledby="jerseysTitle">
                    <div class="section__inner">
                        <header class="section__head">
                            <p class="section__eyebrow">${I18N.t("clubDetail.archiveEyebrow")}</p>
                            <h2 class="section__title" id="jerseysTitle">${I18N.t("clubDetail.jerseysTitle")}</h2>
                            <div class="section__divider"></div>
                            <p class="section__subtitle">${I18N.t("clubDetail.jerseysSubtitle", { countLabel, name })}</p>
                        </header>
                        <div class="grid" id="jerseysGrid" role="list" aria-busy="true"></div>
                    </div>
               </section>`;
        return `
            <nav class="breadcrumb" aria-label="Breadcrumb">
                <a class="breadcrumb__link" href="index.html#collections">${I18N.t("breadcrumb.collections")}</a>
                <span class="breadcrumb__sep" aria-hidden="true">/</span>
                <span class="breadcrumb__current" aria-current="page">${name}</span>
            </nav>

            <header class="detail__banner">
                <div class="detail__media">${detailMedia(c)}</div>
                <div class="detail__overlay">
                    ${c.featured ? `<span class="badge">${I18N.t("collectionDetail.featured")}</span>` : ""}
                    <p class="detail__eyebrow">${I18N.t("collectionDetail.eyebrow")}</p>
                    <h1 class="detail__title">${name}</h1>
                    ${c.country ? `<p class="detail__meta"><span>${esc(c.country)}</span></p>` : ""}
                </div>
            </header>

            <div class="detail__intro">
                <p class="detail__desc">${esc(c.description)}</p>
            </div>

            ${listSection}`;
    }

    function leagueDetailTemplate(league, collection, hasRegions) {
        const name = esc(I18N.properNoun(league.name));
        const collLink = collection
            ? `<a class="breadcrumb__link" href="pages/collection.html?slug=${encodeURIComponent(collection.slug)}">${esc(I18N.properNoun(collection.name))}</a>
               <span class="breadcrumb__sep" aria-hidden="true">/</span>`
            : "";
        // Most leagues list clubs directly; Brasileirão (today the only one
        // with regions -- MI-06) lists region cards instead, one level up
        // from clubs. Everything else about the page is unchanged either way.
        const listSection = hasRegions
            ? `<section class="section" aria-labelledby="regionsTitle">
                    <div class="section__inner">
                        <header class="section__head">
                            <p class="section__eyebrow">${I18N.t("leagueDetail.regionsEyebrow")}</p>
                            <h2 class="section__title" id="regionsTitle">${I18N.t("leagueDetail.regionsTitle")}</h2>
                            <div class="section__divider"></div>
                            <p class="section__subtitle">${I18N.t("leagueDetail.regionsSubtitle", { name })}</p>
                        </header>
                        <div class="grid" id="regionsGrid" role="list" aria-busy="true"></div>
                    </div>
               </section>`
            : `<section class="section" aria-labelledby="clubsTitle">
                    <div class="section__inner">
                        <header class="section__head">
                            <p class="section__eyebrow">${I18N.t("collectionDetail.clubsEyebrow")}</p>
                            <h2 class="section__title" id="clubsTitle">${I18N.t("collectionDetail.clubsTitle")}</h2>
                            <div class="section__divider"></div>
                            <p class="section__subtitle">${I18N.t("collectionDetail.clubsSubtitle", { name })}</p>
                        </header>
                        <div class="grid" id="clubsGrid" role="list" aria-busy="true"></div>
                    </div>
               </section>`;
        return `
            <nav class="breadcrumb" aria-label="Breadcrumb">
                <a class="breadcrumb__link" href="index.html#collections">${I18N.t("breadcrumb.collections")}</a>
                <span class="breadcrumb__sep" aria-hidden="true">/</span>
                ${collLink}
                <span class="breadcrumb__current" aria-current="page">${name}</span>
            </nav>

            <header class="detail__banner">
                <div class="detail__media">${detailMedia(league, "leagues")}</div>
                <div class="detail__overlay">
                    ${league.featured ? `<span class="badge">${I18N.t("collectionDetail.featured")}</span>` : ""}
                    <p class="detail__eyebrow">${I18N.t("leagueDetail.eyebrow")}</p>
                    <h1 class="detail__title">${name}</h1>
                    ${league.country ? `<p class="detail__meta"><span>${esc(league.country)}</span></p>` : ""}
                </div>
            </header>

            <div class="detail__intro">
                <p class="detail__desc">${esc(league.description)}</p>
            </div>

            ${listSection}`;
    }

    /* ---------- region page (clubs) — MI-06/CS-23, mirrors the league page ---------- */

    function regionDetailTemplate(region, league, collection) {
        const name = esc(I18N.properNoun(region.name));
        const collLink = collection
            ? `<a class="breadcrumb__link" href="pages/collection.html?slug=${encodeURIComponent(collection.slug)}">${esc(I18N.properNoun(collection.name))}</a>
               <span class="breadcrumb__sep" aria-hidden="true">/</span>`
            : "";
        const leagueLink = league
            ? `<a class="breadcrumb__link" href="pages/league.html?slug=${encodeURIComponent(league.slug)}">${esc(I18N.properNoun(league.name))}</a>
               <span class="breadcrumb__sep" aria-hidden="true">/</span>`
            : "";
        return `
            <nav class="breadcrumb" aria-label="Breadcrumb">
                <a class="breadcrumb__link" href="index.html#collections">${I18N.t("breadcrumb.collections")}</a>
                <span class="breadcrumb__sep" aria-hidden="true">/</span>
                ${collLink}${leagueLink}
                <span class="breadcrumb__current" aria-current="page">${name}</span>
            </nav>

            <header class="detail__banner">
                <div class="detail__media">${detailMedia(region, "regions")}</div>
                <div class="detail__overlay">
                    <p class="detail__eyebrow">${I18N.t("regionDetail.eyebrow")}</p>
                    <h1 class="detail__title">${name}</h1>
                    ${region.country ? `<p class="detail__meta"><span>${esc(region.country)}</span></p>` : ""}
                </div>
            </header>

            <section class="section" aria-labelledby="clubsTitle">
                <div class="section__inner">
                    <header class="section__head">
                        <p class="section__eyebrow">${I18N.t("collectionDetail.clubsEyebrow")}</p>
                        <h2 class="section__title" id="clubsTitle">${I18N.t("collectionDetail.clubsTitle")}</h2>
                        <div class="section__divider"></div>
                        <p class="section__subtitle">${I18N.t("collectionDetail.clubsSubtitle", { name })}</p>
                    </header>
                    <div class="grid" id="clubsGrid" role="list" aria-busy="true"></div>
                </div>
            </section>`;
    }

    function renderNotFound(root, label) {
        const labelKey = label === "League" ? "common.labelLeague"
            : label === "Region" ? "common.labelRegion"
            : label === "Club" ? "common.labelClub"
            : label === "Jersey" ? "common.labelJersey" : "common.labelCollection";
        root.setAttribute("aria-busy", "false");
        root.innerHTML = `
            <div class="detail__notfound">
                <p class="detail__eyebrow">${esc(I18N.t(labelKey))}</p>
                <h1 class="detail__title">${I18N.t("notFound.title")}</h1>
                <p class="detail__desc">${I18N.t("notFound.desc")}</p>
                <a class="btn btn--secondary" href="index.html#collections">${I18N.t("notFound.cta")}</a>
            </div>`;
    }

    /* ---------- club page (jerseys) ---------- */

    function clubCrest(club) {
        const name = I18N.properNoun(club.name);
        if (club.image && window.ImageLoader) {
            return ImageLoader.imageTag(ImageLoader.getImage("clubs", club.image), {
                alt: name + " crest", className: "club-hero__badge"
            });
        }
        return brandedMark("club-hero__mark", [90, 63], name);
    }

    // A product can carry one or more videos: `videos` (array) is canonical,
    // `video` (string) is accepted as a single-item shorthand. Paths resolve
    // against <base href="../"> like every other asset.
    function productVideos(p) {
        if (!p) return [];
        if (Array.isArray(p.videos)) return p.videos.filter(Boolean);
        return p.video ? [p.video] : [];
    }

    // Which video plays on a listing card: ONLY the operator's chosen
    // catalogVideo (when it's one of the product's videos). No default -- a
    // product can have videos as stories with NO card video (card shows the
    // image). The pipeline sets catalogVideo when a card video is intended.
    function catalogVideo(p) {
        const vids = productVideos(p);
        if (!vids.length) return "";
        return vids.indexOf(p && p.catalogVideo) !== -1 ? p.catalogVideo : "";
    }

    function jerseyMedia(p) {
        const primary = Array.isArray(p.images) && p.images.length
            ? (p.images.find((im) => im.primary) || p.images[0])
            : null;
        // A registered video plays in place of the photo on listing cards
        // (autoplay + muted + loop, like an animated preview). The primary photo
        // is the poster, so there's an instant frame before the video loads.
        const cardVideo = catalogVideo(p);
        if (cardVideo) {
            const poster = primary && primary.url && window.ImageLoader
                ? ImageLoader.getImage("jerseys", primary.url) : "";
            return `<video class="jersey-card__photo jersey-card__video" `
                 + `src="${esc(ImageLoader.assetUrl(cardVideo))}"${poster ? ` poster="${esc(poster)}"` : ""} `
                 + `autoplay loop muted playsinline preload="metadata" `
                 + `aria-label="${esc(p.name)}"></video>`;
        }
        if (primary && primary.url && window.ImageLoader) {
            return ImageLoader.imageTag(ImageLoader.getImage("jerseys", primary.url), {
                alt: p.name, className: "jersey-card__photo"
            });
        }
        return brandedMark("jersey-card__mark", [110, 77], p.name);
    }

    // MI-03: the only price string ever shown -- pre-formatted by the
    // pipeline's Pricing Engine (product.formattedPrice), picked for the
    // active currency. No calculation, no number formatting happens here.
    function jerseyPriceHtml(p) {
        if (!window.CurrencyService) return "";
        const text = CurrencyService.formattedPriceFor(p);
        if (!text) return "";
        // de/por: when an operator override/promotion lowered the price, strike
        // the original. The promo LABEL is shown as a badge over the card image
        // (jersey-card__promo), like the "Novo" badge -- not next to the price.
        const was = CurrencyService.compareAtFormattedFor(p);
        const old = was ? `<span class="price-was">${esc(was)}</span> ` : "";
        const cls = "jersey-card__price" + (was ? " is-promo" : "");
        return `<p class="${cls}">${old}<span class="price-now">${esc(text)}</span></p>`;
    }

    // Personalization (name + number printing): a plain observation, not an
    // order option -- the source only exposes a with/without toggle (no
    // free-text name/number field to collect), so this is display-only,
    // matching the "M11NTX intermediates, availability confirmed via
    // Instagram" model everywhere else on the jersey detail page.
    // Taxa de personalização (config persoFee, em BRL) formatada na moeda ativa
    // usando o câmbio do próprio produto (preço[cur]/preço[BRL]). Fonte única
    // compartilhada pela nota da página e pelo toggle do order box (cart.js usa
    // a mesma regra), para o "+R$40" bater sempre com o carrinho.
    function persoFeeLabel(p) {
        const fee = (window.CONFIG && Number.isFinite(CONFIG.persoFee)) ? CONFIG.persoFee : 40;
        if (!window.CurrencyService) return "R$ " + fee.toFixed(2).replace(".", ",");
        const cur = CurrencyService.getCurrency();
        const brl = p && p.price && typeof p.price.BRL === "number" ? p.price.BRL : 0;
        const curAmt = p && p.price && typeof p.price[cur] === "number" ? p.price[cur] : brl;
        const feeCur = brl > 0 ? fee * (curAmt / brl) : fee;
        const loc = (CurrencyService.CURRENCY_TO_LOCALE && CurrencyService.CURRENCY_TO_LOCALE[cur]) || "pt-BR";
        try { return new Intl.NumberFormat(loc, { style: "currency", currency: cur }).format(feeCur); }
        catch (_) { return "R$ " + fee.toFixed(2).replace(".", ","); }
    }

    function jerseyPersonalizationHtml(p) {
        if (!p || !p.personalizationAvailable || !window.CurrencyService) return "";
        return `<p class="jersey__personalization">${esc(I18N.t("jerseyDetail.personalizationNote", { price: persoFeeLabel(p) }))}</p>`;
    }

    function jerseyCard(p) {
        const name = esc(I18N.translateName(p.name));
        const meta = [esc(I18N.fieldLabel("category", p.category)), esc(p.season)]
            .filter(Boolean).join(" · ");
        const cta = I18N.t("jerseyCard.viewDetails");
        // Ação rápida: adicionar ao pedido sem abrir o produto. Com grade de
        // tamanhos, um popover pede o tamanho ali mesmo no card; sem grade,
        // adiciona direto. Dados vão em atributos p/ um handler delegado.
        const qaSizes = (Array.isArray(p.sizes) ? p.sizes : [])
            .map((s) => (typeof s === "string" ? s : s && s.size)).filter(Boolean);
        const qaPrimary = Array.isArray(p.images) && p.images.length
            ? (p.images.find((im) => im.primary) || p.images[0]) : null;
        const qaCover = qaPrimary && qaPrimary.url && window.ImageLoader
            ? ImageLoader.getImage("jerseys", qaPrimary.url) : "";
        const qaPrice = p.price && typeof p.price.BRL === "number" ? p.price.BRL : 0;
        const quickAdd = window.Cart ? `
                    <button type="button" class="jersey-card__quick" aria-label="${esc(I18N.t("jerseyCard.quickAdd"))} — ${name}"
                            data-qa-id="${esc(p.id)}" data-qa-name="${name}" data-qa-price="${qaPrice}"
                            data-qa-prices='${esc(JSON.stringify(p.price || {}))}' data-qa-image="${esc(qaCover)}">
                        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                    <div class="jersey-card__qa" hidden>
                        <p class="jersey-card__qa-label">${esc(I18N.t("jerseyDetail.sizesLabel"))}</p>
                        <div class="jersey-card__qa-sizes">
                            ${qaSizes.map((s) => `<button type="button" class="size-chip jersey-card__qa-size" data-size="${esc(s)}">${esc(I18N.sizeLabel(s))}</button>`).join("")}
                        </div>
                        <button type="button" class="jersey-card__qa-close" aria-label="${esc(I18N.t("common.close"))}">&times;</button>
                    </div>` : "";
        return `
            <article class="jersey-card reveal" role="listitem" data-id="${esc(p.id)}">
                <div class="jersey-card__media">
                    <div class="jersey-card__img">${jerseyMedia(p)}</div>
                    ${p.promotion && p.promotion.label ? `<span class="badge badge--promo jersey-card__promo">${esc(p.promotion.label)}</span>` : ""}
                    ${isNew(p) ? `<span class="badge badge--new jersey-card__new">${esc(I18N.t("jerseyCard.new"))}</span>` : ""}
                    ${p.type ? `<span class="badge jersey-card__type">${esc(I18N.fieldLabel("type", p.type))}</span>` : ""}
                    ${quickAdd}
                </div>
                <div class="jersey-card__body">
                    <p class="jersey-card__brand">${esc(p.brand)}</p>
                    <h3 class="jersey-card__name">${name}</h3>
                    <p class="jersey-card__meta">${meta}</p>
                    ${jerseyPriceHtml(p)}
                    <a class="btn btn--secondary jersey-card__cta"
                       href="pages/jersey.html?slug=${encodeURIComponent(p.slug)}"
                       aria-label="${cta} — ${name}">
                        ${cta} <span class="arrow" aria-hidden="true">&rarr;</span>
                    </a>
                </div>
            </article>`;
    }

    // MI-03: tracks the most-recently-rendered jersey grid so a language/
    // currency change can re-render it from the SAME already-fetched list
    // (no re-fetch) -- see the "language:change"/"currency:change" listeners
    // registered once, below.
    let _lastJerseyGrid = null;
    let _lastJerseyList = null;
    let _lastJerseyDetail = null;
    // MI-03/CS-59 follow-up: every OTHER page (collections grid, collection/
    // league/region/club detail) injects its content as one static
    // `root.innerHTML = someTemplate(...)` string built from I18N.t() calls
    // evaluated at render time -- unlike the nav/footer (data-i18n
    // attributes, refreshed by I18N.applyStatic() on every language change),
    // that HTML is baked in the CURRENT language the moment it's written and
    // nothing re-runs those I18N.t() calls on its own. Each init*() function
    // below sets this to a zero-arg closure that repeats its own render step
    // (never re-fetches -- the data is already in the closure) so a
    // language/currency change can call it again, same pattern as the
    // jersey trackers above.
    let _lastPageRerender = null;

    // MI-03: a language/currency change never re-fetches the catalog -- it
    // just re-runs the SAME render call(s) against the SAME already-fetched
    // data still held in the trackers above. Registered once; safe because
    // each page loads catalog.js fresh (never re-executed on the same page)
    // and only ever populates the tracker(s) its own page uses.
    function rerenderLocalizedContent() {
        if (_lastJerseyGrid) {
            fillGrid(_lastJerseyGrid, _lastJerseyList, jerseyCard, I18N.t("clubDetail.empty"));
        }
        if (_lastJerseyDetail) {
            const d = _lastJerseyDetail;
            d.root.innerHTML = jerseyDetailTemplate(d.jersey, d.club, d.league, d.region, d.collection);
            d.root.setAttribute("aria-busy", "false");
            if (window.ImageLoader) ImageLoader.hydrate(d.root);
            document.dispatchEvent(new CustomEvent("jersey:rendered", { detail: { root: d.root } }));
        }
        if (_lastPageRerender) _lastPageRerender();
    }
    if (typeof document !== "undefined") {
        document.addEventListener("language:change", rerenderLocalizedContent);
        document.addEventListener("currency:change", rerenderLocalizedContent);
    }

    function renderJerseys(grid, list = []) {
        _lastJerseyGrid = grid;
        _lastJerseyList = list;
        fillGrid(grid, list, jerseyCard, I18N.t("clubDetail.empty"));
    }

    function clubDetailTemplate(club, league, region, collection, count) {
        const name = esc(I18N.properNoun(club.name));
        const collLink = collection
            ? `<a class="breadcrumb__link" href="pages/collection.html?slug=${encodeURIComponent(collection.slug)}">${esc(I18N.properNoun(collection.name))}</a>
               <span class="breadcrumb__sep" aria-hidden="true">/</span>`
            : "";
        const leagueLink = league
            ? `<a class="breadcrumb__link" href="pages/league.html?slug=${encodeURIComponent(league.slug)}">${esc(I18N.properNoun(league.name))}</a>
               <span class="breadcrumb__sep" aria-hidden="true">/</span>`
            : "";
        const regionLink = region
            ? `<a class="breadcrumb__link" href="pages/region.html?slug=${encodeURIComponent(region.slug)}">${esc(I18N.properNoun(region.name))}</a>
               <span class="breadcrumb__sep" aria-hidden="true">/</span>`
            : "";
        const meta = esc(club.country);
        const unit = count === 1 ? I18N.t("clubDetail.jerseySingular") : I18N.t("clubDetail.jerseyPlural");
        const countLabel = count + " " + unit;
        const leagueName = league ? I18N.properNoun(league.name) : "";
        return `
            <nav class="breadcrumb" aria-label="Breadcrumb">
                <a class="breadcrumb__link" href="index.html#collections">${I18N.t("breadcrumb.collections")}</a>
                <span class="breadcrumb__sep" aria-hidden="true">/</span>
                ${collLink}${leagueLink}${regionLink}
                <span class="breadcrumb__current" aria-current="page">${name}</span>
            </nav>

            <header class="club-hero">
                <div class="club-hero__crest">${clubCrest(club)}</div>
                <div class="club-hero__info">
                    <p class="detail__eyebrow">${esc(leagueName)}</p>
                    <h1 class="detail__title">${name}</h1>
                    <p class="detail__meta">
                        ${meta ? `<span>${meta}</span><span class="detail__dot" aria-hidden="true">·</span>` : ""}
                        <span>${countLabel}</span>
                    </p>
                </div>
            </header>

            <section class="section" aria-labelledby="jerseysTitle">
                <div class="section__inner">
                    <header class="section__head">
                        <p class="section__eyebrow">${I18N.t("clubDetail.archiveEyebrow")}</p>
                        <h2 class="section__title" id="jerseysTitle">${I18N.t("clubDetail.jerseysTitle")}</h2>
                        <div class="section__divider"></div>
                        <p class="section__subtitle">${I18N.t("clubDetail.jerseysSubtitle", { countLabel, name })}</p>
                    </header>
                    <div id="segmentTabs"></div>
                    <div class="grid" id="jerseysGrid" role="list" aria-busy="true"></div>
                </div>
            </section>`;
    }

    /* ---------- jersey page (details + gallery) ---------- */

    function galleryImages(p) {
        const arr = Array.isArray(p.images) && p.images.length
            ? p.images.map((im) => im.url)
            : (p.image ? [p.image] : []);
        return arr.map((name) =>
            window.ImageLoader ? ImageLoader.getImage("jerseys", name) : name);
    }

    function jerseyGallery(p) {
        const imgs = galleryImages(p);
        if (!imgs.length) {
            // no photos yet -> branded placeholder, no thumbnails
            return `
                <div class="gallery">
                    <div class="gallery__main">
                        <div class="gallery__stage gallery__stage--placeholder">
                            ${brandedMark("gallery__mark", [220, 154], p.name)}
                        </div>
                    </div>
                </div>`;
        }
        const thumbs = imgs.map((src, i) => `
                <button type="button" class="gallery__thumb${i === 0 ? " is-active" : ""}"
                        data-src="${esc(src)}" aria-label="View image ${i + 1}">
                    <img class="img-lazy" src="${esc(src)}" alt="" loading="lazy" decoding="async">
                </button>`).join("");
        return `
            <div class="gallery">
                <div class="gallery__main" id="galleryMain">
                    <img class="gallery__img" id="galleryImg" src="${esc(imgs[0])}"
                         alt="${esc(p.name)}" decoding="async">
                </div>
                ${imgs.length > 1 ? `<div class="gallery__thumbs">${thumbs}</div>` : ""}
            </div>`;
    }

    // Instagram-stories entry point for a product's video(s): one circular
    // "story ring" per video (gradient ring + a product thumb + play badge) that
    // signals there are videos. Clicking a ring OPENS a fullscreen stories player
    // STARTING AT THAT video and auto-advancing through the rest -- 9:16, one
    // progress bar per video, tap zones for prev/next, mute toggle -- instead of
    // playing inline on the page. Ring 1 -> starts at video 1; ring 2 -> starts
    // at video 2; and so on.
    function jerseyStories(p) {
        const vids = productVideos(p);
        if (!vids.length) return "";
        const rings = vids.map((v, i) =>
            `<button type="button" class="story-ring" data-i="${i}" aria-haspopup="dialog"
                    aria-label="Ver vídeo ${i + 1} de ${vids.length}">
                <span class="story-ring__ring"><span class="story-ring__thumb">
                    <video class="story-ring__vid" src="${esc(ImageLoader.assetUrl(v))}#t=0.5" muted playsinline
                           preload="metadata" tabindex="-1"></video>
                    <span class="story-ring__play" aria-hidden="true">&#9658;</span>
                </span></span>
            </button>`
        ).join("");
        const bars = vids.map(() => `<span class="stories__bar"><i></i></span>`).join("");
        const slides = vids.map((v, i) =>
            `<video class="stories__video${i === 0 ? " is-active" : ""}" data-i="${i}" `
            + `src="${esc(ImageLoader.assetUrl(v))}" muted playsinline preload="none"></video>`
        ).join("");
        return `
            <div class="stories" data-count="${vids.length}">
                <div class="story-rings">${rings}</div>
                <div class="story-modal" role="dialog" aria-modal="true"
                     aria-label="Vídeos do produto" hidden>
                    <button type="button" class="story-modal__close" aria-label="Fechar">&times;</button>
                    <div class="stories__frame">
                        <div class="stories__bars">${bars}</div>
                        <div class="stories__slides">${slides}</div>
                        <button type="button" class="stories__zone stories__zone--prev" aria-label="Anterior"></button>
                        <button type="button" class="stories__zone stories__zone--next" aria-label="Próximo"></button>
                        <button type="button" class="stories__sound" aria-label="Som" aria-pressed="false">
                            <span class="stories__sound-on" hidden>&#128266;</span><span class="stories__sound-off">&#128263;</span>
                        </button>
                    </div>
                </div>
            </div>`;
    }

    function wireStories(root) {
        const box = root && root.querySelector(".stories");
        if (!box) return;
        const rings = Array.prototype.slice.call(box.querySelectorAll(".story-ring"));
        const modal = box.querySelector(".story-modal");
        const vids = Array.prototype.slice.call(box.querySelectorAll(".stories__video"));
        const bars = Array.prototype.slice.call(box.querySelectorAll(".stories__bar > i"));
        if (!vids.length || !modal || !rings.length) return;
        let idx = 0;
        function paint() { bars.forEach((b, i) => { b.style.width = i < idx ? "100%" : "0%"; }); }
        function show(i, play) {
            idx = (i + vids.length) % vids.length;
            vids.forEach((v, k) => { if (k !== idx) { v.pause(); v.classList.remove("is-active"); } });
            const v = vids[idx];
            v.classList.add("is-active");
            try { v.currentTime = 0; } catch (e) {}
            paint();
            if (play !== false) v.play().catch(() => {});
        }
        function open(start) {
            modal.hidden = false;
            document.body.classList.add("stories-open");
            show(start || 0);
        }
        function close() {
            vids.forEach((v) => v.pause());
            modal.hidden = true;
            document.body.classList.remove("stories-open");
        }
        function next() { if (idx >= vids.length - 1) close(); else show(idx + 1); }

        rings.forEach((r) => r.addEventListener("click", () => {
            const start = parseInt(r.getAttribute("data-i"), 10);
            open(isNaN(start) ? 0 : start);
        }));
        modal.querySelector(".story-modal__close").addEventListener("click", close);
        modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
        document.addEventListener("keydown", (e) => { if (!modal.hidden && e.key === "Escape") close(); });
        vids.forEach((v, i) => {
            v.addEventListener("timeupdate", () => {
                if (i === idx && v.duration) bars[i].style.width = (v.currentTime / v.duration * 100) + "%";
            });
            v.addEventListener("ended", next);
        });
        modal.querySelector(".stories__zone--next").addEventListener("click", next);
        modal.querySelector(".stories__zone--prev").addEventListener("click", () => show(idx - 1));
        const sound = modal.querySelector(".stories__sound");
        sound.addEventListener("click", () => {
            const unmute = vids[idx].muted;                 // currently muted -> turn sound on
            vids.forEach((v) => { v.muted = !unmute; });
            sound.setAttribute("aria-pressed", String(unmute));
            modal.querySelector(".stories__sound-on").hidden = !unmute;
            modal.querySelector(".stories__sound-off").hidden = unmute;
            vids[idx].play().catch(() => {});
        });
    }
    // wire the stories ring every time the jersey detail page (re)renders
    // Order box (cart.js): size picker + quantity stepper + "Adicionar ao pedido".
    function wireOrder(root) {
        if (!root) return;
        const box = root.querySelector(".order");
        if (!box) return;
        const sizes = Array.prototype.slice.call(box.querySelectorAll(".order__size"));
        sizes.forEach((b) => b.addEventListener("click", () => {
            sizes.forEach((x) => x.classList.remove("is-selected"));
            b.classList.add("is-selected");
            const err = box.querySelector(".order__err");
            if (err) err.remove();
        }));
        const val = box.querySelector(".qty__val");
        const step = (d) => { val.textContent = Math.max(1, (parseInt(val.textContent, 10) || 1) + d); };
        box.querySelector("[data-qminus]").addEventListener("click", () => step(-1));
        box.querySelector("[data-qplus]").addEventListener("click", () => step(1));

        // Personalização (nome/número) — checkbox revela os campos.
        const persoToggle = box.querySelector(".order__perso-toggle");
        const persoFields = box.querySelector(".order__perso-fields");
        const persoName = box.querySelector(".order__perso-name");
        const persoNum = box.querySelector(".order__perso-num");
        if (persoToggle) {
            persoToggle.addEventListener("change", () => {
                persoFields.classList.toggle("is-open", persoToggle.checked);
                if (persoToggle.checked) persoName.focus();
            });
            persoNum.addEventListener("input", () => { persoNum.value = persoNum.value.replace(/\D/g, "").slice(0, 3); });
        }

        box.querySelector(".order__add").addEventListener("click", () => {
            const sel = box.querySelector(".order__size.is-selected");
            if (sizes.length && !sel) {
                if (!box.querySelector(".order__err")) {
                    const p = document.createElement("p");
                    p.className = "order__err";
                    p.textContent = I18N.t("jerseyDetail.sizeRequired");
                    box.insertBefore(p, box.querySelector(".order__consult"));
                }
                return;
            }
            if (!window.Cart) return;
            const perso = persoToggle && persoToggle.checked && (persoName.value.trim() || persoNum.value.trim())
                ? { name: persoName.value.trim(), number: persoNum.value.trim() } : null;
            let prices = null;
            try { prices = JSON.parse(box.dataset.prices || "{}"); } catch (_) { prices = null; }
            window.Cart.add({
                id: box.dataset.id, name: box.dataset.name,
                size: sel ? sel.dataset.size : "",
                qty: parseInt(val.textContent, 10) || 1,
                price: parseFloat(box.dataset.price) || 0,
                prices: prices,
                image: box.dataset.image,
                perso,
            });
            // reset da personalização após adicionar (evita repetir sem querer)
            if (persoToggle && persoToggle.checked) { persoToggle.checked = false; persoFields.classList.remove("is-open"); persoName.value = ""; persoNum.value = ""; }
        });

        // CTA fixo no mobile: preço + "Adicionar ao pedido" sempre à mão.
        if (!root.querySelector(".jersey-sticky")) {
            const bar = document.createElement("div");
            bar.className = "jersey-sticky";
            const priceEl = root.querySelector(".jersey__price");
            bar.innerHTML = `<div class="jersey-sticky__price">${priceEl ? priceEl.innerHTML : ""}</div>`
                + `<button type="button" class="btn btn--primary jersey-sticky__btn">${esc(I18N.t("jerseyDetail.addToOrder"))}</button>`;
            root.appendChild(bar);
            bar.querySelector(".jersey-sticky__btn").addEventListener("click", () => {
                const sel = box.querySelector(".order__size.is-selected");
                if (sizes.length && !sel) { box.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
                const add = box.querySelector(".order__add"); if (add) add.click();
            });
        }
    }

    // Avaliações NO PRODUTO = vitrine somente-leitura: estrelas, nome e texto
    // (sem foto, sem formulário). A coleta acontece no menu "Avaliações"
    // (pages/reviews.html). A seção só aparece se houver avaliação aprovada
    // para este produto; sem registros, fica oculta (pedido do dono).
    const _stars = (n) => { n = Math.max(0, Math.min(5, Number(n) || 0)); return "★".repeat(n) + "☆".repeat(5 - n); };
    async function renderReviews(root) {
        const mount = root && root.querySelector("#reviews");
        if (!mount) return;
        mount.hidden = true; // padrão oculto; revela só com avaliações aprovadas
        const cfg = window.CONFIG || {};
        const url = cfg.supabaseUrl, anon = cfg.supabaseAnon;
        const pid = mount.dataset.pid;
        if (!url || !anon || !pid) return;
        const H = { apikey: anon, Authorization: "Bearer " + anon };
        let list = [];
        try {
            const r = await fetch(`${url}/rest/v1/reviews?product_id=eq.${encodeURIComponent(pid)}&status=eq.approved&order=created_at.desc&select=name,rating,comment`, { headers: H });
            list = await r.json(); if (!Array.isArray(list)) list = [];
        } catch (_) {}
        if (!list.length) return; // sem avaliação aprovada -> não mostra a seção
        mount.hidden = false;
        const avg = list.reduce((s, x) => s + (x.rating || 0), 0) / list.length;
        const listHtml = list.map((x) => `<article class="review">
                <div class="review__top"><span class="review__stars">${_stars(x.rating)}</span><b class="review__name">${esc(x.name || "")}</b></div>
                ${x.comment ? `<p class="review__text">${esc(x.comment)}</p>` : ""}
            </article>`).join("");
        mount.innerHTML = `<div class="section__inner reviews__inner">
                <header class="section__head reviews__head">
                    <p class="section__eyebrow">${esc(I18N.t("reviews.eyebrow"))}</p>
                    <h2 class="section__title">${esc(I18N.t("reviews.title"))}</h2>
                    <p class="reviews__avg"><span class="review__stars">${_stars(Math.round(avg))}</span> ${avg.toFixed(1)} · ${esc(I18N.t("reviews.count", { n: list.length }))}</p>
                </header>
                <div class="reviews__list">${listHtml}</div>
                <a class="btn btn--ghost reviews__cta" href="pages/reviews.html">${esc(I18N.t("reviews.writeCta"))} &rarr;</a>
            </div>`;
    }

    document.addEventListener("jersey:rendered", (e) => {
        const root = e.detail && e.detail.root;
        wireStories(root);
        wireOrder(root);
        renderReviews(root);
        wireSizeGuide(root);
    });

    // image_url guarda uma URL única (legado) OU um array JSON de URLs (novo,
    // p/ múltiplas fotos). Sem migração de schema: parse tolerante nos 2 lados
    // (esta vitrine e o admin usam a MESMA lógica).
    function reviewImgs(v) {
        if (!v) return [];
        if (typeof v === "string" && v[0] === "[") { try { const a = JSON.parse(v); return Array.isArray(a) ? a : []; } catch (_) { return [v]; } }
        return [v];
    }

    /* ---------- página "Avaliações" (menu do site) ----------
       Coleta central: qualquer pessoa avalia (nome, nota, texto, fotos) e um
       admin aprova. Mostra a "parede" de avaliações aprovadas (com fotos).
       Um campo de produto é OPCIONAL — se preenchido, a avaliação também
       aparece na página daquele produto (RN: lá é só estrelas/nome/texto). */
    async function initReviewsPage() {
        const root = document.getElementById("reviewsPage");
        if (!root) return;
        const titleKey = "reviews.pageTitle", subKey = "reviews.pageSubtitle";
        document.title = `M11NTX | ${I18N.t(titleKey)}`;
        if (window.SEO) SEO.set({ title: `M11NTX | ${I18N.t(titleKey)}`, description: I18N.t(subKey), canonical: "/pages/reviews.html" });

        const cfg = window.CONFIG || {};
        const url = cfg.supabaseUrl, anon = cfg.supabaseAnon;
        const H = { apikey: anon, Authorization: "Bearer " + anon };

        // typeahead opcional de produto (reusa o mesmo enrich dos filtros)
        let prod = [];
        try {
            const [p, cl, co, lg] = await Promise.all([API.getProducts(), API.getClubs(), API.getCollections(), API.getLeagues()]);
            prod = (window.Filters ? Filters.enrich(p, { clubs: cl, collections: co, leagues: lg }) : (Array.isArray(p) ? p : []));
        } catch (_) {}

        let chosen = null; // {id, name}

        const render = () => {
            root.innerHTML = `
                <nav class="breadcrumb" aria-label="Breadcrumb">
                    <a class="breadcrumb__link" href="index.html" data-i18n="breadcrumb.home">Home</a>
                    <span class="breadcrumb__sep" aria-hidden="true">/</span>
                    <span class="breadcrumb__current" aria-current="page">${esc(I18N.t(titleKey))}</span>
                </nav>
                <header class="section__head reviews-page__head">
                    <p class="section__eyebrow">${esc(I18N.t("reviews.eyebrow"))}</p>
                    <h1 class="section__title">${esc(I18N.t(titleKey))}</h1>
                    <div class="section__divider"></div>
                    <p class="section__subtitle">${esc(I18N.t(subKey))}</p>
                </header>
                <form class="reviews-page__form" id="revForm" novalidate>
                    <div class="reviews__rating" id="revRating" role="radiogroup" aria-label="${esc(I18N.t("reviews.rating"))}">
                        ${[1, 2, 3, 4, 5].map((i) => `<button type="button" class="reviews__star" data-v="${i}" aria-label="${i}">☆</button>`).join("")}
                    </div>
                    <input class="reviews__field" name="name" placeholder="${esc(I18N.t("reviews.yourName"))}" required>
                    <div class="reviews-page__typeahead">
                        <input class="reviews__field" id="revProduct" autocomplete="off" placeholder="${esc(I18N.t("reviews.productOptional"))}">
                        <div class="reviews-page__ta-results" id="revProductResults" hidden></div>
                    </div>
                    <textarea class="reviews__field" name="comment" rows="4" placeholder="${esc(I18N.t("reviews.comment"))}"></textarea>
                    <label class="reviews__photo">${esc(I18N.t("reviews.photos"))}<input type="file" id="revPhotos" name="photos" accept="image/*" multiple></label>
                    <button type="submit" class="btn btn--primary" id="revSubmit">${esc(I18N.t("reviews.submit"))}</button>
                    <p class="reviews__msg" id="revMsg" role="status"></p>
                </form>
                <div class="reviews-page__wall" id="revWall" aria-busy="true"></div>`;
            wire();
            loadWall();
        };

        function wire() {
            let rating = 0;
            const stEls = Array.prototype.slice.call(root.querySelectorAll(".reviews__star"));
            stEls.forEach((b) => b.addEventListener("click", () => { rating = +b.dataset.v; stEls.forEach((x, i) => { x.textContent = i < rating ? "★" : "☆"; }); }));

            // typeahead: filtra por nome/clube/temporada; clicar escolhe o produto
            const pInput = root.querySelector("#revProduct");
            const pRes = root.querySelector("#revProductResults");
            const showRes = (q) => {
                chosen = null;
                q = (q || "").trim().toLowerCase();
                if (q.length < 2) { pRes.hidden = true; pRes.innerHTML = ""; return; }
                const hits = prod.filter((x) => {
                    const hay = [x.name, x.clubName, x.season].map((s) => String(s || "").toLowerCase()).join(" ");
                    return q.split(/\s+/).every((tok) => hay.indexOf(tok) !== -1);
                }).slice(0, 6);
                if (!hits.length) { pRes.hidden = true; pRes.innerHTML = ""; return; }
                pRes.innerHTML = hits.map((x) => `<button type="button" class="reviews-page__ta-item" data-id="${esc(x.id)}" data-name="${esc(I18N.translateName(x.name))}">${esc(I18N.translateName(x.name))}${x.clubName ? ` · ${esc(x.clubName)}` : ""}${x.season ? ` · ${esc(x.season)}` : ""}</button>`).join("");
                pRes.hidden = false;
            };
            if (pInput) {
                let tmr = null;
                pInput.addEventListener("input", () => { clearTimeout(tmr); const v = pInput.value; tmr = setTimeout(() => showRes(v), 180); });
                pRes.addEventListener("click", (e) => {
                    const it = e.target.closest(".reviews-page__ta-item");
                    if (!it) return;
                    chosen = { id: it.dataset.id, name: it.dataset.name };
                    pInput.value = it.dataset.name; pRes.hidden = true; pRes.innerHTML = "";
                });
            }

            const form = root.querySelector("#revForm");
            form.addEventListener("submit", async (e) => {
                e.preventDefault();
                const msg = root.querySelector("#revMsg"), btn = root.querySelector("#revSubmit");
                const nm = form.name.value.trim();
                if (!url || !anon) { msg.textContent = I18N.t("reviews.fail"); msg.className = "reviews__msg is-err"; return; }
                if (!nm) { msg.textContent = I18N.t("reviews.needName"); msg.className = "reviews__msg is-err"; return; }
                if (!rating) { msg.textContent = I18N.t("reviews.needRating"); msg.className = "reviews__msg is-err"; return; }
                btn.disabled = true; msg.textContent = I18N.t("reviews.sending"); msg.className = "reviews__msg";
                try {
                    const files = Array.prototype.slice.call((root.querySelector("#revPhotos").files) || []).slice(0, 5);
                    const urls = [];
                    for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
                        const path = `wall/${Date.now()}-${i}-${Math.random().toString(36).slice(2)}.${ext}`;
                        const up = await fetch(`${url}/storage/v1/object/reviews/${path}`, {
                            method: "POST", headers: Object.assign({ "Content-Type": file.type || "image/jpeg" }, H), body: file });
                        if (up.ok) urls.push(`${url}/storage/v1/object/public/reviews/${path}`);
                    }
                    const imageField = urls.length > 1 ? JSON.stringify(urls) : (urls[0] || "");
                    const res = await fetch(`${url}/rest/v1/reviews`, {
                        method: "POST", headers: Object.assign({ "Content-Type": "application/json", "Prefer": "return=minimal" }, H),
                        body: JSON.stringify({
                            product_id: chosen ? chosen.id : "", product_name: chosen ? chosen.name : "",
                            name: nm, rating: rating, comment: form.comment.value.trim(),
                            image_url: imageField, status: "pending"
                        }) });
                    if (!res.ok) throw new Error(await res.text());
                    form.reset(); rating = 0; chosen = null;
                    stEls.forEach((x) => { x.textContent = "☆"; });
                    msg.textContent = I18N.t("reviews.thanks"); msg.className = "reviews__msg is-ok";
                } catch (_) { msg.textContent = I18N.t("reviews.fail"); msg.className = "reviews__msg is-err"; }
                btn.disabled = false;
            });
        }

        async function loadWall() {
            const wall = root.querySelector("#revWall");
            if (!wall) return;
            let list = [];
            if (url && anon) {
                try {
                    const r = await fetch(`${url}/rest/v1/reviews?status=eq.approved&order=created_at.desc&select=name,rating,comment,image_url,product_name`, { headers: H });
                    list = await r.json(); if (!Array.isArray(list)) list = [];
                } catch (_) {}
            }
            wall.setAttribute("aria-busy", "false");
            if (!list.length) { wall.innerHTML = `<p class="reviews-page__empty">${esc(I18N.t("reviews.wallEmpty"))}</p>`; return; }
            wall.innerHTML = list.map((x) => {
                const imgs = reviewImgs(x.image_url);
                return `<article class="review review--wall">
                    <div class="review__top"><span class="review__stars">${_stars(x.rating)}</span><b class="review__name">${esc(x.name || "")}</b></div>
                    ${x.product_name ? `<p class="review__tag">${esc(x.product_name)}</p>` : ""}
                    ${x.comment ? `<p class="review__text">${esc(x.comment)}</p>` : ""}
                    ${imgs.length ? `<div class="review__imgs">${imgs.map((u) => `<img class="review__img" src="${esc(u)}" alt="" loading="lazy">`).join("")}</div>` : ""}
                </article>`;
            }).join("");
        }

        render();
        _lastPageRerender = render; // troca de idioma re-renderiza via handler global
    }

    // Guia de tamanhos como modal: link no order box abre; backdrop/×/Esc fecham.
    function wireSizeGuide(root) {
        if (!root) return;
        const modal = root.querySelector("#sizeGuideModal");
        const open = root.querySelector("[data-size-guide]");
        if (!modal || !open) return;
        const show = () => { modal.hidden = false; document.body.classList.add("size-modal-open"); };
        const hide = () => { modal.hidden = true; document.body.classList.remove("size-modal-open"); };
        open.addEventListener("click", show);
        modal.querySelectorAll("[data-size-guide-close]").forEach((el) => el.addEventListener("click", hide));
        document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !modal.hidden) hide(); });
    }

    // Ação rápida no card (quick-add): handler delegado no document, cobre
    // qualquer grade de cards (home, coleção, clube, catálogo), inclusive os
    // renderizados depois. Com tamanhos, abre popover; sem, adiciona direto.
    function quickAddToCart(btn, size) {
        if (!window.Cart) return;
        let prices = null;
        try { prices = JSON.parse(btn.dataset.qaPrices || "{}"); } catch (_) { prices = null; }
        window.Cart.add({
            id: btn.dataset.qaId, name: btn.dataset.qaName, size: size || "",
            qty: 1, price: parseFloat(btn.dataset.qaPrice) || 0, prices: prices,
            image: btn.dataset.qaImage, perso: null,
        });
        btn.classList.add("is-added");
        setTimeout(() => btn.classList.remove("is-added"), 1200);
    }

    document.addEventListener("click", (e) => {
        const closeBtn = e.target.closest(".jersey-card__qa-close");
        if (closeBtn) { const qa = closeBtn.closest(".jersey-card__qa"); if (qa) qa.hidden = true; return; }
        const sizeBtn = e.target.closest(".jersey-card__qa-size");
        if (sizeBtn) {
            const media = sizeBtn.closest(".jersey-card__media");
            const btn = media && media.querySelector(".jersey-card__quick");
            if (btn) quickAddToCart(btn, sizeBtn.dataset.size);
            const qa = sizeBtn.closest(".jersey-card__qa");
            if (qa) qa.hidden = true;
            return;
        }
        const q = e.target.closest(".jersey-card__quick");
        if (!q) return;
        e.preventDefault();
        const media = q.closest(".jersey-card__media");
        const qa = media && media.querySelector(".jersey-card__qa");
        const hasSizes = qa && qa.querySelector(".jersey-card__qa-size");
        if (hasSizes) {
            document.querySelectorAll(".jersey-card__qa:not([hidden])").forEach((el) => { if (el !== qa) el.hidden = true; });
            qa.hidden = !qa.hidden;
        } else {
            quickAddToCart(q, "");
        }
    });

    function specRow(label, valueHtml) {
        return valueHtml
            ? `<div class="spec"><dt>${esc(label)}</dt><dd>${valueHtml}</dd></div>`
            : "";
    }

    function jerseyDetailTemplate(p, club, league, region, collection) {
        const name = esc(I18N.translateName(p.name));
        const collName = collection ? esc(I18N.properNoun(collection.name)) : "";
        const leagueName = league ? esc(I18N.properNoun(league.name)) : "";
        const clubName = club ? esc(I18N.properNoun(club.name)) : "";
        const clubLink = club
            ? `<a class="link" href="pages/club.html?slug=${encodeURIComponent(club.slug)}">${clubName}</a>`
            : "";
        const leagueLink = league
            ? `<a class="link" href="pages/league.html?slug=${encodeURIComponent(league.slug)}">${leagueName}</a>`
            : "";
        const crumbColl = collection
            ? `<a class="breadcrumb__link" href="pages/collection.html?slug=${encodeURIComponent(collection.slug)}">${collName}</a>
               <span class="breadcrumb__sep" aria-hidden="true">/</span>`
            : "";
        const crumbLeague = league
            ? `<a class="breadcrumb__link" href="pages/league.html?slug=${encodeURIComponent(league.slug)}">${leagueName}</a>
               <span class="breadcrumb__sep" aria-hidden="true">/</span>`
            : "";
        const crumbRegion = region
            ? `<a class="breadcrumb__link" href="pages/region.html?slug=${encodeURIComponent(region.slug)}">${esc(I18N.properNoun(region.name))}</a>
               <span class="breadcrumb__sep" aria-hidden="true">/</span>`
            : "";
        const crumbClub = club
            ? `<a class="breadcrumb__link" href="pages/club.html?slug=${encodeURIComponent(club.slug)}">${clubName}</a>
               <span class="breadcrumb__sep" aria-hidden="true">/</span>`
            : "";
        const lead = [clubLink, leagueLink].filter(Boolean).join(" · ");

        // Intermediation model (CS-11): M11NTX does not sell directly and does not
        // expose live stock. Availability is confirmed during service, so the size
        // grid is shown as a reference only — no "out of stock", no e-commerce cues.
        const sizeList = (Array.isArray(p.sizes) ? p.sizes : []).map((s) =>
            typeof s === "string" ? { size: s } : { size: s.size });

        const sizesBlock = sizeList.length
            ? `<div class="sizes">
                   <p class="sizes__label">${I18N.t("jerseyDetail.sizesLabel")}</p>
                   <div class="sizes__list">
                       ${sizeList.map((s) => `<span class="size-chip">${esc(I18N.sizeLabel(s.size))}</span>`).join("")}
                   </div>
               </div>`
            : "";

        // Order flow: the operator now lets a visitor build an order and finish it
        // on WhatsApp (cart.js). The jersey detail exposes a size picker + quantity
        // + "Adicionar ao pedido"; the Instagram consult stays as a soft alternative.
        const orderPrice = p.price && typeof p.price.BRL === "number" ? p.price.BRL : 0;
        const primaryImg = Array.isArray(p.images) && p.images.length
            ? (p.images.find((im) => im.primary) || p.images[0]) : null;
        const orderCover = primaryImg && primaryImg.url && window.ImageLoader
            ? ImageLoader.getImage("jerseys", primaryImg.url) : "";
        // Link "guia de tamanhos" abre a mesma imagem de referência num modal
        // (RN: sem estoque ao vivo, é só orientação) — some quando não há grade.
        const sizesGuideLink = sizeList.length
            ? `<button type="button" class="order__sizes-guide" data-size-guide>${esc(I18N.t("jerseyDetail.sizeGuideLink"))}</button>`
            : "";
        const orderSizes = sizeList.length
            ? `<div class="order__sizes" role="radiogroup" aria-label="${I18N.t("jerseyDetail.sizesLabel")}">
                   <div class="order__sizes-head">
                       <p class="sizes__label">${I18N.t("jerseyDetail.sizesLabel")}</p>
                       ${sizesGuideLink}
                   </div>
                   <div class="order__sizes-list">
                       ${sizeList.map((s) => `<button type="button" class="size-chip order__size" data-size="${esc(s.size)}">${esc(I18N.sizeLabel(s.size))}</button>`).join("")}
                   </div>
               </div>`
            : "";
        // Personalização só aparece quando o produto permite (RN); com o "+fee"
        // no rótulo para o cliente saber o custo antes de marcar.
        const persoBlock = p.personalizationAvailable
            ? `<label class="order__perso-check">
                    <input type="checkbox" class="order__perso-toggle"> ${I18N.t("jerseyDetail.personalizeToggle")}
                    <span class="order__perso-fee">+${esc(persoFeeLabel(p))}</span>
                </label>
                <div class="order__perso-fields">
                    <input type="text" class="order__perso-name" maxlength="20" placeholder="${esc(I18N.t("jerseyDetail.persoNamePlaceholder"))}">
                    <input type="text" class="order__perso-num" maxlength="3" inputmode="numeric" placeholder="${esc(I18N.t("jerseyDetail.persoNumberPlaceholder"))}">
                </div>`
            : "";
        const orderBox = `<div class="order" data-id="${esc(p.id)}" data-name="${esc(name)}" data-price="${orderPrice}" data-prices='${esc(JSON.stringify(p.price || {}))}' data-image="${esc(orderCover)}">
                ${orderSizes}
                ${persoBlock}
                <div class="order__actions">
                    <div class="qty" aria-label="Quantidade">
                        <button type="button" class="qty__btn" data-qminus aria-label="Diminuir">−</button>
                        <span class="qty__val">1</span>
                        <button type="button" class="qty__btn" data-qplus aria-label="Aumentar">+</button>
                    </div>
                    <button type="button" class="btn btn--primary order__add">${I18N.t("jerseyDetail.addToOrder")}</button>
                </div>
                <ul class="order__trust" aria-label="${esc(I18N.t("jerseyDetail.trustLabel"))}">
                    <li class="order__trust-item"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span>${esc(I18N.t("jerseyDetail.trustDelivery"))}</span></li>
                    <li class="order__trust-item"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg><span>${esc(I18N.t("jerseyDetail.trustReturns"))}</span></li>
                    <li class="order__trust-item"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/></svg><span>${esc(I18N.t("jerseyDetail.trustPayment"))}</span></li>
                </ul>
                <a class="order__consult" href="${esc(INSTAGRAM_URL)}" target="_blank" rel="noopener">${I18N.t("jerseyDetail.orderConsult")} &rarr;</a>
            </div>`;

        // Reference-only size chart image, swapped by language (CS-11: no live
        // stock, so this is guidance, not a purchase step). Placed below the
        // gallery, not the info column — that's where the layout actually has
        // room to show it large enough to read.
        const sizeGuideSrc = I18N.getLang() === "pt"
            ? "assets/images/size-guide-pt.webp"
            : "assets/images/size-guide-en.webp";
        // Modal: aberto pelo link "guia de tamanhos" do order box. Fica no DOM
        // oculto (hidden) e é revelado por wireSizeGuide (jersey:rendered).
        const sizeGuide = `
            <div class="size-modal" id="sizeGuideModal" hidden role="dialog" aria-modal="true" aria-label="${esc(I18N.t("jerseyDetail.sizeGuideLabel"))}">
                <div class="size-modal__backdrop" data-size-guide-close></div>
                <div class="size-modal__panel" role="document">
                    <button type="button" class="size-modal__close" data-size-guide-close aria-label="${esc(I18N.t("common.close"))}">&times;</button>
                    <p class="size-modal__label">${I18N.t("jerseyDetail.sizeGuideLabel")}</p>
                    <img src="${sizeGuideSrc}" loading="lazy" alt="${I18N.t("jerseyDetail.sizeGuideAlt")}">
                </div>
            </div>`;

        return `
            <nav class="breadcrumb" aria-label="Breadcrumb">
                <a class="breadcrumb__link" href="index.html#collections">${I18N.t("breadcrumb.collections")}</a>
                <span class="breadcrumb__sep" aria-hidden="true">/</span>
                ${crumbColl}${crumbLeague}${crumbRegion}${crumbClub}
                <span class="breadcrumb__current" aria-current="page">${name}</span>
            </nav>

            <div class="jersey">
                <div class="jersey__gallery">${jerseyStories(p)}${jerseyGallery(p)}</div>
                <div class="jersey__info">
                    <p class="detail__eyebrow">${I18N.t("jerseyDetail.eyebrow")}</p>
                    <h1 class="detail__title">${name}</h1>
                    ${lead ? `<p class="jersey__lead">${lead}</p>` : ""}
                    ${jerseyPriceHtml(p).replace("jersey-card__price", "jersey__price")}
                    ${jerseyPersonalizationHtml(p)}
                    <dl class="specs">
                        ${specRow(I18N.t("jerseyDetail.specBrand"), esc(p.brand))}
                        ${specRow(I18N.t("jerseyDetail.specType"), esc(I18N.fieldLabel("type", p.type)))}
                        ${specRow(I18N.t("jerseyDetail.specCategory"), esc(I18N.fieldLabel("category", p.category)))}
                        ${specRow(I18N.t("jerseyDetail.specSeason"), esc(p.season))}
                        ${specRow(I18N.t("jerseyDetail.specVersion"), esc(I18N.fieldLabel("version", p.version)))}
                        ${specRow(I18N.t("jerseyDetail.specGender"), esc(I18N.fieldLabel("gender", p.gender)))}
                    </dl>
                    ${orderBox}
                    <p class="jersey__note">${I18N.t("jerseyDetail.note")}</p>
                </div>
                ${sizeGuide}
            </div>

            <section id="reviews" class="reviews" data-pid="${esc(p.id)}" data-pname="${name}"></section>

            ${journeySections()}`;
    }

    /* ---------- customer journey (CS-11) ----------
       M11NTX is an intermediary — no direct sales, nothing resembling a
       traditional e-commerce. Static, premium, transparent. Steps + FAQ come
       from I18N.t("journey.steps"/"journey.faq") — the single source shared
       with pages/how-it-works.html and pages/faq.html (CS-19). */

    function journeySections() {
        return `
            <section class="section journey" aria-labelledby="journeyTitle">
                <div class="section__inner">
                    <header class="section__head">
                        <p class="section__eyebrow">${I18N.t("journey.eyebrow")}</p>
                        <h2 class="section__title" id="journeyTitle">${I18N.t("journey.title")}</h2>
                        <div class="section__divider"></div>
                    </header>

                    <ol class="steps">${I18N.renderStepsHtml()}</ol>

                    <aside class="import-info" aria-labelledby="importTitle">
                        <p class="section__eyebrow" id="importTitle">${I18N.t("journey.importInfoEyebrow")}</p>
                        <p class="import-info__text">${esc(I18N.t("journey.importInfoText"))}</p>
                        <div class="import-info__delivery">
                            <span class="import-info__delivery-label">${I18N.t("journey.deliveryLabel")}</span>
                            <span class="import-info__delivery-value">${I18N.t("journey.deliveryValue")}</span>
                        </div>
                    </aside>
                </div>
            </section>

            <section class="section faq" aria-labelledby="faqTitle">
                <div class="section__inner">
                    <header class="section__head">
                        <p class="section__eyebrow">${I18N.t("journey.faqEyebrow")}</p>
                        <h2 class="section__title" id="faqTitle">${I18N.t("journey.faqTitle")}</h2>
                        <div class="section__divider"></div>
                    </header>
                    <div class="faq__list">${I18N.renderFaqHtml()}</div>
                </div>
            </section>`;
    }

    /* ---------- init ---------- */

    async function init() {
        const grid = document.getElementById("catalogGrid");
        if (!grid) return;
        if (window.SEO) SEO.set({ canonical: "/" }); // home: normalized canonical + OG/Twitter
        if (window.Analytics) Analytics.track.homeView();
        renderSkeletons(grid);
        const collections = await API.getCollections();
        const list = Array.isArray(collections) ? collections : [];
        // Data-driven split: any collection with group === "outros" (e.g.
        // NBA, Acessórios -- no leagues/clubs of its own) shows in a
        // separate, clearly-labeled section below the main futebol grid,
        // never mixed into "Explore a história do futebol". Never assumes
        // a fixed count on either side.
        const main = list.filter((c) => c.group !== "outros");
        const other = list.filter((c) => c.group === "outros");
        const otherWrap = document.getElementById("collectionsOtherWrap");
        const otherGrid = document.getElementById("catalogGridOther");
        const render = () => {
            renderCollections(grid, main);
            if (otherWrap) otherWrap.hidden = other.length === 0;
            if (other.length && otherGrid) renderCollections(otherGrid, other);
        };
        render();
        _lastPageRerender = render;
        initFeatured();
    }

    // Home: carrossel de destaques (produtos escolhidos em data/featured.json).
    let _featWired = false;
    async function initFeatured() {
        const track = document.getElementById("featuredTrack");
        if (!track) return;
        let ids = [];
        try {
            const r = await fetch("data/featured.json", { cache: "no-cache" });
            const j = await r.json();
            ids = Array.isArray(j && j.ids) ? j.ids : [];
        } catch (_) { /* sem config -> some a seção */ }
        const products = await API.getProducts();
        const byId = new Map((Array.isArray(products) ? products : []).map((p) => [p.id, p]));
        const list = ids.map((id) => byId.get(id)).filter(Boolean);
        const section = track.closest(".home-featured");
        if (!list.length) { if (section) section.hidden = true; return; }
        if (section) section.hidden = false;
        fillGrid(track, list, jerseyCard, "");
        track.setAttribute("aria-busy", "false");
        if (window.ImageLoader) ImageLoader.hydrate(track);
        if (!_featWired) {
            _featWired = true;
            const prev = document.getElementById("featPrev"), next = document.getElementById("featNext");
            const step = () => Math.max(240, track.clientWidth * 0.85);
            if (prev) prev.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: "smooth" }));
            if (next) next.addEventListener("click", () => track.scrollBy({ left: step(), behavior: "smooth" }));
            document.addEventListener("currency:change", initFeatured);
            document.addEventListener("language:change", initFeatured);
        }
    }

    async function initDetail() {
        const root = document.getElementById("collectionDetail");
        if (!root) return;

        const slug = getParam("slug");
        const collections = await API.getCollections();
        const collection = Array.isArray(collections)
            ? collections.find((c) => c.slug === slug)
            : null;

        if (!collection) {
            renderNotFound(root);
            if (window.SEO) SEO.set({ title: "Not found | M11NTX", robots: "noindex, follow" });
            return;
        }

        document.title = `M11NTX | ${collection.name}`;
        if (window.SEO) {
            SEO.set({
                title: `M11NTX | ${collection.name}`,
                description: collection.description,
                canonical: `/pages/collection.html?slug=${encodeURIComponent(slug)}`,
                image: seoImage("collections", collection.image),
                imageAlt: collection.name
            });
            SEO.breadcrumb([
                { name: "Home", url: "/" },
                { name: "Collections", url: "/#collections" },
                { name: collection.name, url: `/pages/collection.html?slug=${encodeURIComponent(slug)}` }
            ]);
        }
        if (window.Analytics) Analytics.track.collectionView(slug);
        // leagues belonging to this collection (data-driven, scalable filter)
        const leagues = await API.getLeagues();
        const forCollection = Array.isArray(leagues)
            ? leagues.filter((l) => l.collectionId === collection.id)
            : [];

        // A collection with no leagues/clubs of its own (NBA, Acessórios --
        // never has a club/league hierarchy) lists its jerseys directly
        // instead, same "flat archive" pattern as a club page, just scoped
        // by collectionId rather than clubId (CS-62).
        const hasLeagues = forCollection.length > 0;
        let jerseys = [];
        if (!hasLeagues) {
            const products = await API.getProducts();
            jerseys = (Array.isArray(products)
                ? products.filter((p) => p.collectionId === collection.id && isBrowsable(p))
                : []).sort(productSort);
        }

        const render = () => {
            root.innerHTML = detailTemplate(collection, hasLeagues, jerseys.length);
            root.setAttribute("aria-busy", "false");
            if (window.ImageLoader) ImageLoader.hydrate(root);
            if (hasLeagues) {
                renderLeagues(document.getElementById("leaguesGrid"), forCollection);
            } else {
                renderJerseys(document.getElementById("jerseysGrid"), jerseys);
            }
        };
        render();
        _lastPageRerender = render;
    }

    async function initLeaguePage() {
        const root = document.getElementById("leagueDetail");
        if (!root) return;

        const slug = getParam("slug");
        const [leagues, collections, regions, clubs] = await Promise.all([
            API.getLeagues(), API.getCollections(), API.getRegions(), API.getClubs()
        ]);

        const league = Array.isArray(leagues) ? leagues.find((l) => l.slug === slug) : null;
        if (!league) {
            renderNotFound(root, "League");
            if (window.SEO) SEO.set({ title: "Not found | M11NTX", robots: "noindex, follow" });
            return;
        }

        const collection = Array.isArray(collections)
            ? collections.find((c) => c.id === league.collectionId)
            : null;
        // Most leagues list clubs directly; a league with regions (data-driven
        // via config/normalization/regions.json in catalog-pipeline) lists
        // region cards instead, one level up from clubs -- MI-06's original
        // design. CS-64 (2026-07-13): Brasileirão specifically now skips that
        // extra region-card level and lists all its clubs directly on its
        // own league page instead, per explicit product decision -- the
        // region data itself is untouched (still generated, still used for
        // e.g. club breadcrumbs/regionId filtering elsewhere), only this
        // one league's own page stops listing region cards. Add more league
        // ids here if the same choice is ever made for another region-
        // bearing league.
        const SKIP_REGIONS_FOR_LEAGUES = ["brasileirao"];
        const forLeagueRegions = (Array.isArray(regions) && !SKIP_REGIONS_FOR_LEAGUES.includes(league.id))
            ? regions.filter((r) => r.leagueId === league.id)
            : [];

        document.title = `M11NTX | ${league.name}`;
        if (window.SEO) {
            SEO.set({
                title: `M11NTX | ${league.name}`,
                description: league.description,
                canonical: `/pages/league.html?slug=${encodeURIComponent(slug)}`,
                image: seoImage("leagues", league.image),
                imageAlt: league.name
            });
            SEO.breadcrumb(leagueCrumbs(collection, league));
        }
        // clubs belonging to this league (data-driven, scalable filter) --
        // only used on the no-regions branch below, computed once either way
        const forLeague = Array.isArray(clubs)
            ? clubs.filter((cl) => cl.leagueId === league.id)
            : [];

        const render = () => {
            root.innerHTML = leagueDetailTemplate(league, collection, forLeagueRegions.length > 0);
            root.setAttribute("aria-busy", "false");
            if (window.ImageLoader) ImageLoader.hydrate(root);
            if (forLeagueRegions.length) {
                renderRegions(document.getElementById("regionsGrid"), forLeagueRegions);
            } else {
                renderClubs(document.getElementById("clubsGrid"), forLeague);
            }
        };
        render();
        _lastPageRerender = render;
    }

    async function initRegionPage() {
        const root = document.getElementById("regionDetail");
        if (!root) return;

        const slug = getParam("slug");
        const [regions, leagues, collections, clubs] = await Promise.all([
            API.getRegions(), API.getLeagues(), API.getCollections(), API.getClubs()
        ]);

        const region = Array.isArray(regions) ? regions.find((r) => r.slug === slug) : null;
        if (!region) {
            renderNotFound(root, "Region");
            if (window.SEO) SEO.set({ title: "Not found | M11NTX", robots: "noindex, follow" });
            return;
        }

        const league = Array.isArray(leagues) ? leagues.find((l) => l.id === region.leagueId) : null;
        const collection = league && Array.isArray(collections)
            ? collections.find((c) => c.id === league.collectionId)
            : null;

        document.title = `M11NTX | ${region.name}`;
        if (window.SEO) {
            SEO.set({
                title: `M11NTX | ${region.name}`,
                description: region.description,
                canonical: `/pages/region.html?slug=${encodeURIComponent(slug)}`,
                image: seoImage("regions", region.image),
                imageAlt: region.name
            });
            SEO.breadcrumb(regionCrumbs(collection, league, region));
        }
        // clubs belonging to this region (data-driven, scalable filter)
        const forRegion = Array.isArray(clubs)
            ? clubs.filter((cl) => cl.regionId === region.id)
            : [];

        const render = () => {
            root.innerHTML = regionDetailTemplate(region, league, collection);
            root.setAttribute("aria-busy", "false");
            if (window.ImageLoader) ImageLoader.hydrate(root);
            renderClubs(document.getElementById("clubsGrid"), forRegion);
        };
        render();
        _lastPageRerender = render;
    }

    /* ---------- segment tabs: Fan/Player/Women/Retro/Kids within a club (MI-33) ---------- */
    // Not a new hierarchy level and not the multi-facet Filters sidebar --
    // a lightweight, single-choice re-filter of the club's own already-
    // fetched jersey list. Built from fields the canonical model already
    // has (version/gender/category) -- no new data needed per club.
    const SEGMENTS = [
        { key: "all", labelKey: "segmentAll", match: () => true },
        { key: "fan", labelKey: "segmentFan", match: (p) => p.version === "fan" },
        { key: "player", labelKey: "segmentPlayer", match: (p) => p.version === "player" },
        { key: "women", labelKey: "segmentWomen", match: (p) => p.gender === "women" },
        { key: "retro", labelKey: "segmentRetro", match: (p) => p.category === "retro" },
        { key: "kids", labelKey: "segmentKids", match: (p) => p.gender === "kids" },
    ];

    function filterBySegment(jerseys, key) {
        const seg = SEGMENTS.find((s) => s.key === key) || SEGMENTS[0];
        return jerseys.filter(seg.match);
    }

    function segmentTabsTemplate(jerseys, activeKey) {
        // Only show a segment with at least one match for THIS club -- "All"
        // and "Fan" always qualify today; Player/Women/Retro/Kids appear on
        // their own, with zero hardcoding, the moment those menus are
        // imported for a given club.
        const visible = SEGMENTS.filter((s) => s.key === "all" || jerseys.some(s.match));
        if (visible.length <= 1) return "";
        const btns = visible.map((s) => {
            const count = s.key === "all" ? jerseys.length : jerseys.filter(s.match).length;
            const pressed = s.key === activeKey ? "true" : "false";
            return `
                <button type="button" class="segment-tabs__btn" data-segment="${s.key}"
                        aria-pressed="${pressed}">
                    ${esc(I18N.t(`clubDetail.${s.labelKey}`))}
                    <span class="segment-tabs__count">${count}</span>
                </button>`;
        }).join("");
        return `
            <div class="segment-tabs-wrap">
                <span class="segment-tabs-label">${esc(I18N.t("clubDetail.segmentFilterLabel"))}</span>
                <div class="segment-tabs" role="tablist" aria-label="${esc(I18N.t("clubDetail.jerseysTitle"))}">${btns}</div>
            </div>`;
    }

    function mountSegmentTabs(container, grid, jerseys) {
        if (!container) return;
        let active = "all";
        const render = () => {
            container.innerHTML = segmentTabsTemplate(jerseys, active);
            renderJerseys(grid, filterBySegment(jerseys, active));
        };
        container.addEventListener("click", (e) => {
            const btn = e.target.closest(".segment-tabs__btn");
            if (!btn) return;
            active = btn.dataset.segment;
            render();
        });
        render();
    }

    async function initClubPage() {
        const root = document.getElementById("clubDetail");
        if (!root) return;

        const slug = getParam("slug");
        const [clubs, leagues, regions, collections, products] = await Promise.all([
            API.getClubs(), API.getLeagues(), API.getRegions(), API.getCollections(), API.getProducts()
        ]);

        const club = Array.isArray(clubs) ? clubs.find((c) => c.slug === slug) : null;
        if (!club) {
            renderNotFound(root, "Club");
            if (window.SEO) SEO.set({ title: "Not found | M11NTX", robots: "noindex, follow" });
            return;
        }

        const league = Array.isArray(leagues) ? leagues.find((l) => l.id === club.leagueId) : null;
        const region = Array.isArray(regions) ? regions.find((r) => r.id === club.regionId) : null;
        const collection = league && Array.isArray(collections)
            ? collections.find((c) => c.id === league.collectionId)
            : null;
        const leagueName = league ? league.name : (club.league || "");

        // jerseys belonging to this club (data-driven, scalable filter),
        // newest season first (CS-23)
        const jerseys = (Array.isArray(products)
            ? products.filter((p) => p.clubId === club.id && isBrowsable(p))
            : []).sort(productSort);

        document.title = `M11NTX | ${club.name}`;
        if (window.SEO) {
            const count = jerseys.length;
            SEO.set({
                title: `M11NTX | ${club.name}`,
                description: `${club.name} — ${leagueName} jersey archive. ${count} classic ` +
                    `${count === 1 ? "shirt" : "shirts"}. Premium Soccer Culture.`,
                canonical: `/pages/club.html?slug=${encodeURIComponent(slug)}`,
                image: seoImage("clubs", club.image),
                imageAlt: `${club.name} crest`
            });
            SEO.breadcrumb(clubCrumbs(collection, league, region, club));
        }
        if (window.Analytics) Analytics.track.clubView(slug);

        const render = () => {
            root.innerHTML = clubDetailTemplate(club, league, region, collection, jerseys.length);
            root.setAttribute("aria-busy", "false");
            if (window.ImageLoader) ImageLoader.hydrate(root);
            mountSegmentTabs(document.getElementById("segmentTabs"), document.getElementById("jerseysGrid"), jerseys);
        };
        render();
        _lastPageRerender = render;
    }

    async function initJerseyPage() {
        const root = document.getElementById("jerseyDetail");
        if (!root) return;

        const slug = getParam("slug");
        const [products, clubs, leagues, regions, collections] = await Promise.all([
            API.getProducts(), API.getClubs(), API.getLeagues(), API.getRegions(), API.getCollections()
        ]);

        const jersey = Array.isArray(products) ? products.find((p) => p.slug === slug) : null;
        if (!jersey) {
            renderNotFound(root, "Jersey");
            if (window.SEO) SEO.set({ title: "Not found | M11NTX", robots: "noindex, follow" });
            return;
        }

        const club = Array.isArray(clubs) ? clubs.find((c) => c.id === jersey.clubId) : null;
        const league = club && Array.isArray(leagues)
            ? leagues.find((l) => l.id === club.leagueId)
            : null;
        const region = club && Array.isArray(regions)
            ? regions.find((r) => r.id === club.regionId)
            : null;
        const collection = league && Array.isArray(collections)
            ? collections.find((c) => c.id === league.collectionId)
            : null;

        document.title = `M11NTX | ${jersey.name}`;
        if (window.SEO) {
            const clubName = club ? club.name : "";
            const bits = [jersey.name, clubName, jersey.season, jersey.brand, jersey.type]
                .filter(Boolean).join(" · ");
            SEO.set({
                title: `M11NTX | ${jersey.name}${clubName ? " — " + clubName : ""}`,
                description: `${bits}. Importação premium · 25–40 dias corridos. Premium Soccer Culture.`,
                canonical: `/pages/jersey.html?slug=${encodeURIComponent(slug)}`,
                image: seoImage("jerseys", (Array.isArray(jersey.images) && jersey.images[0] && jersey.images[0].url) || jersey.image),
                imageAlt: jersey.name
            });
            SEO.breadcrumb(jerseyCrumbs(collection, league, region, club, jersey));
        }
        if (window.Analytics) {
            Analytics.track.jerseyView(slug, { club: club ? club.slug : "", brand: jersey.brand });
        }
        _lastJerseyDetail = { root, jersey, club, league, region, collection };
        root.innerHTML = jerseyDetailTemplate(jersey, club, league, region, collection);
        root.setAttribute("aria-busy", "false");
        if (window.ImageLoader) ImageLoader.hydrate(root);

        // hand off to UI to wire the gallery (swap / fade)
        document.dispatchEvent(new CustomEvent("jersey:rendered", { detail: { root } }));
    }

    /* ---------- catalog page: full jersey archive with filters (CS-21) ---------- */

    async function initCatalogPage() {
        const root = document.getElementById("filterControls");
        const grid = document.getElementById("jerseysGrid");
        if (!root || !grid) return;

        const titleKey = "catalogPage.title";
        const eyebrowKey = "catalogPage.eyebrow";
        const subtitleKey = "catalogPage.subtitle";

        const renderStaticText = () => {
            document.title = `M11NTX | ${I18N.t(titleKey)}`;
            const titleEl = document.getElementById("catalogPageTitle");
            const eyebrowEl = document.getElementById("catalogPageEyebrow");
            const subtitleEl = document.getElementById("catalogPageSubtitle");
            if (titleEl) titleEl.textContent = I18N.t(titleKey);
            if (eyebrowEl) eyebrowEl.textContent = I18N.t(eyebrowKey);
            if (subtitleEl) subtitleEl.textContent = I18N.t(subtitleKey);
        };
        renderStaticText();
        _lastPageRerender = renderStaticText;
        if (window.SEO) {
            SEO.set({
                title: `M11NTX | ${I18N.t(titleKey)}`,
                description: I18N.t(subtitleKey),
                canonical: "/pages/catalog.html",
            });
        }
        renderSkeletons(grid);
        if (!window.Filters || !window.API) {
            grid.innerHTML = "";
            return;
        }
        // Fetch here (instead of letting Filters.attach do it) so the default,
        // unfiltered view is newest-season-first (CS-23) from the first paint.
        const [products, clubs, collections, leagues] = await Promise.all([
            API.getProducts(), API.getClubs(), API.getCollections(), API.getLeagues()
        ]);
        const sorted = products.filter(isBrowsable).sort(productSort);
        await Filters.attach({
            controls: "filterControls", list: "jerseysGrid", hideSingle: true,
            data: { products: sorted, clubs, collections, leagues },
        });
    }

    /* ---------- site search (CS-21) ---------- */
    // Reuses the same enriched-product shape as the flat catalog + Filters/
    // Search engines already tested in filters.test.js / search.test.js —
    // no new matching logic, just wiring + a results template.

    const SEARCH_RESULT_LIMIT = 8;

    function searchResultRow(p) {
        const name = esc(I18N.translateName(p.name));
        const meta = [esc(p.clubName), esc(p.leagueName), esc(p.season)]
            .filter(Boolean).join(" · ");
        return `
            <li class="search__item">
                <a class="search__result" href="pages/jersey.html?slug=${encodeURIComponent(p.slug)}">
                    <div class="search__result-media">${jerseyMedia(p)}</div>
                    <div class="search__result-body">
                        <p class="search__result-name">${name}</p>
                        ${meta ? `<p class="search__result-meta">${meta}</p>` : ""}
                    </div>
                </a>
            </li>`;
    }

    // When every match belongs to the same club, offer a shortcut to that
    // club's page instead of making people scroll a capped results list.
    function searchViewAllClub(items) {
        if (!items.length) return "";
        const slug = items[0].clubSlug;
        if (!slug || items.some((i) => i.clubSlug !== slug)) return "";
        const club = items[0].clubName;
        const label = I18N.t("search.viewAllClub", { count: items.length, club: esc(club) });
        return `<a class="search__view-all" href="pages/club.html?slug=${encodeURIComponent(slug)}">${label}</a>`;
    }

    function renderSearchResults(res) {
        const root = document.getElementById("searchResults");
        if (!root) return;
        const query = String((res && res.query) || "").trim();

        if (!query) {
            root.innerHTML = `<p class="search__hint" data-i18n="search.hint">${esc(I18N.t("search.hint"))}</p>`;
            return;
        }
        if (!res.count) {
            root.innerHTML = `<p class="search__hint">${esc(I18N.t("search.noResults", { query: query }))}</p>`;
            return;
        }

        const label = I18N.t(res.count === 1 ? "search.resultSingular" : "search.resultPlural");
        const rows = res.items.slice(0, SEARCH_RESULT_LIMIT).map(searchResultRow).join("");
        root.innerHTML = `
            <p class="search__count">${res.count} ${esc(label)}</p>
            <ul class="search__list">${rows}</ul>
            ${searchViewAllClub(res.items)}`;
        if (window.ImageLoader) ImageLoader.hydrate(root);
    }

    // Wired from any page that renders the search overlay (nav is global —
    // see main.js). Loads the same JSON every other page already fetches;
    // no dedicated search index/endpoint needed at this catalog size.
    async function initSiteSearch() {
        const input = document.getElementById("searchInput");
        if (!input || !window.API || !window.Filters || !window.Search) return;

        const [products, clubs, leagues, collections] = await Promise.all([
            API.getProducts(), API.getClubs(), API.getLeagues(), API.getCollections()
        ]);
        // Newest season first (same rule as the catalog page, CS-23).
        const sorted = products.filter(isBrowsable).sort(productSort);
        const engine = Search.create({ items: Filters.enrich(sorted, { clubs, leagues, collections }) });
        Search.mount(engine, input, { onChange: renderSearchResults });
    }

    return {
        init, initDetail, initLeaguePage, initRegionPage, initClubPage, initJerseyPage,
        initCatalogPage, initSiteSearch, initReviewsPage,
        renderSkeletons, renderCollections, renderLeagues, renderRegions, renderClubs, renderJerseys
    };
})();

window.Catalog = Catalog;
