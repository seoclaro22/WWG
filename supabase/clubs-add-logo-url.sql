-- La columna esta declarada en schema.sql pero nunca se aplico en produccion:
-- las consultas de clubs usan select('*'), asi que no fallaban, simplemente
-- club.logo_url llegaba siempre como undefined y el campo de logo del admin
-- no guardaba nada.
alter table public.clubs add column if not exists logo_url text;
