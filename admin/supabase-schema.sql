-- ============================================================================
-- M11NTX Admin — Supabase schema (run once in the SQL Editor)
-- ============================================================================
-- Backend do /admin. O admin grava aqui; um export (GitHub Action) lê esta
-- tabela + o Storage e escreve os configs JSON + assets no repo, mantendo o
-- JSON como fonte da verdade do storefront (RN-012). NADA aqui é lido em tempo
-- real pela loja pública.
--
-- Como rodar: Supabase Dashboard -> SQL Editor -> New query -> cole tudo -> Run.
-- ============================================================================

-- 1) Tabela de overrides por produto ----------------------------------------
-- Uma linha por produto (id = o id do catálogo, ex. "source-<slug>"). Começa
-- cobrindo MÍDIA; os campos de preço/promoção/disponibilidade já existem (null)
-- para as próximas fases do admin, sem precisar migrar depois.
create table if not exists public.product_overrides (
    id                  text primary key,               -- product id no catálogo
    name                text,                            -- só p/ leitura humana no admin
    extra_images        jsonb   not null default '[]'::jsonb,  -- [{url,alt,position,primary}]
    hidden_images       jsonb   not null default '[]'::jsonb,  -- urls de fotos da fonte a ocultar
    hidden_media        jsonb   not null default '[]'::jsonb,  -- fotos extras/vídeos ocultos (some do site, fica no admin)
    primary_image       text,                            -- url/key da foto principal (capa) escolhida no admin
    videos              jsonb   not null default '[]'::jsonb,  -- ["product-media/<id>/<file>.mp4", ...]
    catalog_video       text,                            -- qual vídeo toca no card (default = 1o)
    -- Próximas fases (ficam null por enquanto):
    price_override      jsonb,                           -- {BRL, USD, EUR} ou regra
    promotion           jsonb,                           -- {percent|price, startsAt, endsAt, label}
    available_override  boolean,                         -- habilitar/desabilitar manualmente
    note                text,
    updated_at          timestamptz not null default now(),
    updated_by          uuid references auth.users(id)
);

-- mantém updated_at fresco
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    new.updated_by = auth.uid();
    return new;
end $$;

drop trigger if exists trg_product_overrides_touch on public.product_overrides;
create trigger trg_product_overrides_touch
    before insert or update on public.product_overrides
    for each row execute function public.touch_updated_at();

-- 2) RLS: só usuários autenticados (o operador logado) leem/escrevem ---------
alter table public.product_overrides enable row level security;

drop policy if exists "authenticated read"  on public.product_overrides;
drop policy if exists "authenticated write" on public.product_overrides;

create policy "authenticated read"
    on public.product_overrides for select
    to authenticated using (true);

create policy "authenticated write"
    on public.product_overrides for all
    to authenticated using (true) with check (true);

-- 3) Storage: bucket dos assets (fotos/vídeos enviados pelo admin) -----------
-- Leitura pública (o export baixa os arquivos; e serve de preview no admin).
-- Escrita só autenticado.
insert into storage.buckets (id, name, public)
values ('product-media', 'product-media', true)
on conflict (id) do nothing;

drop policy if exists "public read media"      on storage.objects;
drop policy if exists "authenticated upload"   on storage.objects;
drop policy if exists "authenticated modify"   on storage.objects;

create policy "public read media"
    on storage.objects for select
    using (bucket_id = 'product-media');

create policy "authenticated upload"
    on storage.objects for insert
    to authenticated with check (bucket_id = 'product-media');

create policy "authenticated modify"
    on storage.objects for update
    to authenticated using (bucket_id = 'product-media');

-- ============================================================================
-- Pronto. Depois disto:
--   1. Authentication -> Users -> Add user: crie SEU login (email + senha).
--      (Deixe "Auto Confirm" ligado para não precisar de e-mail de verificação.)
--   2. Settings -> API: copie a "Project URL" e a chave "anon public"
--      (também chamada "publishable") e me envie — são públicas e seguras
--      para uso no navegador (a segurança real vem do RLS acima).
-- ============================================================================
