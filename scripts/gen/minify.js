/**
 * minify.js
 * Dependency-free minifier for the M11NTX static site (CS-15).
 *
 * Run:  node scripts/gen/minify.js
 *
 * Generates *.min.css and *.min.js next to the sources. The source files stay
 * the editable truth; the .min files are generated artifacts referenced by the
 * HTML in production. Re-run after editing any CSS/JS.
 *
 * Design goal: correctness over maximum compression. The JS pass is a
 * conservative, scanner-based minifier that is string/template/regex/comment
 * aware and KEEPS newlines (so Automatic Semicolon Insertion is never affected).
 * It strips comments + indentation + blank lines and collapses runs of spaces.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");

const CSS_FILES = [
    "assets/css/style.css",
    "assets/css/filters.css",
    "assets/css/journey.css",
    "assets/css/institutional.css"
];

const JS_FILES = [
    "config/site.js",
    "assets/js/i18n.js",
    "assets/js/api.js",
    "assets/js/image-loader.js",
    "assets/js/services/locationService.js",
    "assets/js/services/languageService.js",
    "assets/js/services/currencyService.js",
    "assets/js/services/localization.js",
    "assets/js/catalog.js",
    "assets/js/filters.js",
    "assets/js/search.js",
    "assets/js/seo.js",
    "assets/js/analytics.js",
    "assets/js/ui.js",
    "assets/js/main.js",
    "assets/js/cart.js"
];

/* ============================================================
   CSS — string-aware, drops comments, collapses whitespace,
   removes spaces around { } ; , (safe set; keeps calc/combinators).
============================================================ */
function minifyCSS(css) {
    const strs = [];
    let r = "";
    for (let i = 0; i < css.length;) {
        if (css.substr(i, 2) === "/*") {                 // comment
            const e = css.indexOf("*/", i + 2);
            i = e < 0 ? css.length : e + 2;
            continue;
        }
        const ch = css[i];
        if (ch === '"' || ch === "'") {                  // string — keep verbatim
            let s = ch; i++;
            while (i < css.length) {
                s += css[i];
                if (css[i] === "\\") { s += css[i + 1]; i += 2; continue; }
                if (css[i] === ch) { i++; break; }
                i++;
            }
            strs.push(s);
            r += "@@S" + (strs.length - 1) + "@@";        // sentinel placeholder
            continue;
        }
        r += ch; i++;
    }
    r = r.replace(/\s+/g, " ")
        .replace(/\s*([{};,])\s*/g, "$1")
        .replace(/;}/g, "}")
        .trim();
    r = r.replace(/@@S(\d+)@@/g, function (m, k) { return strs[+k]; });
    return r + "\n";
}

/* ============================================================
   JS — conservative scanner. Preserves strings, template literals
   (incl. nested ${}), and regex literals verbatim; drops comments;
   collapses spaces/tabs; trims lines; keeps newlines.
============================================================ */
function minifyJS(src) {
    let i = 0;
    const n = src.length;
    let out = "";
    let lastSig = "";
    const REGEX_OK = "(,=:[!&|?{};+-*%^~<>";

    function copyTemplate() {
        let s = "`"; i++;
        while (i < n) {
            const d = src[i];
            if (d === "\\") { s += d + (src[i + 1] || ""); i += 2; continue; }
            if (d === "`") { s += "`"; i++; break; }
            if (d === "$" && src[i + 1] === "{") {
                s += "${"; i += 2; let depth = 1;
                while (i < n && depth > 0) {
                    const e = src[i];
                    if (e === "\\") { s += e + (src[i + 1] || ""); i += 2; continue; }
                    if (e === "`") { s += copyTemplate(); continue; }
                    if (e === '"' || e === "'") {
                        let q = e; s += e; i++;
                        while (i < n) { s += src[i]; if (src[i] === "\\") { s += src[i + 1]; i += 2; continue; } if (src[i] === q) { i++; break; } i++; }
                        continue;
                    }
                    if (e === "{") { depth++; s += e; i++; continue; }
                    if (e === "}") { depth--; s += e; i++; continue; }
                    s += e; i++;
                }
                continue;
            }
            s += d; i++;
        }
        return s;
    }

    while (i < n) {
        const c = src[i], c2 = src[i + 1];

        if (c === "/" && c2 === "/") { i += 2; while (i < n && src[i] !== "\n") i++; continue; }
        if (c === "/" && c2 === "*") { i += 2; while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++; i += 2; out += " "; continue; }

        if (c === '"' || c === "'") {
            let s = c; i++;
            while (i < n) { s += src[i]; if (src[i] === "\\") { s += src[i + 1]; i += 2; continue; } if (src[i] === c) { i++; break; } i++; }
            out += s; lastSig = c; continue;
        }

        if (c === "`") { out += copyTemplate(); lastSig = "`"; continue; }

        if (c === "/" && (lastSig === "" || REGEX_OK.indexOf(lastSig) !== -1)) {
            let s = "/"; i++; let inClass = false;
            while (i < n) {
                const d = src[i]; s += d;
                if (d === "\\") { s += src[i + 1]; i += 2; continue; }
                if (d === "[") inClass = true;
                else if (d === "]") inClass = false;
                else if (d === "/" && !inClass) { i++; break; }
                i++;
            }
            while (i < n && /[a-z]/i.test(src[i])) { s += src[i]; i++; }
            out += s; lastSig = "/"; continue;
        }

        if (c === " " || c === "\t") { while (i < n && (src[i] === " " || src[i] === "\t")) i++; out += " "; continue; }
        if (c === "\r") { i++; continue; }
        if (c === "\n") { out += "\n"; i++; continue; }

        out += c; lastSig = c; i++;
    }

    return out.split("\n")
        .map(function (l) { return l.replace(/^[ \t]+/, "").replace(/[ \t]+$/, ""); })
        .filter(function (l) { return l.length > 0; })
        .join("\n") + "\n";
}

/* ============================================================ */
function minFile(rel, fn) {
    const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
    const out = fn(src);
    const dot = rel.lastIndexOf(".");
    const outRel = rel.slice(0, dot) + ".min" + rel.slice(dot);
    fs.writeFileSync(path.join(ROOT, outRel), out, "utf8");
    const pct = src.length ? Math.round((1 - out.length / src.length) * 100) : 0;
    console.log(rel + " -> " + outRel + "  " + src.length + " -> " + out.length + " (-" + pct + "%)");
}

CSS_FILES.forEach(function (f) { minFile(f, minifyCSS); });
JS_FILES.forEach(function (f) { minFile(f, minifyJS); });
console.log("done.");

// Cache-busting: re-stamp the HTML asset refs with the fresh content hashes, so
// a JS/CSS update is never served stale behind Cloudflare's 4h asset cache
// (the HTML/JSON cache is only 10min). Runs automatically after every minify.
require("./stamp-version.js");
