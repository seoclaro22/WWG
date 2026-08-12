-- URLs legibles: /club/la-santa en vez de /club/10833c27-b40a-4070-...
--
-- El UUID NO se retira nunca. La ruta sigue aceptandolo y responde con una
-- redireccion permanente al slug, asi que ninguna URL indexada da 404.
--
-- Colisiones medidas sobre los datos reales:
--   clubs   31 filas, 0 slugs repetidos  -> basta el nombre
--   djs    403 filas, 0 slugs repetidos  -> basta el nombre
--   events 440 filas, 288 repetidas por nombre ("calablava-mornings" sale 30
--          veces). Con nombre + sala + fecha bajan a 0.

-- ---------------------------------------------------------------------------
-- 1. slugify
-- ---------------------------------------------------------------------------
-- Sin unaccent para no depender de que la extension este instalada. translate
-- mapea caracter a caracter, asi que las dos cadenas tienen que medir igual.
create or replace function public.slugify(v text)
returns text
language sql
immutable
as $$
  select nullif(
    trim(both '-' from regexp_replace(
      lower(translate(
        coalesce(v, ''),
        'áàäâãåéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇøØ',
        'aaaaaaeeeeiiiiooooouuuuncAAAAAAEEEEIIIIOOOOOUUUUNCoO'
      )),
      '[^a-z0-9]+', '-', 'g'
    )),
    ''
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Columnas
-- ---------------------------------------------------------------------------
alter table public.clubs  add column if not exists slug text;
alter table public.djs    add column if not exists slug text;
alter table public.events add column if not exists slug text;

-- events tiene privilegios POR COLUMNA (ver el revoke/grant de contact_phone).
-- Una columna nueva no hereda nada, asi que sin esto el rol anonimo no la ve y
-- events_public, que es security_invoker, falla al seleccionarla.
grant select (slug) on public.events to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Relleno de lo que ya existe
-- ---------------------------------------------------------------------------
update public.clubs set slug = public.slugify(name) where slug is null;
update public.djs   set slug = public.slugify(name) where slug is null;

-- La fecha se toma en UTC porque es la zona en la que la app pinta las fechas
-- (LDate va con timeZone UTC). Si se usara la del servidor, el slug podria
-- decir un dia distinto del que ve el usuario.
update public.events e
set slug = trim(both '-' from concat_ws('-',
      public.slugify(e.name),
      public.slugify(c.name),
      to_char(e.start_at at time zone 'UTC', 'YYYY-MM-DD')
    ))
from public.clubs c
where c.id = e.club_id and e.slug is null;

-- Eventos sin sala asignada
update public.events e
set slug = trim(both '-' from concat_ws('-',
      public.slugify(e.name),
      to_char(e.start_at at time zone 'UTC', 'YYYY-MM-DD')
    ))
where e.slug is null;

-- Red de seguridad: si aun asi quedara algun repetido, se le pega un trozo del
-- id. Con los datos de hoy no toca ninguna fila, pero el indice unico de abajo
-- fallaria y dejaria el script a medias.
update public.clubs t set slug = t.slug || '-' || left(t.id::text, 6)
from (select slug from public.clubs where slug is not null group by slug having count(*) > 1) d
where t.slug = d.slug;

update public.djs t set slug = t.slug || '-' || left(t.id::text, 6)
from (select slug from public.djs where slug is not null group by slug having count(*) > 1) d
where t.slug = d.slug;

update public.events t set slug = t.slug || '-' || left(t.id::text, 6)
from (select slug from public.events where slug is not null group by slug having count(*) > 1) d
where t.slug = d.slug;

-- ---------------------------------------------------------------------------
-- 4. Unicidad
-- ---------------------------------------------------------------------------
-- Parcial: una fila sin slug es tolerable (el codigo cae al id), varias filas
-- compartiendo slug no.
create unique index if not exists idx_clubs_slug  on public.clubs(slug)  where slug is not null;
create unique index if not exists idx_djs_slug    on public.djs(slug)    where slug is not null;
create unique index if not exists idx_events_slug on public.events(slug) where slug is not null;

-- ---------------------------------------------------------------------------
-- 5. Slug automatico al insertar
-- ---------------------------------------------------------------------------
-- Imprescindible: los eventos y los DJs los da de alta un sistema automatico
-- que no sabe nada de slugs. Sin esto entrarian sin slug y sus fichas se
-- quedarian con la URL de UUID para siempre.
create or replace function public.set_club_slug()
returns trigger language plpgsql as $$
declare base text; cand text;
begin
  if new.slug is not null and new.slug <> '' then return new; end if;
  base := public.slugify(new.name);
  if base is null then new.slug := null; return new; end if;
  cand := base;
  if exists (select 1 from public.clubs where slug = cand and id <> new.id) then
    cand := base || '-' || left(new.id::text, 6);
  end if;
  new.slug := cand;
  return new;
end $$;

create or replace function public.set_dj_slug()
returns trigger language plpgsql as $$
declare base text; cand text;
begin
  if new.slug is not null and new.slug <> '' then return new; end if;
  base := public.slugify(new.name);
  if base is null then new.slug := null; return new; end if;
  cand := base;
  if exists (select 1 from public.djs where slug = cand and id <> new.id) then
    cand := base || '-' || left(new.id::text, 6);
  end if;
  new.slug := cand;
  return new;
end $$;

create or replace function public.set_event_slug()
returns trigger language plpgsql as $$
declare sala text; base text; cand text;
begin
  if new.slug is not null and new.slug <> '' then return new; end if;
  select public.slugify(c.name) into sala from public.clubs c where c.id = new.club_id;
  base := trim(both '-' from concat_ws('-',
    public.slugify(new.name),
    sala,
    to_char(new.start_at at time zone 'UTC', 'YYYY-MM-DD')
  ));
  if base is null or base = '' then new.slug := null; return new; end if;
  cand := base;
  if exists (select 1 from public.events where slug = cand and id <> new.id) then
    cand := base || '-' || left(new.id::text, 6);
  end if;
  new.slug := cand;
  return new;
end $$;

drop trigger if exists trg_clubs_slug on public.clubs;
create trigger trg_clubs_slug before insert on public.clubs
  for each row execute function public.set_club_slug();

drop trigger if exists trg_djs_slug on public.djs;
create trigger trg_djs_slug before insert on public.djs
  for each row execute function public.set_dj_slug();

drop trigger if exists trg_events_slug on public.events;
create trigger trg_events_slug before insert on public.events
  for each row execute function public.set_event_slug();

-- ---------------------------------------------------------------------------
-- 6. events_public tiene que exponer el slug
-- ---------------------------------------------------------------------------
-- Se anaden e.slug y c.slug as club_slug. El resto de la vista queda igual,
-- incluido security_invoker=on, que es lo que hace que se aplique el RLS.
drop view if exists public.events_public;
create view public.events_public with (security_invoker = on) as
  select e.id, e.slug, e.name, e.name_i18n, e.description, e.description_i18n,
         e.start_at, e.end_at, e.genres, e.sponsored,
         e.price_min, e.price_max, e.images, e.url_referral,
         e.status, e.created_at, c.id as club_id, c.name as club_name,
         c.slug as club_slug, c.location, e.geo, e.zone
  from public.events e
  left join public.clubs c on c.id = e.club_id and c.status = 'approved'
  where e.status = 'published';

-- Un drop view se lleva por delante los privilegios, asi que se rehacen.
grant select on public.events_public to anon, authenticated;
