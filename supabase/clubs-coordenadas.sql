-- Coordenadas de los 31 clubs.
--
-- Las 19 que Nominatim resolvio a nivel de edificio desde la direccion se
-- dejan como estaban: contrastadas con Google Maps, la diferencia es de 10 a
-- 20 metros. Las otras 12 caian en el eje de la calle o no aparecian, y se
-- tomaron de la ficha del local en Google Maps.
--
-- Se filtra por id y no por nombre porque hay nombres con acento.
--
-- lat y lon son columnas planas ademas de location, que es geography y
-- PostgREST devuelve como WKB hexadecimal, inservible desde el JSON-LD.
alter table public.clubs add column if not exists lat double precision;
alter table public.clubs add column if not exists lon double precision;

-- AMOK MALLORCA
update public.clubs set lat = 39.536064, lon = 2.7417394, location = ST_SetSRID(ST_MakePoint(2.7417394, 39.536064), 4326)::geography where id = 'cf12eb76-83d5-4020-baa7-4e1e4834f5f1';
-- BCM MALLORCA
update public.clubs set lat = 39.5094661, lon = 2.5331111, location = ST_SetSRID(ST_MakePoint(2.5331111, 39.5094661), 4326)::geography where id = 'fcf46833-c369-4809-8cf9-6b3d6f3f5540';
-- BLVD MARITIMO CLUB
update public.clubs set lat = 39.5645571, lon = 2.6272783, location = ST_SetSRID(ST_MakePoint(2.6272783, 39.5645571), 4326)::geography where id = '532dc552-3882-47ea-9b91-8feb68225d12';
-- BOOMERANG
update public.clubs set lat = 39.600229, lon = 2.6699082, location = ST_SetSRID(ST_MakePoint(2.6699082, 39.600229), 4326)::geography where id = '5990cd38-b0ab-4b60-bbc0-f667f49ee989';
-- Brokers
update public.clubs set lat = 39.4600165, lon = -0.3521316, location = ST_SetSRID(ST_MakePoint(-0.3521316, 39.4600165), 4326)::geography where id = 'e8e74492-f837-429e-97b0-044156da4884';
-- Calablava Beach Club
update public.clubs set lat = 39.5645736, lon = -0.2824399, location = ST_SetSRID(ST_MakePoint(-0.2824399, 39.5645736), 4326)::geography where id = '9ee4eb74-41ed-4b05-bc4a-e714796d1dcd';
-- CALLE 365
update public.clubs set lat = 40.4151775, lon = -3.6996408, location = ST_SetSRID(ST_MakePoint(-3.6996408, 40.4151775), 4326)::geography where id = '45d59e89-4aec-4ab0-9b3a-68e16ad89972';
-- ENREDO CLUB
update public.clubs set lat = 39.5526188, lon = 2.6234814, location = ST_SetSRID(ST_MakePoint(2.6234814, 39.5526188), 4326)::geography where id = 'ff68cdce-fb11-43a6-9dae-d27ebf7e7578';
-- ES BOSQ (RECINTO MALLORCA LIVE)
update public.clubs set lat = 39.5067535, lon = 2.5208319, location = ST_SetSRID(ST_MakePoint(2.5208319, 39.5067535), 4326)::geography where id = 'e53982bc-cc25-447b-9c7b-4558df5cbb70';
-- ESMOLI CLUB
update public.clubs set lat = 39.5742817, lon = 2.639011, location = ST_SetSRID(ST_MakePoint(2.639011, 39.5742817), 4326)::geography where id = '2498ad45-7e56-416e-adb2-ac67e0864b3b';
-- FITZ MALLORCA
update public.clubs set lat = 39.5628851, lon = 2.6268571, location = ST_SetSRID(ST_MakePoint(2.6268571, 39.5628851), 4326)::geography where id = 'b019a390-1071-4325-94c8-6e4369b3bbd0';
-- GUNILLA CLUB
update public.clubs set lat = 40.4225632, lon = -3.6909002, location = ST_SetSRID(ST_MakePoint(-3.6909002, 40.4225632), 4326)::geography where id = 'd2b3af52-0582-4b7d-b4b2-c60200c30db7';
-- KOYA CLUB
update public.clubs set lat = 39.5084166, lon = 2.7505296, location = ST_SetSRID(ST_MakePoint(2.7505296, 39.5084166), 4326)::geography where id = '2668ca3a-25fa-46d6-99d1-ec7a684ce276';
-- LA SANTA
update public.clubs set lat = 40.048428, lon = 0.0525586, location = ST_SetSRID(ST_MakePoint(0.0525586, 40.048428), 4326)::geography where id = '10833c27-b40a-4070-8144-425de255fbd2';
-- LUNITA
update public.clubs set lat = 39.5406942, lon = 2.7121976, location = ST_SetSRID(ST_MakePoint(2.7121976, 39.5406942), 4326)::geography where id = '0a5352d4-b759-4cbe-a6dd-4068283401e1';
-- NAZCA CLUB
update public.clubs set lat = 40.4513836, lon = -3.6944566, location = ST_SetSRID(ST_MakePoint(-3.6944566, 40.4513836), 4326)::geography where id = '3305cfc1-d1ce-4c22-bb6e-4043da6c370d';
-- OVERCLUB
update public.clubs set lat = 39.6034088, lon = 2.6565335, location = ST_SetSRID(ST_MakePoint(2.6565335, 39.6034088), 4326)::geography where id = '3cefc1be-64e3-49e5-bc75-3db37ae48b60';
-- PANAMA
update public.clubs set lat = 52.3749358, lon = 4.9304264, location = ST_SetSRID(ST_MakePoint(4.9304264, 52.3749358), 4326)::geography where id = '05dcb1dc-b38b-4399-a1b9-4cd685395c7f';
-- PANAMA JACK MAGALUF
update public.clubs set lat = 39.5095954, lon = 2.5324442, location = ST_SetSRID(ST_MakePoint(2.5324442, 39.5095954), 4326)::geography where id = 'd565474b-004e-4485-a8b9-0221b56521b8';
-- PERRO NEGRO MADRID
update public.clubs set lat = 40.4290007, lon = -3.682953, location = ST_SetSRID(ST_MakePoint(-3.682953, 40.4290007), 4326)::geography where id = 'f63827b6-6e44-48eb-b08f-41258518abeb';
-- RUBICON
update public.clubs set lat = 40.4225137, lon = -3.689844, location = ST_SetSRID(ST_MakePoint(-3.689844, 40.4225137), 4326)::geography where id = 'b19fbb19-abcc-44f3-a116-956db63dbc69';
-- SALA DE DESPECHO
update public.clubs set lat = 40.4228377, lon = -3.6909403, location = ST_SetSRID(ST_MakePoint(-3.6909403, 40.4228377), 4326)::geography where id = 'a8304cd8-d56d-427c-aa8e-0c9ef1c057b4';
-- SELVA CLUB
update public.clubs set lat = 39.6066886, lon = 2.6712565, location = ST_SetSRID(ST_MakePoint(2.6712565, 39.6066886), 4326)::geography where id = '14da2e9f-4be7-4805-907b-82e0689e51cd';
-- SHÔKO MADRID
update public.clubs set lat = 40.4088216, lon = -3.7108619, location = ST_SetSRID(ST_MakePoint(-3.7108619, 40.4088216), 4326)::geography where id = '4909777b-ee08-4432-9095-d606cb203ac3';
-- SUTTON BARCELONA
update public.clubs set lat = 41.3959745, lon = 2.1517322, location = ST_SetSRID(ST_MakePoint(2.1517322, 41.3959745), 4326)::geography where id = '3a36da9b-f4d6-42c0-ac87-3ce92741e9f5';
-- TEATRO MAGNO
update public.clubs set lat = 40.4172928, lon = -3.6983671, location = ST_SetSRID(ST_MakePoint(-3.6983671, 40.4172928), 4326)::geography where id = '0b5c5300-1c55-4c15-9e48-26d2e2c8c21e';
-- TERRAZA KARAU
update public.clubs set lat = 40.4202504, lon = -3.6919982, location = ST_SetSRID(ST_MakePoint(-3.6919982, 40.4202504), 4326)::geography where id = '4929f4ba-914e-44ea-a723-fd06efe9fd6e';
-- TODOS SANTOS
update public.clubs set lat = 40.425343, lon = -3.6917581, location = ST_SetSRID(ST_MakePoint(-3.6917581, 40.425343), 4326)::geography where id = '25e0a5bd-eb51-4f96-9368-098879681388';
-- Tulum
update public.clubs set lat = 39.495889, lon = -0.400966, location = ST_SetSRID(ST_MakePoint(-0.400966, 39.495889), 4326)::geography where id = 'eef57811-868d-4be0-a8d5-81854b90940c';
-- WAVE CLUB
update public.clubs set lat = 39.5968457, lon = 2.6311197, location = ST_SetSRID(ST_MakePoint(2.6311197, 39.5968457), 4326)::geography where id = 'e8043802-e1f0-43ba-b8e5-1d53ac5b772a';
-- ZAR SOCIETY
update public.clubs set lat = 39.5642561, lon = 2.6277313, location = ST_SetSRID(ST_MakePoint(2.6277313, 39.5642561), 4326)::geography where id = '1c896311-46aa-4522-854e-663e3076eae2';
