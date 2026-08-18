-- Valencia Clubs Import
-- Zone: Valencia
-- Status: approved (indexable)
-- Insert major Valencia clubs with SEO-friendly data

INSERT INTO clubs (name, slug, address, zone, description, genres, status, created_at, updated_at)
VALUES
  -- Malvarrosa / Beach clubs
  ('Akuarela Playa', 'akuarela-playa', 'Playa de la Malvarrosa, Valencia', 'Valencia', 'Club de playa con varias salas y vistas al mar. Referencia de los beach clubs de la Malvarrosa que combinan ambiente de día con discoteca de noche durante la temporada estival.', ARRAY['Electrónica', 'House', 'Reggaeton', 'Pop'], 'approved', NOW(), NOW()),
  ('Marina Beach Club', 'marina-beach-club', 'Puerto de Valencia, s/n, 46024 Valencia', 'Valencia', 'Club frente al puerto deportivo junto al edificio Veles e Vents. Discoteca de playa con terraza y vistas al agua. Referencia de la vida nocturna veraniega de Valencia.', ARRAY['Electrónica', 'House', 'Tech House', 'Pop'], 'approved', NOW(), NOW()),
  ('Motel Connect', 'motel-connect', 'Playa de la Malvarrosa, Valencia', 'Valencia', 'Chiringuito-discoteca de la Malvarrosa. Espacio abierto que combina el ambiente relajado de día con sesiones de DJ por las noches en verano.', ARRAY['Electrónica', 'House', 'Reggaeton', 'Latin'], 'approved', NOW(), NOW()),
  ('La Playa Club', 'la-playa-club', 'Playa de la Malvarrosa, Valencia', 'Valencia', 'Club de playa con oferta de música variada. Punto de encuentro para la fiesta estival en la zona de la playa.', ARRAY['Reggaeton', 'Pop', 'Electrónica', 'Latin'], 'approved', NOW(), NOW()),

  -- Ruzafa / Centro
  ('Únic', 'unic-valencia', 'Calle Ruzafa 53, 46005 Valencia', 'Valencia', 'Sala de referencia en pleno barrio del Carmen. Club versátil que acoge fiestas temáticas, conciertos y sesiones de DJ de variados géneros musicales.', ARRAY['Electrónica', 'House', 'Techno', 'Indie'], 'approved', NOW(), NOW()),
  ('Hänger', 'hanger-valencia', 'Calle de la Paz 56, 46003 Valencia', 'Valencia', 'Club en el barrio de Ruzafa con propuesta alternativa. Espacio dedicado a música electrónica y experimental.', ARRAY['Electrónica', 'Techno', 'House', 'Indie'], 'approved', NOW(), NOW()),
  ('Deseo', 'deseo-valencia', 'Calle Ruzafa, Valencia', 'Valencia', 'Club del barrio alternativo y multicultural de Ruzafa. Oferta de música variada con público joven e internacional.', ARRAY['Electrónica', 'House', 'Reggaeton', 'Indie'], 'approved', NOW(), NOW()),
  ('La Sala Club', 'la-sala-club-valencia', 'Calle Ruzafa, Valencia', 'Valencia', 'Espacio nocturno en Ruzafa para sesiones de DJ y eventos musicales. Ambiente flexible y público variado.', ARRAY['Electrónica', 'House', 'Pop', 'Indie'], 'approved', NOW(), NOW()),

  -- Barrio del Carmen / Centro Histórico
  ('Eslabón Valencia', 'eslabon-valencia', 'Calle Almudín, Valencia', 'Valencia', 'Sala de conciertos y club en el Carmen. Espacio dedicado a música en vivo, indie y propuestas alternativas.', ARRAY['Indie', 'Alternativa', 'Electrónica', 'Pop'], 'approved', NOW(), NOW()),
  ('Morgan', 'morgan-valencia', 'Calle del Turia 58, 46005 Valencia', 'Valencia', 'Bar de copas y club en la zona del Carmen. Ambiente festivo con música variada para disfrutar de la noche valenciana.', ARRAY['Pop', 'Reggaeton', 'Electrónica', 'Latin'], 'approved', NOW(), NOW()),
  ('La Vinya del Senyor', 'la-vinya-del-senyor', 'Calle de San Felipe Neri 15, 46003 Valencia', 'Valencia', 'Espacio gastronómico y de ocio nocturno en el corazón del Carmen. Oferta de cócteles y sesiones de DJ.', ARRAY['Pop', 'Electrónica', 'Reggaeton', 'Latin'], 'approved', NOW(), NOW()),

  -- Ensanche / Ronda
  ('Kapital Valencia', 'kapital-valencia', 'Avenida de la Construcción, Valencia', 'Valencia', 'Discoteca en la zona de negocios del Ensanche. Múltiples ambientes dedicados a diferentes géneros musicales.', ARRAY['Electrónica', 'House', 'Reggaeton', 'Pop'], 'approved', NOW(), NOW()),

  -- Benimaclet
  ('La Casa del Sonido', 'la-casa-del-sonido', 'Calle Padre Mariana 41, 46020 Valencia', 'Valencia', 'Club alternativo en el barrio universitario de Benimaclet. Espacio dedicado a música en vivo y DJ de géneros variados.', ARRAY['Indie', 'Electrónica', 'Rock', 'Alternativa'], 'approved', NOW(), NOW()),

  -- Centro / Avenidas
  ('State Club Valencia', 'state-club-valencia', 'Avenidas de Valencia', 'Valencia', 'Club nocturno con capacidad importante. Múltiples pistas y ambientes para disfrutar de diferentes géneros musicales.', ARRAY['Electrónica', 'House', 'Reggaeton', 'Pop'], 'approved', NOW(), NOW()),

  -- Ruzafa surrounding
  ('Brokers', 'brokers-valencia', 'Calle de Lasierra 3, 46005 Valencia', 'Valencia', 'Bar de copas en la zona de Ruzafa. Punto de encuentro nocturno con música y ambiente festivo.', ARRAY['Pop', 'Reggaeton', 'Electrónica', 'Latin'], 'approved', NOW(), NOW()),

  -- Carmen
  ('Terraza Karau', 'terraza-karau-valencia', 'Calle del Carmen, Valencia', 'Valencia', 'Terraza de copas en el histórico barrio del Carmen. Ambiente abierto para disfrutar de la noche en Valencia.', ARRAY['Pop', 'Reggaeton', 'Electrónica', 'Latin'], 'approved', NOW(), NOW());

-- Count inserted rows
SELECT COUNT(*) as inserted_clubs FROM clubs WHERE zone = 'Valencia' AND status = 'approved';
