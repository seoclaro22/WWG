-- Arregla la analitica: app_devices/app_sessions/app_page_views tenian 0 filas
-- pese a haber trafico real, y las metricas de duracion seguian vacias aun
-- despues de que empezaran a entrar filas.
--
-- Diagnostico hecho con curl contra la REST de Supabase, reproduciendo lo que
-- hace components/AnalyticsTracker.tsx. Habia DOS fallos independientes:
--
-- 1. ORDEN (arreglado en el codigo, no aqui). El tracker insertaba la sesion
--    antes de crear el dispositivo, pero app_sessions.device_id es clave
--    foranea de app_devices. Para cualquier visitante nuevo el insert moria
--    con 23503 ("Key is not present in table app_devices"), y detras caian
--    las vistas por la FK a app_sessions. Los catch{} vacios lo ocultaban
--    todo. Ver el cambio en components/AnalyticsTracker.tsx.
--
-- 2. UPDATE BLOQUEADO (lo que arregla este fichero). Con la anon key, un
--    PATCH sobre estas tablas responde 204/200 pero afecta a 0 filas: RLS lo
--    descarta en silencio. Verificado sobre una sesion con user_id null,
--    mandando user_id null en el payload: duration_ms seguia a 0.
--
--    Consecuencia en el panel: las filas entran, pero nunca se actualizan.
--    Por eso salian "Duracion media 0m", "Usuarios activos 0" y "Sesiones 0"
--    aunque hubiera visitas: todo eso se calcula a partir de last_seen_at y
--    duration_ms, que se escriben por UPDATE (heartbeat cada 30s y cierre de
--    cada vista de pagina).
--
-- Por que no basta con volver a poner "with check (user_id is null or
-- auth.uid() = user_id)": la fila real de app_devices tiene user_id de un
-- usuario logueado, y ese with check deja fuera a cualquier visitante
-- anonimo que pase despues por ese mismo dispositivo, bloqueandole tambien
-- columnas inocuas como last_seen_at.
--
-- En su lugar se abre el UPDATE y se protege lo unico que importaba: que
-- nadie pueda "adoptar" la fila de otro reescribiendole el user_id. De eso se
-- encarga el trigger, que ademas cubre INSERT ... ON CONFLICT y cualquier
-- ruta futura, no solo la politica.

create or replace function public.preserve_analytics_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if OLD.user_id is not null and NEW.user_id is distinct from OLD.user_id then
    NEW.user_id := OLD.user_id;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_app_devices_preserve_owner on public.app_devices;
create trigger trg_app_devices_preserve_owner
  before update on public.app_devices
  for each row execute function public.preserve_analytics_owner();

drop trigger if exists trg_app_sessions_preserve_owner on public.app_sessions;
create trigger trg_app_sessions_preserve_owner
  before update on public.app_sessions
  for each row execute function public.preserve_analytics_owner();

drop trigger if exists trg_app_page_views_preserve_owner on public.app_page_views;
create trigger trg_app_page_views_preserve_owner
  before update on public.app_page_views
  for each row execute function public.preserve_analytics_owner();

drop policy if exists app_devices_update_public on public.app_devices;
create policy app_devices_update_public on public.app_devices
  for update using (true) with check (true);

drop policy if exists app_sessions_update_public on public.app_sessions;
create policy app_sessions_update_public on public.app_sessions
  for update using (true) with check (true);

drop policy if exists app_page_views_update_public on public.app_page_views;
create policy app_page_views_update_public on public.app_page_views
  for update using (true) with check (true);

-- Comprobacion: deberia devolver una fila por tabla, con qual='true' y
-- with_check='true'.
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('app_devices', 'app_sessions', 'app_page_views')
  and cmd = 'UPDATE'
order by tablename;
