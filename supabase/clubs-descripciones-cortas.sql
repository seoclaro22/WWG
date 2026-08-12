-- ENREDO, OVERCLUB y ESMOLI tenian descripciones de 380, 369 y 300 caracteres
-- frente a la media de 660 de los otros 28 clubs. Se amplian usando solo datos
-- verificables de la propia base de datos: direccion, generos y la programacion
-- real de cada sala. Nada inventado, que es lo que fallo en La Santa.
--
-- OJO: ENREDO y OVERCLUB nombran sus sesiones fijas (EGOISTA, MENEO, SALAO,
-- PARAO). Son palabras clave de nombre propio y por eso interesan, pero si esas
-- residencias cambian hay que revisar estos textos.
--
-- ESMOLI no tiene ningun evento en la base de datos, asi que su texto se amplia
-- menos: solo el edificio, la ubicacion y los generos que tiene asignados.

update public.clubs set
  description = concat(
    'ENREDO CLUB ocupa un local a pie de Paseo Marítimo, en la avenida Gabriel Roca 45 (Portopí), uno de los pocos clubs de Palma al que se llega y se vuelve caminando por el puerto. Su programación se reparte entre house, tech house y techno.',
    E'\n',
    'La agenda gira en torno a dos noches fijas: EGOÍSTA, en la madrugada del viernes, con house comercial y los grandes éxitos del momento, y MENEO, los sábados a partir de las 23:00, centrada en reguetón, perreo y música urbana. En verano se suma SALAO, sesión de atardecer en la terraza con deep house y afro house.',
    E'\n',
    'Es la opción cómoda para quien se aloja en Palma o cerca del puerto: cambia de ambiente según la noche y no obliga a desplazarse hasta los polígonos, donde está la mayoría de la vida nocturna electrónica de la ciudad.'
  ),
  description_i18n = coalesce(description_i18n, '{}'::jsonb) || jsonb_build_object(
    'en', concat(
      'ENREDO CLUB sits right on the seafront promenade, at Avenida Gabriel Roca 45 (Portopí), one of the few clubs in Palma you can walk to and back from along the harbour. Its programming moves between house, tech house and techno.',
      E'\n',
      'The calendar is built around two fixed nights: EGOÍSTA, in the early hours of Friday, with commercial house and the biggest current hits, and MENEO, on Saturdays from 23:00, focused on reggaeton, perreo and urban music. In summer SALAO joins in, a sunset terrace session with deep house and afro house.',
      E'\n',
      'It is the convenient choice if you are staying in Palma or near the harbour: the mood changes with the night, and you do not have to travel out to the industrial estates where most of the city''s electronic nightlife is based.'
    ),
    'de', concat(
      'Der ENREDO CLUB liegt direkt an der Uferpromenade, an der Avenida Gabriel Roca 45 (Portopí), und ist einer der wenigen Clubs in Palma, den man am Hafen entlang zu Fuß erreichen kann. Das Programm bewegt sich zwischen House, Tech House und Techno.',
      E'\n',
      'Der Kalender stützt sich auf zwei feste Nächte: EGOÍSTA in den frühen Stunden des Freitags mit Commercial House und den größten aktuellen Hits, und MENEO samstags ab 23:00 Uhr mit Reggaeton, Perreo und Urban. Im Sommer kommt SALAO dazu, eine Sunset-Session auf der Terrasse mit Deep House und Afro House.',
      E'\n',
      'Die bequeme Wahl, wenn man in Palma oder in Hafennähe wohnt: Die Stimmung wechselt je nach Nacht, und man muss nicht in die Gewerbegebiete hinausfahren, wo der Großteil des elektronischen Nachtlebens der Stadt stattfindet.'
    )
  )
where name = 'ENREDO CLUB';

update public.clubs set
  description = concat(
    'OVERCLUB es la referencia de club de sonido en Palma, en la calle Gremi de Passamaners 17, en la zona norte de la ciudad. Sistema calibrado al milímetro, entornos visuales de 360 grados y una sala pensada para escuchar, no solo para bailar.',
    E'\n',
    'Su programación tiene dos caras. Entre semana, PARAO ocupa la noche del jueves y va rotando de estilo, del reguetón antiguo al tech house. Los fines de semana llegan los nombres internacionales del techno y el tech house de la mano de promotoras como VANNDAL, GOODLIFE, DISORDER 360º y OVERLOAD: por su cabina han pasado Reinier Zonneveld, Estella Boersma, Peter Blue u Olympe.',
    E'\n',
    'Es el sitio al que va quien busca cartel serio de electrónica en Mallorca sin salir de Palma. Abierto los fines de semana, defiende la inclusividad y un enfoque auténtico de la cultura club.'
  ),
  description_i18n = coalesce(description_i18n, '{}'::jsonb) || jsonb_build_object(
    'en', concat(
      'OVERCLUB is the reference point for sound in Palma, on Calle Gremi de Passamaners 17, in the north of the city. Meticulously calibrated system, 360-degree visual environments and a room built for listening, not just dancing.',
      E'\n',
      'Its programming has two sides. Midweek, PARAO takes over Thursday night and rotates styles, from old-school reggaeton to tech house. At weekends the international techno and tech house names arrive through promoters such as VANNDAL, GOODLIFE, DISORDER 360º and OVERLOAD: Reinier Zonneveld, Estella Boersma, Peter Blue and Olympe have all played the booth.',
      E'\n',
      'This is where you go for a serious electronic line-up in Mallorca without leaving Palma. Open at weekends, it champions inclusivity and an authentic approach to club culture.'
    ),
    'de', concat(
      'OVERCLUB ist die Referenz für Sound in Palma, in der Calle Gremi de Passamaners 17 im Norden der Stadt. Millimetergenau kalibrierte Anlage, 360-Grad-Visuals und ein Raum, der zum Zuhören gebaut ist, nicht nur zum Tanzen.',
      E'\n',
      'Das Programm hat zwei Seiten. Unter der Woche übernimmt PARAO die Donnerstagnacht und wechselt dabei den Stil, von altem Reggaeton bis Tech House. An den Wochenenden kommen die internationalen Techno- und Tech-House-Namen über Veranstalter wie VANNDAL, GOODLIFE, DISORDER 360º und OVERLOAD: Reinier Zonneveld, Estella Boersma, Peter Blue und Olympe standen bereits hinter den Decks.',
      E'\n',
      'Hier ist man richtig, wenn man auf Mallorca ein ernsthaftes elektronisches Line-up sucht, ohne Palma zu verlassen. Am Wochenende geöffnet, mit klarem Bekenntnis zu Inklusivität und einem authentischen Verständnis von Clubkultur.'
    )
  )
where name = 'OVERCLUB';

update public.clubs set
  description = concat(
    'Es Molí Club es uno de los locales más underground de Palma, alojado en un antiguo molino harinero de 1860 catalogado como patrimonio histórico, del que toma su nombre catalán: molí, molino. Está en la calle de la Indústria 11, en Ponent, a un paso de Santa Catalina.',
    E'\n',
    'Su programación se mueve dentro del techno y sus alrededores: tech house, uk tech house, minimal techno, minimal tech house, deep house y house. Nada de música comercial ni de listas de éxitos.',
    E'\n',
    'Es el club al que se va buscando electrónica de verdad en Palma, lejos del circuito turístico de Magaluf y S''Arenal. La agenda se anuncia sesión a sesión, así que conviene consultarla antes de ir.'
  ),
  description_i18n = coalesce(description_i18n, '{}'::jsonb) || jsonb_build_object(
    'en', concat(
      'Es Molí Club is one of the most underground venues in Palma, housed in a former flour mill dating back to 1860 and listed as a historical landmark, which gives it its Catalan name: molí, mill. It stands on Carrer de la Indústria 11, in Ponent, a short walk from Santa Catalina.',
      E'\n',
      'Its programming stays within techno and everything around it: tech house, uk tech house, minimal techno, minimal tech house, deep house and house. No commercial music, no chart hits.',
      E'\n',
      'This is the club you go to when you want real electronic music in Palma, away from the tourist circuit of Magaluf and S''Arenal. The calendar is announced session by session, so it is worth checking before you head over.'
    ),
    'de', concat(
      'Der Es Molí Club ist einer der Underground-Läden Palmas, untergebracht in einer ehemaligen Getreidemühle von 1860, die unter Denkmalschutz steht und dem Club seinen katalanischen Namen gibt: molí, Mühle. Er liegt in der Carrer de la Indústria 11 in Ponent, wenige Schritte von Santa Catalina entfernt.',
      E'\n',
      'Das Programm bleibt beim Techno und allem, was daran grenzt: Tech House, UK Tech House, Minimal Techno, Minimal Tech House, Deep House und House. Keine kommerzielle Musik, keine Charthits.',
      E'\n',
      'Hierher geht man, wenn man in Palma echte elektronische Musik sucht, abseits des Touristenkreislaufs von Magaluf und S''Arenal. Das Programm wird von Session zu Session angekündigt, ein Blick vorher lohnt sich also.'
    )
  )
where name = 'ESMOLI CLUB';
