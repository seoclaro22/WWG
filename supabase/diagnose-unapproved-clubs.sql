-- Diagnostico: eventos publicados cuyo club aparece en events_public
-- (porque el join no filtra por status) pero cuya ficha real esta
-- pending o rejected, y por tanto /club/<id> da 404 al publico.
--
-- Solo lectura. Pegar en el SQL Editor de Supabase y ejecutar.

-- 1) Resumen: cuantos eventos activos estan en esta situacion, agrupados
--    por el estado real del club.
select
  c.status as club_status,
  count(*) as eventos_afectados,
  count(distinct c.id) as clubs_afectados
from public.events e
join public.clubs c on c.id = e.club_id
where e.status = 'published'
  and e.start_at >= now()
  and c.status <> 'approved'
group by c.status;

-- 2) Detalle: que club es cada uno, para poder revisarlos uno a uno antes
--    de aprobar en bloque.
select
  c.id as club_id,
  c.name as club_name,
  c.status as club_status,
  c.created_at as club_created_at,
  count(e.id) as eventos_activos
from public.events e
join public.clubs c on c.id = e.club_id
where e.status = 'published'
  and e.start_at >= now()
  and c.status <> 'approved'
group by c.id, c.name, c.status, c.created_at
order by eventos_activos desc;
