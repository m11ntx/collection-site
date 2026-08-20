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
    image_order         jsonb   not null default '[]'::jsonb,  -- ordem das fotos na galeria (urls)
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

-- 4) Campanhas de promoção (uma promo + a lista de produtos que participam) ---
create table if not exists public.campaigns (
    id           uuid primary key default gen_random_uuid(),
    name         text not null,
    label        text,
    type         text not null default 'percent',   -- 'percent' | 'price'
    value        numeric,
    starts_at    date,
    ends_at      date,
    active       boolean not null default true,
    product_ids  jsonb   not null default '[]'::jsonb,
    updated_at   timestamptz not null default now(),
    updated_by   uuid references auth.users(id)
);

drop trigger if exists trg_campaigns_touch on public.campaigns;
create trigger trg_campaigns_touch
    before insert or update on public.campaigns
    for each row execute function public.touch_updated_at();

alter table public.campaigns enable row level security;
drop policy if exists "authenticated read camp"  on public.campaigns;
drop policy if exists "authenticated write camp" on public.campaigns;
create policy "authenticated read camp"  on public.campaigns for select to authenticated using (true);
create policy "authenticated write camp" on public.campaigns for all    to authenticated using (true) with check (true);

-- ----------------------------------------------------------------------------
-- PEDIDOS (checkout "monte seu pedido" -> WhatsApp + Telegram)
-- Inserção vem da Edge Function create-order (service role -> ignora RLS).
-- O /admin (usuário logado) lê, muda status e pode excluir.
-- ----------------------------------------------------------------------------
create table if not exists public.orders (
    id         uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    items      jsonb  not null,
    customer   jsonb  not null,
    total_brl  numeric not null default 0,
    status     text   not null default 'novo'   -- novo | em_contato | concluido | cancelado
);
alter table public.orders add column if not exists status text not null default 'novo';

alter table public.orders enable row level security;
drop policy if exists "authenticated read orders"   on public.orders;
drop policy if exists "authenticated update orders"  on public.orders;
drop policy if exists "authenticated delete orders"  on public.orders;
create policy "authenticated read orders"   on public.orders for select to authenticated using (true);
create policy "authenticated update orders" on public.orders for update to authenticated using (true) with check (true);
create policy "authenticated delete orders" on public.orders for delete to authenticated using (true);

-- ----------------------------------------------------------------------------
-- CARRINHOS / LEADS (rascunhos que podem ou não virar pedido)
-- Upsert por session_id vindo da Edge Function save-cart (service role).
-- O /admin (logado) lê, muda status (aberto|convertido|ignorado) e exclui.
-- ----------------------------------------------------------------------------
create table if not exists public.carts (
    id         uuid primary key default gen_random_uuid(),
    session_id text unique not null,
    items      jsonb not null default '[]'::jsonb,
    customer   jsonb not null default '{}'::jsonb,
    total_brl  numeric not null default 0,
    status     text not null default 'aberto',   -- aberto | convertido | ignorado
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
-- garante o UNIQUE (necessário pro upsert) mesmo se a tabela já existir
alter table public.carts add column if not exists total_brl numeric not null default 0;
create unique index if not exists carts_session_id_key on public.carts (session_id);

alter table public.carts enable row level security;
drop policy if exists "authenticated read carts"   on public.carts;
drop policy if exists "authenticated update carts"  on public.carts;
drop policy if exists "authenticated delete carts"  on public.carts;
create policy "authenticated read carts"   on public.carts for select to authenticated using (true);
create policy "authenticated update carts" on public.carts for update to authenticated using (true) with check (true);
create policy "authenticated delete carts" on public.carts for delete to authenticated using (true);

-- ----------------------------------------------------------------------------
-- CLUBES / LIGAS geridos no /admin (associação de camisas a times SEM deploy)
-- O export (supabase_export.merge_taxonomy) mescla estas linhas no config de
-- normalização (clubs.json / leagues.json) ANTES do import; as camisas passam
-- a resolver sozinhas por nome/apelido. Mantém o JSON como fonte da verdade.
-- (Fica ANTES do usage_report, que referencia estas tabelas.)
-- ----------------------------------------------------------------------------

-- Clube novo (ex.: Como 1907). id = slug do nome (ex. "como").
create table if not exists public.clubs_custom (
    id         text primary key,                       -- slug do clube
    name       text not null,
    league     text,                                   -- id da liga (built-in ou custom)
    country    text,
    aliases    jsonb not null default '[]'::jsonb,      -- variações de escrita, ex ["como","como 1907"]
    image      text,                                    -- URL pública da logo (bucket product-media/clubs/)
    updated_at timestamptz not null default now(),
    updated_by uuid references auth.users(id)
);
drop trigger if exists trg_clubs_custom_touch on public.clubs_custom;
create trigger trg_clubs_custom_touch
    before insert or update on public.clubs_custom
    for each row execute function public.touch_updated_at();

-- Liga nova (raro; a maioria já existe). id = slug do nome (ex. "liga-mx").
create table if not exists public.leagues_custom (
    id         text primary key,
    name       text not null,
    collection text,                                   -- europa|brasil|selecoes|resto-do-mundo
    country    text,
    aliases    jsonb not null default '[]'::jsonb,
    updated_at timestamptz not null default now(),
    updated_by uuid references auth.users(id)
);
drop trigger if exists trg_leagues_custom_touch on public.leagues_custom;
create trigger trg_leagues_custom_touch
    before insert or update on public.leagues_custom
    for each row execute function public.touch_updated_at();

-- Apelido apontando uma variação/erro de escrita para um clube EXISTENTE
-- (built-in ou custom). Ex.: {club_id:"tottenham", alias:"totthenham"}.
create table if not exists public.club_aliases (
    id         bigint generated by default as identity primary key,
    club_id    text not null,
    alias      text not null,
    created_at timestamptz not null default now(),
    updated_by uuid references auth.users(id)
);
create unique index if not exists club_aliases_uniq on public.club_aliases (club_id, alias);

alter table public.clubs_custom   enable row level security;
alter table public.leagues_custom enable row level security;
alter table public.club_aliases   enable row level security;

drop policy if exists "authenticated read clubs"     on public.clubs_custom;
drop policy if exists "authenticated write clubs"    on public.clubs_custom;
drop policy if exists "authenticated read leaguesc"  on public.leagues_custom;
drop policy if exists "authenticated write leaguesc" on public.leagues_custom;
drop policy if exists "authenticated read aliases"   on public.club_aliases;
drop policy if exists "authenticated write aliases"  on public.club_aliases;

create policy "authenticated read clubs"     on public.clubs_custom   for select to authenticated using (true);
create policy "authenticated write clubs"    on public.clubs_custom   for all    to authenticated using (true) with check (true);
create policy "authenticated read leaguesc"  on public.leagues_custom for select to authenticated using (true);
create policy "authenticated write leaguesc" on public.leagues_custom for all    to authenticated using (true) with check (true);
create policy "authenticated read aliases"   on public.club_aliases   for select to authenticated using (true);
create policy "authenticated write aliases"  on public.club_aliases   for all    to authenticated using (true) with check (true);

-- ----------------------------------------------------------------------------
-- USO (FREE TIER) — chamada pelo Action (export.supabase_usage) com a service
-- key p/ montar a seção "USO (FREE TIER)" no e-mail: tamanho do banco, storage
-- e contagem de linhas. SECURITY DEFINER p/ ler pg_database_size + storage.
-- ----------------------------------------------------------------------------
create or replace function public.usage_report()
returns jsonb
language sql
security definer
set search_path = public, storage
as $$
  select jsonb_build_object(
    'db_bytes', pg_database_size(current_database()),
    'storage_bytes', coalesce((select sum((metadata->>'size')::bigint) from storage.objects), 0),
    'storage_objects', (select count(*) from storage.objects),
    'tables', jsonb_build_object(
      'orders',            (select count(*) from public.orders),
      'carts',             (select count(*) from public.carts),
      'product_overrides', (select count(*) from public.product_overrides),
      'campaigns',         (select count(*) from public.campaigns),
      'clubs_custom',      (select count(*) from public.clubs_custom),
      'club_aliases',      (select count(*) from public.club_aliases)
    )
  );
$$;
revoke all on function public.usage_report() from public, anon;
grant execute on function public.usage_report() to service_role;

-- ============================================================================
-- Pronto. Depois disto:
--   1. Authentication -> Users -> Add user: crie SEU login (email + senha).
--      (Deixe "Auto Confirm" ligado para não precisar de e-mail de verificação.)
--   2. Settings -> API: copie a "Project URL" e a chave "anon public"
--      (também chamada "publishable") e me envie — são públicas e seguras
--      para uso no navegador (a segurança real vem do RLS acima).
-- ============================================================================
