-- Perfiles profesionales — edicion en los tres idiomas
--
-- Problema que arregla: la ficha muestra i18n[locale] || campo_base (ver
-- components/LocalText.tsx). El español estaba en dos sitios, bio y
-- bio_i18n.es, y el segundo gana. Un profesional editaba bio, se guardaba
-- bien, y en pantalla no cambiaba nada.
--
-- Solucion sin tocar datos existentes: el panel manda los tres idiomas juntos
-- en el campo _i18n, y al aplicarlo se copia el español al campo base. Los dos
-- sitios quedan con el mismo texto, asi que da igual cual gane al pintar.
--
-- La alternativa era limpiar el 'es' de 352 fichas. Esto no toca ninguna.

begin;

-- ---------------------------------------------------------------------------
-- 1. Los campos de idioma entran en las listas blancas
-- ---------------------------------------------------------------------------

create or replace function public.campos_directos(p_target_type text)
returns text[] language sql immutable as $$
  select case p_target_type
    when 'dj'   then array['socials', 'spotify_embed', 'short_bio', 'short_bio_i18n']
    when 'club' then array['links', 'referral_link', 'address', 'open_hours']
  end;
$$;

create or replace function public.campos_con_revision(p_target_type text)
returns text[] language sql immutable as $$
  select case p_target_type
    when 'dj'   then array['name', 'name_i18n', 'bio', 'bio_i18n', 'genres', 'images']
    when 'club' then array['name', 'name_i18n', 'description', 'description_i18n', 'genres', 'images', 'zone']
  end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Escribir un _i18n sincroniza el campo base
-- ---------------------------------------------------------------------------

create or replace function public.aplicar_campo(
  p_target_type text, p_target_id uuid, p_field text, p_value jsonb
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_tabla text := case p_target_type when 'dj' then 'djs' when 'club' then 'clubs' end;
  v_tipo  text;
  v_arr   text[];
  v_base  text;
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
    execute format('update public.%I set %I = $1 where id = $2', v_tabla, p_field)
      using (p_value #>> '{}'), p_target_id;
  end if;

  -- Al guardar un _i18n con español dentro, el campo base recibe ese mismo
  -- texto. Asi los dos coinciden y da igual cual use la pagina al pintar; sin
  -- esto el texto se guardaria pero no se veria, que es el fallo original.
  -- Ademas el campo base es el que alimenta la meta descripcion de Google.
  if p_field like '%\_i18n' and p_value ? 'es' then
    v_base := left(p_field, length(p_field) - 5);
    if exists (
      select 1 from pg_attribute a
       where a.attrelid = ('public.' || v_tabla)::regclass
         and a.attname = v_base and a.attnum > 0 and not a.attisdropped
    ) then
      execute format('update public.%I set %I = $1 where id = $2', v_tabla, v_base)
        using (p_value ->> 'es'), p_target_id;
    end if;
  end if;
end;
$$;

revoke all on function public.aplicar_campo(text, uuid, text, jsonb) from public, anon, authenticated;

commit;
