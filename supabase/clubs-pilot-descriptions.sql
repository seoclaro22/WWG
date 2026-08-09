-- Reescritura de descripciones (solo ES por ahora) para las 3 fichas piloto
-- con mayor perdida de clics en Search Console pese a buena posicion:
-- La Santa Benicassim, Panama Jack Magaluf, Perro Negro Madrid.
-- Se sustituye el patron plantilla comun ("Si buscas la verdadera
-- experiencia de X, es tu parada obligatoria...") por texto unico por ficha,
-- con el pueblo real en la primera frase y datos verificados (misma calle
-- que otros clubs, mezcla de generos) en vez de relleno generico.

update public.clubs set description = 'La Santa Benicàssim es la discoteca al aire libre de referencia en la Costa del Azahar, junto a la Carretera N-340 (Km 78), a la entrada de Benicàssim y a pocos minutos de Castellón de la Plana. Su gran terraza combina dos barras y una pista de baile central rodeada de palmeras e iluminación de estilo tropical, mientras que una sala interior permite mantener la actividad durante todo el año, más allá de la temporada de verano. La música pasa del reggaeton y los éxitos urbanos a sesiones de techno, acid techno, tech house y afro house, lo que la convierte en una de las pocas discotecas de la zona que combina ambos públicos en la misma noche.'
where id = '10833c27-b40a-4070-8144-425de255fbd2'; -- LA SANTA

update public.clubs set description = 'En pleno corazón de la Strip de Magaluf, en la Avinguda de l''Olivera, Panama Jack es una de las discotecas con más ambiente de la zona turística de Mallorca. Su propuesta se centra en reggaeton, música latina y global hits, con DJs internacionales pinchando los temas más sonados del momento y una puesta en escena con shows de luces y cañones de CO2. Está a pocos metros de BCM Mallorca, en la misma avenida, lo que la convierte en parada habitual para quien hace ruta de discotecas por la Strip sin moverse del mismo tramo.'
where id = 'd565474b-004e-4485-a8b9-0221b56521b8'; -- PANAMA JACK MAGALUF

update public.clubs set description = 'Perro Negro Madrid es la delegación en la capital de la discoteca de Medellín convertida en referencia internacional del perreo, en el número 28 de la calle Don Ramón de la Cruz, en pleno barrio de Salamanca. La sala apuesta por reggaeton clásico y actual sin concesiones, con trap, dembow, dancehall y guayeteo, en un ambiente oscuro y desenfadado que reproduce el espíritu del local original colombiano. Los reservados VIP y la cercanía con otros clubs de Salamanca —Rubicon, Terraza Karau, Gunilla Club o Sala de Despecho, todos a un paseo entre sí— la convierten en parada habitual de quienes hacen ruta nocturna por la zona.'
where id = 'f63827b6-6e44-48eb-b08f-41258518abeb'; -- PERRO NEGRO MADRID
