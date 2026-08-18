-- Madrid Clubs Import
-- Zone: Madrid
-- Status: approved (indexable)
-- Insert major Madrid clubs with SEO-friendly data

INSERT INTO clubs (name, slug, address, zone, description, genres, status, created_at, updated_at)
VALUES
  -- Triángulo del Arte / Huertas
  ('Teatro Kapital', 'teatro-kapital', 'Atocha 125, 28012 Madrid', 'Madrid', 'Discoteca legendaria de 7 plantas con ambientes distintos en cada nivel. Pionera en Madrid con una de las pistas de baile más grandes de la capital.', ARRAY['Electrónica', 'Pop', 'Reggaeton', 'House'], 'approved', NOW(), NOW()),
  ('Teatro Barceló', 'teatro-barcelo', 'Barceló 11, 28004 Madrid', 'Madrid', 'Club ubicado en un antiguo cine de los años 30. Capacidad para miles de personas con estética teatral característica. Referencia histórica del ocio madrileño.', ARRAY['Electrónica', 'House', 'Tech House', 'Pop'], 'approved', NOW(), NOW()),
  ('Fabrik', 'fabrik', 'Camino de la Fábrica, 38, 28290 Humanes de Madrid', 'Madrid', 'Una de las macrodiscotecas más grandes de Europa. Múltiples espacios y pistas dedicadas a diferentes géneros. Capacidad para varios miles de personas.', ARRAY['Electrónica', 'House', 'Techno', 'Deep House'], 'approved', NOW(), NOW()),
  ('Moby Dick', 'moby-dick', 'Avenida Brasil 5, 28020 Madrid', 'Madrid', 'Histórico club madrileño con sala de conciertos y discoteca. Referencia de la escena musical de Madrid desde hace décadas.', ARRAY['Rock', 'Indie', 'Electrónica', 'Alternativa'], 'approved', NOW(), NOW()),
  ('Eslabón', 'eslabon', 'Calle del Dr. Fourquet 21, 28012 Madrid', 'Madrid', 'Sala de conciertos y club en el barrio de Lavapiés. Espacio alternativo dedicado a música en directo y sesiones de DJ.', ARRAY['Indie', 'Electrónica', 'Alternativa', 'Pop'], 'approved', NOW(), NOW()),

  -- Malasaña
  ('La Vía Láctea', 'la-via-lactea', 'Velarde 18, 28004 Madrid', 'Madrid', 'Icono de la Movida madrileña de los 80. Bar legendario de Malasaña con música en vivo y ambiente alternativo.', ARRAY['Rock', 'Indie', 'Alternativa', 'Electrónica'], 'approved', NOW(), NOW()),
  ('Soda Stereo Club', 'soda-stereo-club', 'Corredera Alta de San Pablo 26, 28004 Madrid', 'Madrid', 'Sala de conciertos y club en el corazón de Malasaña. Espacio dedicado a música en directo, indie y experimental.', ARRAY['Indie', 'Alternativa', 'Electrónica', 'Pop'], 'approved', NOW(), NOW()),
  ('Panta Rhei', 'panta-rhei', 'Corredera Baja de San Pablo 36, 28004 Madrid', 'Madrid', 'Club nocturno en Malasaña con oferta de cócteles y música variada. Atmósfera cálida y ambiente alternativo.', ARRAY['Indie', 'Alternativa', 'Electrónica', 'Reggaeton'], 'approved', NOW(), NOW()),

  -- Chueca
  ('Why Not?', 'why-not', 'Calle San Bartolomé 7, 28004 Madrid', 'Madrid', 'Club emblemático de Chueca con ambiente LGTBI+ y música electrónica. Referencia de la vida nocturna de Chueca.', ARRAY['Electrónica', 'House', 'Reggaeton', 'Pop'], 'approved', NOW(), NOW()),
  ('Fulanita de Tal', 'fulanita-de-tal', 'Calle Barquillo 29, 28004 Madrid', 'Madrid', 'Bar y club en el centro de Chueca. Espacio acogedor con música y ambiente festivo los fines de semana.', ARRAY['Pop', 'Reggaeton', 'Electrónica', 'Indie'], 'approved', NOW(), NOW()),
  ('La Lupe', 'la-lupe', 'Gravina 10, 28004 Madrid', 'Madrid', 'Local histórico de Chueca con sesiones de DJ variadas. Punto de encuentro en la noche madrileña.', ARRAY['Electrónica', 'House', 'Pop', 'Reggaeton'], 'approved', NOW(), NOW()),

  -- Gran Vía / Centro
  ('Joy Eslava', 'joy-eslava', 'Gran Vía 44, 28013 Madrid', 'Madrid', 'Histórico club del centro de Madrid en un edificio singular. Escenario de música en vivo y discoteca con capacidad para miles de personas.', ARRAY['Pop', 'Electrónica', 'Rock', 'Reggaeton'], 'approved', NOW(), NOW()),

  -- Chueca / Centro
  ('Perro Negro', 'perro-negro', 'Calle Barquillo 44, 28004 Madrid', 'Madrid', 'Bar de copas y club de Chueca. Ambiente festivo y música variada para disfrutar de la noche madrileña.', ARRAY['Reggaeton', 'Pop', 'Electrónica', 'Latin'], 'approved', NOW(), NOW()),

  -- Retiro / Centro
  ('La Sala', 'la-sala-madrid', 'Calle Reclinos 5, 28001 Madrid', 'Madrid', 'Sala de conciertos y club céntrico. Espacio flexible para eventos musicales y sesiones de DJ de variados géneros.', ARRAY['Electrónica', 'House', 'Indie', 'Pop'], 'approved', NOW(), NOW()),

  -- Alcalá
  ('State Metropolitan', 'state-metropolitan', 'Alcalá 20, 28014 Madrid', 'Madrid', 'Discoteca en plena Alcalá con varias pistas y ambientes diferentes. Club con capacidad importante en zona céntrica.', ARRAY['Electrónica', 'House', 'Reggaeton', 'Pop'], 'approved', NOW(), NOW()),

  -- Lavapiés
  ('Somera', 'somera-madrid', 'Calle del Dr. Fourquet 7, 28012 Madrid', 'Madrid', 'Bar de copas y club en Lavapiés. Ambiente relajado con música variada y propuestas alternativas.', ARRAY['Indie', 'Electrónica', 'Alternativa', 'Pop'], 'approved', NOW(), NOW()),

  -- Atocha
  ('Zona Club', 'zona-club', 'Atocha 2, 28012 Madrid', 'Madrid', 'Club nocturno en la zona de Atocha. Espacio versátil con música y ambiente flexible para diferentes eventos.', ARRAY['Electrónica', 'House', 'Reggaeton', 'Pop'], 'approved', NOW(), NOW());

-- Count inserted rows
SELECT COUNT(*) as inserted_clubs FROM clubs WHERE zone = 'Madrid' AND status = 'approved';
