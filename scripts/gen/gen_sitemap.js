/**
 * gen_sitemap.js
 * Generate sitemap.xml from the JSON in /data (no dependencies).
 *
 * Run:  node scripts/gen/gen_sitemap.js
 *
 * JSON is the single source of truth, so the sitemap scales with the catalog:
 * home + every collection + every club + every jersey (?slug= URLs).
 */
const fs = require("fs");
const path = require("path");

const SITE = "https://m11ntx.github.io/collection-site"; // keep in sync with seo.js SITE.url
const ROOT = path.resolve(__dirname, "..", "..");
const DATA = path.join(ROOT, "data");

function readJSON(file) {
    try {
        const txt = fs.readFileSync(path.join(DATA, file), "utf8").trim();
        return txt ? JSON.parse(txt) : [];
    } catch (e) {
        console.warn("skip " + file + ": " + e.message);
        return [];
    }
}

function xmlEscape(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function urlFor(pathPart) {
    return SITE + pathPart;
}

const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

const collections = readJSON("collections.json");
const leagues = readJSON("leagues.json");
const regions = readJSON("regions.json");
const clubs = readJSON("clubs.json");
const products = readJSON("products.json");

const urls = [];
function add(loc, priority, changefreq) {
    urls.push({ loc: loc, priority: priority, changefreq: changefreq });
}

add(urlFor("/"), "1.0", "weekly");

// Institutional pages (CS-16)
["about", "how-it-works", "faq", "contact", "privacy", "terms", "intermediation-policy"]
    .forEach((s) => add(urlFor("/pages/" + s + ".html"), "0.5", "monthly"));

collections.forEach((c) =>
    add(urlFor("/pages/collection.html?slug=" + encodeURIComponent(c.slug)), "0.8", "weekly"));
leagues.forEach((l) =>
    add(urlFor("/pages/league.html?slug=" + encodeURIComponent(l.slug)), "0.7", "weekly"));
regions.forEach((r) =>
    add(urlFor("/pages/region.html?slug=" + encodeURIComponent(r.slug)), "0.65", "weekly"));
clubs.forEach((c) =>
    add(urlFor("/pages/club.html?slug=" + encodeURIComponent(c.slug)), "0.6", "weekly"));
products.forEach((p) =>
    add(urlFor("/pages/jersey.html?slug=" + encodeURIComponent(p.slug)), "0.5", "monthly"));

const body = urls.map((u) =>
    "  <url>\n" +
    "    <loc>" + xmlEscape(u.loc) + "</loc>\n" +
    "    <lastmod>" + today + "</lastmod>\n" +
    "    <changefreq>" + u.changefreq + "</changefreq>\n" +
    "    <priority>" + u.priority + "</priority>\n" +
    "  </url>"
).join("\n");

const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    body + "\n" +
    "</urlset>\n";

fs.writeFileSync(path.join(ROOT, "sitemap.xml"), xml, "utf8");
console.log("sitemap.xml written with " + urls.length + " URLs (" +
    collections.length + " collections, " + leagues.length + " leagues, " +
    regions.length + " regions, " + clubs.length + " clubs, " +
    products.length + " jerseys).");
