-- SELVA CLUB: el español tiene tres párrafos (732 car.) pero en_i18n y de_i18n
-- solo guardaban el primero (270 y 264 car.). LocalText hace i18n[locale] || value,
-- así que el visitante en inglés o alemán veía un tercio de la ficha.
-- Se completan los dos párrafos que faltaban. No se toca la clave 'es':
-- la columna description ya es el español y una clave 'es' poblada lo taparía.
update public.clubs
set description_i18n = coalesce(description_i18n, '{}'::jsonb) || jsonb_build_object(
  'en', concat(
    'If you''re looking for a club experience in Mallorca that''s a far cry from the typical mass tourism, Selva Club is the place for you. Located in the Son Castelló industrial park in Palma, this venue is a meeting point for locals who are passionate about electronic music.',
    E'\n',
    'Expect a more intimate, underground atmosphere where the music and the crowd are what really matter. Reviews single out the sound system, which wraps around you while local and guest DJs work through a range of electronic genres.',
    E'\n',
    'It is a club with a genuine atmosphere, and the staff generally earn very good reviews for how they treat people. That said, as in most venues of this kind, expect to pay a premium for drinks.'
  ),
  'de', concat(
    'Wer auf Mallorca ein Cluberlebnis abseits des üblichen Massentourismus sucht, ist im Selva Club genau richtig. Der Club liegt im Industriegebiet Son Castelló in Palma und ist ein beliebter Treffpunkt für Einheimische mit einer Leidenschaft für elektronische Musik.',
    E'\n',
    'Erwartet eine intimere, Underground-Atmosphäre, in der die Musik und das Publikum im Mittelpunkt stehen. In den Bewertungen wird vor allem die Soundanlage hervorgehoben, die einen umhüllt, während lokale DJs und Gäste verschiedene elektronische Genres auflegen.',
    E'\n',
    'Der Club hat eine authentische Atmosphäre, und das Personal bekommt für seinen freundlichen Umgang durchweg sehr gute Bewertungen. Allerdings muss man, wie in den meisten Läden dieser Art, mit höheren Preisen für Getränke rechnen.'
  )
)
where name = 'SELVA CLUB';
