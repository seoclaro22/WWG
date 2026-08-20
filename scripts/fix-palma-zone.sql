-- Los 4 clubs de la expansion se cargaron con zone='Palma' en vez de
-- zone='Mallorca' + town='Palma', que es la convencion real (ver Amok
-- Mallorca, Boomerang, etc: zone='Mallorca', town='Palma'). Con zone='Palma'
-- suelto quedaban fuera de la zona real de Mallorca, como una ciudad
-- independiente inexistente.
-- Ejecutar en el SQL Editor de Supabase.

update public.clubs set zone = 'Mallorca', town = 'Palma'
where id in (
  'bd7ef6b6-eaa6-45cf-b9ce-bfe767708138', -- Abraxas Palma
  '3d1d0337-27f1-49d4-81e3-6c6c1b688582', -- Castro's Palma
  'fc2e7c07-ed0b-4b29-806d-ded643028ce0', -- Garito Café
  '8aa2122b-a2ab-4441-b497-a0d7f8d50cbb'  -- Tito's Palma
);
