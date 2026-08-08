-- Perfiles profesionales — Fase 4: panel de adopcion
--
-- Responde a la pregunta del punto 21: ¿los DJs y clubs quieren reclamar y
-- gestionar sus perfiles?
--
-- Solo se registra un dato nuevo: la apertura del formulario. Los otros dos
-- pasos del embudo ya existen y seria absurdo duplicarlos:
--   - visitas a la ficha  -> app_page_views, que ya las guarda
--   - solicitud enviada   -> cada envio es una fila de profile_claims
--
-- No se registran impresiones del boton a proposito: eso serian escrituras en
-- cada carga de cada ficha, y el proyecto ya esta pasado de limites.

begin;

-- ---------------------------------------------------------------------------
-- 1. Aperturas del formulario
-- ---------------------------------------------------------------------------
-- Sin user_agent ni IP: para contar un embudo no hacen falta, y lo que no se
-- guarda no hay que protegerlo despues.

create table if not exists public.claim_opens (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('dj', 'club')),
  target_id   uuid not null,
  user_id     uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists claim_opens_fecha_idx on public.claim_opens(created_at desc);

alter table public.claim_opens enable row level security;

-- Cualquiera puede abrir el formulario, incluso sin sesion: el boton se ve en
-- fichas publicas. Por eso el insert es abierto, y no hay ningun select para
-- anon: se escribe, no se lee.
drop policy if exists claim_opens_insert on public.claim_opens;
create policy claim_opens_insert on public.claim_opens
  for insert to anon, authenticated
  with check (true);

drop policy if exists claim_opens_select_moderator on public.claim_opens;
create policy claim_opens_select_moderator on public.claim_opens
  for select to authenticated
  using (public.is_moderator(auth.uid()));

-- ---------------------------------------------------------------------------
-- 2. El panel
-- ---------------------------------------------------------------------------

create or replace function public.claims_adoption(p_dias int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_desde timestamptz := now() - make_interval(days => greatest(p_dias, 1));
begin
  if not public.is_moderator(auth.uid()) then
    raise exception 'no autorizado';
  end if;

  return jsonb_build_object(
    -- Bloque 1: donde estan las solicitudes y cuanto se ha verificado
    'por_estado', (
      select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
        from (select status, count(*) n from public.profile_claims group by status) t
    ),
    'solicitudes', (select count(*) from public.profile_claims),
    'djs_verificados', (select count(*) from public.djs where verified),
    'djs_totales', (select count(*) from public.djs),
    'clubs_verificados', (select count(*) from public.clubs where verified),
    'clubs_totales', (select count(*) from public.clubs),

    -- Bloque 2: el embudo, en la ventana pedida
    'visitas_fichas', (
      select count(*) from public.app_page_views
       where started_at >= v_desde
         and (path like '%/dj/%' or path like '%/club/%')
    ),
    'aperturas', (select count(*) from public.claim_opens where created_at >= v_desde),
    'envios', (select count(*) from public.profile_claims where created_at >= v_desde),
    'dias', p_dias
  );
end;
$$;

revoke all on function public.claims_adoption(int) from public, anon;
grant execute on function public.claims_adoption(int) to authenticated;

commit;
