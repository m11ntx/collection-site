/**
 * stamp-version.js
 * Cache-busting for the built *.min.js / *.min.css assets.
 *
 * Run:  node scripts/gen/stamp-version.js   (after scripts/gen/minify.js)
 *
 * Cloudflare caches JS/CSS for 4h (max-age=14400) but HTML/JSON for only 10min,
 * so a code change could be served stale for hours while the data it needs is
 * already live -- exactly what broke the video POC on 2026-08-06. Appending a
 * short content hash (`?v=<hash>`) to every local min asset reference in the
 * HTML gives each new build a fresh URL, so an update is picked up as soon as
 * the (short-cached) HTML refreshes. Unchanged files keep their hash -> no
 * needless re-download. Re-run on every build; it updates existing `?v=` too.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..", "..");
const HTML = [
    "index.html", "404.html",
    ...fs.readdirSync(path.join(ROOT, "pages"))
        .filter((f) => f.endsWith(".html")).map((f) => "pages/" + f),
].filter((f) => fs.existsSync(path.join(ROOT, f)));

const REF = /(\b(?:src|href)=")((?:config|assets)\/[^"?]+\.min\.(?:js|css))(?:\?v=[a-f0-9]+)?(")/g;

const hashes = {};
function hashOf(rel) {
    if (rel in hashes) return hashes[rel];
    let h = null;
    try {
        h = crypto.createHash("md5")
            .update(fs.readFileSync(path.join(ROOT, rel))).digest("hex").slice(0, 8);
    } catch (e) { /* referenced file missing -> leave unstamped */ }
    hashes[rel] = h;
    return h;
}

let changed = 0;
for (const rel of HTML) {
    const p = path.join(ROOT, rel);
    const src = fs.readFileSync(p, "utf8");
    let n = 0;
    const out = src.replace(REF, (m, pre, asset, post) => {
        const h = hashOf(asset);
        if (!h) return m;
        n++;
        return `${pre}${asset}?v=${h}${post}`;
    });
    if (out !== src) { fs.writeFileSync(p, out); changed++; }
    console.log(`${rel}: ${n} asset ref(s) stamped`);
}
console.log(`done -- ${changed} file(s) updated`);
