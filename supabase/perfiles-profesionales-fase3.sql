-- Perfiles profesionales — Fase 3: edicion con permisos por campo
--
-- El encargo (punto 8) separa los campos en dos grupos: unos se editan directo
-- y otros pasan por revision. RLS decide filas enteras, no columnas, asi que
-- una politica de update sobre djs/clubs dejaria al profesional cambiar
-- cualquier campo, incluido el nombre y todo lo que afecta a la indexacion.
--
-- Por eso no se da ninguna politica de update: se entra por dos funciones que
-- llevan la lista blanca dentro. El limite vive en el servidor, donde no se
-- puede saltar desde el navegador.

begin;

-- ---------------------------------------------------------------------------
-- 1. Que puede tocar cada uno
-- ---------------------------------------------------------------------------
-- Directo: cosas que solo afectan a su propia ficha y son faciles de revertir.
-- Revision: nombre, bios, generos y ubicacion, que mueven la indexacion, mas
-- las imagenes, porque una foto equivocada es peor que ninguna (punto 16).

create or replace function public.campos_directos(p_target_type text)
returns text[] language sql immutable as $$
  select case p_target_type
    when 'dj'   then array['socials', 'spotify_embed', 'short_bio']
    when 'club' then array['links', 'referral_link', 'address', 'open_hours']
  end;
$$;

create or replace function public.campos_con_revision(p_target_type text)
returns text[] language sql immutable as $$
  select case p_target_type
    when 'dj'   then array['name', 'bio', 'genres', 'images']
    when 'club' then array['name', 'description', 'genres', 'images', 'zone']
  end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Quien manda en una ficha
-- ---------------------------------------------------------------------------

create or replace function public.gestiona_perfil(p_target_type text, p_target_id uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_owner uuid;
begin
  if p_target_type = 'dj' then
    select claimed_by into v_owner from public.djs where id = p_target_id;
  elsif p_target_type = 'club' then
    select claimed_by into v_owner from public.clubs where id = p_target_id;
  else
    return false;
  end if;
  return v_owner is not null and v_owner = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------------
-- 2b. Escribir un campo respetando su tipo
-- ---------------------------------------------------------------------------
-- Los valores viajan como jsonb para poder tratar todos los campos igual, pero
-- las columnas no son todas jsonb: name y bio son text, genres es text[], y
-- socials o images si son jsonb. Asignar jsonb a una columna text falla, asi
-- que aqui se mira el tipo real de la columna y se convierte.

create or replace function public.aplicar_campo(
  p_target_type text, p_target_id uuid, p_field text, p_value jsonb
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_tabla text := case p_target_type when 'dj' then 'djs' when 'club' then 'clubs' end;
  v_tipo  text;
  v_arr   text[];
begin
  if v_tabla is null then raise exception 'tipo de perfil invalido'; end if;

  select a.atttypid::regtype::text into v_tipo
    from pg_attribute a
   where a.attrelid = ('public.' || v_tabla)::regclass
     and a.attname = p_field and a.attnum > 0 and not a.attisdropped;
  if v_tipo is null then raise exception 'el campo % no existe en %', p_field, v_tabla; end if;

  if v_tipo = 'jsonb' then
    execute format('update public.%I set %I = $1 where id = $2', v_tabla, p_field)
      using p_value, p_target_id;
  elsif v_tipo = 'text[]' then
    select coalesce(array_agg(x), '{}') into v_arr
      from jsonb_array_elements_text(coalesce(p_value, '[]'::jsonb)) x;
    execute format('update public.%I set %I = $1 where id = $2', v_tabla, p_field)
      using v_arr, p_target_id;
  else
    -- text y similares: #>> extrae el valor sin las comillas del json
    execute format('update public.%I set %I = $1 where id = $2', v_tabla, p_field)
      using (p_value #>> '{}'), p_target_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Edicion directa
-- ---------------------------------------------------------------------------
-- Aplica solo los campos de la lista blanca y deja constancia de cada uno en
-- profile_changes con su valor anterior, que es lo que permite revertir.

create or replace function public.update_profile_direct(
  p_target_type text,
  p_target_id uuid,
  p_patch jsonb
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_permitidos text[] := public.campos_directos(p_target_type);
  v_campo text;
  v_anterior jsonb;
  v_nuevo jsonb;
  v_fila jsonb;
begin
  if not public.gestiona_perfil(p_target_type, p_target_id) then
    raise exception 'no gestionas este perfil';
  end if;

  if p_target_type = 'dj' then
    select to_jsonb(d) into v_fila from public.djs d where d.id = p_target_id;
  else
    select to_jsonb(c) into v_fila from public.clubs c where c.id = p_target_id;
  end if;

  for v_campo in select jsonb_object_keys(p_patch) loop
    -- Un campo fuera de la lista no se ignora en silencio: si la interfaz
    -- manda algo que no toca, es un fallo que hay que ver, no tragar.
    if not (v_campo = any(v_permitidos)) then
      raise exception 'el campo % no se puede editar directamente', v_campo;
    end if;

    v_anterior := v_fila -> v_campo;
    v_nuevo := p_patch -> v_campo;
    continue when v_anterior is not distinct from v_nuevo;

    perform public.aplicar_campo(p_target_type, p_target_id, v_campo, v_nuevo);

    insert into public.profile_changes
      (target_type, target_id, field, old_value, new_value, kind, status, requested_by, reviewed_at)
    values
      (p_target_type, p_target_id, v_campo, v_anterior, v_nuevo, 'direct', 'applied', auth.uid(), now());
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Cambios que piden revision
-- ---------------------------------------------------------------------------
-- No tocan la ficha: solo dejan la propuesta en profile_changes.

create or replace function public.request_profile_change(
  p_target_type text,
  p_target_id uuid,
  p_field text,
  p_new_value jsonb
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_anterior jsonb;
  v_fila jsonb;
  v_id uuid;
begin
  if not public.gestiona_perfil(p_target_type, p_target_id) then
    raise exception 'no gestionas este perfil';
  end if;
  if not (p_field = any(public.campos_con_revision(p_target_type))) then
    raise exception 'el campo % no admite propuesta de cambio', p_field;
  end if;

  if p_target_type = 'dj' then
    select to_jsonb(d) into v_fila from public.djs d where d.id = p_target_id;
  else
    select to_jsonb(c) into v_fila from public.clubs c where c.id = p_target_id;
  end if;
  v_anterior := v_fila -> p_field;

  -- Una propuesta viva por campo: si reenvias, se actualiza la que habia en
  -- vez de acumular pendientes que dicen cosas distintas.
  update public.profile_changes
     set new_value = p_new_value, old_value = v_anterior, created_at = now()
   where target_type = p_target_type and target_id = p_target_id
     and field = p_field and status = 'pending'
  returning id into v_id;

  if v_id is null then
    insert into public.profile_changes
      (target_type, target_id, field, old_value, new_value, kind, status, requested_by)
    values
      (p_target_type, p_target_id, p_field, v_anterior, p_new_value, 'review', 'pending', auth.uid())
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Resolver una propuesta (administracion)
-- ---------------------------------------------------------------------------

create or replace function public.resolve_profile_change(p_change_id uuid, p_aprobar boolean, p_notas text default null)
returns void language plpgsql security definer set search_path = public as $$
declare c public.profile_changes;
begin
  if not public.is_moderator(auth.uid()) then
    raise exception 'no autorizado';
  end if;

  select * into c from public.profile_changes where id = p_change_id for update;
  if not found then raise exception 'cambio no encontrado'; end if;
  if c.status <> 'pending' then raise exception 'ese cambio ya estaba resuelto'; end if;

  if p_aprobar then
    perform public.aplicar_campo(c.target_type, c.target_id, c.field, c.new_value);
  end if;

  update public.profile_changes
     set status = case when p_aprobar then 'approved' else 'rejected' end,
         reviewed_by = auth.uid(), reviewed_at = now(), admin_notes = coalesce(p_notas, admin_notes)
   where id = p_change_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Revertir (punto 9)
-- ---------------------------------------------------------------------------

create or replace function public.revert_profile_change(p_change_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c public.profile_changes;
begin
  if not public.is_moderator(auth.uid()) then
    raise exception 'no autorizado';
  end if;

  select * into c from public.profile_changes where id = p_change_id for update;
  if not found then raise exception 'cambio no encontrado'; end if;
  if c.status not in ('applied', 'approved') then
    raise exception 'solo se puede revertir un cambio que llego a aplicarse';
  end if;

  perform public.aplicar_campo(c.target_type, c.target_id, c.field, c.old_value);

  update public.profile_changes
     set status = 'reverted', reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_change_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. El profesional ve el historial de su ficha
-- ---------------------------------------------------------------------------

drop policy if exists profile_changes_select_gestor on public.profile_changes;
create policy profile_changes_select_gestor on public.profile_changes
  for select to authenticated
  using (public.gestiona_perfil(target_type, target_id));

-- aplicar_campo escribe cualquier columna sin comprobar quien llama: es la
-- pieza interna que usan las tres funciones de arriba, que si comprueban. En
-- PostgreSQL toda funcion nace ejecutable por PUBLIC, asi que dejarla como
-- estaba seria una puerta trasera para editar cualquier ficha. Se le quita el
-- permiso a todo el mundo; las funciones que la llaman corren como propietario
-- y no lo necesitan.
revoke all on function public.aplicar_campo(text, uuid, text, jsonb) from public, anon, authenticated;

revoke all on function public.update_profile_direct(text, uuid, jsonb) from public, anon;
revoke all on function public.request_profile_change(text, uuid, text, jsonb) from public, anon;
revoke all on function public.resolve_profile_change(uuid, boolean, text) from public, anon;
revoke all on function public.revert_profile_change(uuid) from public, anon;
grant execute on function public.update_profile_direct(text, uuid, jsonb) to authenticated;
grant execute on function public.request_profile_change(text, uuid, text, jsonb) to authenticated;
grant execute on function public.resolve_profile_change(uuid, boolean, text) to authenticated;
grant execute on function public.revert_profile_change(uuid) to authenticated;

commit;
