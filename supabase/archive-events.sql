-- Archivado de eventos pasados sin perder estadisticas
-- Ejecutar en el SQL Editor de Supabase (una sola vez).

-- 1) Tabla de archivo: snapshot ligero del evento para que las estadisticas
--    puedan seguir resolviendo nombres despues del borrado.
create table if not exists public.events_archive (
  id uuid primary key,
  club_id uuid,
  club_name text,
  name text not null,
  name_i18n jsonb,
  start_at timestamptz,
  end_at timestamptz,
  genres text[] default '{}',
  zone text,
  sponsored boolean default false,
  created_at timestamptz,
  archived_at timestamptz not null default now()
);

alter table public.events_archive enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='events_archive' and policyname='events_archive_select_moderator') then
    create policy events_archive_select_moderator on public.events_archive
      for select using (public.is_moderator(auth.uid()));
  end if;
end $$;

-- 2) Las tablas de tracking no deben perder el event_id cuando se borra el evento.
--    Se quitan las FK (la columna uuid se mantiene tal cual).
alter table public.clicks drop constraint if exists clicks_event_id_fkey;
alter table public.app_page_views drop constraint if exists app_page_views_event_id_fkey;

-- 3) Funcion de archivado: mueve a events_archive y borra de events
--    los eventos terminados hace mas de `retention`.
--    Se considera terminado: end_at si existe, si no start_at + 12 horas.
create or replace function public.archive_old_events(retention interval default interval '7 days')
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  moved int;
begin
  with old_events as (
    select e.id, e.club_id, c.name as club_name, e.name, e.name_i18n,
           e.start_at, e.end_at, e.genres, e.zone, e.sponsored, e.created_at
    from public.events e
    left join public.clubs c on c.id = e.club_id
    where coalesce(e.end_at, e.start_at + interval '12 hours') < now() - retention
  ), ins as (
    insert into public.events_archive
      (id, club_id, club_name, name, name_i18n, start_at, end_at, genres, zone, sponsored, created_at)
    select id, club_id, club_name, name, name_i18n, start_at, end_at, genres, zone, sponsored, created_at
    from old_events
    on conflict (id) do nothing
    returning id
  )
  delete from public.events e
  using old_events o
  where e.id = o.id;
  get diagnostics moved = row_count;
  return moved;
end;
$$;

-- 4) Programar ejecucion diaria a las 05:00 UTC con pg_cron.
--    En Supabase: Database -> Extensions -> habilitar pg_cron primero.
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if not exists (select 1 from cron.job where jobname = 'archive-old-events') then
      perform cron.schedule('archive-old-events', '0 5 * * *', $job$select public.archive_old_events()$job$);
    end if;
  end if;
end $$;

-- Ejecucion manual (opcional, para probar):
-- select public.archive_old_events();
