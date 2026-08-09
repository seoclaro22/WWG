-- Añade el pueblo/localidad exacta de cada club, separado de `zone` (que sigue
-- siendo el hub de ciudad que agrupa /mallorca, /madrid, /valencia... y no se toca).
-- `town` solo se usa en el texto de titulo/H1 de la propia ficha, para que
-- coincida con lo que la gente busca de verdad (ej. "la santa benicasim").

alter table public.clubs add column if not exists town text;

update public.clubs set town = 'Benicàssim' where id = '10833c27-b40a-4070-8144-425de255fbd2'; -- LA SANTA
update public.clubs set town = 'Magaluf' where id = 'd565474b-004e-4485-a8b9-0221b56521b8'; -- PANAMA JACK MAGALUF
update public.clubs set town = 'Magaluf' where id = 'fcf46833-c369-4809-8cf9-6b3d6f3f5540'; -- BCM MALLORCA
update public.clubs set town = 'Madrid' where id = 'b19fbb19-abcc-44f3-a116-956db63dbc69'; -- RUBICON
update public.clubs set town = 'Madrid' where id = '4929f4ba-914e-44ea-a723-fd06efe9fd6e'; -- TERRAZA KARAU
update public.clubs set town = 'Madrid' where id = '45d59e89-4aec-4ab0-9b3a-68e16ad89972'; -- CALLE 365
update public.clubs set town = 'Madrid' where id = 'f63827b6-6e44-48eb-b08f-41258518abeb'; -- PERRO NEGRO MADRID
update public.clubs set town = 'Madrid' where id = '3305cfc1-d1ce-4c22-bb6e-4043da6c370d'; -- NAZCA CLUB
update public.clubs set town = 'Madrid' where id = '4909777b-ee08-4432-9095-d606cb203ac3'; -- SHÔKO MADRID
update public.clubs set town = 'Madrid' where id = 'd2b3af52-0582-4b7d-b4b2-c60200c30db7'; -- GUNILLA CLUB
update public.clubs set town = 'Madrid' where id = '25e0a5bd-eb51-4f96-9368-098879681388'; -- TODOS SANTOS
update public.clubs set town = 'Madrid' where id = 'a8304cd8-d56d-427c-aa8e-0c9ef1c057b4'; -- SALA DE DESPECHO
update public.clubs set town = 'Madrid' where id = '0b5c5300-1c55-4c15-9e48-26d2e2c8c21e'; -- TEATRO MAGNO
update public.clubs set town = 'Palma' where id = '0a5352d4-b759-4cbe-a6dd-4068283401e1'; -- LUNITA
update public.clubs set town = 'Palma' where id = '1c896311-46aa-4522-854e-663e3076eae2'; -- ZAR SOCIETY
update public.clubs set town = 'Palma' where id = '5990cd38-b0ab-4b60-bbc0-f667f49ee989'; -- BOOMERANG
update public.clubs set town = 'Palma' where id = 'b019a390-1071-4325-94c8-6e4369b3bbd0'; -- FITZ MALLORCA
update public.clubs set town = 'S''Arenal' where id = '2668ca3a-25fa-46d6-99d1-ec7a684ce276'; -- KOYA CLUB
update public.clubs set town = 'Calvià' where id = 'e53982bc-cc25-447b-9c7b-4558df5cbb70'; -- ES BOSQ (RECINTO MALLORCA LIVE)
update public.clubs set town = 'Palma' where id = 'ff68cdce-fb11-43a6-9dae-d27ebf7e7578'; -- ENREDO CLUB
update public.clubs set town = 'Palma' where id = 'cf12eb76-83d5-4020-baa7-4e1e4834f5f1'; -- AMOK MALLORCA
update public.clubs set town = 'Palma' where id = '2498ad45-7e56-416e-adb2-ac67e0864b3b'; -- ESMOLI CLUB
update public.clubs set town = 'Palma' where id = 'e8043802-e1f0-43ba-b8e5-1d53ac5b772a'; -- WAVE CLUB
update public.clubs set town = 'Palma' where id = '3cefc1be-64e3-49e5-bc75-3db37ae48b60'; -- OVERCLUB
update public.clubs set town = 'Palma' where id = '14da2e9f-4be7-4805-907b-82e0689e51cd'; -- SELVA CLUB
update public.clubs set town = 'Palma' where id = '532dc552-3882-47ea-9b91-8feb68225d12'; -- BLVD MARITIMO CLUB
update public.clubs set town = 'Platja de la Pobla de Farnals' where id = '9ee4eb74-41ed-4b05-bc4a-e714796d1dcd'; -- Calablava Beach Club
update public.clubs set town = 'València' where id = 'eef57811-868d-4be0-a8d5-81854b90940c'; -- Tulum
update public.clubs set town = 'València' where id = 'e8e74492-f837-429e-97b0-044156da4884'; -- Brokers
update public.clubs set town = 'Barcelona' where id = '3a36da9b-f4d6-42c0-ac87-3ce92741e9f5'; -- SUTTON BARCELONA
update public.clubs set town = 'Amsterdam' where id = '05dcb1dc-b38b-4399-a1b9-4cd685395c7f'; -- PANAMA
