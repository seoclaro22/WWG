begin;

create or replace function public.wwg_fourvenues_event_id(referral text)
returns text
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select (regexp_match(referral, '^https?://(?:www\.|web\.)?fourvenues\.com/(?:[^?#]*/)?events/([A-Za-z0-9_-]+)/?(?:[?#].*)?$', 'i'))[1];
$$;

create index if not exists events_fourvenues_source_idx
on public.events (public.wwg_fourvenues_event_id(url_referral));

create or replace function public.wwg_prevent_duplicate_fourvenues_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  source_id text := public.wwg_fourvenues_event_id(new.url_referral);
begin
  if source_id is null then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('wwg:fourvenues:' || source_id, 0));
  if exists (
    select 1 from public.events
    where public.wwg_fourvenues_event_id(url_referral) = source_id
  ) then
    raise exception 'Este evento de Fourvenues ya existe. Actualiza la ficha existente.'
      using errcode = '23505';
  end if;
  return new;
end;
$$;

revoke all on function public.wwg_prevent_duplicate_fourvenues_event() from public;
drop trigger if exists prevent_duplicate_fourvenues_event on public.events;
create trigger prevent_duplicate_fourvenues_event
before insert on public.events
for each row execute function public.wwg_prevent_duplicate_fourvenues_event();

commit;
