/**
 * gen_pages.js
 * Generate the M11NTX institutional pages (CS-16) from a single template so the
 * shared chrome (nav, footer, head/SEO) stays consistent. Output goes to
 * pages/*.html and is committed + served. Re-run after editing content here.
 *
 *   node scripts/gen/gen_pages.js
 *
 * Reuses the approved design system (style.min.css) + journey/institutional
 * additive styles. Does not touch the frozen landing.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const SITE = "https://m11ntx.github.io/collection-site";
const OG_IMG = SITE + "/assets/icons/android-chrome-512x512.png";

/* ---------- shared chrome ---------- */

function head(p) {
    const canonical = SITE + "/pages/" + p.file;
    const extraCss = (p.css || []).map(function (c) {
        return '<link rel="stylesheet" href="assets/css/' + c + '.min.css">';
    }).join("\n");
    return `<!DOCTYPE html>
<html lang="${p.lang || "en"}">
<head>
<meta charset="UTF-8">
<base href="../">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>M11NTX | ${p.tab}</title>

<meta name="description" content="${p.desc}">
<meta name="robots" content="index, follow">
<meta name="author" content="M11NTX">
<meta name="theme-color" content="#050505">
<link rel="canonical" href="${canonical}">

<!-- Open Graph -->
<meta property="og:type" content="website">
<meta property="og:site_name" content="M11NTX">
<meta property="og:locale" content="en">
<meta property="og:title" content="M11NTX | ${p.tab}">
<meta property="og:description" content="${p.desc}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${OG_IMG}">
<meta property="og:image:alt" content="M11NTX">

<!-- Twitter Cards -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@m11ntx">
<meta name="twitter:title" content="M11NTX | ${p.tab}">
<meta name="twitter:description" content="${p.desc}">
<meta name="twitter:image" content="${OG_IMG}">

<!-- Favicon pack -->
<link rel="icon" href="assets/icons/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="assets/icons/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="assets/icons/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="assets/icons/apple-touch-icon.png">
<link rel="manifest" href="assets/icons/site.webmanifest">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="assets/css/style.min.css">
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap">
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.min.css">
<link rel="stylesheet" href="assets/css/institutional.min.css">
${extraCss}
</head>`;
}

const NAV = `<header class="nav" id="siteNav">
    <div class="nav__inner">
        <a href="index.html" class="nav__logo" aria-label="M11NTX — Home">
            <img src="assets/images/symbol.png" alt="" class="nav__mark" width="30" height="21" decoding="async">
            <span class="nav__name">M11NTX</span>
        </a>
        <nav class="nav__menu" aria-label="Primary">
            <ul class="nav__list">
                <li><a href="index.html#collections" class="nav__link">Collection</a></li>
                <li><a href="pages/how-it-works.html" class="nav__link">How It Works</a></li>
                <li><a href="pages/faq.html" class="nav__link">FAQ</a></li>
                <li><a href="pages/about.html" class="nav__link">About</a></li>
                <li><a href="pages/contact.html" class="nav__link">Contact</a></li>
            </ul>
            <button type="button" class="nav__search" id="searchOpen" aria-label="Open search">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <circle cx="11" cy="11" r="7"></circle>
                    <line x1="21" y1="21" x2="16.5" y2="16.5"></line>
                </svg>
                <span>Search</span>
            </button>
        </nav>
        <button type="button" class="nav__toggle" id="menuToggle" aria-label="Open menu" aria-expanded="false" aria-controls="mobileMenu">
            <span class="nav__bar"></span>
            <span class="nav__bar"></span>
            <span class="nav__bar"></span>
        </button>
    </div>
</header>

<div class="mobile-menu" id="mobileMenu" aria-hidden="true">
    <div class="mobile-menu__head">
        <span class="mobile-menu__brand">M11NTX</span>
        <button type="button" class="mobile-menu__close" id="menuClose" aria-label="Close menu">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <line x1="6" y1="6" x2="18" y2="18"></line>
                <line x1="18" y1="6" x2="6" y2="18"></line>
            </svg>
        </button>
    </div>
    <nav class="mobile-menu__nav" aria-label="Mobile">
        <a href="index.html#collections" class="mobile-menu__link">Collection</a>
        <a href="pages/how-it-works.html" class="mobile-menu__link">How It Works</a>
        <a href="pages/faq.html" class="mobile-menu__link">FAQ</a>
        <a href="pages/about.html" class="mobile-menu__link">About</a>
        <a href="pages/contact.html" class="mobile-menu__link">Contact</a>
        <button type="button" class="mobile-menu__link mobile-menu__search" id="searchOpenMobile">Search</button>
    </nav>
</div>

<div class="search" id="searchOverlay" role="dialog" aria-modal="true" aria-label="Search the collection" aria-hidden="true">
    <button type="button" class="search__close" id="searchClose" aria-label="Close search">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <line x1="6" y1="6" x2="18" y2="18"></line>
            <line x1="18" y1="6" x2="6" y2="18"></line>
        </svg>
    </button>
    <form class="search__inner" role="search" onsubmit="return false">
        <label class="search__label" for="searchInput">Search the collection</label>
        <div class="search__field">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7"></circle>
                <line x1="21" y1="21" x2="16.5" y2="16.5"></line>
            </svg>
            <input id="searchInput" class="search__input" type="search" placeholder="Search clubs, leagues, jerseys…" autocomplete="off">
        </div>
        <p class="search__hint">Search is coming soon.</p>
    </form>
</div>`;

const FOOTER = `<footer class="site-footer site-footer--full">
    <div class="footer__inner">
        <nav class="footer__links" aria-label="Institutional">
            <a href="pages/about.html">About</a>
            <a href="pages/how-it-works.html">How It Works</a>
            <a href="pages/faq.html">FAQ</a>
            <a href="pages/contact.html">Contact</a>
            <a href="pages/privacy.html">Privacy</a>
            <a href="pages/terms.html">Terms</a>
            <a href="pages/intermediation-policy.html">Intermediation Policy</a>
        </nav>
        <div class="footer__social">
            <a href="https://www.instagram.com/m11ntx/" data-config="instagram" target="_blank" rel="noopener">Instagram</a>
            <a href="mailto:hello.m11ntx@gmail.com" data-config="email">Email</a>
        </div>
    </div>
    <div class="footer__base">
        <span class="footer-left">&copy; 2026 M11NTX</span>
        <img src="assets/images/symbol.png" alt="M11" class="footer-mark" width="855" height="596" loading="lazy" decoding="async">
        <span class="footer-right">Wear The Manto</span>
    </div>
</footer>`;

const SCRIPTS = `<script src="config/site.min.js" defer></script>
<script src="assets/js/seo.min.js" defer></script>
<script src="assets/js/analytics.min.js" defer></script>
<script src="assets/js/ui.min.js" defer></script>
<script src="assets/js/main.min.js" defer></script>`;

function render(p) {
    return `${head(p)}
<body>

<a class="skip-link" href="#main">Skip to content</a>

${NAV}

<main class="detail" id="main">
    <nav class="breadcrumb" aria-label="Breadcrumb">
        <a class="breadcrumb__link" href="index.html">Home</a>
        <span class="breadcrumb__sep" aria-hidden="true">/</span>
        <span class="breadcrumb__current" aria-current="page">${p.crumb}</span>
    </nav>

    <p class="detail__eyebrow">${p.eyebrow}</p>
    <h1 class="detail__title">${p.h1}</h1>
    ${p.lead ? `<p class="detail__desc">${p.lead}</p>` : ""}

    ${p.body}
</main>

${FOOTER}

${SCRIPTS}

</body>
</html>
`;
}

/* ---------- content ---------- */

const faqItems = [
    ["Como funciona a compra?",
     "A M11NTX atua como intermediadora na aquisição de camisas importadas. Você escolhe a peça, consulta a disponibilidade pelo nosso Instagram e conduzimos todo o processo de importação até a entrega."],
    ["Qual é o prazo de entrega?",
     "O prazo estimado é de 25–40 dias corridos, contados após a confirmação da disponibilidade e do atendimento. Por se tratar de importação, pequenas variações podem ocorrer."],
    ["Como funciona a disponibilidade?",
     "A disponibilidade de cada camisa é confirmada individualmente antes do pedido. Ao consultar, verificamos a peça, o tamanho e a versão desejada."],
    ["Como falo com a M11NTX?",
     "Todo o atendimento é feito pelo nosso Instagram oficial. Toque em “Consultar Disponibilidade” em qualquer camisa, ou fale conosco pela página de Atendimento."],
    ["As camisas são importadas?",
     "Sim. Trabalhamos com camisas importadas, adquiridas sob consulta para cada cliente."],
    ["Como é feito o pagamento?",
     "O pagamento é combinado durante o atendimento personalizado, fora da plataforma. Nada é cobrado automaticamente pelo site."],
    ["Vocês têm loja física?",
     "Não. A M11NTX é uma plataforma digital; todo o atendimento acontece pelo Instagram oficial."]
];

const faqHtml = `<div class="faq__list">
${faqItems.map(function (f) {
    return `    <details class="faq__item">
        <summary class="faq__q">${f[0]}<span class="faq__icon" aria-hidden="true"></span></summary>
        <div class="faq__a"><p>${f[1]}</p></div>
    </details>`;
}).join("\n")}
</div>`;

const steps = [
    ["Escolha da camisa", ""],
    ["Contato pelo Instagram", ""],
    ["Confirmação da disponibilidade", ""],
    ["Importação", ""],
    ["Prazo estimado", "25–40 dias corridos"],
    ["Entrega", ""]
];

const stepsHtml = `<ol class="steps">
${steps.map(function (s, i) {
    return `    <li class="step">
        <span class="step__num" aria-hidden="true">${i + 1}</span>
        <div class="step__body">
            <h3 class="step__label">${s[0]}</h3>
            ${s[1] ? `<p class="step__sub">${s[1]}</p>` : ""}
        </div>
    </li>`;
}).join("\n")}
</ol>`;

const PAGES = [
    {
        file: "about.html", tab: "About", crumb: "About", eyebrow: "About", h1: "About M11NTX",
        desc: "M11NTX — premium soccer culture. Curated classic and retro jerseys, sourced as an intermediary with a transparent journey.",
        lead: "Premium soccer culture — the shirts that carry history.",
        body: `<div class="prose">
        <p>M11NTX is a premium soccer-culture project dedicated to the shirts that carry history — curated classic and retro jerseys, presented with the reverence they deserve.</p>
        <p>We are not a traditional store. M11NTX works as an <strong>intermediary</strong> for the acquisition of imported jerseys: you choose the piece, we confirm availability, and we handle the entire import until it reaches your hands.</p>
        <h2>What we stand for</h2>
        <ul>
            <li>Authenticity and provenance over hype.</li>
            <li>Transparency at every step of the journey.</li>
            <li>A premium, unhurried experience — quality over quantity.</li>
        </ul>
        <p>Some jerseys are just shirts. Others carry history. Understand the flow in <a href="pages/how-it-works.html">How It Works</a> and our <a href="pages/intermediation-policy.html">Intermediation Policy</a>.</p>
        <p><strong>Wear The Manto.</strong></p>
    </div>`
    },
    {
        file: "how-it-works.html", tab: "How It Works", crumb: "How It Works",
        eyebrow: "Journey", h1: "How It Works", css: ["journey"], lang: "en",
        desc: "How M11NTX works: choose a jersey, contact us on Instagram, we confirm availability and import it — estimated 25–40 dias corridos to delivery.",
        lead: "Da escolha da camisa até a entrega — um fluxo simples, pessoal e transparente.",
        body: `${stepsHtml}
    <div class="prose">
        <p>A M11NTX atua como intermediadora: a disponibilidade é sempre confirmada antes do pedido e a compra é feita por atendimento personalizado. Saiba mais na <a href="pages/intermediation-policy.html">Política de Intermediação</a>.</p>
        <div class="contact__actions">
            <a class="btn btn--primary" data-config="instagram" href="https://www.instagram.com/m11ntx/" target="_blank" rel="noopener">Consultar Disponibilidade <span class="arrow" aria-hidden="true">&rarr;</span></a>
        </div>
    </div>`
    },
    {
        file: "faq.html", tab: "FAQ", crumb: "FAQ", eyebrow: "FAQ", h1: "Perguntas Frequentes",
        css: ["journey"], lang: "pt-BR",
        desc: "Perguntas frequentes da M11NTX: prazo, disponibilidade, como funciona a compra, atendimento e pagamento.",
        lead: "Tudo o que você precisa saber antes de consultar uma camisa.",
        body: faqHtml
    },
    {
        file: "contact.html", tab: "Contact", crumb: "Contact", eyebrow: "Contact", h1: "Atendimento",
        lang: "pt-BR",
        desc: "Fale com a M11NTX pelo Instagram oficial ou por e-mail. Atendimento personalizado para camisas importadas.",
        lead: "Atendimento pessoal e direto.",
        body: `<div class="prose">
        <p>Todo o atendimento da M11NTX é feito pelo nosso Instagram oficial — de forma pessoal e direta. Escolha a camisa, consulte a disponibilidade e conduzimos todo o processo com você.</p>
        <div class="contact__actions">
            <a class="btn btn--primary" data-config="instagram" href="https://www.instagram.com/m11ntx/" target="_blank" rel="noopener">Falar no Instagram <span class="arrow" aria-hidden="true">&rarr;</span></a>
            <a class="btn btn--secondary" data-config="email" href="mailto:hello.m11ntx@gmail.com">Enviar e-mail</a>
        </div>
        <p class="prose__updated">Prazo estimado de importação: 25–40 dias corridos, após a confirmação.</p>
    </div>`
    },
    {
        file: "privacy.html", tab: "Privacy", crumb: "Privacy", eyebrow: "Privacy", h1: "Política de Privacidade",
        lang: "pt-BR",
        desc: "Como a M11NTX trata dados de navegação, medição e contato. Transparência e conformidade com a LGPD.",
        body: `<div class="prose">
        <p>Esta política descreve como a M11NTX trata as informações ao usar esta plataforma. Prezamos pela transparência e pela coleta mínima de dados.</p>
        <h2>Dados que tratamos</h2>
        <ul>
            <li>Dados de navegação e medição de audiência (ex.: Google Analytics 4 e Microsoft Clarity), de forma agregada.</li>
            <li>Informações que você compartilha voluntariamente ao nos contatar pelo Instagram ou e-mail.</li>
        </ul>
        <p>A plataforma não realiza vendas diretas nem processa pagamentos; portanto, não coletamos dados de pagamento pelo site.</p>
        <h2>Como usamos</h2>
        <ul>
            <li>Para entender o uso do site e melhorar a experiência.</li>
            <li>Para responder e conduzir o atendimento que você iniciar.</li>
        </ul>
        <h2>Cookies e medição</h2>
        <p>Ferramentas de medição podem usar cookies/identificadores. Você pode desativar cookies no navegador; sinais de “Do Not Track” são respeitados pela nossa camada de medição.</p>
        <h2>Compartilhamento</h2>
        <p>Compartilhamos dados apenas com os provedores de medição citados e com as plataformas de contato (Instagram/Meta), conforme suas próprias políticas.</p>
        <h2>Seus direitos (LGPD)</h2>
        <p>Você pode solicitar acesso, correção ou exclusão dos seus dados pelos nossos canais de <a href="pages/contact.html">Atendimento</a>.</p>
        <p class="prose__updated">Última atualização: julho de 2026.</p>
    </div>`
    },
    {
        file: "terms.html", tab: "Terms", crumb: "Terms", eyebrow: "Terms", h1: "Termos de Uso",
        lang: "pt-BR",
        desc: "Termos de uso da plataforma M11NTX: natureza intermediadora, disponibilidade, prazos e atendimento.",
        body: `<div class="prose">
        <p>Ao utilizar esta plataforma, você concorda com os termos abaixo.</p>
        <h2>Sobre a plataforma</h2>
        <p>A M11NTX é uma vitrine digital e atua como <strong>intermediadora</strong> na aquisição de camisas importadas. Não realizamos vendas diretas nem processamos pagamentos pelo site.</p>
        <h2>Disponibilidade e prazos</h2>
        <ul>
            <li>A disponibilidade de cada camisa é <strong>confirmada antes do pedido</strong>.</li>
            <li>O prazo estimado de importação é de <strong>25–40 dias corridos</strong>, podendo variar por se tratar de importação.</li>
        </ul>
        <h2>Atendimento e pagamento</h2>
        <p>A compra é realizada mediante atendimento personalizado, pelo Instagram oficial, com condições combinadas fora da plataforma.</p>
        <h2>Propriedade intelectual</h2>
        <p>Marcas, escudos e nomes de clubes pertencem aos seus respectivos titulares e são usados apenas para fins de identificação das peças.</p>
        <h2>Limitação de responsabilidade</h2>
        <p>As informações são fornecidas “como estão”. Prazos são estimativas e imagens podem ter variações. Consulte a <a href="pages/intermediation-policy.html">Política de Intermediação</a>.</p>
        <p class="prose__updated">Última atualização: julho de 2026.</p>
    </div>`
    },
    {
        file: "intermediation-policy.html", tab: "Intermediation Policy", crumb: "Intermediation Policy",
        eyebrow: "Policy", h1: "Política de Intermediação", lang: "pt-BR",
        desc: "A M11NTX atua como intermediadora na aquisição de camisas importadas, com atendimento personalizado e disponibilidade confirmada antes do pedido.",
        lead: "Transparência sobre como conduzimos cada aquisição.",
        body: `<div class="prose">
        <p>A M11NTX atua como <strong>intermediadora</strong> na aquisição de camisas importadas. Não realizamos vendas diretas pela plataforma.</p>
        <ul>
            <li>A compra é realizada mediante <strong>atendimento personalizado</strong>, pelo nosso Instagram oficial.</li>
            <li>A <strong>disponibilidade</strong> de cada camisa será <strong>sempre confirmada antes do pedido</strong>.</li>
            <li>O prazo estimado de importação é de <strong>25–40 dias corridos</strong>, contados após a confirmação.</li>
        </ul>
        <h2>Como funciona</h2>
        <p>Você escolhe a peça, consulta a disponibilidade, confirmamos as condições e conduzimos a importação até a entrega. Veja o passo a passo em <a href="pages/how-it-works.html">How It Works</a>.</p>
        <p>Nosso compromisso é com a clareza: nada é cobrado automaticamente e cada etapa é combinada com você antes de avançar.</p>
        <p class="prose__updated">Última atualização: julho de 2026.</p>
    </div>`
    }
];

PAGES.forEach(function (p) {
    fs.writeFileSync(path.join(ROOT, "pages", p.file), render(p), "utf8");
    console.log("wrote pages/" + p.file);
});
console.log("done: " + PAGES.length + " institutional pages.");
