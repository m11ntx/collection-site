/**
 * i18n.js
 * PT/EN language switch for M11NTX — a client-side dictionary + localStorage,
 * no routing, no build step (CS-19).
 *
 * - `STRINGS` covers every static UI string (nav, footer, hero, empty states,
 *   spec labels, the customer journey, FAQ, institutional page bodies).
 * - `FIELD_LABELS` / `PROPER_NOUNS` translate the small set of controlled
 *   values that already live in data/*.json (type, category, gender, version,
 *   collection name) — the JSON itself never changes (RN-012).
 * - `translateName()` is a **rule-based phrase/word substitution** over the
 *   free-text jersey `name` field, built from the exact PT vocabulary in
 *   today's data/products.json. It is not machine translation — see
 *   docs/i18n.md for the trade-off and how to extend it.
 *
 * Exported to `window.I18N` (browser) and `module.exports` (Node tests), same
 * pattern as filters.js.
 */
(function (root, factory) {
    "use strict";
    const api = factory();
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    if (root) root.I18N = api;
})(typeof window !== "undefined" ? window : null, function () {
    "use strict";

    const STORAGE_KEY = "m11ntx_lang";
    // The frozen hero (index.html landing) has no visible nav/toggle until the
    // user scrolls past it, so it stays hardcoded English and is never
    // translated — EN is the site-wide default to match it.
    const DEFAULT_LANG = "en";

    /* ============================================================
       UI strings — one key per string, both languages side by side
       so a missing translation is obvious at a glance.
    ============================================================ */
    const STRINGS = {
        pt: {
            nav: {
                home: "M11NTX — Início", collection: "Coleção", catalog: "Catálogo",
                howItWorks: "Como Funciona", reviews: "Avaliações",
                faq: "FAQ", about: "Sobre", contact: "Contato",
                openSearch: "Abrir busca", search: "Buscar",
                searchPlaceholder: "Buscar na coleção",
                openMenu: "Abrir menu", closeMenu: "Fechar menu",
                langToggle: "Mudar para inglês", langToggleLabel: "EN"
            },
            mobileMenu: { brand: "M11NTX" },
            search: {
                closeSearch: "Fechar busca", dialogLabel: "Buscar na coleção",
                placeholder: "Buscar clubes, ligas, camisas…",
                hint: "Digite para buscar camisas, clubes e ligas…",
                noResults: "Nenhum resultado para “{query}”.",
                resultSingular: "resultado", resultPlural: "resultados",
                viewAllClub: "Ver todas as {count} camisas de {club} →"
            },
            footer: {
                about: "Sobre", howItWorks: "Como Funciona", faq: "FAQ", contact: "Contato",
                privacy: "Privacidade", terms: "Termos", intermediationPolicy: "Política de Intermediação",
                instagram: "Instagram", email: "E-mail", tagline: "Wear The Manto"
            },
            hero: {
                skipToContent: "Pular para o conteúdo",
                title: "MAIS QUE<br>CAMISAS",
                text: "Algumas camisas são apenas camisas.<br>Outras carregam história.",
                sub: "Camisas de futebol importadas — <b>monte seu pedido</b> aqui e finalize no WhatsApp, sem pagamento no site.",
                explore: "Explorar a coleção",
                trust1: "Importação premium", trust2: "Entrega 25–40 dias",
                trust3: "Troca em 7 dias", trust4: "Finaliza no WhatsApp"
            },
            home: {
                featuredEyebrow: "Mais pedidas", featuredTitle: "Camisas em destaque",
                featuredSub: "Alguns destaques do catálogo — toque para montar seu pedido.",
                seeAll: "Ver todas",
                howEyebrow: "Simples e transparente", howTitle: "Como funciona",
                howSub: "Do clique ao manto na sua porta — sem pagamento no site.",
                how1t: "Monte seu pedido", how1d: "Escolha a camisa, o tamanho e a quantidade. Quer nome e número? Personalize por +R$40 a peça.",
                how2t: "Finalize no WhatsApp", how2d: "Preencha seus dados e abrimos o WhatsApp com o pedido pronto. Você confirma pagamento e envio com segurança.",
                how3t: "Receba em casa", how3d: "Importamos e acompanhamos até a entrega — 25 a 40 dias corridos. Troca garantida em 7 dias.",
                ctaTitle: "Pronto pra vestir o manto?", ctaText: "Monte seu pedido em minutos. A gente finaliza com você no WhatsApp — sem cobrança automática, com atendimento de verdade.",
                ctaBtn: "Montar meu pedido"
            },
            reviews: {
                eyebrow: "Avaliações", title: "O que dizem",
                empty: "Seja o primeiro a avaliar esta camisa.",
                count: "{n} avaliações", write: "Escrever avaliação",
                writeCta: "Deixe a sua avaliação",
                pageTitle: "Avaliações", pageSubtitle: "Comprou com a gente? Conte como foi — deixe sua nota, comentário e fotos. Analisamos e publicamos.",
                productOptional: "Qual produto? (opcional)", photos: "Adicionar fotos (opcional)",
                wallEmpty: "Ainda não há avaliações publicadas. Seja a primeira pessoa a avaliar!",
                rating: "Sua nota", yourName: "Seu nome", comment: "Seu comentário (opcional)",
                photo: "Foto (opcional)", submit: "Enviar avaliação",
                needName: "Informe seu nome.", needRating: "Escolha uma nota.",
                sending: "Enviando…", thanks: "Obrigado! Sua avaliação passará por aprovação antes de aparecer.",
                fail: "Não deu pra enviar agora. Tente de novo."
            },
            collections: {
                eyebrow: "A Coleção", title: "Coleções", subtitle: "Explore a história do futebol.",
                noscript: "Ative o JavaScript para explorar as coleções.",
                empty: "Nenhuma coleção disponível ainda.", exploreCta: "Explorar",
                otherTitle: "Outros"
            },
            catalogPage: {
                eyebrow: "Acervo Completo", title: "Catálogo",
                subtitle: "Todas as camisas em um só lugar. Filtre por clube, liga, temporada e mais."
            },
            breadcrumb: { home: "Início", collections: "Coleções" },
            common: { labelCollection: "Coleção", labelLeague: "Liga", labelRegion: "Região", labelClub: "Clube", labelJersey: "Camisa", close: "Fechar" },
            collectionDetail: {
                featured: "Destaque", eyebrow: "Coleção",
                clubsEyebrow: "Clubes", clubsTitle: "Clubes",
                clubsSubtitle: "Os clubes que moldaram {name}.",
                clubsEmpty: "Os clubes desta coleção chegam em breve.",
                leaguesEyebrow: "Ligas", leaguesTitle: "Ligas",
                leaguesSubtitle: "As ligas que moldaram {name}.",
                leaguesEmpty: "As ligas desta coleção chegam em breve."
            },
            notFound: {
                title: "Não encontrado", desc: "Isso ainda não existe.",
                cta: "Voltar às Coleções"
            },
            leagueDetail: {
                eyebrow: "Liga",
                regionsEyebrow: "Regiões", regionsTitle: "Regiões",
                regionsSubtitle: "As regiões que compõem {name}.",
                regionsEmpty: "As regiões desta liga chegam em breve."
            },
            leagueCard: { viewClubs: "Ver clubes" },
            regionDetail: { eyebrow: "Região" },
            regionCard: { viewClubs: "Ver clubes" },
            clubDetail: {
                jerseySingular: "camisa", jerseyPlural: "camisas",
                archiveEyebrow: "Acervo", jerseysTitle: "Camisas",
                jerseysSubtitle: "{countLabel} no acervo do {name}.",
                empty: "Nenhuma camisa neste acervo ainda.",
                segmentAll: "Todas", segmentFan: "Fan", segmentPlayer: "Jogador",
                segmentWomen: "Feminino", segmentRetro: "Retrô", segmentKids: "Infantil",
                segmentFilterLabel: "Filtrar"
            },
            clubCard: { viewJerseys: "Ver camisas" },
            jerseyCard: { viewDetails: "Ver Detalhes", new: "Novo", quickAdd: "Adicionar ao pedido" },
            filters: {
                reset: "Limpar", resultCount: "{count} de {total} camisas",
                searchPlaceholder: "Buscar por clube, nome, temporada…",
                loadMore: "Ver mais ({n})",
                title: "Filtros", apply: "Ver {count} resultados",
                empty: "Nenhum filtro disponível.",
                label: {
                    collection: "Coleção", league: "Liga", club: "Clube",
                    manufacturer: "Marca", season: "Temporada", version: "Versão",
                    category: "Categoria", gender: "Gênero", availability: "Disponibilidade"
                }
            },
            jerseyDetail: {
                eyebrow: "Camisa",
                specBrand: "Marca", specType: "Tipo", specCategory: "Categoria",
                specSeason: "Temporada", specVersion: "Versão", specGender: "Gênero",
                sizesLabel: "Tamanhos",
                consultCta: "Fale com a gente",
                consultAriaLabel: "Fale com a M11NTX sobre {name}",
                addToOrder: "Adicionar ao pedido",
                personalizeToggle: "Personalizar (nome e número)",
                persoNamePlaceholder: "Nome (ex.: VINI JR)",
                persoNumberPlaceholder: "Nº",
                sizeRequired: "Escolha um tamanho.",
                orderConsult: "Prefere falar conosco? Chame no Instagram",
                sizeGuideLabel: "Guia de Tamanhos",
                sizeGuideLink: "Guia de tamanhos",
                sizeGuideAlt: "Guia de tamanhos M11NTX",
                trustLabel: "Nossas garantias",
                trustDelivery: "Prazo 25–40 dias",
                trustReturns: "Troca em 7 dias",
                trustPayment: "Pagamento pelo WhatsApp",
                note: "Importação premium · Prazo estimado 25–40 dias corridos",
                personalizationNote: "Esta camisa pode ser personalizada com nome e número (+{price})"
            },
            journey: {
                eyebrow: "Jornada", title: "Como Funciona",
                steps: [
                    { label: "Escolha da camisa" },
                    { label: "Monte o pedido no site" },
                    { label: "Finalize pelo WhatsApp" },
                    { label: "Importação" },
                    { label: "Prazo estimado", sub: "25–40 dias corridos" },
                    { label: "Entrega" }
                ],
                importInfoEyebrow: "Informações de Importação",
                importInfoText: "A M11NTX facilita a importação de camisas selecionadas. " +
                    "Você monta o pedido no site e finaliza pelo WhatsApp; a disponibilidade é confirmada ao recebermos o pedido.",
                deliveryLabel: "Prazo estimado", deliveryValue: "25–40 dias corridos",
                faqEyebrow: "FAQ", faqTitle: "Perguntas Frequentes",
                faq: [
                    { q: "Como funciona a compra?", a: "Você monta o pedido aqui no site: escolhe a camisa, tamanho e quantidade, adiciona personalização se quiser (nome e número, +R$40 por peça) e clica em Adicionar ao pedido. No carrinho, preencha seus dados e finalize — abrimos um WhatsApp com o pedido pronto pra você confirmar pagamento e envio com a gente." },
                    { q: "Qual é o prazo de entrega?", a: "A importação é estimada em 25–40 dias corridos, contados após a confirmação do pedido e do pagamento. Por se tratar de importação, pequenas variações podem ocorrer." },
                    { q: "Como é feito o pagamento?", a: "Sem cobrança automática no site. Ao finalizar o pedido, combinamos a forma de pagamento com você pelo WhatsApp, com segurança." },
                    { q: "Posso personalizar a camisa?", a: "Sim. Na página do produto, marque Personalizar e informe nome e número. A personalização custa R$40 por peça, somada ao pedido." },
                    { q: "Como funciona a disponibilidade?", a: "Trabalhamos com importação. Ao recebermos seu pedido, confirmamos a disponibilidade da peça, do tamanho e da versão e seguimos com a compra." },
                    { q: "Vocês atendem fora do Brasil?", a: "Sim. No checkout, selecione seu país e preencha o endereço internacional; combinamos frete e prazo pelo WhatsApp." },
                    { q: "Como funcionam trocas e devoluções?", a: "Arrependimento: você pode desistir em até 7 dias corridos após o recebimento (CDC, compra a distância), com o produto sem uso, etiquetas e embalagem original. Troca de tamanho: em até 7 dias, com o frete de envio e retorno por conta do cliente. Produtos personalizados (nome/número), por serem feitos sob encomenda, não têm troca por arrependimento ou tamanho — apenas em caso de defeito de fabricação (nesse caso, sem custo de frete). Para solicitar, fale com a gente pelo WhatsApp informando o número do pedido." },
                    { q: "Vocês têm loja física?", a: "Não. Somos uma operação online; o pós-pedido é conduzido pelo WhatsApp e nosso Instagram (@m11ntx) segue como vitrine e contato." }
                ]
            },
            cart: {
                fab: "Meu pedido", title: "Meu pedido",
                empty: "Seu pedido está vazio.<br>Adicione camisas pelo botão “Adicionar ao pedido”.",
                noPayNote: "Sem pagamento agora — você finaliza o pedido pelo WhatsApp.",
                stData: "Seus dados", returnsLink: "Trocas e devoluções",
                noPayBanner: "Sem pagamento agora — você confere tudo e combina o pagamento com a gente no WhatsApp.",
                checkout: "Finalizar pedido", yourData: "Seus dados", deliveryAddress: "Endereço de entrega",
                privacyNote: "Ao continuar, você concorda em ser contatado sobre este pedido.",
                submit: "Registrar e abrir o WhatsApp", back: "Voltar", registering: "Registrando…",
                success: "Pedido registrado! Abrimos o WhatsApp pra você concluir.",
                waGreeting: "Olá! Quero finalizar meu pedido M11NTX:", addressLabel: "Endereço",
                remove: "Remover", persoAdd: "✚ personalizar (nome/nº)", persoEdit: "✎ editar personalização",
                country: "País", name: "Nome completo", cpf: "CPF", docIntl: "Documento / Passaporte", optional: "(opcional)",
                phone: "WhatsApp", email: "E-mail", cep: "CEP", postal: "CEP / Código postal",
                number: "Número", street: "Rua", addr1: "Endereço", neighborhood: "Bairro",
                city: "Cidade", state: "UF", stateIntl: "Estado / Província", complement: "Complemento",
                fill: "Preencha: {label}.", invalidCPF: "CPF inválido.", phoneShort: "WhatsApp incompleto.",
                invalidEmail: "E-mail inválido.", cepShort: "CEP incompleto.",
                cepSearching: "Buscando endereço…", cepFilled: "Endereço preenchido ✓",
                cepNotFound: "CEP não encontrado — preencha manualmente.",
                cepFail: "Não deu pra buscar o CEP — preencha manualmente."
            },
            page404: {
                eyebrow: "Erro 404", title: "Página não encontrada",
                desc: "A página que você procura não existe ou foi movida.",
                cta: "Voltar às Coleções"
            },
            institutional: {
                about: {
                    eyebrow: "Sobre", h1: "Sobre a M11NTX",
                    desc: "M11NTX — cultura premium do futebol. Camisas clássicas e retrô selecionadas, com uma jornada transparente.",
                    lead: "Cultura premium do futebol — as camisas que carregam história.",
                    body: "<p>A M11NTX é um projeto premium de cultura do futebol dedicado às camisas que carregam história — camisas retrô e clássicas selecionadas, apresentadas com a reverência que merecem.</p>" +
                        "<p>Não somos uma loja tradicional. A M11NTX <strong>facilita a importação</strong> de camisas selecionadas: você monta o pedido aqui no site, finaliza pelo WhatsApp e conduzimos toda a importação até ela chegar às suas mãos.</p>" +
                        "<h2>O que defendemos</h2>" +
                        "<ul><li>Autenticidade e procedência acima do hype.</li><li>Transparência em cada etapa da jornada.</li><li>Uma experiência premium e sem pressa — qualidade acima de quantidade.</li></ul>" +
                        "<p>Algumas camisas são só camisas. Outras carregam história. Entenda o fluxo em <a href=\"pages/how-it-works.html\">Como Funciona</a> e na nossa <a href=\"pages/intermediation-policy.html\">Política de Intermediação</a>.</p>" +
                        "<p><strong>Wear The Manto.</strong></p>"
                },
                howItWorks: {
                    eyebrow: "Jornada", h1: "Como Funciona",
                    lead: "Da escolha da camisa até a entrega — um fluxo simples, pessoal e transparente.",
                    body: "<p>Você monta o pedido aqui no site (camisa, tamanho, quantidade e personalização opcional) e finaliza pelo WhatsApp, onde combinamos pagamento e envio. A M11NTX facilita a importação e confirma a disponibilidade ao receber o pedido. Saiba mais na <a href=\"pages/intermediation-policy.html\">Política de Intermediação</a>.</p>"
                },
                faq: {
                    eyebrow: "FAQ", h1: "Perguntas Frequentes",
                    lead: "Tudo o que você precisa saber antes de consultar uma camisa."
                },
                contact: {
                    eyebrow: "Contato", h1: "Atendimento", lead: "Atendimento pessoal e direto.",
                    body: "<p>Monte seu pedido aqui no site e finalize pelo WhatsApp — é por lá que combinamos pagamento, envio e tiramos dúvidas, de forma pessoal e direta. Nosso Instagram oficial (@m11ntx) segue como vitrine e canal de contato.</p>",
                    talkOnInstagram: "Falar no Instagram", sendEmail: "Enviar e-mail",
                    updated: "Prazo estimado de importação: 25–40 dias corridos, após a confirmação do pedido."
                },
                privacy: {
                    eyebrow: "Privacidade", h1: "Política de Privacidade",
                    body: "<p>Esta política descreve como a M11NTX trata as informações ao usar esta plataforma. Prezamos pela transparência e pela coleta mínima necessária para processar o seu pedido.</p>" +
                        "<h2>Dados que tratamos</h2><ul><li><strong>Dados do pedido</strong>, informados por você no checkout: nome, documento (CPF no Brasil, ou documento/Tax ID opcional no exterior), WhatsApp/telefone, e-mail e endereço de entrega, além dos itens escolhidos.</li><li>Dados de navegação e medição de audiência (ex.: Google Analytics 4 e Microsoft Clarity), de forma agregada.</li></ul>" +
                        "<p>Os dados do pedido são armazenados com segurança no nosso provedor de banco de dados (Supabase) e usados exclusivamente para processar o pedido e entrar em contato com você. <strong>Não coletamos dados de cartão ou pagamento pelo site</strong> — o pagamento é combinado diretamente com você pelo WhatsApp.</p>" +
                        "<h2>Como usamos</h2><ul><li>Para registrar, conduzir e finalizar o seu pedido.</li><li>Para entrar em contato sobre o pedido (WhatsApp/e-mail) e enviar a peça.</li><li>Para entender o uso do site e melhorar a experiência.</li></ul>" +
                        "<h2>Cookies e medição</h2><p>Ferramentas de medição podem usar cookies/identificadores. Você pode desativar cookies no navegador; sinais de “Do Not Track” são respeitados pela nossa camada de medição.</p>" +
                        "<h2>Compartilhamento</h2><p>Não vendemos seus dados. Compartilhamos apenas o necessário com os provedores que operam o serviço (banco de dados/notificações e medição de audiência) e com as plataformas de contato (WhatsApp, Instagram/Meta), conforme suas próprias políticas.</p>" +
                        "<h2>Seus direitos (LGPD)</h2><p>Você pode solicitar acesso, correção ou exclusão dos seus dados pelos nossos canais de <a href=\"pages/contact.html\">Atendimento</a>.</p>",
                    updated: "Última atualização: julho de 2026."
                },
                terms: {
                    eyebrow: "Termos", h1: "Termos de Uso",
                    body: "<p>Ao utilizar esta plataforma, você concorda com os termos abaixo.</p>" +
                        "<h2>Sobre a plataforma</h2><p>A M11NTX é uma vitrine digital que <strong>facilita a importação</strong> de camisas selecionadas. O pedido é montado no site e finalizado pelo WhatsApp; não processamos pagamentos automaticamente pelo site.</p>" +
                        "<h2>Disponibilidade e prazos</h2><ul><li>A disponibilidade de cada camisa é <strong>confirmada ao recebermos o pedido</strong>.</li><li>O prazo estimado de importação é de <strong>25–40 dias corridos</strong> após a confirmação, podendo variar por se tratar de importação.</li></ul>" +
                        "<h2>Pedido e pagamento</h2><p>Você monta o pedido no site e o finaliza pelo WhatsApp, onde combinamos a forma de pagamento e o envio. A personalização (nome/número) custa R$40 por peça.</p>" +
                        "<h2>Trocas e devoluções</h2><ul><li><strong>Arrependimento:</strong> até 7 dias corridos após o recebimento (CDC), com o produto sem uso, etiquetas e embalagem original.</li><li><strong>Troca de tamanho:</strong> até 7 dias, com o frete de envio e retorno por conta do cliente.</li><li><strong>Produtos personalizados:</strong> por serem sob encomenda, só trocam em caso de defeito de fabricação.</li></ul>" +
                        "<h2>Propriedade intelectual</h2><p>Marcas, escudos e nomes de clubes pertencem aos seus respectivos titulares e são usados apenas para fins de identificação das peças.</p>" +
                        "<h2>Limitação de responsabilidade</h2><p>As informações são fornecidas “como estão”. Prazos são estimativas e imagens podem ter variações. Consulte a <a href=\"pages/intermediation-policy.html\">Política de Intermediação</a>.</p>",
                    updated: "Última atualização: julho de 2026."
                },
                intermediationPolicy: {
                    eyebrow: "Política", h1: "Política de Intermediação",
                    lead: "Transparência sobre como conduzimos cada importação.",
                    body: "<p>A M11NTX <strong>facilita a importação</strong> de camisas selecionadas. O pedido é montado aqui no site e finalizado pelo WhatsApp.</p>" +
                        "<ul><li>Você monta o pedido no site (camisa, tamanho, quantidade e personalização opcional) e <strong>finaliza pelo WhatsApp</strong>, onde combinamos pagamento e envio.</li><li>A <strong>disponibilidade</strong> de cada camisa é <strong>confirmada ao recebermos o pedido</strong>.</li><li>O prazo estimado de importação é de <strong>25–40 dias corridos</strong>, contados após a confirmação.</li></ul>" +
                        "<h2>Como funciona</h2><p>Você escolhe a peça, monta o pedido, finaliza pelo WhatsApp, confirmamos as condições e conduzimos a importação até a entrega. Veja o passo a passo em <a href=\"pages/how-it-works.html\">Como Funciona</a>.</p>" +
                        "<p>Nosso compromisso é com a clareza: nada é cobrado automaticamente pelo site e cada etapa é combinada com você antes de avançar.</p>",
                    updated: "Última atualização: julho de 2026."
                }
            }
        },
        en: {
            nav: {
                home: "M11NTX — Home", collection: "Collection", catalog: "Catalog",
                howItWorks: "How It Works", reviews: "Reviews",
                faq: "FAQ", about: "About", contact: "Contact",
                openSearch: "Open search", search: "Search",
                searchPlaceholder: "Search the collection",
                openMenu: "Open menu", closeMenu: "Close menu",
                langToggle: "Switch to Portuguese", langToggleLabel: "PT"
            },
            mobileMenu: { brand: "M11NTX" },
            search: {
                closeSearch: "Close search", dialogLabel: "Search the collection",
                placeholder: "Search clubs, leagues, jerseys…",
                hint: "Type to search jerseys, clubs and leagues…",
                noResults: "No results for “{query}”.",
                resultSingular: "result", resultPlural: "results",
                viewAllClub: "View all {count} {club} jerseys →"
            },
            footer: {
                about: "About", howItWorks: "How It Works", faq: "FAQ", contact: "Contact",
                privacy: "Privacy", terms: "Terms", intermediationPolicy: "Intermediation Policy",
                instagram: "Instagram", email: "Email", tagline: "Wear The Manto"
            },
            hero: {
                skipToContent: "Skip to content",
                title: "MORE THAN<br>JERSEYS",
                text: "Some jerseys are just shirts.<br>Others carry history.",
                sub: "Imported football jerseys — <b>build your order</b> here and finish on WhatsApp, no payment on the site.",
                explore: "Explore the collection",
                trust1: "Premium import", trust2: "Delivery 25–40 days",
                trust3: "7-day returns", trust4: "Finish on WhatsApp"
            },
            home: {
                featuredEyebrow: "Most wanted", featuredTitle: "Featured jerseys",
                featuredSub: "A few highlights from the catalog — tap to build your order.",
                seeAll: "View all",
                howEyebrow: "Simple and transparent", howTitle: "How it works",
                howSub: "From the click to the shirt at your door — no payment on the site.",
                how1t: "Build your order", how1d: "Choose the jersey, size and quantity. Want a name and number? Personalize for +R$40 per piece.",
                how2t: "Finish on WhatsApp", how2d: "Fill in your details and we open WhatsApp with your order ready. You confirm payment and shipping securely.",
                how3t: "Get it at home", how3d: "We import and track it through to delivery — 25 to 40 calendar days. 7-day returns guaranteed.",
                ctaTitle: "Ready to wear the manto?", ctaText: "Build your order in minutes. We finish it with you on WhatsApp — no automatic charge, real human service.",
                ctaBtn: "Build my order"
            },
            reviews: {
                eyebrow: "Reviews", title: "What people say",
                empty: "Be the first to review this jersey.",
                count: "{n} reviews", write: "Write a review",
                writeCta: "Leave your review",
                pageTitle: "Reviews", pageSubtitle: "Bought from us? Tell us how it went — leave your rating, comment and photos. We review and publish.",
                productOptional: "Which product? (optional)", photos: "Add photos (optional)",
                wallEmpty: "No reviews published yet. Be the first to review!",
                rating: "Your rating", yourName: "Your name", comment: "Your comment (optional)",
                photo: "Photo (optional)", submit: "Submit review",
                needName: "Enter your name.", needRating: "Pick a rating.",
                sending: "Sending…", thanks: "Thank you! Your review will be approved before it appears.",
                fail: "Couldn't send right now. Please try again."
            },
            collections: {
                eyebrow: "The Collection", title: "Collections", subtitle: "Explore soccer history.",
                noscript: "Enable JavaScript to explore the collections.",
                empty: "No collections available yet.", exploreCta: "Explore",
                otherTitle: "Other"
            },
            catalogPage: {
                eyebrow: "Full Archive", title: "Catalog",
                subtitle: "Every jersey in one place. Filter by club, league, season and more."
            },
            breadcrumb: { home: "Home", collections: "Collections" },
            common: { labelCollection: "Collection", labelLeague: "League", labelRegion: "Region", labelClub: "Club", labelJersey: "Jersey", close: "Close" },
            collectionDetail: {
                featured: "Featured", eyebrow: "Collection",
                clubsEyebrow: "Clubs", clubsTitle: "Clubs",
                clubsSubtitle: "The clubs that shaped {name}.",
                clubsEmpty: "Clubs for this collection are coming soon.",
                leaguesEyebrow: "Leagues", leaguesTitle: "Leagues",
                leaguesSubtitle: "The leagues that shaped {name}.",
                leaguesEmpty: "Leagues for this collection are coming soon."
            },
            notFound: {
                title: "Not found", desc: "This doesn't exist yet.",
                cta: "Back to Collections"
            },
            leagueDetail: {
                eyebrow: "League",
                regionsEyebrow: "Regions", regionsTitle: "Regions",
                regionsSubtitle: "The regions that make up {name}.",
                regionsEmpty: "Regions for this league are coming soon."
            },
            leagueCard: { viewClubs: "View clubs" },
            regionDetail: { eyebrow: "Region" },
            regionCard: { viewClubs: "View clubs" },
            clubDetail: {
                jerseySingular: "jersey", jerseyPlural: "jerseys",
                archiveEyebrow: "Archive", jerseysTitle: "Jerseys",
                jerseysSubtitle: "{countLabel} in the {name} archive.",
                empty: "No jerseys in this archive yet.",
                segmentAll: "All", segmentFan: "Fan", segmentPlayer: "Player",
                segmentWomen: "Women", segmentRetro: "Retro", segmentKids: "Kids",
                segmentFilterLabel: "Filter"
            },
            clubCard: { viewJerseys: "View jerseys" },
            jerseyCard: { viewDetails: "View Details", new: "New", quickAdd: "Add to order" },
            filters: {
                reset: "Reset", resultCount: "{count} of {total} jerseys",
                searchPlaceholder: "Search by club, name, season…",
                loadMore: "Load more ({n})",
                title: "Filters", apply: "View {count} results",
                empty: "No filters available.",
                label: {
                    collection: "Collection", league: "League", club: "Club",
                    manufacturer: "Manufacturer", season: "Season", version: "Version",
                    category: "Category", gender: "Gender", availability: "Availability"
                }
            },
            jerseyDetail: {
                eyebrow: "Jersey",
                specBrand: "Brand", specType: "Type", specCategory: "Category",
                specSeason: "Season", specVersion: "Version", specGender: "Gender",
                sizesLabel: "Sizes",
                consultCta: "Get in touch",
                consultAriaLabel: "Talk to M11NTX about {name}",
                addToOrder: "Add to order",
                personalizeToggle: "Personalize (name and number)",
                persoNamePlaceholder: "Name (e.g. VINI JR)",
                persoNumberPlaceholder: "No.",
                sizeRequired: "Please choose a size.",
                orderConsult: "Prefer to talk? Message us on Instagram",
                sizeGuideLabel: "Size Guide",
                sizeGuideLink: "Size guide",
                sizeGuideAlt: "M11NTX size guide",
                trustLabel: "Our guarantees",
                trustDelivery: "25–40 day delivery",
                trustReturns: "7-day returns",
                trustPayment: "Pay via WhatsApp",
                note: "Premium import · Estimated delivery 25–40 calendar days",
                personalizationNote: "This jersey can be personalized with name and number (+{price})"
            },
            journey: {
                eyebrow: "Journey", title: "How It Works",
                steps: [
                    { label: "Choose the jersey" },
                    { label: "Build your order on the site" },
                    { label: "Finish on WhatsApp" },
                    { label: "Import" },
                    { label: "Estimated delivery", sub: "25–40 calendar days" },
                    { label: "Delivery" }
                ],
                importInfoEyebrow: "Import Information",
                importInfoText: "M11NTX facilitates the import of selected jerseys. " +
                    "You build your order on the site and finish on WhatsApp; availability is confirmed once we receive your order.",
                deliveryLabel: "Estimated delivery", deliveryValue: "25–40 calendar days",
                faqEyebrow: "FAQ", faqTitle: "Frequently Asked Questions",
                faq: [
                    { q: "How does ordering work?", a: "You build your order right here on the site: choose the jersey, size and quantity, add personalization if you like (name and number, +R$40 per piece) and click Add to order. In the cart, fill in your details and finish — we open a WhatsApp chat with your order ready so you can confirm payment and shipping with us." },
                    { q: "What is the delivery time?", a: "Import is estimated at 25–40 calendar days, counted after your order and payment are confirmed. Since these are imports, small variations may occur." },
                    { q: "How is payment made?", a: "No automatic charge on the site. When you finish your order, we arrange the payment method with you on WhatsApp, securely." },
                    { q: "Can I personalize the jersey?", a: "Yes. On the product page, tick Personalize and enter the name and number. Personalization costs R$40 per piece, added to your order." },
                    { q: "How does availability work?", a: "We work with imports. When we receive your order, we confirm availability of the piece, size and version and proceed with the purchase." },
                    { q: "Do you ship outside Brazil?", a: "Yes. At checkout, select your country and fill in your international address; we arrange shipping and timeframe on WhatsApp." },
                    { q: "How do returns and exchanges work?", a: "Right of withdrawal: you may cancel within 7 calendar days of receiving the item (Brazilian Consumer Code, distance sales), with the product unused and in its original tags and packaging. Size exchange: within 7 days, with outbound and return shipping paid by the customer. Personalized items (name/number), being made to order, cannot be exchanged for withdrawal or size — only in case of a manufacturing defect (in which case shipping is free). To request it, message us on WhatsApp with your order number." },
                    { q: "Do you have a physical store?", a: "No. We're an online operation; everything after your order is handled on WhatsApp, and our Instagram (@m11ntx) remains a showcase and contact channel." }
                ]
            },
            cart: {
                fab: "My order", title: "My order",
                empty: "Your order is empty.<br>Add jerseys using the “Add to order” button.",
                noPayNote: "No payment now — you finish your order on WhatsApp.",
                stData: "Your details", returnsLink: "Returns & exchanges",
                noPayBanner: "No payment now — you review everything and arrange payment with us on WhatsApp.",
                checkout: "Finish order", yourData: "Your details", deliveryAddress: "Delivery address",
                privacyNote: "By continuing, you agree to be contacted about this order.",
                submit: "Save and open WhatsApp", back: "Back", registering: "Saving…",
                success: "Order saved! We opened WhatsApp for you to finish.",
                waGreeting: "Hi! I'd like to finish my M11NTX order:", addressLabel: "Address",
                remove: "Remove", persoAdd: "✚ personalize (name/no.)", persoEdit: "✎ edit personalization",
                country: "Country", name: "Full name", cpf: "CPF", docIntl: "ID / Passport", optional: "(optional)",
                phone: "WhatsApp / Phone", email: "Email", cep: "Postal code", postal: "ZIP / Postal code",
                number: "Number", street: "Street", addr1: "Address line 1", neighborhood: "Neighborhood",
                city: "City", state: "State", stateIntl: "State / Province", complement: "Address line 2",
                fill: "Please fill: {label}.", invalidCPF: "Invalid CPF.", phoneShort: "Phone number incomplete.",
                invalidEmail: "Invalid email.", cepShort: "Postal code incomplete.",
                cepSearching: "Looking up address…", cepFilled: "Address filled ✓",
                cepNotFound: "Postal code not found — fill in manually.",
                cepFail: "Couldn't look up the postal code — fill in manually."
            },
            page404: {
                eyebrow: "Error 404", title: "Page not found",
                desc: "The page you are looking for doesn't exist or has moved.",
                cta: "Back to Collections"
            },
            institutional: {
                about: {
                    eyebrow: "About", h1: "About M11NTX",
                    desc: "M11NTX — premium soccer culture. Curated classic and retro jerseys, sourced as an intermediary with a transparent journey.",
                    lead: "Premium soccer culture — the shirts that carry history.",
                    body: "<p>M11NTX is a premium soccer-culture project dedicated to the shirts that carry history — curated classic and retro jerseys, presented with the reverence they deserve.</p>" +
                        "<p>We are not a traditional store. M11NTX <strong>facilitates the import</strong> of selected jerseys: you build your order here on the site, finish on WhatsApp, and we handle the entire import until it reaches your hands.</p>" +
                        "<h2>What we stand for</h2>" +
                        "<ul><li>Authenticity and provenance over hype.</li><li>Transparency at every step of the journey.</li><li>A premium, unhurried experience — quality over quantity.</li></ul>" +
                        "<p>Some jerseys are just shirts. Others carry history. Understand the flow in <a href=\"pages/how-it-works.html\">How It Works</a> and our <a href=\"pages/intermediation-policy.html\">Intermediation Policy</a>.</p>" +
                        "<p><strong>Wear The Manto.</strong></p>"
                },
                howItWorks: {
                    eyebrow: "Journey", h1: "How It Works",
                    lead: "From choosing the jersey to delivery — a simple, personal and transparent flow.",
                    body: "<p>You build your order here on the site (jersey, size, quantity and optional personalization) and finish on WhatsApp, where we arrange payment and shipping. M11NTX facilitates the import and confirms availability when the order comes in. Learn more in the <a href=\"pages/intermediation-policy.html\">Intermediation Policy</a>.</p>"
                },
                faq: {
                    eyebrow: "FAQ", h1: "Frequently Asked Questions",
                    lead: "Everything you need to know before checking on a jersey."
                },
                contact: {
                    eyebrow: "Contact", h1: "Support", lead: "Personal and direct support.",
                    body: "<p>Build your order here on the site and finish on WhatsApp — that's where we arrange payment, shipping and answer questions, personally and directly. Our official Instagram (@m11ntx) remains a showcase and contact channel.</p>",
                    talkOnInstagram: "Message us on Instagram", sendEmail: "Send an email",
                    updated: "Estimated import time: 25–40 calendar days, after the order is confirmed."
                },
                privacy: {
                    eyebrow: "Privacy", h1: "Privacy Policy",
                    body: "<p>This policy describes how M11NTX handles information when you use this platform. We value transparency and collecting only what's needed to process your order.</p>" +
                        "<h2>Data we process</h2><ul><li><strong>Order data</strong> you provide at checkout: name, ID document (CPF in Brazil, or an optional document/Tax ID abroad), WhatsApp/phone, email and delivery address, along with the items you choose.</li><li>Browsing and audience-measurement data (e.g. Google Analytics 4 and Microsoft Clarity), in aggregate form.</li></ul>" +
                        "<p>Order data is stored securely with our database provider (Supabase) and used solely to process your order and contact you. <strong>We do not collect card or payment data through the site</strong> — payment is arranged directly with you on WhatsApp.</p>" +
                        "<h2>How we use it</h2><ul><li>To record, handle and finish your order.</li><li>To contact you about the order (WhatsApp/email) and ship the item.</li><li>To understand site usage and improve the experience.</li></ul>" +
                        "<h2>Cookies and measurement</h2><p>Measurement tools may use cookies/identifiers. You can disable cookies in your browser; “Do Not Track” signals are respected by our measurement layer.</p>" +
                        "<h2>Sharing</h2><p>We don't sell your data. We share only what's necessary with the providers that operate the service (database/notifications and audience measurement) and with the contact platforms (WhatsApp, Instagram/Meta), per their own policies.</p>" +
                        "<h2>Your rights (LGPD)</h2><p>You may request access, correction or deletion of your data through our <a href=\"pages/contact.html\">Support</a> channels.</p>",
                    updated: "Last updated: July 2026."
                },
                terms: {
                    eyebrow: "Terms", h1: "Terms of Use",
                    body: "<p>By using this platform, you agree to the terms below.</p>" +
                        "<h2>About the platform</h2><p>M11NTX is a digital showcase that <strong>facilitates the import</strong> of selected jerseys. The order is built on the site and finished on WhatsApp; we do not process payments automatically through the site.</p>" +
                        "<h2>Availability and timeframes</h2><ul><li>Each jersey's availability is <strong>confirmed when we receive the order</strong>.</li><li>The estimated import time is <strong>25–40 calendar days</strong> after confirmation, and may vary since these are imports.</li></ul>" +
                        "<h2>Order and payment</h2><p>You build the order on the site and finish it on WhatsApp, where we arrange the payment method and shipping. Personalization (name/number) costs R$40 per piece.</p>" +
                        "<h2>Returns and exchanges</h2><ul><li><strong>Right of withdrawal:</strong> within 7 calendar days of receipt (Brazilian Consumer Code), with the product unused and in its original tags and packaging.</li><li><strong>Size exchange:</strong> within 7 days, with outbound and return shipping paid by the customer.</li><li><strong>Personalized items:</strong> being made to order, they can only be exchanged in case of a manufacturing defect.</li></ul>" +
                        "<h2>Intellectual property</h2><p>Brands, crests and club names belong to their respective owners and are used only to identify the pieces.</p>" +
                        "<h2>Limitation of liability</h2><p>Information is provided “as is”. Timeframes are estimates and images may vary. See the <a href=\"pages/intermediation-policy.html\">Intermediation Policy</a>.</p>",
                    updated: "Last updated: July 2026."
                },
                intermediationPolicy: {
                    eyebrow: "Policy", h1: "Intermediation Policy",
                    lead: "Transparency about how we conduct every import.",
                    body: "<p>M11NTX <strong>facilitates the import</strong> of selected jerseys. The order is built here on the site and finished on WhatsApp.</p>" +
                        "<ul><li>You build the order on the site (jersey, size, quantity and optional personalization) and <strong>finish on WhatsApp</strong>, where we arrange payment and shipping.</li><li>Each jersey's <strong>availability</strong> is <strong>confirmed when we receive the order</strong>.</li><li>The estimated import time is <strong>25–40 calendar days</strong>, counted after confirmation.</li></ul>" +
                        "<h2>How it works</h2><p>You choose the piece, build the order, finish on WhatsApp, we confirm the terms, and we handle the import through to delivery. See the step-by-step in <a href=\"pages/how-it-works.html\">How It Works</a>.</p>" +
                        "<p>Our commitment is to clarity: nothing is charged automatically on the site and every step is agreed with you before moving forward.</p>",
                    updated: "Last updated: July 2026."
                }
            }
        }
    };

    /* ============================================================
       Controlled field values already in data/*.json — display
       label only, the underlying value never changes.
    ============================================================ */
    const FIELD_LABELS = {
        type: {
            Home: { pt: "Casa", en: "Home" },
            Away: { pt: "Fora", en: "Away" },
            Third: { pt: "Terceiro Uniforme", en: "Third" },
            Goalkeeper: { pt: "Goleiro", en: "Goalkeeper" }
        },
        category: {
            Retro: { pt: "Retrô", en: "Retro" },
            Current: { pt: "Atual", en: "Current" },
            "Manga Longa": { pt: "Manga Longa", en: "Long Sleeve" }
        },
        gender: {
            Men: { pt: "Masculina", en: "Men" },
            Women: { pt: "Feminina", en: "Women" },
            Kids: { pt: "Infantil", en: "Kids" },
            Unisex: { pt: "Unissex", en: "Unisex" }
        },
        version: {
            Fan: { pt: "Torcedor", en: "Fan" },
            Player: { pt: "Jogador", en: "Player" }
        },
        availability: {
            "In Stock": { pt: "Disponível", en: "In Stock" },
            "Out of Stock": { pt: "Indisponível", en: "Out of Stock" }
        }
    };

    // Brazilian size letters (data/*.json's `sizes[].size`) -> the equivalent
    // EN sizing scheme. `XG` is treated as a synonym of `GG` (both "extra
    // grande" in real Feng listings). Unknown values (e.g. a mis-mapped
    // customization option that isn't actually a size) pass through
    // unchanged via sizeLabel()'s fallback — never blank, never throws.
    const SIZE_LABELS = {
        PP: { pt: "PP", en: "XS" },
        P: { pt: "P", en: "S" },
        M: { pt: "M", en: "M" },
        G: { pt: "G", en: "L" },
        GG: { pt: "GG", en: "XL" },
        XG: { pt: "XG", en: "XL" },
        "2GG": { pt: "2GG", en: "2XL" },
        "3GG": { pt: "3GG", en: "3XL" },
        "4GG": { pt: "4GG", en: "4XL" }
    };

    // Proper nouns that appear as raw PT values in data/*.json (collection
    // names today). Keyed by the raw JSON value; unknown values pass through
    // unchanged so future data without an entry here never breaks.
    const PROPER_NOUNS = {
        Brasil: { pt: "Brasil", en: "Brazil" },
        Europa: { pt: "Europa", en: "Europe" },
        // Brazilian regions (Brasileirão only, MI-06/CS-23). Place names
        // (Rio de Janeiro, São Paulo, Minas Gerais) need no entry --
        // properNoun() already passes unknown values through unchanged.
        Sul: { pt: "Sul", en: "South" },
        Nordeste: { pt: "Nordeste", en: "Northeast" },
        Norte: { pt: "Norte", en: "North" },
        "Centro-Oeste": { pt: "Centro-Oeste", en: "Midwest" },
        // Remaining collections (MI-30/31/32/36) not yet covered above.
        // "América do Sul"/"Lançamentos" removed (CS-54): Libertadores moved
        // into Resto do Mundo, the Lançamentos card was retired entirely.
        "Resto do Mundo": { pt: "Resto do Mundo", en: "Rest of the World" },
        "Seleções": { pt: "Seleções", en: "National Teams" },
        // Continent-level regions grouping national teams (MI-30), same
        // shape as the Brazilian regions above.
        "África": { pt: "África", en: "Africa" },
        "Américas": { pt: "Américas", en: "Americas" },
        "Ásia": { pt: "Ásia", en: "Asia" },
        "Oceania": { pt: "Oceania", en: "Oceania" },
        // National teams are modeled as `club` entries under the Seleções
        // league (MI-30) -- `club.name` is the PT country name, `club.country`
        // is already English but isn't what card/detail titles render, so
        // these need the same PT->EN treatment as any other proper noun.
        // Identical-in-both-languages names (Argentina, Chile, Costa Rica,
        // Jamaica, Peru, Portugal, Senegal) need no entry.
        Alemanha: { pt: "Alemanha", en: "Germany" },
        "Argélia": { pt: "Argélia", en: "Algeria" },
        "Bélgica": { pt: "Bélgica", en: "Belgium" },
        "Canadá": { pt: "Canadá", en: "Canada" },
        "Colômbia": { pt: "Colômbia", en: "Colombia" },
        "Coreia do Sul": { pt: "Coreia do Sul", en: "South Korea" },
        "Croácia": { pt: "Croácia", en: "Croatia" },
        Dinamarca: { pt: "Dinamarca", en: "Denmark" },
        "Emirados Árabes Unidos": { pt: "Emirados Árabes Unidos", en: "United Arab Emirates" },
        Equador: { pt: "Equador", en: "Ecuador" },
        "Escócia": { pt: "Escócia", en: "Scotland" },
        Espanha: { pt: "Espanha", en: "Spain" },
        "Estados Unidos": { pt: "Estados Unidos", en: "United States" },
        "França": { pt: "França", en: "France" },
        Holanda: { pt: "Holanda", en: "Netherlands" },
        Hungria: { pt: "Hungria", en: "Hungary" },
        Inglaterra: { pt: "Inglaterra", en: "England" },
        Irlanda: { pt: "Irlanda", en: "Ireland" },
        "Itália": { pt: "Itália", en: "Italy" },
        "Iugoslávia": { pt: "Iugoslávia", en: "Yugoslavia" },
        "Japão": { pt: "Japão", en: "Japan" },
        Marrocos: { pt: "Marrocos", en: "Morocco" },
        "México": { pt: "México", en: "Mexico" },
        "Nigéria": { pt: "Nigéria", en: "Nigeria" },
        Noruega: { pt: "Noruega", en: "Norway" },
        "País de Gales": { pt: "País de Gales", en: "Wales" },
        "Polônia": { pt: "Polônia", en: "Poland" },
        "Suécia": { pt: "Suécia", en: "Sweden" },
        "Suíça": { pt: "Suíça", en: "Switzerland" },
        "Tunísia": { pt: "Tunísia", en: "Tunisia" },
        Uruguai: { pt: "Uruguai", en: "Uruguay" },
        "Áustria": { pt: "Áustria", en: "Austria" },
        "Islândia": { pt: "Islândia", en: "Iceland" },
        "Malásia": { pt: "Malásia", en: "Malaysia" },
        "Ucrânia": { pt: "Ucrânia", en: "Ukraine" },
        Filipinas: { pt: "Filipinas", en: "Philippines" },
        Paraguai: { pt: "Paraguai", en: "Paraguay" },
        "Curaçau": { pt: "Curaçau", en: "Curaçao" },
        "República Tcheca": { pt: "República Tcheca", en: "Czech Republic" },
        "Nova Zelândia": { pt: "Nova Zelândia", en: "New Zealand" }
    };

    /* ============================================================
       Free-text jersey `name` translation — rule-based phrase/word
       substitution, PT -> EN only (see docs/i18n.md for scope/limits).
       Longest phrases first so they're consumed before their words
       would otherwise be matched individually.
    ============================================================ */
    const NAME_DICTIONARY = [
        // ---- multi-word phrases (must precede any single word they contain) ----
        ["[PRÉ-VENDA]", "[PRE-SALE]"],
        ["(cópia)", "(copy)"],
        ["Tubarões Azuis", "Blue Sharks"],
        ["com detalhes em", "with details in"],
        ["Inter de Milão", "Inter Milan"],
        ["Seleção Brasileira", "Brazil National Team"],
        ["Consciência Negra", "Black Consciousness"],
        ["República Tcheca", "Czech Republic"],
        ["Emirados Árabes Unidos", "United Arab Emirates"],
        ["Estados Unidos", "United States"],
        ["Coreia do Sul", "South Korea"],
        ["País de Gales", "Wales"],
        ["Nova Zelândia", "New Zealand"],
        ["Pré-jogo", "Pre-Match"],
        ["Pré Jogo", "Pre-Match"],
        ["Manga Longa", "Long Sleeve"],
        ["Azul Marinho", "Navy Blue"],
        // ---- segment / vocabulary already covered ----
        ["Seleção", "National Team"],
        ["Camisa", "Jersey"],
        ["Retrô", "Retro"],
        ["Torcedor", "Fan"],
        ["Torcedora", "Fan"],
        ["Masculina", "Men's"], ["Masculino", "Men's"],
        ["Feminina", "Women's"],
        ["Infantil", "Kids"],
        ["Unissex", "Unisex"],
        // ---- apparel / segment words ----
        ["Jogador", "Player"],
        ["Camiseta", "T-Shirt"],
        ["Regata", "Tank Top"],
        ["Treino", "Training"],
        ["Goleiro", "Goalkeeper"],
        ["Jaqueta", "Jacket"],
        ["Conjunto", "Set"],
        ["Meias", "Socks"],
        ["Antiderrapante", "Non-slip"],
        ["Cano", "Cut"],
        ["Alto", "High"],
        ["Baixo", "Low"],
        ["Manga", "Sleeve"],
        ["Longa", "Long"],
        ["Corta-Vento", "Windbreaker"],
        ["Blusão", "Jacket"],
        ["Aquecimento", "Warm-up"],
        ["Uniforme", "Uniform"],
        ["Titular", "Starter"],
        ["Reserva", "Reserve"],
        ["Basquete", "Basketball"],
        ["Futebol", "Soccer"],
        ["Atlética", "Athletic"],
        // ---- colors ----
        ["Amarelo", "Yellow"], ["Amarela", "Yellow"], ["amarelas", "yellow"],
        ["Vermelho", "Red"], ["Vermelha", "Red"], ["Vermelhas", "Red"],
        ["Branco", "White"], ["Branca", "White"], ["Braqnco", "White"], ["brancas", "white"],
        ["Preto", "Black"], ["Preta", "Black"], ["pretas", "black"], ["Pretas", "Black"],
        ["Verde", "Green"], ["verdes", "green"],
        ["Azul", "Blue"], ["Azuis", "Blue"],
        ["Grená", "Maroon"],
        ["Marinho", "Navy"],
        ["Bege", "Beige"],
        ["Cinza", "Gray"],
        ["Rosa", "Pink"],
        ["Roxo", "Purple"], ["Roxa", "Purple"],
        ["Laranja", "Orange"],
        ["Dourado", "Gold"], ["Dourada", "Golden"], ["Dourados", "Golden"],
        ["Vinho", "Wine"],
        ["Marrom", "Brown"],
        ["Ciano", "Cyan"],
        ["Claro", "Light"], ["Clara", "Light"], ["claro", "light"],
        ["Escuro", "Dark"], ["escuro", "dark"],
        ["limão", "lime"],
        ["Turquesa", "Turquoise"],
        ["Xadrez", "Checkered"],
        // ---- sponsorship / patch (several inconsistent source spellings) ----
        ["Patrocínios", "Sponsors"], ["Patrocínio", "Sponsor"],
        ["Patrocinios", "Sponsors"], ["Patrocinio", "Sponsor"],
        ["Patrocinadores", "Sponsors"],
        ["Patrocíniois", "Sponsors"],
        // ---- commemorative / edition words ----
        ["Edição", "Edition"], ["Edicão", "Edition"],
        ["Especial", "Special"],
        ["Homenagem", "Tribute"],
        ["Comemorativa", "Commemorative"],
        ["Aniversário", "Anniversary"], ["Aniversario", "Anniversary"],
        ["Centenário", "Centennial"],
        ["Limitada", "Limited"],
        ["Identidade", "Identity"],
        ["Campeão", "Champion"], ["Campeã", "Champion"],
        ["Mundial", "World"], ["Mundo", "World"],
        ["cópia", "copy"],
        ["Turnê", "Tour"],
        ["brasão", "crest"], ["escudo", "crest"],
        // ---- pattern / design words ----
        ["Listrado", "Striped"], ["Listrada", "Striped"], ["Listras", "Stripes"], ["listra", "stripe"],
        ["Multicolorida", "Multicolored"], ["coloridos", "colorful"], ["multicoloridas", "multicolored"],
        ["bolinhas", "polka dots"], ["bolhinhas", "polka dots"], ["bolhas", "bubbles"],
        ["faixa", "stripe"], ["banda", "band"],
        ["desenhos", "designs"], ["desenho", "design"], ["rosas", "roses"],
        ["Modelo", "Model"],
        ["fluorescente", "fluorescent"],
        ["Todos", "All"], ["Todas", "All"],
        ["Versão", "Version"],
        ["Três", "Three"],
        ["bebê", "baby"],
        ["fundação", "foundation"],
        ["Milésimo", "Thousandth"],
        ["clube", "club"],
        ["à", "to the"],
        // ---- country/nation names inside free-text product names (distinct
        //      from the club-card PROPER_NOUNS fix -- these are the same
        //      country words appearing mid-title, e.g. "Seleção da Alemanha") ----
        ["Alemanha", "Germany"],
        ["Inglaterra", "England"],
        ["Itália", "Italy"],
        ["Espanha", "Spain"],
        ["Japão", "Japan"],
        ["França", "France"],
        ["México", "Mexico"],
        ["Holanda", "Netherlands"],
        ["Colômbia", "Colombia"],
        ["Escócia", "Scotland"],
        ["Uruguai", "Uruguay"],
        ["Croácia", "Croatia"],
        ["Bélgica", "Belgium"],
        ["Equador", "Ecuador"],
        ["Suíça", "Switzerland"],
        ["Tunísia", "Tunisia"],
        ["Paraguai", "Paraguay"],
        ["Marrocos", "Morocco"],
        ["Nigéria", "Nigeria"],
        ["Noruega", "Norway"],
        ["Polônia", "Poland"],
        ["Suécia", "Sweden"],
        ["Áustria", "Austria"],
        ["Islândia", "Iceland"],
        ["Malásia", "Malaysia"],
        ["Ucrânia", "Ukraine"],
        ["Curaçau", "Curaçao"],
        ["Canadá", "Canada"],
        ["Dinamarca", "Denmark"],
        ["Hungria", "Hungary"],
        ["Iugoslávia", "Yugoslavia"],
        ["Filipinas", "Philippines"],
        ["Argélia", "Algeria"],
        ["Irlanda", "Ireland"],
        // ---- prepositions/conjunctions leaking outside the one fixed phrase
        //      above -- last, since they're the most generic tokens ----
        ["com", "with"],
        ["da", "of the"],
        ["do", "of the"],
        ["de", "of"],
        ["no", "in"],
        ["na", "in"],
        ["ao", "to the"],
        ["nos", "in"],
        ["os", "the"],
        ["as", "the"],
        ["e", "and"]
    ];

    function escapeRegExp(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    // Boundary-safe word/phrase matcher: JS `\b` treats accented characters
    // (ô, ã, é…) as non-word, so a PT word ending in one never gets a boundary
    // there and `\bRetrô\b` silently fails to match. Lookaround on whitespace/
    // punctuation/string edges sidesteps that entirely. Quote marks are
    // included (CS-52 fix: MI-36's `&quot;`-decoding fix in catalog-pipeline
    // means real product names now carry literal `"Título"`-style quoted
    // words, e.g. `"México de Oro"` — the word right after/before a quote
    // mark wasn't matching at all until these were added).
    function phraseRegex(phrase) {
        return new RegExp("(^|[\\s,\\-\"'“”])(" + escapeRegExp(phrase) + ")(?=[\\s,\\-\"'“”]|$)", "gi");
    }

    function matchCase(sample, replacement) {
        if (!sample) return replacement;
        return sample[0] === sample[0].toUpperCase()
            ? replacement[0].toUpperCase() + replacement.slice(1)
            : replacement[0].toLowerCase() + replacement.slice(1);
    }

    function applyDictionary(str, dict) {
        return dict.reduce((acc, pair) => {
            const pt = pair[0], en = pair[1];
            return acc.replace(phraseRegex(pt), (m, lead, word) => lead + matchCase(word, en));
        }, str);
    }

    function translateName(rawName) {
        const name = rawName == null ? "" : String(rawName);
        if (!name || getLang() !== "en") return name;
        return applyDictionary(name, NAME_DICTIONARY);
    }

    /* ============================================================
       Language state
    ============================================================ */
    function getLang() {
        try {
            const saved = typeof window !== "undefined" && window.localStorage
                && window.localStorage.getItem(STORAGE_KEY);
            return saved === "en" || saved === "pt" ? saved : DEFAULT_LANG;
        } catch (e) {
            return DEFAULT_LANG;
        }
    }

    /** MI-03: no page reload -- persists, re-renders every [data-i18n*]
     * element in place, updates <html lang>/[data-lang] + the toggle label,
     * and fires "language:change" so dynamically-rendered content (product
     * cards, detail pages) can re-render itself from already-fetched data
     * (the catalog is never re-fetched on a language change). */
    function setLang(lang) {
        if (lang !== "en" && lang !== "pt") return;
        try {
            if (typeof window !== "undefined" && window.localStorage) {
                window.localStorage.setItem(STORAGE_KEY, lang);
            }
        } catch (e) { /* no-op */ }
        if (typeof document === "undefined") return;
        applyStatic();
        initLangToggle();
        document.dispatchEvent(new CustomEvent("language:change",
            { detail: { lang: lang, locale: lang === "pt" ? "pt-BR" : "en-US" } }));
    }

    function interpolate(str, vars) {
        if (!vars) return str;
        return str.replace(/\{(\w+)\}/g, (m, key) => (key in vars ? String(vars[key]) : m));
    }

    function lookup(dict, path) {
        return path.split(".").reduce((node, key) =>
            (node && typeof node === "object") ? node[key] : undefined, dict);
    }

    function t(path, vars) {
        const lang = getLang();
        let value = lookup(STRINGS[lang], path);
        if (value === undefined) value = lookup(STRINGS[DEFAULT_LANG], path);
        if (value === undefined) return path;
        return typeof value === "string" ? interpolate(value, vars) : value;
    }

    function fieldLabel(field, value) {
        const entry = FIELD_LABELS[field] && FIELD_LABELS[field][value];
        return entry ? entry[getLang()] : value;
    }

    function sizeLabel(size) {
        const key = String(size == null ? "" : size).trim().toUpperCase();
        const entry = SIZE_LABELS[key];
        return entry ? entry[getLang()] : size;
    }

    function properNoun(value) {
        const entry = PROPER_NOUNS[value];
        return entry ? entry[getLang()] : value;
    }

    // Shared "How It Works" steps / FAQ list markup — used by the standalone
    // pages/how-it-works.html + pages/faq.html (via [data-i18n-steps]/
    // [data-i18n-faq]) AND by catalog.js's jersey-page journeySections(), so
    // both places render the exact same unified content (see docs/i18n.md).
    function renderStepsHtml() {
        return t("journey.steps").map((s, i) => `
            <li class="step">
                <span class="step__num" aria-hidden="true">${i + 1}</span>
                <div class="step__body">
                    <h3 class="step__label">${s.label}</h3>
                    ${s.sub ? `<p class="step__sub">${s.sub}</p>` : ""}
                </div>
            </li>`).join("");
    }

    function renderFaqHtml() {
        return t("journey.faq").map((f) => `
            <details class="faq__item">
                <summary class="faq__q">${f.q}<span class="faq__icon" aria-hidden="true"></span></summary>
                <div class="faq__a"><p>${f.a}</p></div>
            </details>`).join("");
    }

    /* ============================================================
       DOM wiring — static markup translation + the nav toggle button
    ============================================================ */
    function applyStatic(root) {
        const scope = root || (typeof document !== "undefined" ? document : null);
        if (!scope || !scope.querySelectorAll) return;
        scope.querySelectorAll("[data-i18n]").forEach((el) => {
            el.textContent = t(el.getAttribute("data-i18n"));
        });
        scope.querySelectorAll("[data-i18n-html]").forEach((el) => {
            el.innerHTML = t(el.getAttribute("data-i18n-html"));
        });
        scope.querySelectorAll("[data-i18n-attr]").forEach((el) => {
            // data-i18n-attr="aria-label:search.closeSearch;placeholder:search.placeholder"
            el.getAttribute("data-i18n-attr").split(";").forEach((rule) => {
                const parts = rule.split(":");
                if (parts.length !== 2) return;
                el.setAttribute(parts[0].trim(), t(parts[1].trim()));
            });
        });
        scope.querySelectorAll("[data-i18n-steps]").forEach((el) => { el.innerHTML = renderStepsHtml(); });
        scope.querySelectorAll("[data-i18n-faq]").forEach((el) => { el.innerHTML = renderFaqHtml(); });
    }

    function initLangToggle() {
        if (typeof document === "undefined") return;
        const lang = getLang();
        document.documentElement.setAttribute("lang", lang === "en" ? "en" : "pt-BR");
        document.documentElement.setAttribute("data-lang", lang);
        document.querySelectorAll(".js-lang-toggle").forEach((btn) => {
            btn.textContent = t("nav.langToggleLabel");
            btn.setAttribute("aria-label", t("nav.langToggle"));
            // Called again after every reload-free setLang() -- guard against
            // re-attaching a second/third click listener, and always read the
            // CURRENT language at click time (not a stale value captured once).
            if (btn.dataset.i18nWired) return;
            btn.dataset.i18nWired = "1";
            btn.addEventListener("click", () => setLang(getLang() === "en" ? "pt" : "en"));
        });
    }

    function init() {
        applyStatic();
        initLangToggle();
    }

    return {
        STRINGS, FIELD_LABELS, SIZE_LABELS, PROPER_NOUNS, NAME_DICTIONARY,
        getLang, setLang, t, fieldLabel, sizeLabel, properNoun, translateName,
        renderStepsHtml, renderFaqHtml,
        applyStatic, initLangToggle, init
    };
});
