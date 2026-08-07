-- Segunda parte del arreglo de analitica. Aplicar DESPUES de
-- fix-analytics-tracking.sql.
--
-- Por que hace falta: abrir la politica de UPDATE no basta. En PostgreSQL,
-- un UPDATE con clausula WHERE necesita ademas permiso de SELECT sobre la
-- tabla, asi que tambien se le aplican las politicas de SELECT. La unica que
-- hay es is_moderator(auth.uid()), falsa para un visitante anonimo: la fila
-- le resulta invisible, el WHERE no encuentra nada y el UPDATE responde 204
-- habiendo tocado 0 filas. Verificado escribiendo un valor de prueba en tz y
-- comprobando que no cambiaba.
--
-- No se soluciona dando SELECT publico: expondria user_agent, first_referrer
-- y user_id de todos los visitantes a cualquiera con la anon key, que es
-- publica por definicion.
--
-- En su lugar, el heartbeat pasa por funciones SECURITY DEFINER: se ejecutan
-- con los permisos del propietario (saltandose RLS) pero solo hacen la
-- operacion concreta y no dejan leer nada. Cada una recibe el id aleatorio
-- que el propio navegador genero, y ninguna devuelve datos.

-- ---------------------------------------------------------------------------
-- Dispositivo: alta o actualizacion. coalesce(d.user_id, ...) impide que una
-- visita anonima posterior borre el dueño de un dispositivo ya asociado a una
-- cuenta, que es el unico dato sensible de la fila.
-- ---------------------------------------------------------------------------
create or replace function public.analytics_touch_device(
  p_device_id   uuid,
  p_last_seen   timestamptz,
  p_user_id     uuid,
  p_device_type text,
  p_os          text,
  p_lang        text,
  p_tz          text,
  p_user_agent  text,
  p_is_pwa      boolean,
  p_referrer    text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_devices as d (
    device_id, first_seen_at, last_seen_at, user_id, device_type, os, lang,
    tz, user_agent, is_pwa, first_referrer, last_referrer
  ) values (
    p_device_id, p_last_seen, p_last_seen, p_user_id, p_device_type, p_os,
    p_lang, p_tz, p_user_agent, p_is_pwa, p_referrer, p_referrer
  )
  on conflict (device_id) do update set
    last_seen_at  = excluded.last_seen_at,
    device_type   = excluded.device_type,
    os            = excluded.os,
    lang          = excluded.lang,
    tz            = excluded.tz,
    user_agent    = excluded.user_agent,
    is_pwa        = excluded.is_pwa,
    last_referrer = excluded.last_referrer,
    user_id       = coalesce(d.user_id, excluded.user_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Sesion: heartbeat cada 30s. De aqui salen "duracion media", "usuarios
-- activos" y "sesiones" del panel, que estaban a cero porque este update
-- nunca llegaba a aplicarse.
-- ---------------------------------------------------------------------------
create or replace function public.analytics_touch_session(
  p_session_id uuid,
  p_last_seen  timestamptz,
  p_duration   bigint,
  p_path       text,
  p_event_id   uuid,
  p_user_id    uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.app_sessions set
    last_seen_at     = p_last_seen,
    duration_ms      = p_duration,
    current_path     = p_path,
    current_event_id = p_event_id,
    user_id          = coalesce(user_id, p_user_id)
  where id = p_session_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Vista de pagina: cierre al salir. Sin esto, ended_at y duration_ms quedan
-- a null y no se puede calcular tiempo por pantalla.
-- ---------------------------------------------------------------------------
create or replace function public.analytics_end_view(
  p_view_id  uuid,
  p_ended_at timestamptz,
  p_duration bigint
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.app_page_views set
    ended_at    = p_ended_at,
    duration_ms = p_duration
  where id = p_view_id;
end;
$$;

revoke all on function public.analytics_touch_device(uuid, timestamptz, uuid, text, text, text, text, text, boolean, text) from public;
revoke all on function public.analytics_touch_session(uuid, timestamptz, bigint, text, uuid, uuid) from public;
revoke all on function public.analytics_end_view(uuid, timestamptz, bigint) from public;

grant execute on function public.analytics_touch_device(uuid, timestamptz, uuid, text, text, text, text, text, boolean, text) to anon, authenticated;
grant execute on function public.analytics_touch_session(uuid, timestamptz, bigint, text, uuid, uuid) to anon, authenticated;
grant execute on function public.analytics_end_view(uuid, timestamptz, bigint) to anon, authenticated;
