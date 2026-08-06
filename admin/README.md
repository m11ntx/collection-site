# M11NTX — Admin (setup)

Painel `/admin` para gerenciar o catálogo (mídia agora; preço/promoção/
disponibilidade nas próximas fases). Backend: **Supabase** (auth + storage +
tabela de overrides). O admin grava no Supabase; um **export** escreve os
configs JSON + assets no repo — o storefront continua lendo JSON estático
(RN-012). O Supabase **não** é lido em tempo real pela loja pública.

## Arquitetura (resumo)

```
[admin.html no site]  --login-->  Supabase Auth
        |  upload fotos/vídeos     Supabase Storage (bucket product-media)
        |  edita overrides         Supabase DB (tabela product_overrides)
        v
[export: GitHub Action]  lê Supabase  -->  escreve no repo:
        - catalog-pipeline/config/normalization/product_media.json
        - collection-site/assets/... (as fotos/vídeos)
        v
[pipeline/generator]  mescla product_media.json  -->  products.json (estático)
        v
[storefront]  lê JSON estático (como hoje)
```

## Passo a passo (o que VOCÊ faz — uma vez)

1. **Criar o projeto** em supabase.com (Free = $0):
   - Name: `m11ntx` · Region: **South America (São Paulo)** · defina e guarde a senha do banco.
2. **Rodar o schema**: SQL Editor → New query → cole `supabase-schema.sql` → **Run**.
3. **Criar seu login**: Authentication → Users → **Add user** (email + senha; deixe *Auto Confirm* ligado).
4. **Pegar as credenciais**: Settings → API → copie **Project URL** e a chave **anon public** (publishable) e me envie.
   - São públicas/seguras para o navegador — a proteção real é o RLS do schema.

## O que EU faço depois de receber URL + anon key

- **Fase 1**: `admin.html` (login + gestão de mídia): lista os produtos (lendo o
  `data/products.json` do site), permite enviar fotos/vídeos, escolher o
  `catalogVideo`, e salva no Supabase.
- **Export**: GitHub Action que lê o Supabase e escreve `product_media.json` +
  assets no repo (precisa de um secret com a *service role key* — passo guiado).
- **Fases seguintes**: preço, promoção, disponibilidade, habilitar/desabilitar
  (a tabela já tem os campos).

> Arquivos deste diretório ainda **não foram commitados** — commito quando você quiser.
