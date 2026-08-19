-- Spain Expansion: Ibiza, Palma, Barcelona, Sevilla, Bilbao, Málaga
-- Zone: Various Spanish cities
-- Status: approved (indexable)
-- Insert major clubs with SEO-friendly data

INSERT INTO clubs (name, slug, address, zone, description, genres, status, created_at)
VALUES
  -- IBIZA
  ('Pacha Ibiza', 'pacha-ibiza', 'Avenida 8 de Agosto, 07800 Ibiza', 'Ibiza', 'Discoteca legendaria de Ibiza, símbolo de la vida nocturna balear. Referencia mundial de la fiesta electrónica con artistas internacionales y ambiente cosmopolita.', ARRAY['Electrónica', 'House', 'Techno', 'Trance'], 'approved', NOW()),
  ('Amnesia Ibiza', 'amnesia-ibiza', 'San Rafael, 07800 Ibiza', 'Ibiza', 'Megadiscoteca histórica de Ibiza con capacidad para miles de personas. Pionera de la escena electrónica balear con foam parties y eventos temáticos legendarios.', ARRAY['Electrónica', 'Techno', 'House', 'Deep House'], 'approved', NOW()),
  ('Hï Ibiza', 'hi-ibiza', 'Playa d''en Bossa, 07800 Ibiza', 'Ibiza', 'Club de ultra lujo en Playa d''en Bossa con tecnología audiovisual de vanguardia. Referencia de la fiesta de alta gama en Ibiza con residencias de DJs de renombre.', ARRAY['Electrónica', 'House', 'Tech House', 'Techno'], 'approved', NOW()),
  ('Eden Ibiza', 'eden-ibiza', 'Calle San Carlos 17, 07800 Ibiza', 'Ibiza', 'Club referencia en el casco antiguo de Ibiza con terrazas y ambiente vibrante. Punto de encuentro para la fiesta de día y noche durante toda la temporada estival.', ARRAY['Electrónica', 'House', 'Reggaeton', 'Pop'], 'approved', NOW()),
  ('Café del Mar', 'cafe-del-mar-ibiza', 'Cala Conta, 07810 San Antonio, Ibiza', 'Ibiza', 'Chiringuito icónico al atardecer en Cala Conta. Legendario por sus sunsets y ambiente relajado que transforma en fiesta nocturna durante el verano.', ARRAY['Chill Out', 'Electrónica', 'Reggaeton', 'Pop'], 'approved', NOW()),

  -- PALMA
  ('Tito''s Palma', 'titos-palma', 'Paseo Marítimo 3, 07012 Palma', 'Palma', 'Discoteca histórica en el Paseo Marítimo de Palma. Referencia de la vida nocturna palmesana con varias plantas y ambientes diferentes.', ARRAY['Electrónica', 'Pop', 'Reggaeton', 'House'], 'approved', NOW()),
  ('Castro''s Palma', 'castros-palma', 'Paseo Marítimo 5, 07012 Palma', 'Palma', 'Club de copas en el paseo marítimo con vistas al puerto deportivo. Ambiente festivo y música variada para disfrutar de la noche en Palma.', ARRAY['Pop', 'Reggaeton', 'Electrónica', 'Latin'], 'approved', NOW()),
  ('Garito Café', 'garito-cafe-palma', 'Calle del Apuntadores 1, 07012 Palma', 'Palma', 'Bar de copas y club en pleno centro histórico de Palma. Espacio alternativo con música variada y público mixto.', ARRAY['Indie', 'Electrónica', 'Alternativa', 'Pop'], 'approved', NOW()),
  ('Abraxas Palma', 'abraxas-palma', 'Carrer del Sindicat 5, 07001 Palma', 'Palma', 'Sala de conciertos y club en el barrio antiguo. Dedicado a música en directo, indie y propuestas alternativas de Palma.', ARRAY['Indie', 'Alternativa', 'Rock', 'Electrónica'], 'approved', NOW()),

  -- BARCELONA
  ('Razzmatazz Barcelona', 'razzmatazz-barcelona', 'Almogàvers 122, 08018 Barcelona', 'Barcelona', 'Complejo de salas de conciertos y club en Poblenou. Referencia de la escena musical barcelonesa con múltiples espacios y géneros variados.', ARRAY['Rock', 'Indie', 'Electrónica', 'Alternativa'], 'approved', NOW()),
  ('Mooem Barcelona', 'mooem-barcelona', 'Plaça Reial 13, 08002 Barcelona', 'Barcelona', 'Club legendario en la Plaça Reial del Barrio Gótico. Punto de encuentro nocturno con música electrónica y ambiente cosmopolita.', ARRAY['Electrónica', 'House', 'Techno', 'Deep House'], 'approved', NOW()),
  ('Sidecar Factory Club', 'sidecar-barcelona', 'Plaça Reial 7, 08002 Barcelona', 'Barcelona', 'Sala de conciertos y club en la Plaça Reial. Espacio dedicado a música en directo, indie y electrónica con público alternativo.', ARRAY['Indie', 'Electrónica', 'Rock', 'Alternativa'], 'approved', NOW()),
  ('Opium Barcelona', 'opium-barcelona', 'Passeig Marítim de la Barceloneta 34, 08003 Barcelona', 'Barcelona', 'Discoteca de lujo en la Barceloneta con vistas al mar. Club de referencia con capacidad para miles de personas y ambiente de alta gama.', ARRAY['Electrónica', 'House', 'Reggaeton', 'Pop'], 'approved', NOW()),
  ('Shoko Barcelona', 'shoko-barcelona', 'Passeig Marítim de la Barceloneta 36, 08003 Barcelona', 'Barcelona', 'Club y restaurante en la Barceloneta con vistas al puerto. Ambiente elegante combinando cocina asiática, cócteles y sesiones de DJ.', ARRAY['Electrónica', 'House', 'Reggaeton', 'Pop'], 'approved', NOW()),

  -- SEVILLA
  ('Eslabón Sevilla', 'eslabon-sevilla', 'Calle Betis 35, 41010 Sevilla', 'Sevilla', 'Sala de conciertos y club en el paseo de Triana. Espacio dedicado a música en directo, flamenco fusion y propuestas alternativas sevillanas.', ARRAY['Flamenco Fusion', 'Indie', 'Electrónica', 'Alternativa'], 'approved', NOW()),
  ('Antique Teatro Sevilla', 'antique-teatro-sevilla', 'Calle Amor de Dios 13, 41002 Sevilla', 'Sevilla', 'Sala de conciertos en pleno centro histórico de Sevilla. Referencia de la música en directo con capacidad íntima para artistas nacionales e internacionales.', ARRAY['Rock', 'Indie', 'Alternativa', 'Electrónica'], 'approved', NOW()),
  ('Sala Malandar', 'sala-malandar-sevilla', 'Calle Pasaje Carmona 11, 41001 Sevilla', 'Sevilla', 'Club alternativo en el centro de Sevilla. Espacio dedicado a música en directo, DJ sessions y ambiente joven e independiente.', ARRAY['Indie', 'Electrónica', 'Rock', 'Alternativa'], 'approved', NOW()),
  ('Discotheque Sevilla', 'discotheque-sevilla', 'Avenida de la Constitución 37, 41002 Sevilla', 'Sevilla', 'Discoteca céntrica de Sevilla con múltiples pistas. Club con ambiente festivo y música variada para disfrutar de la noche sevillana.', ARRAY['Electrónica', 'House', 'Reggaeton', 'Pop'], 'approved', NOW()),

  -- BILBAO
  ('Kafe Antzokia Bilbao', 'kafe-antzokia-bilbao', 'Calle Muelle de la Merced 2, 48003 Bilbao', 'Bilbao', 'Sala de conciertos y club en la margen izquierda del Nervión. Referencia de la música en directo en Bilbao con artistas de diverso géneros.', ARRAY['Rock', 'Indie', 'Electrónica', 'Alternativa'], 'approved', NOW()),
  ('Surco Bilbao', 'surco-bilbao', 'Calle Fernández del Campo 22, 48003 Bilbao', 'Bilbao', 'Club especializado en música electrónica e indie. Espacio referencia de la escena alternativa bilbaína con público joven.', ARRAY['Electrónica', 'Indie', 'Techno', 'House'], 'approved', NOW()),
  ('Barceloneta Club Bilbao', 'barceloneta-bilbao', 'Calle Ramón y Cajal 45, 48009 Bilbao', 'Bilbao', 'Club con propuesta de música electrónica y DJ sessions. Ambiente festivo en zona de Deusto para disfrutar de la noche bilbaína.', ARRAY['Electrónica', 'House', 'Reggaeton', 'Pop'], 'approved', NOW()),
  ('El Sótano Bilbao', 'el-sotano-bilbao', 'Calle Bidebarrieta 4, 48005 Bilbao', 'Bilbao', 'Bar de copas y club en el casco viejo de Bilbao. Espacio alternativo con ambiente cálido y música variada.', ARRAY['Indie', 'Alternativa', 'Electrónica', 'Pop'], 'approved', NOW()),

  -- MÁLAGA
  ('Purobeach Málaga', 'purobeach-malaga', 'Playa de Pedregalejo, 29016 Málaga', 'Málaga', 'Beach club de lujo en Pedregalejo con vistas al Mediterráneo. Referencia de la fiesta estival malagueña que combina playa de día con discoteca de noche.', ARRAY['Electrónica', 'House', 'Reggaeton', 'Pop'], 'approved', NOW()),
  ('Salsa Latina Málaga', 'salsa-latina-malaga', 'Calle Larios 1, 29015 Málaga', 'Málaga', 'Club especializado en música latina y salsa en el centro de Málaga. Espacio animado con ambiente festivo y público multicultural.', ARRAY['Salsa', 'Reggaeton', 'Latin', 'Pop'], 'approved', NOW()),
  ('Mala Compañía Málaga', 'mala-compania-malaga', 'Paseo Marítimo de Málaga 35, 29016 Málaga', 'Málaga', 'Bar de copas en el paseo marítimo con terraza. Punto de encuentro nocturno con música variada y vistas al puerto.', ARRAY['Pop', 'Reggaeton', 'Electrónica', 'Latin'], 'approved', NOW()),
  ('Booga Beach Málaga', 'booga-beach-malaga', 'Playa del Palo, 29016 Málaga', 'Málaga', 'Chiringuito-discoteca en la playa del Palo. Ambiente de playa que transforma en fiesta nocturna durante la temporada estival malagueña.', ARRAY['Electrónica', 'House', 'Reggaeton', 'Pop'], 'approved', NOW())
ON CONFLICT (slug) DO NOTHING;

-- Verification count
SELECT zone, COUNT(*) as club_count
FROM clubs
WHERE zone IN ('Ibiza', 'Palma', 'Barcelona', 'Sevilla', 'Bilbao', 'Málaga')
AND status = 'approved'
GROUP BY zone
ORDER BY zone;
