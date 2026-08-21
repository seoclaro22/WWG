-- Añade el telefono de contacto del club. Se muestra en la ficha (boton de
-- llamada junto a "Como llegar") y se declara en el schema.org NightClub
-- como telephone, solo cuando existe: nunca se inventa un numero.
alter table public.clubs add column if not exists phone text;
