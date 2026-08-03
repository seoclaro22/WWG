-- Correcciones de seguridad detectadas en la auditoria del 2026-08-02.
--
-- COMO USARLO: ejecutar por bloques en el SQL editor de Supabase, en este
-- orden, y comprobando el resultado de cada uno. No es un fichero para lanzar
-- entero a ciegas: los bloques 5 y 6 cambian permisos de lectura y conviene
-- verificar despues que la web publica sigue funcionando.
--
-- Estos mismos cambios ya estan aplicados en supabase/schema.sql (el archivo
-- fuente), asi que este fichero es solo para ponerse al dia en el proyecto
-- Supabase real sin tener que re-ejecutar todo schema.sql. Una vez aplicado
-- aqui, el fichero fuente y la base de datos vuelven a coincidir.
--
-- AVISO IMPORTANTE: antes de esta auditoria, supabase/schema.sql usaba
-- "create policy if not exists", que no existe en Postgres, asi que ese
-- fichero nunca se pudo ejecutar entero de un tiron: la base de datos real se
-- configuro a mano y puede no coincidir exactamente. Antes de nada, ejecutar
-- el bloque 0 para ver que hay activo de verdad.


-- =====================================================================
-- 0. DIAGNOSTICO: que politicas existen realmente (no modifica nada)
-- =====================================================================
select tablename, policyname, cmd, qual, with_check
from pg_policies where schemaname = 'public'
order by tablename, policyname;

select relname as tabla, relrowsecurity as rls_activo
from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r'
order by relname;

-- Funciones security definer accesibles por anon/authenticated: son las que
-- pueden saltarse RLS si no se les revoca el permiso de ejecucion.
select p.proname, p.prosecdef as security_definer,
       pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
where p.pronamespace = 'public'::regnamespace and p.prosecdef
order by p.proname;


-- =====================================================================
-- 1. CRITICO: borrado masivo de eventos por cualquiera (sin cuenta)
-- =====================================================================
-- archive_old_events es security definer, recibe el periodo del llamante y no
-- comprueba rol. Postgres concede EXECUTE a PUBLIC por defecto y Supabase
-- expone toda funcion de public via PostgREST, asi que con la anon key (que
-- esta en el bundle publico) bastaba:
--     sb.rpc('archive_old_events', { retention: '-100 years' })
-- para que la condicion fuese cierta en todas las filas y se borrase la tabla
-- events entera, eventos futuros incluidos.

create or replace function public.archive_old_events(retention interval default interval '7 days')
returns int language plpgsql security definer set search_path = public as $$
declare moved int;
begin
  if retention < interval '1 day' then
    raise exception 'retention invalida: %', retention;
  end if;
  insert into public.events_archive
    select * from public.events
    where coalesce(end_at, start_at + interval '12 hours') < now() - retention;
  get diagnostics moved = row_count;
  delete from public.events
    where coalesce(end_at, start_at + interval '12 hours') < now() - retention;
  return moved;
end $$;

revoke all on function public.archive_old_events(interval) from public, anon, authenticated;
grant execute on function public.archive_old_events(interval) to service_role;


-- =====================================================================
-- 2. CRITICO: cualquier usuario registrado podia hacerse admin
-- =====================================================================
-- users_update_self permitia actualizar la propia fila sin restringir columnas,
-- y la columna roles vive en esa misma tabla. Desde el navegador:
--     sb.from('users').update({ roles: ['admin'] }).eq('id', user.id)
-- y a partir de ahi control total del catalogo, lectura de todos los emails y
-- envio de push a toda la base.

revoke update (roles) on public.users from anon, authenticated;

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and roles is not distinct from (select u.roles from public.users u where u.id = auth.uid())
  );

drop policy if exists users_insert_self on public.users;
create policy users_insert_self on public.users
  for insert
  with check (auth.uid() = id and (roles is null or roles = array['user']::text[]));


-- =====================================================================
-- 3. ALTA: reseñas publicadas saltandose la moderacion
-- =====================================================================
-- El with check no restringia status, asi que se podia insertar directamente
-- una reseña con status 'approved' y salia publicada sin pasar por backoffice.

drop policy if exists reviews_insert_self on public.reviews;
create policy reviews_insert_self on public.reviews
  for insert with check (auth.uid() = user_id and status = 'pending');


-- =====================================================================
-- 4. ALTA: events_public expone clubs no aprobados y se salta RLS
-- =====================================================================
-- La vista no declaraba security_invoker, asi que se ejecutaba con los
-- privilegios de su propietario y NO aplicaba el RLS de events ni de clubs. Y
-- el join no filtraba por club aprobado, asi que se publicaban nombre y
-- coordenadas de locales pendientes o rechazados junto a eventos publicados.
--
-- El filtro va en el ON y no en el WHERE a proposito: con left join, un evento
-- cuyo club no este aprobado sigue apareciendo pero con club_name y location a
-- NULL, en vez de desaparecer del catalogo.
--
-- ANTES DE APLICAR: comprobar cuantas filas cambian de forma.
--     select count(*) from public.events e
--     join public.clubs c on c.id = e.club_id
--     where e.status='published' and c.status <> 'approved';

drop view if exists public.events_public;
create view public.events_public with (security_invoker = on) as
  select e.id, e.name, e.name_i18n, e.description, e.description_i18n, e.start_at, e.end_at, e.genres, e.sponsored,
         e.price_min, e.price_max, e.images, e.url_referral,
         e.status, e.created_at, c.id as club_id, c.name as club_name,
         c.location, e.geo, e.zone
  from public.events e
  left join public.clubs c on c.id = e.club_id and c.status = 'approved'
  where e.status = 'published';


-- =====================================================================
-- 5. ALTA: contact_phone legible con la anon key
-- =====================================================================
-- El RLS es por fila, no por columna: la politica events_read_public permite
-- leer cualquier evento publicado, y con el la columna contact_phone. El
-- comentario "solo backoffice" era una convencion de interfaz, no un control.
-- Son telefonos de organizadores: dato personal, con implicacion de RGPD.
--
-- VERIFICAR DESPUES: que la web publica sigue leyendo todo lo que necesita. Si
-- se añade una columna nueva a events hay que añadirla tambien a este grant.
-- El backoffice (apps/web/app/[locale]/admin/events/page.tsx) ya se cambio
-- para leer de events_admin en vez de events directamente.

revoke select on public.events from anon, authenticated;
grant select (
  id, club_id, name, name_i18n, description, description_i18n,
  start_at, end_at, genres, price_min, price_max, age,
  images, url_referral, geo, zone, sponsored, status, created_at
) on public.events to anon, authenticated;

-- Los moderadores necesitan el telefono. Se les da por vista aparte, security
-- definer (no invoker): el grant de columna de arriba es por rol de Postgres
-- y no distingue "moderador" dentro de authenticated, asi que la vista tiene
-- que poder leer contact_phone con los privilegios de su propietario. La unica
-- barrera pasa a ser el is_moderator() de dentro.
drop view if exists public.events_admin;
create view public.events_admin as
  select e.* from public.events e
  where public.is_moderator(auth.uid());

grant select on public.events_admin to authenticated;


-- =====================================================================
-- 6. MEDIA: analitica manipulable por cualquiera
-- =====================================================================
-- Las tres tablas (app_devices, app_sessions, app_page_views) tenian UPDATE
-- "using (true)" sin with check: cualquier anonimo podia modificar cualquier
-- fila de analitica de cualquier otro visitante, incluido reescribirle el
-- user_id para "adoptar" la sesion de alguien que si tenia cuenta.
--
-- No se revoca el UPDATE entero: la propia app lo necesita (hace un heartbeat
-- de sesion cada 30s y cierra cada vista de pagina actualizando su propia
-- fila por un id aleatorio, sin login -- ver components/AnalyticsTracker.tsx).
-- Se cierra solo el hueco real: el with check impide poner un user_id que no
-- sea el propio, y el resto de columnas se puede seguir actualizando.
--
-- Riesgo residual asumido: quien adivine el device_id/session_id/view_id (UUID
-- aleatorio, no expuesto en URLs) de otro visitante puede corromper sus
-- metricas de tiempo/ruta, pero no atribuirselas a un usuario real.

drop policy if exists app_devices_update_public on public.app_devices;
create policy app_devices_update_public on public.app_devices
  for update using (true) with check (user_id is null or auth.uid() = user_id);

drop policy if exists app_sessions_update_public on public.app_sessions;
create policy app_sessions_update_public on public.app_sessions
  for update using (true) with check (user_id is null or auth.uid() = user_id);

drop policy if exists app_page_views_update_public on public.app_page_views;
create policy app_page_views_update_public on public.app_page_views
  for update using (true) with check (user_id is null or auth.uid() = user_id);

-- Y los insert tampoco verificaban a quien se atribuyen: se podia fabricar
-- historial de busqueda o navegacion a nombre de otro usuario. Mismo patron
-- que ya usaba clicks_insert_self, que si lo hacia bien.
drop policy if exists search_logs_insert_public on public.search_logs;
create policy search_logs_insert_public on public.search_logs
  for insert with check (user_id is null or auth.uid() = user_id);

drop policy if exists app_devices_insert_public on public.app_devices;
create policy app_devices_insert_public on public.app_devices
  for insert with check (user_id is null or auth.uid() = user_id);

drop policy if exists app_sessions_insert_public on public.app_sessions;
create policy app_sessions_insert_public on public.app_sessions
  for insert with check (user_id is null or auth.uid() = user_id);

drop policy if exists app_page_views_insert_public on public.app_page_views;
create policy app_page_views_insert_public on public.app_page_views
  for insert with check (user_id is null or auth.uid() = user_id);


-- =====================================================================
-- 7. MEDIA: favorites_expanded definida dos veces
-- =====================================================================
-- schema.sql la definia dos veces con la misma firma; la segunda (de
-- invocante, correcta) pisaba a la primera (security definer, se saltaba el
-- RLS de favorites). Si alguien reordenaba el fichero volvia a quedar activa
-- la insegura. El fichero fuente ya se dejo con una sola definicion; aqui se
-- reafirma la version correcta por si en la base de datos real quedo la otra.

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


-- =====================================================================
-- 9. BAJA: notificaciones push reenviables sin control
-- =====================================================================
-- /api/notify-event no tenia forma de saber si un evento ya habia avisado a
-- sus seguidores. El backoffice evita llamarla dos veces en el flujo normal,
-- pero la ruta en si no tenia ninguna barrera: llamarla de nuevo con el mismo
-- eventId (a mano, o por una carrera de doble clic) reenviaba la notificacion
-- a todos los favoritos otra vez. apps/web/app/api/notify-event/route.ts ya se
-- cambio para marcar el evento con un update atomico antes de enviar.

alter table public.events add column if not exists notified_at timestamptz;


-- =====================================================================
-- 10. COMPROBACION FINAL
-- =====================================================================
-- Repetir el bloque 0 y verificar ademas:

-- Debe fallar por permisos si se ejecuta como anon:
--     select public.archive_old_events('-100 years'::interval);

-- Debe dejar roles intacto (o fallar) si se ejecuta como un usuario normal:
--     update public.users set roles = array['admin'] where id = auth.uid();

-- Debe fallar (columna no visible) si se ejecuta como anon o como un usuario
-- normal sin rol de moderador:
--     select contact_phone from public.events limit 1;

-- Debe funcionar sin cambios para un usuario moderador real:
--     select * from public.events_admin limit 1;
