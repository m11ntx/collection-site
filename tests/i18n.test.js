/**
 * i18n.test.js
 * Zero-dependency tests for the PT/EN language switch (CS-19).
 *
 * Run in Node:      node tests/i18n.test.js
 *
 * Validates: STRINGS pt/en key-shape parity (no missing translations),
 * translateName() against every real product name in data/products.json
 * (no leftover known-PT vocabulary in the EN output), and the fieldLabel/
 * properNoun/t() fallback behavior for unknown values.
 */
(function (root, factory) {
    if (typeof module !== "undefined" && module.exports) {
        const fakeStorage = (function () {
            let store = {};
            return {
                getItem: (k) => (k in store ? store[k] : null),
                setItem: (k, v) => { store[k] = String(v); },
                clear: () => { store = {}; }
            };
        })();
        global.window = { localStorage: fakeStorage, location: { reload: () => {} } };
        module.exports = factory(
            require("../assets/js/i18n.js"),
            require("fs").readFileSync(require("path").join(__dirname, "..", "data", "products.json"), "utf8"),
            global.window.localStorage
        );
    } else {
        root.I18N_TEST_REPORT = factory(root.I18N, null, null);
    }
})(typeof window !== "undefined" ? window : null, function (I18N, productsJsonRaw, storage) {
    "use strict";

    /* ---- tiny assert harness (no deps) ---- */
    const results = [];
    function test(name, fn) {
        try { fn(); results.push({ name: name, ok: true }); }
        catch (e) { results.push({ name: name, ok: false, err: e.message }); }
    }
    function eq(actual, expected, msg) {
        if (actual !== expected) {
            throw new Error((msg || "") + ` expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
    }
    function ok(cond, msg) { if (!cond) throw new Error(msg || "expected truthy"); }

    function setLang(lang) { storage.setItem("m11ntx_lang", lang); }

    /* ---- STRINGS key-shape parity: pt/en must define the same keys ---- */
    function keyPaths(node, prefix) {
        if (Array.isArray(node)) return [prefix]; // arrays compared as a leaf (see journey test below)
        if (node && typeof node === "object") {
            return Object.keys(node).sort().flatMap((k) => keyPaths(node[k], prefix ? prefix + "." + k : k));
        }
        return [prefix];
    }

    test("STRINGS.pt and STRINGS.en define exactly the same keys", () => {
        const ptKeys = keyPaths(I18N.STRINGS.pt, "").sort();
        const enKeys = keyPaths(I18N.STRINGS.en, "").sort();
        const missingInEn = ptKeys.filter((k) => !enKeys.includes(k));
        const missingInPt = enKeys.filter((k) => !ptKeys.includes(k));
        ok(missingInEn.length === 0, "keys missing in en: " + missingInEn.join(", "));
        ok(missingInPt.length === 0, "keys missing in pt: " + missingInPt.join(", "));
    });

    test("journey.steps and journey.faq have the same item count in pt/en", () => {
        eq(I18N.STRINGS.en.journey.steps.length, I18N.STRINGS.pt.journey.steps.length, "steps count");
        eq(I18N.STRINGS.en.journey.faq.length, I18N.STRINGS.pt.journey.faq.length, "faq count");
    });

    /* ---- t() ---- */
    test("t() resolves a dotted path in the active language", () => {
        setLang("pt");
        eq(I18N.t("nav.collection"), "Coleção");
        setLang("en");
        eq(I18N.t("nav.collection"), "Collection");
    });

    test("t() interpolates {vars}", () => {
        setLang("en");
        eq(I18N.t("collectionDetail.clubsSubtitle", { name: "Europa" }), "The clubs that shaped Europa.");
    });

    test("t() falls back to the literal path when the key doesn't exist", () => {
        eq(I18N.t("nope.not.a.real.key"), "nope.not.a.real.key");
    });

    /* ---- fieldLabel() / properNoun() ---- */
    test("fieldLabel() translates a known controlled value", () => {
        setLang("pt");
        eq(I18N.fieldLabel("gender", "Men"), "Masculina");
        setLang("en");
        eq(I18N.fieldLabel("gender", "Men"), "Men");
    });

    test("fieldLabel() falls through unchanged for an unknown value", () => {
        eq(I18N.fieldLabel("gender", "Cyborg"), "Cyborg");
        eq(I18N.fieldLabel("type", ""), "");
    });

    test("properNoun() translates a known collection name, passes through unknown ones", () => {
        setLang("en");
        eq(I18N.properNoun("Brasil"), "Brazil");
        eq(I18N.properNoun("Europa"), "Europe");
        eq(I18N.properNoun("Atlantis"), "Atlantis");
    });

    /* ---- sizeLabel() ---- */
    test("sizeLabel() converts Brazilian letters to the EN scheme", () => {
        setLang("en");
        eq(I18N.sizeLabel("P"), "S");
        eq(I18N.sizeLabel("M"), "M");
        eq(I18N.sizeLabel("G"), "L");
        eq(I18N.sizeLabel("GG"), "XL");
        eq(I18N.sizeLabel("XG"), "XL");
        eq(I18N.sizeLabel("2GG"), "2XL");
        eq(I18N.sizeLabel("3GG"), "3XL");
        eq(I18N.sizeLabel("4GG"), "4XL");
    });

    test("sizeLabel() is a no-op in pt (already the source scheme)", () => {
        setLang("pt");
        eq(I18N.sizeLabel("GG"), "GG");
        eq(I18N.sizeLabel("P"), "P");
    });

    test("sizeLabel() passes through an unknown value unchanged (e.g. a mis-mapped option)", () => {
        setLang("en");
        eq(I18N.sizeLabel("SEM PERSONALIZAÇÃO"), "SEM PERSONALIZAÇÃO");
        eq(I18N.sizeLabel(""), "");
        eq(I18N.sizeLabel(null), null);
    });

    test("sizeLabel() is case-insensitive", () => {
        setLang("en");
        eq(I18N.sizeLabel("gg"), "XL");
    });

    /* ---- translateName() ---- */
    test("translateName() is the identity function in pt", () => {
        setLang("pt");
        const name = "Camisa Retrô Seleção Brasileira Copa América 19/20 Torcedor - Masculina - Branca";
        eq(I18N.translateName(name), name);
    });

    test("translateName() handles null/empty safely", () => {
        setLang("en");
        eq(I18N.translateName(null), "");
        eq(I18N.translateName(""), "");
        eq(I18N.translateName(undefined), "");
    });

    test("translateName() translates known vocabulary and fixes the 'Braqnco' typo", () => {
        setLang("en");
        const out = I18N.translateName("Camisa Manchester United Away Retrô 91/93 Torcedor Adidas Masculina - Azul e Braqnco");
        eq(out, "Jersey Manchester United Away Retro 91/93 Fan Adidas Men's - Blue and White");
    });

    test("translateName() keeps 'Azul Marinho' as one navy-blue phrase, not two colors", () => {
        setLang("en");
        const out = I18N.translateName("Camisa Retrô Arsenal Away 95/96 Torcedor Nike Masculina - Azul Marinho");
        ok(out.indexOf("Navy Blue") !== -1, "expected 'Navy Blue' in: " + out);
    });

    test("translateName() preserves lowercase color casing inside a comma list", () => {
        setLang("en");
        const out = I18N.translateName(
            "Camisa Retrô Paris Saint-Germain II 1998/1999 - Torcedor Nike Masculina - Branca, azul e vermelha");
        eq(out, "Jersey Retro Paris Saint-Germain II 1998/1999 - Fan Nike Men's - White, blue and red");
    });

    test("translateName() leaves every real product name free of known PT tokens in en", () => {
        setLang("en");
        const products = JSON.parse(productsJsonRaw);
        const leftoverPtWords = [
            "Camisa", "Retrô", "Torcedor", "Masculina", "Feminina", "Seleção",
            "Amarelo", "Amarela", "Vermelho", "Vermelha", "Branco", "Branca", "Braqnco",
            "Preto", "Preta", "Verde", "Azul", "Grená", "Marinho", "Bege", "Cinza"
        ];
        const offenders = [];
        products.forEach((p) => {
            if (!p.name) return;
            const translated = I18N.translateName(p.name);
            leftoverPtWords.forEach((w) => {
                const re = new RegExp("(^|[\\s,\\-])" + w + "(?=[\\s,\\-]|$)", "i");
                if (re.test(translated)) offenders.push(p.name + " -> " + translated + " (leftover: " + w + ")");
            });
        });
        ok(offenders.length === 0, "products with leftover PT vocabulary:\n" + offenders.join("\n"));
    });

    // MI-36/CS-51: the test above only checks a fixed 20-word blocklist, so it
    // stayed green while ~90 other PT words (apparel terms, colors, sponsor/
    // edition vocabulary, country names) quietly leaked into "en" mode -- a
    // full sweep found and fixed all of them. This test catches ANY leftover
    // accented character going forward (a good proxy for "still PT" -- English
    // barely uses them), so a future data addition with new vocabulary fails
    // loudly instead of silently shipping untranslated cards. The allowlist
    // covers genuine proper nouns translateName() is not supposed to touch
    // (club/place/person names, per docs/i18n.md) plus one known upstream
    // data-quality bug (literal &quot; entities in 2 product names -- a
    // catalog-pipeline text-normalization fix, not an i18n gap).
    test("translateName() output has no unexpected leftover accented tokens in en", () => {
        setLang("en");
        const products = JSON.parse(productsJsonRaw);
        const allowlist = new Set([
            // Club/place proper nouns (never translated -- see docs/i18n.md
            // "Club/league/collection proper nouns are not translated by
            // translateName").
            "Atlético", "Grêmio", "São", "Esquadrão", "América", "Vitória",
            "Náutico", "Bétis", "Dragão", "Montréal", "Curaçao", "AméricaMEX",
            "Peñarol", "México2425", "Avaí", "Ceará", "Dicá", "Leão",
            "Mönchengladbach", "Tubarões",
            // League proper noun kept as-is, same convention as Bundesliga/
            // La Liga/Süper Lig (a foreign-league brand name, not translated).
            "Brasileirão",
            // Person names (tribute/commemorative jerseys).
            "Pelé", "Romário",
            // Proper institutional/sponsor name ("Caixa Econômica Federal",
            // a Brazilian bank) -- not a generic adjective in this context.
            "Econômica",
            // Named cultural/religious event (Belém, Pará's "Círio de
            // Nazaré" procession) -- a proper noun, not generic vocabulary.
            "Círio", "Nazaré"
        ]);
        const accentRe = /[À-ÖØ-öø-ÿ]/;
        const offenders = [];
        products.forEach((p) => {
            if (!p.name) return;
            const translated = I18N.translateName(p.name);
            translated.split(/\s+/).forEach((word) => {
                if (!accentRe.test(word)) return;
                const clean = word.replace(/[.,\-()/[\]"'“”]/g, "");
                if (!accentRe.test(clean) || allowlist.has(clean)) return;
                offenders.push(p.name + " -> " + translated + " (leftover token: " + clean + ")");
            });
        });
        ok(offenders.length === 0, "products with unexpected leftover PT vocabulary:\n" + offenders.join("\n"));
    });

    /* ---- getLang() / setLang() persistence ---- */
    test("getLang() reflects what setLang() persisted", () => {
        setLang("en");
        eq(I18N.getLang(), "en");
        setLang("pt");
        eq(I18N.getLang(), "pt");
    });

    test("getLang() defaults to en when nothing is stored", () => {
        storage.clear();
        eq(I18N.getLang(), "en");
    });

    /* ---- report ---- */
    const passed = results.filter((r) => r.ok).length;
    const failed = results.length - passed;
    const lines = results.map((r) => (r.ok ? "  PASS " : "  FAIL ") + r.name +
        (r.ok ? "" : "\n        -> " + r.err));
    const summary = `\nI18N — ${passed}/${results.length} passed` +
        (failed ? `, ${failed} FAILED` : "") + "\n" + lines.join("\n") + "\n";

    if (typeof console !== "undefined") console.log(summary);
    if (typeof process !== "undefined" && failed) process.exitCode = 1;

    return { results: results, passed: passed, failed: failed, summary: summary };
});
