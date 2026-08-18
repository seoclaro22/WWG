-- Horarios de apertura de los clubs, columna clubs.open_hours (jsonb).
--
-- Formato consumido por apps/web/lib/opening-hours.ts: dia -> franja o
-- franjas, "HH:MM-HH:MM". Una franja que cruza medianoche se declara tal
-- cual en el dia en que empieza (ej. "vie": "23:30-06:00"), no partida en
-- dos dias como la muestra la ficha de Google.
--
-- Fuente: paginas oficiales de cada club y cruce de varias fuentes
-- independientes (Fourvenues, discomadrid, fiestashoy, etc.), no lectura
-- directa de Google Maps porque el consentimiento de cookies bloqueo el
-- scraping en esta sesion. Recomendado que el dueño de cada ficha lo
-- confirme una vez publicado.
--
-- 17 con horario confirmado por fuente oficial o coincidente entre varias
-- fuentes independientes. 3 marcados NIVEL MEDIO: el dato sale de una sola
-- fuente parcial o de una reconstruccion de un horario partido por
-- medianoche - revisar antes de dar por bueno.
--
-- Se filtra por id y no por nombre por el mismo motivo que en
-- clubs-coordenadas.sql: hay nombres con acento.

-- BCM MALLORCA (temporada abr-oct; resto del año, cerrado)
update public.clubs set open_hours = '{"lun":"22:00-05:00","mar":"22:00-05:00","mie":"22:00-05:00","jue":"22:00-05:00","vie":"22:00-05:00","sab":"22:00-05:00","dom":"22:00-05:00"}'::jsonb where id = 'fcf46833-c369-4809-8cf9-6b3d6f3f5540';

-- CALLE 365 (Madrid)
update public.clubs set open_hours = '{"lun":"18:00-03:00","mar":"18:00-03:00","mie":"18:00-03:00","jue":"18:00-03:00","vie":"18:00-03:30","sab":"18:00-03:30","dom":"18:00-03:00"}'::jsonb where id = '45d59e89-4aec-4ab0-9b3a-68e16ad89972';

-- ESMOLI CLUB (Mallorca)
update public.clubs set open_hours = '{"jue":"23:00-05:00","vie":"23:00-05:00","sab":"23:00-05:00","dom":"23:00-05:00"}'::jsonb where id = '2498ad45-7e56-416e-adb2-ac67e0864b3b';

-- FITZ MALLORCA
update public.clubs set open_hours = '{"lun":"20:00-08:00","mar":"20:00-08:00","mie":"20:00-08:00","jue":"20:00-08:00","vie":"20:00-08:00","sab":"20:00-08:00","dom":"20:00-08:00"}'::jsonb where id = 'b019a390-1071-4325-94c8-6e4369b3bbd0';

-- LA SANTA (Benicàssim)
update public.clubs set open_hours = '{"mar":"00:00-07:00","vie":"00:00-07:00","sab":"00:00-07:00","dom":"00:00-07:00"}'::jsonb where id = '10833c27-b40a-4070-8144-425de255fbd2';

-- NAZCA CLUB (Madrid)
update public.clubs set open_hours = '{"jue":"00:00-05:30","vie":"00:00-06:00","sab":"00:00-06:00"}'::jsonb where id = '3305cfc1-d1ce-4c22-bb6e-4043da6c370d';

-- OVERCLUB (Mallorca)
update public.clubs set open_hours = '{"vie":"23:00-06:00","sab":"23:00-06:00","dom":"00:00-06:00"}'::jsonb where id = '3cefc1be-64e3-49e5-bc75-3db37ae48b60';

-- PANAMA JACK (Magaluf)
update public.clubs set open_hours = '{"lun":"22:00-06:00","mar":"22:00-06:00","mie":"22:00-06:00","jue":"22:00-06:00","vie":"22:00-06:00","sab":"22:00-06:00","dom":"22:00-06:00"}'::jsonb where id = 'd565474b-004e-4485-a8b9-0221b56521b8';

-- RUBICON (Madrid)
update public.clubs set open_hours = '{"mie":"00:00-05:30","jue":"00:00-05:30","vie":"00:00-06:00","sab":"00:00-06:00"}'::jsonb where id = 'b19fbb19-abcc-44f3-a116-956db63dbc69';

-- SHOKO MADRID
update public.clubs set open_hours = '{"jue":"00:00-05:30","vie":"00:00-06:00","sab":"00:00-06:00","dom":"00:00-05:30"}'::jsonb where id = '4909777b-ee08-4432-9095-d606cb203ac3';

-- SUTTON BARCELONA
update public.clubs set open_hours = '{"mie":"00:00-05:00","jue":"00:00-05:00","vie":"00:00-06:00","sab":"00:00-06:00"}'::jsonb where id = '3a36da9b-f4d6-42c0-ac87-3ce92741e9f5';

-- TEATRO MAGNO (Madrid)
update public.clubs set open_hours = '{"jue":"00:00-06:00","vie":"00:00-06:00","sab":"00:00-06:00"}'::jsonb where id = '0b5c5300-1c55-4c15-9e48-26d2e2c8c21e';

-- TERRAZA KARAU (Madrid)
update public.clubs set open_hours = '{"mie":"17:00-01:00","jue":"17:00-01:00","vie":"17:00-01:00","sab":"17:00-01:00","dom":"17:00-01:00"}'::jsonb where id = '4929f4ba-914e-44ea-a723-fd06efe9fd6e';

-- TULUM (Valencia)
update public.clubs set open_hours = '{"jue":"00:00-07:00","vie":"00:00-07:00","sab":["18:00-23:00","00:00-07:00"],"dom":"17:45-23:00"}'::jsonb where id = 'eef57811-868d-4be0-a8d5-81854b90940c';

-- ZAR SOCIETY (Mallorca)
update public.clubs set open_hours = '{"vie":"23:30-06:00","sab":"23:30-06:00","dom":"00:00-06:00"}'::jsonb where id = '1c896311-46aa-4522-854e-663e3076eae2';

-- GUNILLA CLUB (Madrid)
update public.clubs set open_hours = '{"mie":"00:00-06:00","jue":"00:00-06:00","vie":"00:00-06:00","sab":"00:00-06:00"}'::jsonb where id = 'd2b3af52-0582-4b7d-b4b2-c60200c30db7';

-- SALA DE DESPECHO (Madrid)
update public.clubs set open_hours = '{"jue":"21:00-06:00","vie":"21:00-06:00","sab":"21:00-06:00"}'::jsonb where id = 'a8304cd8-d56d-427c-aa8e-0c9ef1c057b4';

-- NIVEL MEDIO: fuente unica o parcial, sin confirmar con web oficial.

-- BLVD MARITIMO CLUB (temporada alta; fuera de temporada solo vie-sab)
update public.clubs set open_hours = '{"vie":"23:45-06:00","sab":"23:45-06:00"}'::jsonb where id = '532dc552-3882-47ea-9b91-8feb68225d12';

-- ENREDO CLUB (Mallorca)
update public.clubs set open_hours = '{"vie":"23:00-05:00","sab":"23:00-05:00"}'::jsonb where id = 'ff68cdce-fb11-43a6-9dae-d27ebf7e7578';

-- TODOS SANTOS (Madrid) - reconstruccion de un horario partido por
-- medianoche en la fuente original, no confirmado con web oficial.
update public.clubs set open_hours = '{"jue":"23:30-06:00","vie":"00:00-06:00","sab":"00:00-06:00"}'::jsonb where id = '25e0a5bd-eb51-4f96-9368-098879681388';

-- Pendientes sin dato localizable: KOYA CLUB, LUNITA, SELVA CLUB,
-- Calablava Beach Club, WAVE CLUB, PANAMA (Amsterdam), PERRO NEGRO
-- (Madrid), Brokers (Valencia).
--
-- Sin horario fijo por diseño (recintos de eventos): AMOK MALLORCA,
-- ES BOSQ (Recinto Mallorca Live).
