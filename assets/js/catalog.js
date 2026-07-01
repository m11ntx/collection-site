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

    /* ---------- utils ---------- */

    function esc(str) {
        return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[c]));
    }

    function getParam(name) {
        return new URLSearchParams(window.location.search).get(name);
    }

    function brandedMark(cls, size) {
        return `<img class="${cls}" src="assets/images/symbol.png" alt="" ` +
               `width="${size[0]}" height="${size[1]}" loading="lazy" decoding="async">`;
    }

    /* ---------- collection card (index grid) ---------- */

    function collectionMedia(c) {
        if (c.image && window.ImageLoader) {
            return ImageLoader.imageTag(ImageLoader.getImage("collections", c.image), {
                alt: c.name, className: "collection-card__photo"
            });
        }
        return brandedMark("collection-card__mark", [150, 105]);
    }

    function collectionCard(c) {
        const name = esc(c.name);
        return `
            <article class="collection-card reveal" role="listitem"
                     data-slug="${esc(c.slug)}" data-featured="${c.featured ? "true" : "false"}">
                <div class="collection-card__media">
                    <div class="collection-card__img">${collectionMedia(c)}</div>
                </div>
                <div class="collection-card__body">
                    <p class="collection-card__era">${esc(c.period)}</p>
                    <h3 class="collection-card__title">${name}</h3>
                    <p class="collection-card__desc">${esc(c.description)}</p>
                    <a class="btn btn--secondary collection-card__cta"
                       href="pages/collection.html?slug=${encodeURIComponent(c.slug)}"
                       aria-label="Explore ${name}">
                        Explore <span class="arrow" aria-hidden="true">&rarr;</span>
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
        if (club.image && window.ImageLoader) {
            return ImageLoader.imageTag(ImageLoader.getImage("clubs", club.image), {
                alt: club.name, className: "club-card__photo"
            });
        }
        return brandedMark("club-card__mark", [80, 56]);
    }

    function clubCard(club) {
        const name = esc(club.name);
        const meta = [esc(club.country), club.founded ? esc(club.founded) : ""]
            .filter(Boolean).join(" · ");
        return `
            <article class="club-card reveal" role="listitem" data-slug="${esc(club.slug)}">
                <div class="club-card__media">
                    <div class="club-card__img">${clubMedia(club)}</div>
                </div>
                <div class="club-card__body">
                    <h3 class="club-card__name">${name}</h3>
                    <p class="club-card__meta">${meta}</p>
                    <a class="club-card__cta" href="pages/club.html?slug=${encodeURIComponent(club.slug)}"
                       aria-label="View ${name} jerseys">
                        View jerseys <span class="arrow" aria-hidden="true">&rarr;</span>
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
        fillGrid(grid, list, collectionCard, "No collections available yet.");
    }

    function renderClubs(grid, list = []) {
        fillGrid(grid, list, clubCard, "Clubs for this collection are coming soon.");
    }

    /* ---------- detail page ---------- */

    function detailMedia(c) {
        if (c.image && window.ImageLoader) {
            return ImageLoader.imageTag(ImageLoader.getImage("collections", c.image), {
                alt: c.name, className: "detail__photo"
            });
        }
        return brandedMark("detail__mark", [220, 154]);
    }

    function detailTemplate(c) {
        const name = esc(c.name);
        return `
            <nav class="breadcrumb" aria-label="Breadcrumb">
                <a class="breadcrumb__link" href="index.html#collections">Collections</a>
                <span class="breadcrumb__sep" aria-hidden="true">/</span>
                <span class="breadcrumb__current" aria-current="page">${name}</span>
            </nav>

            <header class="detail__banner">
                <div class="detail__media">${detailMedia(c)}</div>
                <div class="detail__overlay">
                    ${c.featured ? `<span class="badge">Featured</span>` : ""}
                    <p class="detail__eyebrow">Collection</p>
                    <h1 class="detail__title">${name}</h1>
                    <p class="detail__meta">
                        <span>${esc(c.country)}</span>
                        <span class="detail__dot" aria-hidden="true">·</span>
                        <span>${esc(c.period)}</span>
                    </p>
                </div>
            </header>

            <div class="detail__intro">
                <p class="detail__desc">${esc(c.description)}</p>
            </div>

            <section class="section" aria-labelledby="clubsTitle">
                <div class="section__inner">
                    <header class="section__head">
                        <p class="section__eyebrow">Clubs</p>
                        <h2 class="section__title" id="clubsTitle">Clubs</h2>
                        <div class="section__divider"></div>
                        <p class="section__subtitle">The clubs that shaped ${name}.</p>
                    </header>
                    <div class="grid" id="clubsGrid" role="list" aria-busy="true"></div>
                </div>
            </section>`;
    }

    function renderNotFound(root, label) {
        root.setAttribute("aria-busy", "false");
        root.innerHTML = `
            <div class="detail__notfound">
                <p class="detail__eyebrow">${esc(label || "Collection")}</p>
                <h1 class="detail__title">Not found</h1>
                <p class="detail__desc">This ${esc((label || "collection").toLowerCase())} doesn't exist yet.</p>
                <a class="btn btn--secondary" href="index.html#collections">Back to Collections</a>
            </div>`;
    }

    /* ---------- club page (jerseys) ---------- */

    function clubCrest(club) {
        if (club.image && window.ImageLoader) {
            return ImageLoader.imageTag(ImageLoader.getImage("clubs", club.image), {
                alt: club.name + " crest", className: "club-hero__badge"
            });
        }
        return brandedMark("club-hero__mark", [90, 63]);
    }

    function jerseyMedia(p) {
        if (p.image && window.ImageLoader) {
            return ImageLoader.imageTag(ImageLoader.getImage("jerseys", p.image), {
                alt: p.name, className: "jersey-card__photo"
            });
        }
        return brandedMark("jersey-card__mark", [110, 77]);
    }

    function jerseyCard(p) {
        const name = esc(p.name);
        const meta = [esc(p.category), esc(p.season)].filter(Boolean).join(" · ");
        return `
            <article class="jersey-card reveal" role="listitem" data-id="${esc(p.id)}">
                <div class="jersey-card__media">
                    <div class="jersey-card__img">${jerseyMedia(p)}</div>
                    ${p.type ? `<span class="badge jersey-card__type">${esc(p.type)}</span>` : ""}
                </div>
                <div class="jersey-card__body">
                    <p class="jersey-card__brand">${esc(p.brand)}</p>
                    <h3 class="jersey-card__name">${name}</h3>
                    <p class="jersey-card__meta">${meta}</p>
                    <a class="btn btn--secondary jersey-card__cta"
                       href="pages/jersey.html?slug=${encodeURIComponent(p.slug)}"
                       aria-label="View details of ${name}">
                        View Details <span class="arrow" aria-hidden="true">&rarr;</span>
                    </a>
                </div>
            </article>`;
    }

    function renderJerseys(grid, list = []) {
        fillGrid(grid, list, jerseyCard, "No jerseys in this archive yet.");
    }

    function clubDetailTemplate(club, collection, leagueName, count) {
        const name = esc(club.name);
        const collLink = collection
            ? `<a class="breadcrumb__link" href="pages/collection.html?slug=${encodeURIComponent(collection.slug)}">${esc(collection.name)}</a>
               <span class="breadcrumb__sep" aria-hidden="true">/</span>`
            : "";
        const meta = [esc(club.country), club.founded ? "Founded " + esc(club.founded) : ""]
            .filter(Boolean).join(" · ");
        const countLabel = count + (count === 1 ? " jersey" : " jerseys");
        return `
            <nav class="breadcrumb" aria-label="Breadcrumb">
                <a class="breadcrumb__link" href="index.html#collections">Collections</a>
                <span class="breadcrumb__sep" aria-hidden="true">/</span>
                ${collLink}
                <span class="breadcrumb__current" aria-current="page">${name}</span>
            </nav>

            <header class="club-hero">
                <div class="club-hero__crest">${clubCrest(club)}</div>
                <div class="club-hero__info">
                    <p class="detail__eyebrow">${esc(leagueName)}</p>
                    <h1 class="detail__title">${name}</h1>
                    <p class="detail__meta">
                        <span>${meta}</span>
                        <span class="detail__dot" aria-hidden="true">·</span>
                        <span>${countLabel}</span>
                    </p>
                </div>
            </header>

            <section class="section" aria-labelledby="jerseysTitle">
                <div class="section__inner">
                    <header class="section__head">
                        <p class="section__eyebrow">Archive</p>
                        <h2 class="section__title" id="jerseysTitle">Jerseys</h2>
                        <div class="section__divider"></div>
                        <p class="section__subtitle">${countLabel} in the ${name} archive.</p>
                    </header>
                    <div class="grid" id="jerseysGrid" role="list" aria-busy="true"></div>
                </div>
            </section>`;
    }

    /* ---------- jersey page (details + gallery) ---------- */

    function galleryImages(p) {
        const arr = Array.isArray(p.images) && p.images.length
            ? p.images
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
                            ${brandedMark("gallery__mark", [220, 154])}
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

    function specRow(label, valueHtml) {
        return valueHtml
            ? `<div class="spec"><dt>${esc(label)}</dt><dd>${valueHtml}</dd></div>`
            : "";
    }

    function jerseyDetailTemplate(p, club, collection) {
        const name = esc(p.name);
        const clubLink = club
            ? `<a class="link" href="pages/club.html?slug=${encodeURIComponent(club.slug)}">${esc(club.name)}</a>`
            : "";
        const leagueLink = collection
            ? `<a class="link" href="pages/collection.html?slug=${encodeURIComponent(collection.slug)}">${esc(collection.name)}</a>`
            : "";
        const crumbColl = collection
            ? `<a class="breadcrumb__link" href="pages/collection.html?slug=${encodeURIComponent(collection.slug)}">${esc(collection.name)}</a>
               <span class="breadcrumb__sep" aria-hidden="true">/</span>`
            : "";
        const crumbClub = club
            ? `<a class="breadcrumb__link" href="pages/club.html?slug=${encodeURIComponent(club.slug)}">${esc(club.name)}</a>
               <span class="breadcrumb__sep" aria-hidden="true">/</span>`
            : "";
        const lead = [clubLink, leagueLink].filter(Boolean).join(" · ");

        // sizes — official structure is [{ size, stock }] (RN-006).
        // Accept legacy string entries too.
        const sizeList = (Array.isArray(p.sizes) ? p.sizes : []).map((s) =>
            typeof s === "string"
                ? { size: s, stock: 1 }
                : { size: s.size, stock: Number(s.stock) || 0 });

        // availability is computed from stock (RN-007), never trusted as input
        const inStock = sizeList.some((s) => s.stock > 0);

        const stockBadge = inStock
            ? `<span class="badge jersey__stock">In Stock</span>`
            : `<span class="badge badge--out jersey__stock">Out of Stock</span>`;

        // render only the sizes that exist; stock-0 sizes are shown disabled
        const sizesBlock = sizeList.length
            ? `<div class="sizes">
                   <p class="sizes__label">Sizes</p>
                   <div class="sizes__list">
                       ${sizeList.map((s) =>
                           `<span class="size-chip${s.stock > 0 ? "" : " is-disabled"}">${esc(s.size)}</span>`
                       ).join("")}
                   </div>
               </div>`
            : "";

        let buy;
        if (!inStock) {
            buy = `<button class="btn btn--primary jersey__buy" type="button" disabled>Out of Stock</button>`;
        } else if (p.buyUrl) {
            buy = `<a class="btn btn--primary jersey__buy" href="${esc(p.buyUrl)}"
                      target="_blank" rel="noopener">Comprar na Feng
                      <span class="arrow" aria-hidden="true">&rarr;</span></a>`;
        } else {
            buy = `<button class="btn btn--primary jersey__buy" type="button" disabled>Coming soon</button>`;
        }

        return `
            <nav class="breadcrumb" aria-label="Breadcrumb">
                <a class="breadcrumb__link" href="index.html#collections">Collections</a>
                <span class="breadcrumb__sep" aria-hidden="true">/</span>
                ${crumbColl}${crumbClub}
                <span class="breadcrumb__current" aria-current="page">${name}</span>
            </nav>

            <div class="jersey">
                <div class="jersey__gallery">${jerseyGallery(p)}</div>
                <div class="jersey__info">
                    <div class="jersey__eyebrow-row">
                        <p class="detail__eyebrow">Jersey</p>
                        ${stockBadge}
                    </div>
                    <h1 class="detail__title">${name}</h1>
                    ${lead ? `<p class="jersey__lead">${lead}</p>` : ""}
                    <dl class="specs">
                        ${specRow("Brand", esc(p.brand))}
                        ${specRow("Type", esc(p.type))}
                        ${specRow("Category", esc(p.category))}
                        ${specRow("Season", esc(p.season))}
                        ${specRow("Version", esc(p.version))}
                        ${specRow("Gender", esc(p.gender))}
                    </dl>
                    ${sizesBlock}
                    ${buy}
                </div>
            </div>`;
    }

    /* ---------- init ---------- */

    async function init() {
        const grid = document.getElementById("catalogGrid");
        if (!grid) return;
        renderSkeletons(grid);
        const collections = await API.getCollections();
        renderCollections(grid, Array.isArray(collections) ? collections : []);
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
            return;
        }

        document.title = `M11NTX | ${collection.name}`;
        root.innerHTML = detailTemplate(collection);
        root.setAttribute("aria-busy", "false");
        if (window.ImageLoader) ImageLoader.hydrate(root);

        // clubs belonging to this collection (data-driven, scalable filter)
        const grid = document.getElementById("clubsGrid");
        const clubs = await API.getClubs();
        const forCollection = Array.isArray(clubs)
            ? clubs.filter((cl) => cl.collection === slug)
            : [];
        renderClubs(grid, forCollection);
    }

    async function initClubPage() {
        const root = document.getElementById("clubDetail");
        if (!root) return;

        const slug = getParam("slug");
        const [clubs, collections, products] = await Promise.all([
            API.getClubs(), API.getCollections(), API.getProducts()
        ]);

        const club = Array.isArray(clubs) ? clubs.find((c) => c.slug === slug) : null;
        if (!club) {
            renderNotFound(root, "Club");
            return;
        }

        const collection = Array.isArray(collections)
            ? collections.find((c) => c.slug === club.collection)
            : null;
        const leagueName = collection ? collection.name : (club.collection || "");

        // jerseys belonging to this club (data-driven, scalable filter)
        const jerseys = Array.isArray(products)
            ? products.filter((p) => p.clubId === club.id)
            : [];

        document.title = `M11NTX | ${club.name}`;
        root.innerHTML = clubDetailTemplate(club, collection, leagueName, jerseys.length);
        root.setAttribute("aria-busy", "false");
        if (window.ImageLoader) ImageLoader.hydrate(root);

        renderJerseys(document.getElementById("jerseysGrid"), jerseys);
    }

    async function initJerseyPage() {
        const root = document.getElementById("jerseyDetail");
        if (!root) return;

        const slug = getParam("slug");
        const [products, clubs, collections] = await Promise.all([
            API.getProducts(), API.getClubs(), API.getCollections()
        ]);

        const jersey = Array.isArray(products) ? products.find((p) => p.slug === slug) : null;
        if (!jersey) {
            renderNotFound(root, "Jersey");
            return;
        }

        const club = Array.isArray(clubs) ? clubs.find((c) => c.id === jersey.clubId) : null;
        const collection = club && Array.isArray(collections)
            ? collections.find((c) => c.slug === club.collection)
            : null;

        document.title = `M11NTX | ${jersey.name}`;
        root.innerHTML = jerseyDetailTemplate(jersey, club, collection);
        root.setAttribute("aria-busy", "false");
        if (window.ImageLoader) ImageLoader.hydrate(root);

        // hand off to UI to wire the gallery (swap / fade / zoom)
        document.dispatchEvent(new CustomEvent("jersey:rendered", { detail: { root } }));
    }

    return {
        init, initDetail, initClubPage, initJerseyPage,
        renderSkeletons, renderCollections, renderClubs, renderJerseys
    };
})();

window.Catalog = Catalog;
