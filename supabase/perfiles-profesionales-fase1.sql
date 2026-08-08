-- Perfiles profesionales (DJs y clubs) — Fase 1: cimientos
--
-- Crea lo que necesita el flujo reclamar -> verificar -> gestionar, sin tocar
-- nada de lo que ya funciona: usuarios, favoritos, follows y eventos siguen
-- exactamente igual. La verificacion es un campo mas en djs/clubs, no una
-- tabla paralela ni una URL nueva, para no romper el SEO ya indexado.
--
-- Decisiones tomadas con el propietario:
--   - Los avisos van por email, no por bandeja in-app (esa llega mas tarde).
--   - La identidad se comprueba con el Instagram oficial y revision manual;
--     no se almacenan documentos personales.
--
-- APLICADO el 2026-08-08 sobre produccion. Comprobado despues: la clave
-- publica no puede insertar solicitudes (RLS, 42501) ni llamar a
-- approve_profile_claim (permission denied), y favoritos sigue funcionando.

begin;

-- ---------------------------------------------------------------------------
-- 1. Campos de verificacion en los perfiles
-- ---------------------------------------------------------------------------
-- claimed_by apunta al usuario que gestiona la ficha. Es la fuente de verdad
-- del permiso de edicion: sin este campo, un profesional no puede tocar nada.

alter table public.djs
  add column if not exists verified    boolean default false,
  add column if not exists verified_at timestamptz,
  add column if not exists claimed_by  uuid references public.users(id) on delete set null;

alter table public.clubs
  add column if not exists verified    boolean default false,
  add column if not exists verified_at timestamptz,
  add column if not exists claimed_by  uuid references public.users(id) on delete set null;

create index if not exists djs_claimed_by_idx   on public.djs(claimed_by)   where claimed_by is not null;
create index if not exists clubs_claimed_by_idx on public.clubs(claimed_by) where claimed_by is not null;

-- ---------------------------------------------------------------------------
-- 2. Los DJs tambien se pueden marcar como favoritos
-- ---------------------------------------------------------------------------
-- favorites solo aceptaba 'event' y 'club'. El panel profesional tiene que
-- poder enseñar cuanta gente te ha guardado, asi que 'dj' entra en el check.
-- follows ya aceptaba 'dj', no se toca.

alter table public.favorites drop constraint if exists favorites_target_type_check;
alter table public.favorites
  add constraint favorites_target_type_check
  check (target_type in ('event', 'club', 'dj'));

-- ---------------------------------------------------------------------------
-- 3. Solicitudes de reclamacion
-- ---------------------------------------------------------------------------

create table if not exists public.profile_claims (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('dj', 'club')),
  target_id   uuid not null,
  user_id     uuid references public.users(id) on delete set null,

  -- Lo que rellena el solicitante. instagram es obligatorio: es la prueba de
  -- identidad que se acordo, asi que sin el no hay nada que verificar.
  full_name    text not null,
  email        text not null,
  phone        text,
  instagram    text not null,
  website      text,
  relationship text not null,
  reason       text,
  extra_info   text,

  -- Rastro de seguridad. No se expone nunca en publico (ver RLS mas abajo).
  ip         inet,
  user_agent text,

  status text not null default 'pending'
    check (status in ('pending', 'reviewing', 'approved', 'rejected', 'more_information_required')),
  admin_notes text,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profile_claims_target_idx on public.profile_claims(target_type, target_id);
create index if not exists profile_claims_status_idx on public.profile_claims(status, created_at desc);
create index if not exists profile_claims_user_idx   on public.profile_claims(user_id);

-- Proteccion contra reclamaciones duplicadas (punto 17 del encargo).
-- Un mismo usuario no puede tener dos solicitudes vivas sobre la misma ficha.
create unique index if not exists profile_claims_una_viva_por_usuario
  on public.profile_claims(target_type, target_id, user_id)
  where status in ('pending', 'reviewing', 'more_information_required');

-- Y una ficha no puede acabar aprobada para dos personas a la vez. Esta es la
-- que de verdad impide que dos usuarios gestionen el mismo perfil.
create unique index if not exists profile_claims_una_aprobada_por_ficha
  on public.profile_claims(target_type, target_id)
  where status = 'approved';

-- ---------------------------------------------------------------------------
-- 4. Cambios sujetos a revision + historial
-- ---------------------------------------------------------------------------
-- Una sola tabla sirve para las dos cosas del encargo (puntos 8 y 9): mientras
-- esta 'pending' es una peticion de cambio; una vez resuelta es el historial,
-- con el valor anterior guardado para poder revertir.

create table if not exists public.profile_changes (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('dj', 'club')),
  target_id   uuid not null,

  field     text not null,
  old_value jsonb,
  new_value jsonb,

  -- 'direct' queda registrado igual aunque no pase por revision: el historial
  -- tiene que reflejar todo lo que cambio, no solo lo que se aprobo.
  kind text not null default 'review' check (kind in ('direct', 'review')),

  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'applied', 'reverted')),

  requested_by uuid references public.users(id) on delete set null,
  reviewed_by  uuid references public.users(id) on delete set null,
  reviewed_at  timestamptz,
  admin_notes  text,

  created_at timestamptz not null default now()
);

create index if not exists profile_changes_target_idx on public.profile_changes(target_type, target_id, created_at desc);
create index if not exists profile_changes_status_idx on public.profile_changes(status, created_at desc);

-- ---------------------------------------------------------------------------
-- 5. updated_at automatico en las solicitudes
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profile_claims_touch on public.profile_claims;
create trigger profile_claims_touch
  before update on public.profile_claims
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 6. RLS
-- ---------------------------------------------------------------------------
-- Criterio: el solicitante ve solo lo suyo y no puede cambiar el estado de su
-- propia solicitud (si no, cualquiera se auto-aprobaria). Aprobar y rechazar
-- pasan por la funcion del punto 7, que corre con privilegios del propietario.

alter table public.profile_claims  enable row level security;
alter table public.profile_changes enable row level security;

drop policy if exists profile_claims_insert_propio on public.profile_claims;
create policy profile_claims_insert_propio on public.profile_claims
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists profile_claims_select_propio on public.profile_claims;
create policy profile_claims_select_propio on public.profile_claims
  for select to authenticated
  using (user_id = auth.uid());

-- Los datos del solicitante (email, telefono, IP) no son publicos: no hay
-- ninguna politica de select para anon, asi que la clave publica no los ve.

-- El panel de administracion lee con el token del moderador, asi que necesita
-- su propia politica: sin esto la tabla de solicitudes sale vacia. Se reutiliza
-- is_moderator, el helper que ya usan clubs y events.
drop policy if exists profile_claims_select_moderator on public.profile_claims;
create policy profile_claims_select_moderator on public.profile_claims
  for select to authenticated
  using (public.is_moderator(auth.uid()));

-- Cambiar a 'reviewing' o pedir mas informacion son updates normales del
-- panel. Aprobar y rechazar NO: esos van por la funcion del punto 7, porque
-- arrastran cambios en otras tablas.
drop policy if exists profile_claims_update_moderator on public.profile_claims;
create policy profile_claims_update_moderator on public.profile_claims
  for update to authenticated
  using (public.is_moderator(auth.uid()))
  with check (public.is_moderator(auth.uid()));

drop policy if exists profile_changes_select_propio on public.profile_changes;
create policy profile_changes_select_propio on public.profile_changes
  for select to authenticated
  using (requested_by = auth.uid());

drop policy if exists profile_changes_moderator on public.profile_changes;
create policy profile_changes_moderator on public.profile_changes
  for all to authenticated
  using (public.is_moderator(auth.uid()))
  with check (public.is_moderator(auth.uid()));

-- ---------------------------------------------------------------------------
-- 7. Aprobar una reclamacion
-- ---------------------------------------------------------------------------
-- Va en una funcion y no en un update suelto desde el panel porque aprobar son
-- cuatro escrituras que tienen que pasar juntas o ninguna: marcar la solicitud,
-- vincular la ficha, dar el rol y cerrar las demas solicitudes de esa ficha.
--
-- SECURITY DEFINER con comprobacion de rol dentro: quien la llama tiene que ser
-- admin o moderator, se mire desde donde se mire.

create or replace function public.approve_profile_claim(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim  public.profile_claims;
  v_rol    text;
begin
  if not public.is_moderator(auth.uid()) then
    raise exception 'no autorizado';
  end if;

  select * into v_claim from public.profile_claims where id = p_claim_id for update;
  if not found then
    raise exception 'solicitud no encontrada';
  end if;
  if v_claim.status = 'approved' then
    return; -- ya estaba aprobada, no se repite el trabajo
  end if;
  if v_claim.user_id is null then
    raise exception 'la solicitud no tiene usuario asociado';
  end if;

  update public.profile_claims
     set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_claim_id;

  if v_claim.target_type = 'dj' then
    update public.djs
       set verified = true, verified_at = now(), claimed_by = v_claim.user_id
     where id = v_claim.target_id;
    v_rol := 'dj';
  else
    update public.clubs
       set verified = true, verified_at = now(), claimed_by = v_claim.user_id
     where id = v_claim.target_id;
    v_rol := 'club';
  end if;

  -- El rol se añade, no se sustituye: un profesional sigue siendo usuario y
  -- conserva sus favoritos, follows y notificaciones.
  update public.users
     set roles = array(select distinct unnest(coalesce(roles, '{user}') || array[v_rol]))
   where id = v_claim.user_id;

  -- Las demas solicitudes vivas sobre esa misma ficha dejan de tener sentido.
  update public.profile_claims
     set status = 'rejected',
         admin_notes = coalesce(admin_notes || ' | ', '') || 'Cerrada: la ficha fue asignada a otro solicitante.',
         reviewed_by = auth.uid(), reviewed_at = now()
   where target_type = v_claim.target_type
     and target_id = v_claim.target_id
     and id <> p_claim_id
     and status in ('pending', 'reviewing', 'more_information_required');
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Revocar una verificacion (punto 17)
-- ---------------------------------------------------------------------------

create or replace function public.revoke_profile_claim(p_target_type text, p_target_id uuid, p_motivo text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator(auth.uid()) then
    raise exception 'no autorizado';
  end if;

  if p_target_type = 'dj' then
    update public.djs   set verified = false, verified_at = null, claimed_by = null where id = p_target_id;
  else
    update public.clubs set verified = false, verified_at = null, claimed_by = null where id = p_target_id;
  end if;

  -- El rol no se quita aqui: el usuario puede gestionar otra ficha. Se revisa
  -- en el panel si hay que retirarselo.
  update public.profile_claims
     set status = 'rejected',
         admin_notes = coalesce(admin_notes || ' | ', '') || coalesce(p_motivo, 'Verificacion revocada.'),
         reviewed_by = auth.uid(), reviewed_at = now()
   where target_type = p_target_type and target_id = p_target_id and status = 'approved';
end;
$$;

revoke all on function public.approve_profile_claim(uuid) from public, anon;
revoke all on function public.revoke_profile_claim(text, uuid, text) from public, anon;
grant execute on function public.approve_profile_claim(uuid) to authenticated;
grant execute on function public.revoke_profile_claim(text, uuid, text) to authenticated;

commit;
