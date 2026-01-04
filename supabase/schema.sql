-- NightHub Mallorca - Esquema mÃ­nimo (Postgres + PostGIS)

-- Extensiones recomendadas
create extension if not exists postgis;
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

-- Usuarios
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  display_name text,
  locale text default 'es',
  roles text[] default '{user}',
  zones text[] default '{}',
  created_at timestamptz default now()
);

-- Clubs
create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  name_i18n jsonb,
  description_i18n jsonb,
  address text,
  location geography(point),
  genres text[] default '{}',
  open_hours jsonb,
  referral_link text,
  links jsonb,
  images jsonb,
  status text default 'pending', -- pending|approved|rejected
  created_at timestamptz default now()
);

-- DJs
create table if not exists public.djs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bio text,
  short_bio text,
  name_i18n jsonb,
  bio_i18n jsonb,
  short_bio_i18n jsonb,
  spotify_embed text,
  genres text[] default '{}',
  socials jsonb,
  images jsonb,
  created_at timestamptz default now()
);

-- Generos musicales (catalogo)
create table if not exists public.genres (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique,
  status text default 'active',
  created_at timestamptz default now()
);

-- Relacion eventos <-> DJs (line-up)
create table if not exists public.event_djs (
  event_id uuid references public.events(id) on delete cascade,
  dj_id uuid references public.djs(id) on delete cascade,
  position int default 0,
  primary key (event_id, dj_id)
);

-- Eventos
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete set null,
  name text not null,
  name_i18n jsonb,
  description text,
  description_i18n jsonb,
  start_at timestamptz not null,
  end_at timestamptz,
  genres text[] default '{}',
  price_min numeric,
  price_max numeric,
  age int,
  images jsonb,
  url_referral text,
  geo geography(point),
  status text default 'draft', -- draft|published|archived
  created_at timestamptz default now()
);

-- Follows y favoritos (polimÃ³rfico por tipo)
create table if not exists public.follows (
  user_id uuid references public.users(id) on delete cascade,
  target_type text check (target_type in ('club','dj')),
  target_id uuid not null,
  created_at timestamptz default now(),
  primary key (user_id, target_type, target_id)
);

create table if not exists public.favorites (
  user_id uuid references public.users(id) on delete cascade,
  target_type text check (target_type in ('event','club')),
  target_id uuid not null,
  created_at timestamptz default now(),
  primary key (user_id, target_type, target_id)
);

-- ReseÃ±as (moderadas)
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  target_type text check (target_type in ('event','club')),
  target_id uuid not null,
  rating int check (rating between 1 and 5),
  text text,
  status text default 'pending', -- pending|approved|rejected
  created_at timestamptz default now()
);

-- EnvÃ­os (altas) de clubs o eventos
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  type text check (type in ('club','event')),
  payload jsonb not null,
  contact_email text not null,
  status text default 'pending', -- pending|approved|rejected
  created_at timestamptz default now()
);

-- Tracking de clicks de salida (referidos)
create table if not exists public.clicks (
  id bigserial primary key,
  event_id uuid references public.events(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  source text, -- e.g. discover|details
  referral_url text,
  ts timestamptz default now()
);

-- Registro de búsquedas (para estadísticas)
create table if not exists public.search_logs (
  id bigserial primary key,
  user_id uuid references public.users(id) on delete set null,
  q text,
  zone text,
  genre text,
  tab text,
  ts timestamptz default now()
);

-- Vistas de apoyo
drop view if exists public.events_public;
create view public.events_public as
  select e.id, e.name, e.name_i18n, e.description, e.description_i18n, e.start_at, e.end_at, e.genres,
         e.price_min, e.price_max, e.images, e.url_referral,
         e.status, e.created_at, c.id as club_id, c.name as club_name,
         c.location, e.geo, e.zone
  from public.events e
  left join public.clubs c on c.id = e.club_id
  where e.status = 'published';

-- Ãndices
create index if not exists idx_events_start_at on public.events(start_at);
create index if not exists idx_events_status_start on public.events(status, start_at);
create index if not exists idx_events_club on public.events(club_id);
create index if not exists idx_events_geo on public.events using gist(geo);
create index if not exists idx_clubs_location on public.clubs using gist(location);
create index if not exists idx_favorites_user on public.favorites(user_id);
create index if not exists idx_favorites_user_type on public.favorites(user_id, target_type);
-- Speed up LIKE searches
create index if not exists idx_clubs_name_trgm on public.clubs using gin (name gin_trgm_ops);
create index if not exists idx_djs_name_trgm on public.djs using gin (name gin_trgm_ops);
-- Pivot lookups
create index if not exists idx_event_djs_event on public.event_djs(event_id, position);
create index if not exists idx_event_djs_dj on public.event_djs(dj_id);
create index if not exists idx_genres_name on public.genres(name);

-- RLS (borrador, ajustar en Supabase)
alter table public.events enable row level security;
alter table public.clubs enable row level security;
alter table public.djs enable row level security;
alter table public.follows enable row level security;
alter table public.favorites enable row level security;
alter table public.reviews enable row level security;
alter table public.submissions enable row level security;
alter table public.users enable row level security;
alter table public.event_djs enable row level security;
alter table public.genres enable row level security;
alter table public.clicks enable row level security;
alter table public.search_logs enable row level security;

-- PolÃ­ticas abiertas de lectura pÃºblica para contenidos aprobados
create policy if not exists events_read_public on public.events
  for select using (status = 'published');

create policy if not exists clubs_read_public on public.clubs
  for select using (status = 'approved');

-- Moderadores pueden crear/editar clubs y eventos
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='clubs' and policyname='clubs_insert_moderator') then
    create policy clubs_insert_moderator on public.clubs for insert with check (public.is_moderator(auth.uid()));
  end if;
end $$;

-- Allow moderators to SELECT events in admin
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='events_select_moderator') then
    create policy events_select_moderator on public.events for select using (public.is_moderator(auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='clubs' and policyname='clubs_update_moderator') then
    create policy clubs_update_moderator on public.clubs for update using (public.is_moderator(auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='clubs' and policyname='clubs_delete_moderator') then
    create policy clubs_delete_moderator on public.clubs for delete using (public.is_moderator(auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='events_insert_moderator') then
    create policy events_insert_moderator on public.events for insert with check (public.is_moderator(auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='events_update_moderator') then
    create policy events_update_moderator on public.events for update using (public.is_moderator(auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='events_delete_moderator') then
    create policy events_delete_moderator on public.events for delete using (public.is_moderator(auth.uid()));
  end if;
end $$;

-- Permitir envÃ­os pÃºblicos de submissions (cualquier visitante)
create policy if not exists submissions_insert_public on public.submissions
  for insert with check (true);

-- Inserciones de favoritos/follows por usuario autenticado (placeholder, ajustar a JWT de Supabase)
create policy if not exists favorites_insert_self on public.favorites
  for insert with check (auth.uid() = user_id);
create policy if not exists favorites_select_self on public.favorites
  for select using (auth.uid() = user_id);
create policy if not exists favorites_delete_self on public.favorites
  for delete using (auth.uid() = user_id);

-- Asegurar tipos permitidos incluyen DJ
alter table public.favorites drop constraint if exists favorites_target_type_check;
alter table public.favorites add constraint favorites_target_type_check check (target_type in ('event','club','dj'));
create policy if not exists follows_insert_self on public.follows
  for insert with check (auth.uid() = user_id);
create policy if not exists follows_select_self on public.follows
  for select using (auth.uid() = user_id);
create policy if not exists follows_delete_self on public.follows
  for delete using (auth.uid() = user_id);

-- Favoritos: lectura completa por moderadores (para estadísticas)
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='favorites' and policyname='favorites_select_moderator') then
    create policy favorites_select_moderator on public.favorites for select using (public.is_moderator(auth.uid()));
  end if;
end $$;

-- Clicks: insertar por autenticados (si aportan user_id propio)
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='clicks' and policyname='clicks_insert_self') then
    create policy clicks_insert_self on public.clicks for insert with check (user_id is null or auth.uid() = user_id);
  end if;
end $$;
-- Clicks: lectura por moderadores
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='clicks' and policyname='clicks_select_moderator') then
    create policy clicks_select_moderator on public.clicks for select using (public.is_moderator(auth.uid()));
  end if;
end $$;

-- Search logs: inserción pública (no requiere usuario) y lectura por moderadores
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='search_logs' and policyname='search_logs_insert_public') then
    create policy search_logs_insert_public on public.search_logs for insert with check (true);
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='search_logs' and policyname='search_logs_select_moderator') then
    create policy search_logs_select_moderator on public.search_logs for select using (public.is_moderator(auth.uid()));
  end if;
end $$;

-- Índices de soporte para estadísticas
create index if not exists idx_search_logs_ts on public.search_logs(ts desc);
create index if not exists idx_search_logs_zone on public.search_logs(zone);
create index if not exists idx_search_logs_term on public.search_logs(lower(q));

-- Favoritos: indices utiles para consultas por usuario
create index if not exists idx_favorites_user on public.favorites(user_id);

-- Users: permitir que cada usuario gestione su propio registro
create policy if not exists users_insert_self on public.users
  for insert with check (auth.uid() = id);
create policy if not exists users_select_self on public.users
  for select using (auth.uid() = id);
create policy if not exists users_update_self on public.users
  for update using (auth.uid() = id);

-- Helpers de roles
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
as $$
  select exists(
    select 1 from public.users u
    where u.id = uid and ('admin' = any(u.roles))
  );
$$;

create or replace function public.is_moderator(uid uuid)
returns boolean
language sql
stable
as $$
  select exists(
    select 1 from public.users u
    where u.id = uid and ('admin' = any(u.roles) or 'moderator' = any(u.roles))
  );
$$;

-- Clubs: permitir SELECT completo a moderadores (ademas del publico approved)
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='clubs' and policyname='clubs_select_moderator'
  ) then
    create policy clubs_select_moderator on public.clubs for select using (public.is_moderator(auth.uid()));
  end if;
end $$;

-- DJs: permitir SELECT publico y de moderadores
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='djs' and policyname='djs_select_public'
  ) then
    create policy djs_select_public on public.djs for select using (true);
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='djs' and policyname='djs_select_moderator'
  ) then
    create policy djs_select_moderator on public.djs for select using (public.is_moderator(auth.uid()));
  end if;
end $$;
-- RPC: favoritos expandidos en una sola llamada
create or replace function public.favorites_expanded()
returns table(
  id uuid,
  name text,
  start_at timestamptz,
  club_name text,
  type text
)
language sql
stable
security definer
set search_path = public
as $$
  select e.id, e.name, e.start_at, e.club_name, 'event'::text as type
  from public.favorites f
  join public.events_public e on e.id = f.target_id
  where f.user_id = auth.uid() and f.target_type = 'event'
  union all
  select c.id, c.name, null::timestamptz, null::text, 'club'::text
  from public.favorites f
  join public.clubs c on c.id = f.target_id
  where f.user_id = auth.uid() and f.target_type = 'club'
  union all
  select d.id, d.name, null::timestamptz, null::text, 'dj'::text
  from public.favorites f
  join public.djs d on d.id = f.target_id
  where f.user_id = auth.uid() and f.target_type = 'dj'
  order by type asc, name asc
$$;

-- Reviews policies
create policy if not exists reviews_insert_self on public.reviews
  for insert with check (auth.uid() = user_id);

-- PÃºblico sÃ³lo ve aprobadas; el autor puede ver las suyas
create policy if not exists reviews_select_public on public.reviews
  for select using (status = 'approved' or auth.uid() = user_id or public.is_moderator(auth.uid()));

-- ModeraciÃ³n: aprobar/rechazar/editar
create policy if not exists reviews_update_moderator on public.reviews
  for update using (public.is_moderator(auth.uid()));

-- Borrado: autor o admin
create policy if not exists reviews_delete_self_admin on public.reviews
  for delete using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- Permitir tambien borrado por moderadores
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='reviews' and policyname='reviews_delete_moderator') then
    create policy reviews_delete_moderator on public.reviews for delete using (public.is_moderator(auth.uid()));
  end if;
end $$;

-- Submissions: lectura y actualizaciÃ³n por moderadores
create policy if not exists submissions_select_moderator on public.submissions
  for select using (public.is_moderator(auth.uid()));
create policy if not exists submissions_update_moderator on public.submissions
  for update using (public.is_moderator(auth.uid()));

-- Semillas mÃ­nimas
insert into public.clubs (name, description, address, status)
values ('Pacha Mallorca','Club icÃ³nico de mÃºsica electrÃ³nica','Palma, Mallorca','approved')
on conflict do nothing;

insert into public.events (name, club_id, description, start_at, end_at, status)
select 'Neon Paradise', c.id, 'Noche de house/techno', now() + interval '7 days', now() + interval '7 days 6 hours', 'published'
from public.clubs c
where c.name = 'Pacha Mallorca'
on conflict do nothing;
-- DJs: permitir a moderadores crear/editar
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='djs' and policyname='djs_insert_moderator') then
    create policy djs_insert_moderator on public.djs for insert with check (public.is_moderator(auth.uid()));
  end if;
end $$;

-- Ajustes incrementales (ejecutar sin errores si ya existen)
alter table public.clubs add column if not exists zone text;
alter table public.clubs add column if not exists logo_url text;
create index if not exists idx_clubs_zone_name on public.clubs(zone, name);
-- Telefono privado para eventos (solo backoffice)
alter table public.events add column if not exists contact_phone text;

-- Favorites: permitir tipo 'dj' si no estuviera incluido
do $$ begin
  if exists (
    select 1 from information_schema.check_constraints c
    join information_schema.constraint_table_usage u on c.constraint_name = u.constraint_name and c.constraint_schema = u.constraint_schema
    where u.table_schema = 'public' and u.table_name = 'favorites' and c.check_clause not like '%dj%'
  ) then
    alter table public.favorites drop constraint if exists favorites_target_type_check;
    alter table public.favorites add constraint favorites_target_type_check check (target_type in ('event','club','dj'));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='djs' and policyname='djs_update_moderator') then
    create policy djs_update_moderator on public.djs for update using (public.is_moderator(auth.uid()));
  end if;
end $$;

-- DJs: lectura publica (no hay campo de estado)
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='djs' and policyname='djs_select_public') then
    create policy djs_select_public on public.djs for select using (true);
  end if;
end $$;

-- DJs: borrado para moderadores
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='djs' and policyname='djs_delete_moderator') then
    create policy djs_delete_moderator on public.djs for delete using (public.is_moderator(auth.uid()));
  end if;
end $$;
-- event_djs: lectura publica solo para eventos publicados
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='event_djs' and policyname='event_djs_select_public') then
    create policy event_djs_select_public on public.event_djs
      for select using (exists (select 1 from public.events e where e.id = event_id and e.status = 'published'));
  end if;
end $$;

-- CRUD de event_djs por moderadores
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='event_djs' and policyname='event_djs_ins_mod') then
    create policy event_djs_ins_mod on public.event_djs for insert with check (public.is_moderator(auth.uid()));
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='event_djs' and policyname='event_djs_upd_mod') then
    create policy event_djs_upd_mod on public.event_djs for update using (public.is_moderator(auth.uid()));
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='event_djs' and policyname='event_djs_del_mod') then
    create policy event_djs_del_mod on public.event_djs for delete using (public.is_moderator(auth.uid()));
  end if;
end $$;

-- RPC: favoritos expandidos para el usuario actual (unifica consultas)
create or replace function public.favorites_expanded()
returns table (id uuid, name text, start_at timestamptz, club_name text, type text)
language sql
stable
as $$
  with f as (
    select target_type, target_id from public.favorites
    where user_id = auth.uid()
  )
  select e.id, e.name, e.start_at, e.club_name, 'event'::text as type
  from public.events_public e
  join f on f.target_type = 'event' and f.target_id = e.id
  union all
  select c.id, c.name, null::timestamptz, null::text, 'club'::text
  from public.clubs c
  join f on f.target_type = 'club' and f.target_id = c.id
  union all
  select d.id, d.name, null::timestamptz, null::text, 'dj'::text
  from public.djs d
  join f on f.target_type = 'dj' and f.target_id = d.id
  order by start_at nulls last, name;
$$;

-- Genres: lectura publica y CRUD por moderadores
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='genres' and policyname='genres_select_public') then
    create policy genres_select_public on public.genres for select using (status = 'active');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='genres' and policyname='genres_ins_mod') then
    create policy genres_ins_mod on public.genres for insert with check (public.is_moderator(auth.uid()));
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='genres' and policyname='genres_upd_mod') then
    create policy genres_upd_mod on public.genres for update using (public.is_moderator(auth.uid()));
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='genres' and policyname='genres_del_mod') then
    create policy genres_del_mod on public.genres for delete using (public.is_moderator(auth.uid()));
  end if;
end $$;

-- Update favorites type to allow DJs
alter table public.favorites drop constraint if exists favorites_target_type_check;
alter table public.favorites add constraint favorites_target_type_check check (target_type in (''event'',''club'',''dj''));
