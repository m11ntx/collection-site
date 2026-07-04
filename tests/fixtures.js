/**
 * fixtures.js
 * A small, deterministic slice mirroring the real data/*.json shapes.
 * Shared by the Node tests and the browser test harness.
 */
(function (root, factory) {
    const data = factory();
    if (typeof module !== "undefined" && module.exports) module.exports = data;
    if (root) root.FILTERS_FIXTURES = data;
})(typeof window !== "undefined" ? window : null, function () {
    const collections = [
        { id: 1, slug: "serie-a", name: "Serie A", country: "Italy" },
        { id: 2, slug: "premier-league", name: "Premier League", country: "England" }
    ];

    const clubs = [
        { id: 1, slug: "ac-milan", name: "AC Milan", collection: "serie-a", country: "Italy" },
        { id: 5, slug: "manchester-united", name: "Manchester United", collection: "premier-league", country: "England" }
    ];

    const products = [
        { id: 105, clubId: 1, slug: "ac-milan-home-1993-94", name: "Home 1993/94", brand: "Lotto",
          type: "Home", category: "Retro", season: "1993/94", version: "Player", gender: "Men",
          sizes: [{ size: "M", stock: 2 }, { size: "G", stock: 4 }] },
        { id: 107, clubId: 1, slug: "ac-milan-away-1995-96", name: "Away 1995/96", brand: "Lotto",
          type: "Away", category: "Retro", season: "1995/96", version: "Fan", gender: "Unisex",
          sizes: [{ size: "P", stock: 2 }, { size: "M", stock: 3 }] },
        { id: 101, clubId: 5, slug: "man-united-home-1998-99", name: "Home 1998/99", brand: "Umbro",
          type: "Home", category: "Retro", season: "1998/99", version: "Fan", gender: "Men",
          sizes: [{ size: "P", stock: 3 }, { size: "M", stock: 5 }] },
        { id: 103, clubId: 5, slug: "man-united-home-1994-95", name: "Home 1994/95", brand: "Umbro",
          type: "Home", category: "Retro", season: "1994/95", version: "Fan", gender: "Men",
          sizes: [{ size: "P", stock: 0 }, { size: "M", stock: 0 }] } // out of stock
    ];

    return { collections: collections, clubs: clubs, products: products, leagues: [] };
});
