-- Corrige dos nombres rotos por doble codificacion y fusiona 4 DJs duplicados.
--
-- Los duplicados no son inofensivos: cada ficha extra parte los eventos, los
-- enlaces y el trafico del mismo artista entre varias URLs. Se conserva
-- siempre la ficha con mas datos, no la de nombre mas bonito, y antes de
-- borrar nada se copian a la superviviente la imagen y la bio que solo tenia
-- la otra.
--
-- Ejecutar entero de una vez: va en una transaccion, o entra todo o no entra
-- nada.
--
-- APLICADO el 2026-08-07 sobre produccion. Resultado verificado: 392 -> 387
-- fichas de DJ, 0 duplicados y 0 nombres corruptos. Los cuatro artistas
-- conservan imagen y quedan con 2, 2, 4 y 3 eventos. Se guarda como registro
-- del cambio; no hace falta volver a ejecutarlo (los ids ya no existen).

begin;

-- ---------------------------------------------------------------------------
-- 1. Nombres corruptos
-- ---------------------------------------------------------------------------
-- 'TERRAZA KARÃU' y 'DÂNNY FERNANDEZ' guardan el rastro de una letra que se
-- perdio al importar. La letra original no se puede recuperar: se reescribe
-- el nombre a mano.

update clubs
   set name = 'TERRAZA KARAU'
 where id = '4929f4ba-914e-44ea-a723-fd06efe9fd6e';

-- ---------------------------------------------------------------------------
-- 2. DANNY FERNANDEZ: 3 fichas -> 1
-- ---------------------------------------------------------------------------
-- Superviviente: 6b3bee05 ('DANNY FERNÁNDEZ'), la que pediste conservar.
-- Pero la imagen y la bio mas larga estaban en la ficha rota (ab751ae5), asi
-- que se copian antes de borrarla; si no, el merge perderia datos.

update djs d
   set images    = coalesce(nullif(d.images, '[]'::jsonb), o.images),
       bio       = case when length(coalesce(d.bio, '')) < length(coalesce(o.bio, ''))
                        then o.bio else d.bio end,
       short_bio = coalesce(nullif(d.short_bio, ''), o.short_bio)
  from djs o
 where d.id = '6b3bee05-034b-4949-91df-9fd239aed8ef'
   and o.id = 'ab751ae5-a293-4222-a48b-59fa5e27ad1e';

-- Los eventos de las fichas que se van pasan a la superviviente. El NOT EXISTS
-- evita crear un vinculo duplicado si el evento ya estaba en las dos.
update event_djs e
   set dj_id = '6b3bee05-034b-4949-91df-9fd239aed8ef'
 where e.dj_id in ('ab751ae5-a293-4222-a48b-59fa5e27ad1e',
                   'f05347ff-bc11-4b39-9446-3fbdfe266d27')
   and not exists (
     select 1 from event_djs x
      where x.event_id = e.event_id
        and x.dj_id = '6b3bee05-034b-4949-91df-9fd239aed8ef');

-- Los que si colisionaban ya estan cubiertos por la superviviente: se borran.
delete from event_djs
 where dj_id in ('ab751ae5-a293-4222-a48b-59fa5e27ad1e',
                 'f05347ff-bc11-4b39-9446-3fbdfe266d27');

delete from djs
 where id in ('ab751ae5-a293-4222-a48b-59fa5e27ad1e',
              'f05347ff-bc11-4b39-9446-3fbdfe266d27');

-- ---------------------------------------------------------------------------
-- 3. CARLOS SIMON: 2 fichas -> 1
-- ---------------------------------------------------------------------------
-- Superviviente: 5f6d5530, que tiene imagen y la bio mas larga. Se le pone la
-- tilde, que es como se escribe el nombre.

update djs set name = 'CARLOS SIMÓN'
 where id = '5f6d5530-ee51-4020-8911-7f2e71bbcb22';

update event_djs e
   set dj_id = '5f6d5530-ee51-4020-8911-7f2e71bbcb22'
 where e.dj_id = 'b4d0ea84-189a-4cd8-a638-d4a9b6b9ea76'
   and not exists (
     select 1 from event_djs x
      where x.event_id = e.event_id
        and x.dj_id = '5f6d5530-ee51-4020-8911-7f2e71bbcb22');

delete from event_djs where dj_id = 'b4d0ea84-189a-4cd8-a638-d4a9b6b9ea76';
delete from djs       where id    = 'b4d0ea84-189a-4cd8-a638-d4a9b6b9ea76';

-- ---------------------------------------------------------------------------
-- 4. IVAN RF: 2 fichas -> 1
-- ---------------------------------------------------------------------------
-- Superviviente: 3a5003c9 ('IVÁN RF'), con 4 eventos, imagen y bio. La otra
-- esta completamente vacia: sin generos, sin bio, sin eventos.

update event_djs e
   set dj_id = '3a5003c9-712a-4177-bf77-ae2a72cff09b'
 where e.dj_id = '01183b72-2496-44bd-a804-c4e178e95811'
   and not exists (
     select 1 from event_djs x
      where x.event_id = e.event_id
        and x.dj_id = '3a5003c9-712a-4177-bf77-ae2a72cff09b');

delete from event_djs where dj_id = '01183b72-2496-44bd-a804-c4e178e95811';
delete from djs       where id    = '01183b72-2496-44bd-a804-c4e178e95811';

-- ---------------------------------------------------------------------------
-- 5. URI B: 2 fichas -> 1
-- ---------------------------------------------------------------------------
-- Superviviente: d780c28d ('URI B'), con 2 eventos. La imagen solo la tenia
-- 'URI-B', asi que se copia antes de borrarla.

update djs d
   set images = coalesce(nullif(d.images, '[]'::jsonb), o.images)
  from djs o
 where d.id = 'd780c28d-79de-49de-91e9-bfeb3ffbdf64'
   and o.id = '5de3393c-855c-4e87-9bad-15cb7f4ceb35';

update event_djs e
   set dj_id = 'd780c28d-79de-49de-91e9-bfeb3ffbdf64'
 where e.dj_id = '5de3393c-855c-4e87-9bad-15cb7f4ceb35'
   and not exists (
     select 1 from event_djs x
      where x.event_id = e.event_id
        and x.dj_id = 'd780c28d-79de-49de-91e9-bfeb3ffbdf64');

delete from event_djs where dj_id = '5de3393c-855c-4e87-9bad-15cb7f4ceb35';
delete from djs       where id    = '5de3393c-855c-4e87-9bad-15cb7f4ceb35';

commit;

-- Comprobacion: deberia devolver 4 filas, una por artista, sin duplicados.
select id, name, jsonb_array_length(coalesce(images, '[]'::jsonb)) as imgs,
       (select count(*) from event_djs e where e.dj_id = d.id) as eventos
  from djs d
 where id in ('6b3bee05-034b-4949-91df-9fd239aed8ef',
              '5f6d5530-ee51-4020-8911-7f2e71bbcb22',
              '3a5003c9-712a-4177-bf77-ae2a72cff09b',
              'd780c28d-79de-49de-91e9-bfeb3ffbdf64')
 order by name;
