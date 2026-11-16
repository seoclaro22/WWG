import { nightRangeIso } from '@/lib/event-night'
import { routing } from '@/i18n/routing'
import { dictionaries } from '@/lib/dictionaries'

// Primera miga de pan. Estaba escrita como "Inicio" en duro en las fichas de
// club, DJ, evento y genero, tambien en /en y /de.
export function homeCrumb(locale: string) {
  const dict = dictionaries[locale] || dictionaries[routing.defaultLocale]
  return dict['nav.home'] || 'Inicio'
}

// Umbral de inventario para indexar una pagina generada.
//
// Estas rutas se multiplican solas (zonas x dias, zonas x generos): sin un
// minimo real de eventos acabariamos publicando cientos de paginas vacias,
// que es justo el patron que Google penaliza. Por debajo del umbral la pagina
// sigue existiendo para el usuario que llega desde el sitio, pero sale del
// sitemap y lleva noindex.
export const MIN_EVENTS_TO_INDEX = 3

// Que fichas de DJ se ofrecen a Google.
//
// El extractor crea una ficha por cada nombre que ve en un cartel: unas 900,
// por tres idiomas, y mas de la mitad sin foto. Ese volumen de paginas que son
// un nombre sobre una plantilla es lo que llevo a Google a sacar del indice el
// sitio entero en septiembre de 2026. Se indexa lo mismo que se lista en /djs
// (la ficha con foto, ver listableDjs en db.ts) y, ademas, la que tiene
// sesiones anunciadas. El resto sigue existiendo para quien llega desde el sitio.
export function djIsIndexable(
  dj: { images?: unknown } | null | undefined,
  upcomingEvents: number,
) {
  // Solo con sesiones anunciadas. Antes bastaba con tener foto, y asi
  // entraban ~500 fichas (x3 idiomas) cuya unica sustancia era una bio
  // generada: Search Console no muestra accion manual, asi que la caida del 3
  // de septiembre es una valoracion de calidad del sitio entero, y ese
  // volumen de fichas flojas es lo que mas pesa en ella. La ficha sigue
  // existiendo y enlazada; vuelve a ofrecerse en cuanto tenga una fecha.
  if (!dj) return false
  return upcomingEvents > 0
}

// Los clubs se indexan todos, sin puerta de calidad: son el contenido
// principal del sitio y pocos (menos de cien).
export function clubIsIndexable(
  club: { id?: string | null } | null | undefined,
  _upcomingEvents: number,
) {
  return Boolean(club)
}

export type WhenKey = 'today' | 'weekend'

// Slugs traducidos: la ventaja de estas paginas es la keyword temporal
// ("fiestas hoy en Valencia"), asi que el slug tiene que estar en el idioma.
const WHEN_SLUGS: Record<WhenKey, Record<string, string>> = {
  today: { es: 'hoy', en: 'today', de: 'heute' },
  weekend: { es: 'fin-de-semana', en: 'weekend', de: 'wochenende' },
}

export const WHEN_KEYS: WhenKey[] = ['today', 'weekend']

export function whenSlug(key: WhenKey, locale: string) {
  return WHEN_SLUGS[key][locale] || WHEN_SLUGS[key][routing.defaultLocale]
}

// Solo resuelve el slug del idioma de la URL. Asi /en/mallorca/hoy es un 404
// en vez de un duplicado de /mallorca/hoy: cada arbol de idioma tiene una
// unica URL valida por pagina.
export function resolveWhenSlug(slug: string, locale: string): WhenKey | null {
  for (const key of WHEN_KEYS) {
    if (whenSlug(key, locale) === slug) return key
  }
  return null
}

// Ventana temporal de la consulta.
//
// La noche no termina a medianoche: un evento que empieza el viernes a las
// 23:30 pertenece al viernes, y uno de las 02:00 del sabado tambien. La
// cuenta es la misma que usan los chips de /descubrir (lib/event-night.ts).
export function whenRange(key: WhenKey) {
  return nightRangeIso(key)
}

interface PageCopy {
  title: string
  description: string
  eyebrow: string
  intro: string
  empty: string
}

// Copys de las paginas temporales. Atacan la consulta con intencion mas alta
// que existe en el sector: alguien que quiere salir hoy o este fin de semana.
// Es tambien donde tenemos ventaja real frente a listados estaticos y
// articulos de blog, porque el contenido se regenera solo.
export function whenMeta(key: WhenKey, zone: string, locale: string): PageCopy {
  const copy: Record<string, Record<WhenKey, PageCopy>> = {
    es: {
      today: {
        title: `Salir de fiesta hoy en ${zone}`,
        description: `Las fiestas y discotecas de ${zone} para esta noche: line-up, horarios, precios y entradas. Agenda actualizada cada día para que encuentres plan en minutos.`,
        eyebrow: 'Esta noche',
        intro: `Todo lo que se mueve hoy en ${zone}. La lista se actualiza sola: solo aparecen fiestas que siguen en pie esta noche.`,
        empty: `Hoy no hay nada programado en ${zone}.`,
      },
      weekend: {
        title: `Salir de fiesta este fin de semana en ${zone}`,
        description: `Todas las fiestas del fin de semana en ${zone}: viernes, sábado y domingo con line-ups, horarios y entradas. Planifica tu noche con Where We Go.`,
        eyebrow: 'Este fin de semana',
        intro: `El plan completo del fin de semana en ${zone}, de viernes noche a domingo. Compara line-ups y reserva antes de que se agoten.`,
        empty: `Este fin de semana no hay nada programado en ${zone}.`,
      },
    },
    en: {
      today: {
        title: `Going Out Tonight in ${zone}`,
        description: `Tonight's parties and clubs in ${zone}: line-ups, times, prices and tickets. Updated every day so you can find a plan in minutes.`,
        eyebrow: 'Tonight',
        intro: `Everything happening tonight in ${zone}. The list updates itself: only parties still on tonight show up here.`,
        empty: `Nothing is on tonight in ${zone}.`,
      },
      weekend: {
        title: `Nightlife This Weekend in ${zone}`,
        description: `Every party this weekend in ${zone}: Friday, Saturday and Sunday with line-ups, times and tickets. Plan your night out with Where We Go.`,
        eyebrow: 'This weekend',
        intro: `The full weekend in ${zone}, from Friday night to Sunday. Compare line-ups and book before they sell out.`,
        empty: `Nothing is on this weekend in ${zone}.`,
      },
    },
    de: {
      today: {
        title: `Heute Abend feiern ${germanZonePrep(zone)} ${zone}`,
        description: `Die Partys und Clubs ${germanZonePrep(zone)} ${zone} für heute Abend: Line-ups, Zeiten, Preise und Tickets. Täglich aktualisiert, damit du in Minuten einen Plan hast.`,
        eyebrow: 'Heute Abend',
        intro: `Alles, was heute ${germanZonePrep(zone)} ${zone} läuft. Die Liste aktualisiert sich selbst: hier stehen nur Partys, die heute Abend noch stattfinden.`,
        empty: `Heute läuft nichts ${germanZonePrep(zone)} ${zone}.`,
      },
      weekend: {
        title: `Am Wochenende feiern ${germanZonePrep(zone)} ${zone}`,
        description: `Alle Partys am Wochenende ${germanZonePrep(zone)} ${zone}: Freitag, Samstag und Sonntag mit Line-ups, Zeiten und Tickets. Plane deine Nacht mit Where We Go.`,
        eyebrow: 'Dieses Wochenende',
        intro: `Das ganze Wochenende ${germanZonePrep(zone)} ${zone}, von Freitagnacht bis Sonntag. Vergleiche Line-ups und buche, bevor es ausverkauft ist.`,
        empty: `An diesem Wochenende läuft nichts ${germanZonePrep(zone)} ${zone}.`,
      },
    },
  }
  return (copy[locale] || copy[routing.defaultLocale])[key]
}

// Cruce genero x zona: "discotecas techno en Valencia". Es la consulta de
// alguien que ya sabe que musica quiere, y las fichas de genero sueltas no la
// responden porque mezclan ciudades.
export function zoneGenreMeta(genre: string, zone: string, locale: string): PageCopy {
  const copy: Record<string, PageCopy> = {
    es: {
      title: `Fiestas de ${genre} en ${zone}`,
      description: `Dónde escuchar ${genre} en ${zone}: discotecas, DJs y próximas sesiones con horarios y entradas. Agenda de ${genre} actualizada a diario.`,
      eyebrow: `${genre} en ${zone}`,
      intro: `Las próximas sesiones de ${genre} en ${zone}, con sus line-ups y las salas donde suenan.`,
      empty: `Ahora mismo no hay sesiones de ${genre} programadas en ${zone}.`,
    },
    en: {
      title: `${genre} Parties in ${zone}`,
      description: `Where to hear ${genre} in ${zone}: clubs, DJs and upcoming sets with times and tickets. ${genre} listings updated daily.`,
      eyebrow: `${genre} in ${zone}`,
      intro: `Upcoming ${genre} sets in ${zone}, with line-ups and the venues playing them.`,
      empty: `No ${genre} sets are scheduled in ${zone} right now.`,
    },
    de: {
      title: `${genre} Partys ${germanZonePrep(zone)} ${zone}`,
      description: `Wo du ${genre} ${germanZonePrep(zone)} ${zone} hörst: Clubs, DJs und kommende Sets mit Zeiten und Tickets. ${genre} Termine, täglich aktualisiert.`,
      eyebrow: `${genre} ${germanZonePrep(zone)} ${zone}`,
      intro: `Kommende ${genre} Sets ${germanZonePrep(zone)} ${zone}, mit Line-ups und den Clubs, die sie spielen.`,
      empty: `Aktuell sind keine ${genre} Sets ${germanZonePrep(zone)} ${zone} geplant.`,
    },
  }
  return copy[locale] || copy[routing.defaultLocale]
}

// Parrafo de relleno para los cruces zona x genero que no tienen guia
// evergreen escrita a mano (ver GENRE_ZONE_GUIDES): en vez de inventar
// nombres de salas o precios que no se han investigado, tira de datos reales
// que la propia pagina ya trae (numero de eventos, clubs con agenda, proxima
// fecha) para que la pagina no se quede en cuatro lineas.
export function genreZoneSummary(
  zone: string,
  genre: string,
  locale: string,
  eventCount: number,
  clubNames: string[],
  next?: { title: string; club: string; date: string },
): string {
  if (eventCount === 0) return ''
  const clubs = clubNames.slice(0, 4)
  const clubList = clubs.length ? clubs.join(', ') : ''
  const more = clubNames.length > clubs.length ? clubNames.length - clubs.length : 0

  const copy: Record<string, string> = {
    es: [
      `Ahora mismo hay ${eventCount} ${eventCount === 1 ? 'sesion' : 'sesiones'} de ${genre} en la agenda de ${zone}`,
      clubList ? `, repartidas en salas como ${clubList}${more ? ` y ${more} mas` : ''}.` : '.',
      next ? ` La proxima es ${next.title} en ${next.club}, el ${next.date}.` : '',
    ].join(''),
    en: [
      `Right now there ${eventCount === 1 ? 'is' : 'are'} ${eventCount} ${genre} ${eventCount === 1 ? 'session' : 'sessions'} on the calendar in ${zone}`,
      clubList ? `, across venues like ${clubList}${more ? ` and ${more} more` : ''}.` : '.',
      next ? ` The next one is ${next.title} at ${next.club}, on ${next.date}.` : '',
    ].join(''),
    de: [
      `Aktuell stehen ${eventCount} ${genre}-${eventCount === 1 ? 'Termin' : 'Termine'} in der Agenda von ${zone}`,
      clubList ? `, unter anderem in ${clubList}${more ? ` und ${more} weiteren` : ''}.` : '.',
      next ? ` Der nächste ist ${next.title} im ${next.club}, am ${next.date}.` : '',
    ].join(''),
  }
  return copy[locale] || copy[routing.defaultLocale]
}

// Pagina "cerca de mi".
//
// "salir de fiesta cerca de mi" es la segunda consulta con mas volumen del
// sector (14.800/mes) y la de intencion mas alta. Google no le pasa la
// ubicacion al rastreador: reescribe la consulta a la ciudad de quien busca,
// asi que lo que compite no es el GPS sino tener paginas de ciudad solidas.
// Esta pagina es el hub que las reune, y ademas resuelve la consulta de verdad
// para el usuario detectando su ciudad al llegar.
//
// El slug va en el idioma porque la keyword es el slug.
export const NEAR_SLUGS: Record<string, string> = {
  es: 'salir-de-fiesta-cerca-de-mi',
  en: 'nightlife-near-me',
  de: 'feiern-in-meiner-naehe',
}

export function nearSlug(locale: string) {
  return NEAR_SLUGS[locale] || NEAR_SLUGS[routing.defaultLocale]
}

export function nearMeta(locale: string) {
  const copy: Record<string, {
    title: string; description: string; eyebrow: string; h1: string; intro: string
    cta: string; locating: string; denied: string; noMatch: string; cities: string; events: string; eventsOne: string
  }> = {
    es: {
      title: 'Salir de fiesta cerca de mí hoy | Where We Go',
      description: '¿No sabes dónde salir esta noche? Encuentra fiestas, discotecas y DJs cerca de ti en segundos: detectamos tu ciudad y te mostramos la agenda de hoy, actualizada a diario.',
      eyebrow: 'Cerca de mí',
      h1: 'Salir de fiesta cerca de mí',
      intro: 'Dinos dónde estás y te llevamos a la agenda de tu ciudad. O elige una de las ciudades con fiestas esta semana.',
      cta: 'Usar mi ubicación',
      locating: 'Buscando tu ciudad...',
      denied: 'No hemos podido acceder a tu ubicación. Elige tu ciudad en la lista.',
      noMatch: 'Todavía no tenemos agenda en {city}. Estas son las ciudades activas.',
      cities: 'Ciudades con agenda',
      events: 'eventos próximos',
      eventsOne: 'evento próximo',
    },
    en: {
      title: 'Nightlife Near Me',
      description: 'Find where to go out near you: clubs, parties and DJs in your city with times and tickets. We detect your city and show you what is on tonight.',
      eyebrow: 'Near me',
      h1: 'Nightlife near me',
      intro: 'Tell us where you are and we will take you to your city. Or pick one of the cities with parties this week.',
      cta: 'Use my location',
      locating: 'Finding your city...',
      denied: 'We could not access your location. Pick your city from the list.',
      noMatch: 'We do not cover {city} yet. These are the active cities.',
      cities: 'Cities with listings',
      events: 'upcoming events',
      eventsOne: 'upcoming event',
    },
    de: {
      title: 'Feiern in meiner Nähe',
      description: 'Finde heraus, wo du in deiner Nähe feiern kannst: Clubs, Partys und DJs in deiner Stadt mit Zeiten und Tickets. Wir erkennen deine Stadt und zeigen dir das Programm.',
      eyebrow: 'In meiner Nähe',
      h1: 'Feiern in meiner Nähe',
      intro: 'Sag uns, wo du bist, und wir bringen dich zu deiner Stadt. Oder wähle eine der Städte mit Partys in dieser Woche.',
      cta: 'Meinen Standort verwenden',
      locating: 'Deine Stadt wird gesucht...',
      denied: 'Wir konnten nicht auf deinen Standort zugreifen. Wähle deine Stadt aus der Liste.',
      noMatch: 'Wir decken {city} noch nicht ab. Das sind die aktiven Städte.',
      cities: 'Städte mit Programm',
      events: 'kommende Events',
      eventsOne: 'kommendes Event',
    },
  }
  return copy[locale] || copy[routing.defaultLocale]
}

// Guia evergreen + FAQ de la pagina "cerca de mi".
//
// La pagina solo tenia el localizador y el listado de ciudades: nada de
// contenido fijo, así que para una keyword de volumen alto y dificultad baja
// (18k busquedas/mes) era la pagina mas fina de todo el sitio, muy por debajo
// de lo que ya lleva /[zona] (guia + FAQ). Mismo patron aqui, pero generico
// en vez de investigado por ciudad: esta pagina no es de una zona, es el hub
// que las reune todas.
export function nearGuideHeadings(locale: string) {
  const copy: Record<string, { queElegir: string; comoFunciona: string; porQueUsar: string }> = {
    es: { queElegir: '¿No sabes dónde salir esta noche?', comoFunciona: 'Cómo funciona', porQueUsar: 'Por qué usar Where We Go' },
    en: { queElegir: "Don't know where to go out tonight?", comoFunciona: 'How it works', porQueUsar: 'Why use Where We Go' },
    de: { queElegir: 'Weißt du noch nicht, wohin heute Abend?', comoFunciona: 'So funktioniert es', porQueUsar: 'Warum Where We Go nutzen' },
  }
  return copy[locale] || copy[routing.defaultLocale]
}

export function nearGuide(locale: string) {
  const copy: Record<string, { queElegir: string; comoFunciona: string; porQueUsar: string }> = {
    es: {
      queElegir: 'Antes de elegir discoteca, cuatro cosas que marcan la noche: el ambiente (playa, centro de ciudad o barrio de terrazas no son la misma fiesta), el presupuesto (entrada y copas cambian mucho entre zonas), con quién vas (en grupo grande interesan los clubs grandes; en pareja o pocos amigos, las salas más pequeñas) y qué música buscas. La agenda de cada ciudad te deja filtrar por género y ver precio y horario antes de salir de casa.',
      comoFunciona: 'Where We Go detecta tu ubicación en el navegador, con tu permiso, y te lleva directo a la agenda de tu ciudad: discotecas, fiestas y DJs de hoy, de este finde o de toda la semana. Si prefieres no compartir tu ubicación, elige tu ciudad en la lista de abajo — el resultado es el mismo.',
      porQueUsar: 'En vez de buscar discoteca por discoteca, ves de un vistazo qué ciudades tienen agenda activa ahora mismo, con horarios, line-ups y el enlace directo para conseguir entradas. La agenda se actualiza a diario, así que lo que ves es lo que hay programado de verdad.',
    },
    en: {
      queElegir: "Before picking a club, four things shape the night: the vibe (beachfront, city centre and rooftop bars are not the same party), the budget (entry and drinks vary a lot between areas), who you're going with (big groups suit big clubs; small groups suit smaller venues) and what music you're after. Each city's listings let you filter by genre and check price and time before you leave home.",
      comoFunciona: "Where We Go detects your location in the browser, with your permission, and takes you straight to your city's listings: clubs, parties and DJs for today, this weekend or the whole week. Prefer not to share your location? Pick your city from the list below — same result.",
      porQueUsar: 'Instead of searching club by club, you see at a glance which cities have an active agenda right now, with times, line-ups and a direct link to buy tickets. Listings are updated daily, so what you see is what is actually scheduled.',
    },
    de: {
      queElegir: 'Vor der Clubwahl zählen vier Dinge: die Stimmung (Strandclub, Innenstadt und Dachterrasse sind nicht dieselbe Party), das Budget (Eintritt und Getränke unterscheiden sich stark je nach Gegend), mit wem du unterwegs bist (große Gruppen passen zu großen Clubs, kleinere Runden zu kleineren Locations) und welche Musik du hören willst. Im Programm jeder Stadt kannst du nach Musikrichtung filtern und Preis und Uhrzeit vorher checken.',
      comoFunciona: 'Where We Go erkennt mit deiner Erlaubnis deinen Standort im Browser und bringt dich direkt zum Programm deiner Stadt: Clubs, Partys und DJs für heute, dieses Wochenende oder die ganze Woche. Möchtest du deinen Standort nicht teilen? Wähle deine Stadt aus der Liste unten — gleiches Ergebnis.',
      porQueUsar: 'Statt Club für Club zu suchen, siehst du auf einen Blick, welche Städte gerade ein aktives Programm haben, mit Zeiten, Line-ups und direktem Link zum Ticketkauf. Das Programm wird täglich aktualisiert, du siehst also, was wirklich geplant ist.',
    },
  }
  return copy[locale] || copy[routing.defaultLocale]
}

export function nearFaqHeading(locale: string) {
  return zoneFaqHeading(locale)
}

export function nearFaq(locale: string): ZoneFaq[] {
  const copy: Record<string, ZoneFaq[]> = {
    es: [
      { q: '¿Where We Go usa mi ubicación para algo más?', a: 'No. Tu ubicación solo se usa en el navegador para identificar tu ciudad y mostrarte su agenda; no se guarda ni se comparte.' },
      { q: '¿Qué pasa si mi ciudad no tiene agenda todavía?', a: 'Te mostramos las ciudades activas para que elijas dónde salir esta noche mientras se abre agenda en la tuya.' },
      { q: '¿Es gratis usar Where We Go?', a: 'Sí, consultar la agenda es gratis. Las entradas de cada evento las gestiona directamente el club o promotor a través del enlace de compra.' },
      { q: '¿Con qué frecuencia se actualiza la agenda?', a: 'A diario. Clubs y promotores publican sus fiestas y line-ups directamente en Where We Go.' },
    ],
    en: [
      { q: 'Does Where We Go use my location for anything else?', a: 'No. Your location is only used in the browser to identify your city and show its listings; it is never stored or shared.' },
      { q: "What if my city doesn't have listings yet?", a: 'We show you the active cities so you can pick where to go out tonight while yours gets covered.' },
      { q: 'Is Where We Go free to use?', a: 'Yes, browsing the listings is free. Tickets for each event are handled directly by the club or promoter through the purchase link.' },
      { q: 'How often are listings updated?', a: 'Daily. Clubs and promoters publish their parties and line-ups directly on Where We Go.' },
    ],
    de: [
      { q: 'Nutzt Where We Go meinen Standort für etwas anderes?', a: 'Nein. Dein Standort wird nur im Browser genutzt, um deine Stadt zu erkennen und ihr Programm zu zeigen; er wird nicht gespeichert oder weitergegeben.' },
      { q: 'Was, wenn meine Stadt noch kein Programm hat?', a: 'Wir zeigen dir die aktiven Städte, damit du wählen kannst, wo du heute Nacht feierst, während deine Stadt aufgebaut wird.' },
      { q: 'Ist Where We Go kostenlos?', a: 'Ja, das Programm anzusehen ist kostenlos. Tickets für jedes Event werden direkt vom Club oder Veranstalter über den Kauflink abgewickelt.' },
      { q: 'Wie oft wird das Programm aktualisiert?', a: 'Täglich. Clubs und Veranstalter veröffentlichen ihre Partys und Line-ups direkt auf Where We Go.' },
    ],
  }
  return copy[locale] || copy[routing.defaultLocale]
}

// Islas: en aleman la preposicion correcta es "auf" (auf Mallorca, auf Ibiza),
// no "in" como en una ciudad. Un titulo "Partys in Mallorca" es un error
// gramatical que cualquier hablante nativo nota al momento.
const GERMAN_ISLAND_ZONES = new Set(['Mallorca', 'Ibiza', 'Menorca', 'Formentera'])
function germanZonePrep(zone: string) {
  return GERMAN_ISLAND_ZONES.has(zone) ? 'auf' : 'in'
}

// Pagina de zona. Estaba escrita solo en espanol aunque la URL fuese /en o
// /de, asi que /en/mallorca competia en Google con un titulo en castellano.
export function zoneMeta(zone: string, locale: string) {
  const prep = germanZonePrep(zone)
  const copy: Record<string, { title: string; description: string; eyebrow: string; intro: string; clubs: string; events: string; empty: string }> = {
    es: {
      title: `Las mejores fiestas en ${zone}: discotecas y DJs`,
      description: `¿Dónde salir en ${zone}? Las mejores fiestas, discotecas y DJs de la zona, con agenda actualizada a diario, horarios, precios y entradas.`,
      eyebrow: 'Zona',
      intro: `¿Dónde salir de fiesta en ${zone}? La agenda con discotecas, DJs y eventos actualizada a diario. Encuentra tu plan y reserva entradas con Where We Go.`,
      clubs: `Discotecas en ${zone}`,
      events: `Próximos eventos en ${zone}`,
      empty: `No hay eventos programados en ${zone} ahora mismo.`,
    },
    en: {
      title: `Best Parties in ${zone}: Clubs, DJs and Events`,
      description: `Where's the best party in ${zone}? Top clubs, DJs and events in the area, with daily listings, times, prices and tickets.`,
      eyebrow: 'Area',
      intro: `The listings for the best parties in ${zone}: clubs, DJs and events updated daily. Find your plan and book tickets with Where We Go.`,
      clubs: `Clubs in ${zone}`,
      events: `Upcoming events in ${zone}`,
      empty: `Nothing is scheduled in ${zone} right now.`,
    },
    de: {
      title: `Die besten Partys ${prep} ${zone}: Clubs und DJs`,
      description: `Wo steigt die Party ${prep} ${zone}? Die besten Clubs, DJs und Events der Gegend, täglich aktualisiert mit Zeiten, Preisen und Tickets.`,
      eyebrow: 'Gegend',
      intro: `Wo feiert man ${prep} ${zone}? Das Programm mit Clubs, DJs und Events, täglich aktualisiert. Finde deinen Plan und buche Tickets mit Where We Go.`,
      clubs: `Clubs ${prep} ${zone}`,
      events: `Kommende Events ${prep} ${zone}`,
      empty: `Aktuell ist nichts ${prep} ${zone} geplant.`,
    },
  }
  return copy[locale] || copy[routing.defaultLocale]
}

// Preguntas frecuentes de una pagina de ciudad, redactadas con los datos
// reales de su agenda.
//
// Responde lo que se pregunta de verdad antes de salir (a que hora, cuanto
// cuesta, que noche, que suena) y es lo unico de la pagina que no caduca con
// los eventos. Sin schema FAQPage a proposito: desde agosto de 2023 Google
// solo da resultado enriquecido a sitios de administracion y salud, asi que
// el marcado no aportaria nada; el texto visible si, tanto al usuario como a
// los buscadores de IA, que citan pasajes.
const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

const WEEKDAY_NAMES: Record<string, Record<(typeof WEEKDAY_KEYS)[number], string>> = {
  es: { sunday: 'domingo', monday: 'lunes', tuesday: 'martes', wednesday: 'miércoles', thursday: 'jueves', friday: 'viernes', saturday: 'sábado' },
  en: { sunday: 'Sunday', monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday' },
  de: { sunday: 'Sonntag', monday: 'Montag', tuesday: 'Dienstag', wednesday: 'Mittwoch', thursday: 'Donnerstag', friday: 'Freitag', saturday: 'Samstag' },
}

export type ZoneFaq = { q: string; a: string }

export function zoneFaq(
  zone: string,
  locale: string,
  facts: {
    events: number; venues: number; usualStartHour: number | null
    priceMin: number | null; priceMax: number | null
    busiestWeekday: number | null; topGenres: string[]
  },
): ZoneFaq[] {
  const l = WEEKDAY_NAMES[locale] ? locale : routing.defaultLocale
  const day = facts.busiestWeekday === null ? null : WEEKDAY_NAMES[l][WEEKDAY_KEYS[facts.busiestWeekday]]
  const hour = facts.usualStartHour === null ? null : `${String(facts.usualStartHour).padStart(2, '0')}:00`
  const genres = facts.topGenres.slice(0, 3).join(', ')
  // Castellon tiene una sola sala y la respuesta salia como "seguimos 1 salas
  // con 11 fiestas". Es el unico sitio donde estas cifras se leen en una frase.
  const n = (uno: string, varios: string, cantidad: number) => (cantidad === 1 ? uno : varios)
  const salas = n('sala', 'salas', facts.venues)
  const fiestas = n('fiesta anunciada', 'fiestas anunciadas', facts.events)
  const venues = n('venue', 'venues', facts.venues)
  const parties = n('announced party', 'announced parties', facts.events)
  const clubsDe = n('Club', 'Clubs', facts.venues)
  const partysDe = n('angekündigte Party', 'angekündigte Partys', facts.events)
  const price = facts.priceMin === null ? null
    : facts.priceMax !== null && facts.priceMax !== facts.priceMin
      ? `${facts.priceMin} - ${facts.priceMax} €`
      : `${facts.priceMin} €`

  const out: ZoneFaq[] = []
  const copy = {
    es: {
      hour: { q: `¿A qué hora empiezan las fiestas en ${zone}?`, a: `La mayoría de las sesiones en ${zone} arrancan sobre las ${hour}. Cada ficha lleva su hora exacta, porque las de terraza y las de after se salen de ese horario.` },
      price: { q: `¿Cuánto cuesta la entrada en ${zone}?`, a: `Las entradas de la agenda actual de ${zone} van de ${price}. El precio depende del cartel y de si compras anticipada o en puerta.` },
      day: { q: `¿Qué noche se sale más en ${zone}?`, a: `El ${day} es el día con más fiestas programadas en ${zone} ahora mismo. Es también cuando más salas abren a la vez.` },
      genres: { q: `¿Qué música suena en ${zone}?`, a: `Lo que más se programa en ${zone} es ${genres}. Puedes filtrar la agenda por género para ver solo lo tuyo.` },
      venues: { q: `¿Cuántas discotecas hay en ${zone}?`, a: `Ahora mismo seguimos ${facts.venues} ${salas} de ${zone} con ${facts.events} ${fiestas}. La agenda se actualiza a diario.` },
    },
    en: {
      hour: { q: `What time do parties start in ${zone}?`, a: `Most sets in ${zone} kick off around ${hour}. Each listing shows its exact time, since rooftop and after parties fall outside that window.` },
      price: { q: `How much is a ticket in ${zone}?`, a: `Tickets in the current ${zone} listings run ${price}. The price depends on the line-up and on whether you buy in advance or at the door.` },
      day: { q: `Which night is biggest in ${zone}?`, a: `${day} is the busiest night in ${zone} right now. It is also when the most venues open at once.` },
      genres: { q: `What music is played in ${zone}?`, a: `The most programmed sounds in ${zone} are ${genres}. You can filter the listings by genre to see only what you want.` },
      venues: { q: `How many clubs are there in ${zone}?`, a: `We currently track ${facts.venues} ${venues} in ${zone} with ${facts.events} ${parties}. Listings are updated daily.` },
    },
    de: {
      hour: { q: `Wann beginnen die Partys ${germanZonePrep(zone)} ${zone}?`, a: `Die meisten Sets ${germanZonePrep(zone)} ${zone} starten gegen ${hour}. Jede Veranstaltung zeigt ihre genaue Uhrzeit, denn Rooftop- und After-Partys fallen aus diesem Rahmen.` },
      price: { q: `Was kostet der Eintritt ${germanZonePrep(zone)} ${zone}?`, a: `Die Tickets im aktuellen Programm von ${zone} liegen bei ${price}. Der Preis hängt vom Line-up ab und davon, ob du im Vorverkauf oder an der Tür kaufst.` },
      day: { q: `An welchem Abend ist ${germanZonePrep(zone)} ${zone} am meisten los?`, a: `${day} ist aktuell der Abend mit den meisten Partys ${germanZonePrep(zone)} ${zone}. Dann öffnen auch die meisten Clubs gleichzeitig.` },
      genres: { q: `Welche Musik läuft ${germanZonePrep(zone)} ${zone}?`, a: `Am häufigsten läuft ${germanZonePrep(zone)} ${zone} ${genres}. Du kannst das Programm nach Musikrichtung filtern.` },
      venues: { q: `Wie viele Clubs gibt es ${germanZonePrep(zone)} ${zone}?`, a: `Wir verfolgen derzeit ${facts.venues} ${clubsDe} ${germanZonePrep(zone)} ${zone} mit ${facts.events} ${partysDe}. Täglich aktualisiert.` },
    },
  }[l]!

  // Solo entra la pregunta que tiene dato detras. Una FAQ que responde
  // "null euros" es peor que no tener FAQ.
  if (hour) out.push(copy.hour)
  if (price) out.push(copy.price)
  if (day) out.push(copy.day)
  if (genres) out.push(copy.genres)
  if (facts.venues > 0) out.push(copy.venues)
  return out
}

export function zoneFaqHeading(locale: string) {
  const copy: Record<string, string> = {
    es: 'Preguntas frecuentes',
    en: 'Frequently asked questions',
    de: 'Häufige Fragen',
  }
  return copy[locale] || copy[routing.defaultLocale]
}

// ─────────────────────────────────────────────────────────────────────────────
// Guia evergreen de la pagina de ciudad
//
// El FAQ de arriba depende de la agenda: sin eventos no hay hora pico, ni dia
// mas fuerte, ni genero, y la pagina se queda en el titulo y un listado vacio.
// Esta guia es lo contrario: texto fijo, investigado una vez con fuentes
// externas, que no depende de que haya inventario. Es lo que sostiene la URL
// indexada mientras se rellena la agenda real, y lo que responde el "que
// zona elijo" y "cuanto me va a costar" que no esta en ningun dato nuestro.
//
// Solo entran ciudades que se han investigado de verdad: sin entrada aqui, la
// pagina de esa zona sigue funcionando igual que antes (agenda + FAQ dinamico),
// simplemente sin este bloque. Nunca se rellena con una plantilla generica.
export type ZoneGuide = {
  intro: string
  zonas: { titulo: string; texto: string }[]
  temporada: string
  discotecasFamosas: string
  transporte: string
  precio: string
  vestimenta: string
  seguridad: string
}

const ZONE_GUIDES: Record<string, Record<string, ZoneGuide>> = {
  Mallorca: {
    es: {
      intro: 'La vida nocturna de Mallorca mueve tanto a quien vive en la isla como al turista que llega unos días en verano. Hay oferta para casi cualquier plan: clubs de playa con ambiente turístico, salas de música electrónica con nivel internacional y terrazas de barrio para empezar la noche con calma. En los años 60 la isla llegó a tener más discotecas que Madrid y Barcelona juntas, y ese peso todavía se nota: la fiesta en Mallorca no es solo un complemento del turismo de sol y playa, es una industria propia con décadas de historia detrás.',
      zonas: [
        { titulo: 'Magaluf y Punta Ballena', texto: 'La zona más intensa de la isla. Punta Ballena es una calle de poco más de un kilómetro con decenas de bares y clubs seguidos, pensada para ir de garito en garito en la misma noche. Ambiente joven y muy turístico, sobre todo en verano, con el mayor volumen de discotecas grandes de Mallorca.' },
        { titulo: 'Palma y el Paseo Marítimo', texto: 'La zona con clubs más grandes y line-ups internacionales, junto al puerto deportivo. Aquí está la fiesta con más nivel de producción de la isla, con entradas y dress code algo más exigentes que en Magaluf.' },
        { titulo: 'Santa Catalina', texto: 'El antiguo barrio de pescadores de Palma, hoy reconvertido en la zona de cócteles y terrazas de moda. Menos discoteca y más plan de empezar la noche, con público local y ambiente más tranquilo.' },
        { titulo: 'El Arenal y Can Pastilla', texto: 'Zona de playa entre Palma y Magaluf, con clubs y bares más económicos y un público mixto entre turista y local. Buena opción si se busca fiesta sin los precios de Palma centro.' },
        { titulo: 'Alcúdia y la bahía norte', texto: 'Junto con Magaluf, el otro gran polo de fiesta veraniega de la isla. Ambiente más familiar durante el día y clubs de playa por la noche, con público más internacional y menos concentrado que en el sur.' },
      ],
      temporada: 'La fiesta en Mallorca es muy estacional. La mayoría de las discotecas grandes de Magaluf y Alcúdia abren solo entre abril/mayo y octubre, y cierran por completo en invierno (de noviembre a marzo). Junio, julio y agosto son la temporada alta, con más ambiente pero también más aglomeración y precios más caros. Septiembre suele ser el mes mejor valorado por quien ya conoce la isla: sigue haciendo calor, el mar está a buena temperatura y las zonas turísticas están mucho más tranquilas. En Palma, algunas salas de música electrónica y clubs de ciudad se mantienen abiertos todo el año, al margen de la temporada de playa.',
      discotecasFamosas: 'BCM Planet Dance, en Magaluf, es una de las discotecas más grandes de Europa: más de 38 años de historia, capacidad para varios miles de personas y line-ups con DJs internacionales cada temporada, de abril a octubre. Pachá tiene también una sala en Palma, junto al Paseo Marítimo, dentro del mismo grupo que hizo famosa la marca en Ibiza. Tito\'s, la discoteca centenaria de Palma por la que pasaron desde Josephine Baker hasta Grace Kelly, cerró definitivamente en 2021 y hoy ya no existe como local: se menciona aquí porque sigue siendo parte de la historia de la vida nocturna de la isla, no porque siga abierta. La agenda de Where We Go recoge las salas que están activas ahora mismo, no un ranking histórico.',
      transporte: 'Palma tiene un servicio de autobús nocturno (líneas NIT) que conecta el centro con las zonas periféricas, con parada común en Plaza de España para cambiar de línea. Fuera de Palma, en Magaluf y Alcúdia, el transporte público nocturno es mucho más limitado y la opción habitual es el taxi. En las noches de verano, sobre todo a la salida de las discotecas de madrugada, encontrar taxi libre puede costar bastante: conviene reservarlo con antelación o compartirlo. Se recomienda usar siempre taxis oficiales o aplicaciones de VTC reconocidas, nunca coches sin licencia que se ofrecen a pie de calle.',
      precio: 'La entrada estándar en la mayoría de discotecas de Mallorca ronda entre 10 y 25 €, según la noche y el cartel. Los clubs más grandes de Magaluf y Palma pueden subir de 30 € en fechas con DJs internacionales, con reservados y zonas VIP a partir de 100 € por persona. Las copas suelen costar entre 3 y 8 €. Cada ficha de evento en Where We Go lleva su precio real cuando el promotor lo publica.',
      vestimenta: 'El código de vestimenta depende del tipo de local. En los clubs de playa y en las zonas más turísticas de Magaluf el ambiente es informal, aunque en los locales con más nivel piden ir arreglado. En las salas de música electrónica de Palma el criterio es más relajado: lo habitual es ropa cómoda, sin chanclas ni bañador.',
      seguridad: 'Las zonas más turísticas, como Magaluf, Palma centro y El Arenal, son las que más registran hurtos y descuidos: vigila tus bebidas, no las pierdas de vista y evita dejarlas con desconocidos. Se recomienda no caminar solo de madrugada por calles poco transiluminadas cerca de las zonas de fiesta y volver siempre acompañado o en taxi. Beber en la calle fuera de los locales autorizados no está permitido y puede acabar en sanción. Como en cualquier zona turística con mucha afluencia nocturna, ir con el grupo, controlar el ritmo de bebida y planear la vuelta antes de salir reduce casi todos los riesgos.',
    },
    en: {
      intro: 'Mallorca nightlife moves both the people who live on the island and the tourists who land for a few summer days. There is something for almost every plan: beach clubs with a touristy crowd, electronic music venues with an international line-up, and neighbourhood rooftops to start the night slowly. Back in the 1960s the island had more nightclubs than Madrid and Barcelona combined, and that weight still shows: Mallorca´s nightlife is not just a side effect of sun-and-beach tourism, it is its own industry with decades of history behind it.',
      zonas: [
        { titulo: 'Magaluf and Punta Ballena', texto: 'The most intense area on the island. Punta Ballena is a strip just over a kilometre long, packed with bars and clubs back to back, built for bar-hopping in the same night. Young, very touristy crowd, especially in summer, with the highest concentration of big clubs on the island.' },
        { titulo: 'Palma and the Paseo Marítimo', texto: 'Home to the biggest clubs and international line-ups, right by the marina. This is the island´s highest-production nightlife, with entry prices and dress code a notch stricter than Magaluf.' },
        { titulo: 'Santa Catalina', texto: 'Palma´s old fishermen´s quarter, now the trendy cocktail-and-rooftop area. Less club, more pre-party: local crowd, calmer vibe.' },
        { titulo: 'El Arenal and Can Pastilla', texto: 'A beach area between Palma and Magaluf with cheaper clubs and bars and a mixed local-tourist crowd. A good option if you want to party without Palma centre prices.' },
        { titulo: 'Alcúdia and the northern bay', texto: 'Along with Magaluf, the island´s other big summer party hub. More of a family vibe during the day and beach clubs at night, with a more international, less packed crowd than the south.' },
      ],
      temporada: 'Partying in Mallorca is highly seasonal. Most of the big clubs in Magaluf and Alcúdia only open between April/May and October, closing completely over winter (November to March). June, July and August are peak season, with the most energy but also the biggest crowds and highest prices. September is usually the best-rated month for anyone who already knows the island: still warm, the sea still comfortable, and the touristy areas far calmer. In Palma, some electronic music clubs and city venues stay open all year, regardless of the beach season.',
      discotecasFamosas: 'BCM Planet Dance, in Magaluf, is one of the biggest nightclubs in Europe: over 38 years of history, capacity for several thousand people and international DJ line-ups every season, from April to October. Pachá also runs a venue in Palma, by the Paseo Marítimo, part of the same group that made the brand famous in Ibiza. Tito´s, Palma´s century-old club that once hosted everyone from Josephine Baker to Grace Kelly, closed for good in 2021 and no longer exists as a venue: it´s mentioned here as part of the island´s nightlife history, not because it´s still open. Where We Go´s listings only cover venues that are active right now, not a historical ranking.',
      transporte: 'Palma runs a night bus service (NIT lines) connecting the centre with outlying areas, with a shared stop at Plaza de España for changing lines. Outside Palma, in Magaluf and Alcúdia, night public transport is much more limited and taxis are the usual option. On summer nights, especially right after clubs close in the early hours, finding a free taxi can take a while: it´s worth booking ahead or sharing one. Always use official taxis or recognised ride-hailing apps, never unlicensed cars offered on the street.',
      precio: 'A standard club ticket in Mallorca runs roughly €10 to €25, depending on the night and the line-up. The bigger clubs in Magaluf and Palma can go above €30 on nights with international DJs, with tables and VIP areas starting around €100 per person. Drinks usually cost €3 to €8. Every event listing on Where We Go carries its real price when the promoter publishes one.',
      vestimenta: 'Dress code depends on the venue. Beach clubs and the touristy parts of Magaluf are casual, though the higher-end venues expect something smarter. Palma´s electronic music clubs are more relaxed: comfortable clothes are fine, just no flip-flops or swimwear.',
      seguridad: 'The most touristy areas, like Magaluf, central Palma and El Arenal, see the most petty theft and unattended drinks: keep an eye on your glass and never leave it with strangers. It´s best to avoid walking alone in the early hours through poorly lit streets near the party areas, and to head back with company or by taxi. Drinking in the street outside licensed venues isn´t allowed and can lead to a fine. As with any busy tourist nightlife area, sticking with your group, pacing your drinking and planning the way back before you go out removes most of the risk.',
    },
    de: {
      // Reescrita para el mercado aleman, no traducida del castellano. Los
      // datos de volumen (Ubersuggest, Alemania) dicen que la duda numero uno
      // no es "wo feiern" sino donde esta el Ballermann y que significa el
      // numero: "ballermann" 33.100/mes, "ballermann 6" 18.100, "wo ist
      // ballermann" y variantes ~4.200, "ballermann opening 2026" 1.900,
      // "closing" 880. Por eso la intro abre respondiendo eso y la temporada
      // habla de Opening y Closing por su nombre.
      intro: 'Der Ballermann ist keine einzelne Disco, sondern ein ganzer Strandabschnitt: die Balnearios 1 bis 15 an der Playa de Palma, gut zehn Autominuten vom Flughafen Palma entfernt. Der bekannteste ist der Balneario 6 — der „Ballermann 6", für die meisten schlicht der Ballermann. Rundherum liegen Megapark, Bierkönig und die Bars der Schinkenstraße. Wer zum ersten Mal kommt, sucht meist genau das. Die Insel hat aber deutlich mehr: internationale Clubs am Paseo Marítimo in Palma, junge Partymeilen in Cala Ratjada und ruhigere Strandbars abseits des Trubels.',
      zonas: [
        { titulo: 'Ballermann und Playa de Palma (Balneario 1–15)', texto: 'Die Partymeile schlechthin. Der Balneario 6 ist das Zentrum, von dort läuft man in wenigen Minuten zu Megapark, Bierkönig und Schinkenstraße. Deutsche Party- und Schlagermusik, Stimmung ab nachmittags. Der östliche Teil heißt El Arenal, Richtung Westen geht es nach Can Pastilla.' },
        { titulo: 'Cala Ratjada', texto: 'Der zweite große deutsche Hotspot, im Nordosten der Insel. Deutlich jüngeres Publikum als am Ballermann, viele Gruppen- und Abschlussfahrten. Die Bars liegen dicht beieinander rund um den Hafen, sodass man den ganzen Abend zu Fuß unterwegs sein kann.' },
        { titulo: 'Magaluf und Punta Ballena', texto: 'Das britische Gegenstück zum Ballermann, im Südwesten. Wer statt deutscher Partymusik internationale Line-ups sucht, ist hier richtig: die Punta Ballena ist gut einen Kilometer lang und voller Clubs direkt nebeneinander.' },
        { titulo: 'Palma und der Paseo Marítimo', texto: 'Nachtleben abseits des Pauschaltourismus. Am Yachthafen stehen die größten Clubs der Insel, House und Techno statt Schlager. Eintritt und Dresscode sind eine Stufe strenger als am Ballermann.' },
        { titulo: 'Santa Ponsa und Peguera', texto: 'Ruhiger und familiärer, mit gemischtem deutsch-britischem Publikum. Gute Wahl, wenn man abends ausgehen will, ohne mitten im Trubel zu wohnen.' },
      ],
      temporada: 'Die Ballermann-Saison läuft etwa von Ende April bis Oktober. Das Opening Ende April oder Anfang Mai und das Closing im Oktober sind eigene Großereignisse, für die viele extra anreisen — es sind jedes Jahr die meistgesuchten Termine der Saison. Hochsaison ist Juli und August: am meisten los, aber auch am vollsten und teuersten. September gilt bei Malle-Kennern als bester Monat, weil es noch warm ist und die Strandpromenade deutlich entspannter. Von November bis März sind die großen Läden an der Playa de Palma geschlossen; nur in Palma laufen einige Clubs das ganze Jahr. Die aktuellen Termine stehen im Programm auf dieser Seite.',
      discotecasFamosas: 'Der Megapark an der Playa de Palma ist die größte und bekannteste Adresse am Ballermann, mit Bühne, Live-Acts und Schlagerprogramm bis in die Nacht. Der Bierkönig gleich nebenan ist der zweite Klassiker und für viele der eigentliche Kern des Ballermanns. Internationaler wird es im BCM Planet Dance in Magaluf, einem der größten Clubs Europas, und bei Pachá am Paseo Marítimo in Palma, einem Ableger der Marke, die auf Ibiza bekannt wurde. Das Programm von Where We Go zeigt die Locations, die gerade aktiv sind, kein festes Ranking.',
      transporte: 'Vom Flughafen Palma (PMI) sind es rund zehn Minuten mit dem Taxi zur Playa de Palma — einer der Gründe, warum sich auch ein Kurztrip lohnt. Innerhalb der Playa läuft man alles zu Fuß. Nach Palma hinein fahren die EMT-Linien 23 und 25, nachts deutlich seltener. In den frühen Morgenstunden ist das Taxi meist die einzige realistische Option, und in der Hochsaison können die Wartezeiten an den Ständen lang werden. Immer offizielle Taxis nehmen, nie Fahrer, die einen auf der Straße ansprechen. Und: Mietwagen und Feiern schließen sich aus, die Kontrollen auf der Insel sind streng.',
      precio: 'In den meisten Bars am Ballermann zahlt man keinen Eintritt — das Geld geht für Getränke drauf, ein Bier liegt je nach Laden bei etwa 4 bis 8 €. Der Megapark verlangt je nach Veranstaltung Eintritt. In den großen Clubs in Palma und Magaluf liegt er meist zwischen 15 und 30 €, an Abenden mit internationalen DJs auch darüber; Tische und VIP-Bereiche starten ab rund 100 € pro Person. Im Vorverkauf ist es fast immer günstiger als an der Tür. Den genauen Preis zeigt jede Veranstaltung, sobald der Veranstalter ihn veröffentlicht.',
      vestimenta: 'Am Ballermann gibt es praktisch keinen Dresscode: Shorts, Trikot und Flip-Flops sind völlig normal, viele kommen direkt vom Strand. Trikots und Gruppen-Shirts gehören für viele zum Malle-Urlaub dazu. In den großen Clubs am Paseo Marítimo in Palma sieht das anders aus — dort wird gepflegte Kleidung erwartet, Badekleidung und Sportsachen kommen nicht durch die Tür. In Magaluf liegt es dazwischen und hängt vom Laden ab.',
      seguridad: 'In der Hochsaison sind Taschendiebstähle an der Playa de Palma häufig: Handy und Geldbeutel nah am Körper tragen und Getränke nie unbeaufsichtigt stehen lassen. Trinken auf offener Straße außerhalb der Lokale ist auf Mallorca verboten und wird mit Bußgeldern geahndet; an der Playa de Palma gelten zusätzlich verschärfte Regeln gegen Alkoholexzesse. In den frühen Morgenstunden nicht allein durch schlecht beleuchtete Straßen laufen, sondern in Begleitung oder mit dem Taxi zurück. Wer in der Gruppe bleibt, das Trinktempo im Blick behält und den Rückweg vorher plant, hat mit dem Rest keine Probleme.',
    },
  },
  Madrid: {
    es: {
      intro: 'Madrid es la ciudad con más vida nocturna de España: no hay una sola zona de fiesta, sino varios barrios con personalidad propia, y la noche empieza tarde y se alarga hasta el amanecer casi cualquier día de la semana, no solo el fin de semana. Es una ciudad donde se puede salir de fiesta los doce meses del año, sin depender de la temporada de playa.',
      zonas: [
        { titulo: 'Malasaña', texto: 'El barrio que fue el centro de la Movida madrileña de los 80. Ambiente alternativo e indie, con bares de copas, música en directo y salas más pequeñas que en otras zonas.' },
        { titulo: 'Chueca', texto: 'El barrio con más ambiente de fiesta del centro, epicentro también del ocio LGTBI+ de la ciudad. Música electrónica, pop y reggaetón, con la Plaza de Chueca como punto de encuentro.' },
        { titulo: 'Triángulo del arte y Huertas', texto: 'Zona donde están las discotecas más grandes y conocidas de la ciudad, como Teatro Kapital o Teatro Barceló. Ambiente más de discoteca clásica que de bar de barrio, con entradas y dress code más exigentes.' },
        { titulo: 'La Latina', texto: 'Más de tapeo y terraza que de discoteca, sobre todo los domingos después del Rastro. Buen punto de partida para empezar la noche antes de moverse a otra zona.' },
      ],
      temporada: 'A diferencia de las ciudades de costa, Madrid no cierra su vida nocturna en invierno: las discotecas del centro abren todo el año, de jueves a domingo en su mayoría. El verano suma las terrazas al aire libre y algún macrofestival, pero la agenda de clubs se mantiene activa en cualquier época.',
      discotecasFamosas: 'Teatro Kapital, con siete plantas y ambientes distintos, es la discoteca más conocida de la ciudad, en pleno triángulo del arte. Teatro Barceló ocupa un antiguo cine de los años 30 reconvertido en sala, con una estética teatral que lo diferencia del resto. Fabrik, a las afueras de Madrid en Humanes, es una de las macrodiscotecas de música electrónica más grandes de España, con aforo para varios miles de personas. La agenda de Where We Go recoge las salas activas ahora mismo, no un ranking fijo.',
      transporte: 'El Metro de Madrid cierra entre la 1:30 y las 2:00, con algún refuerzo los fines de semana. A partir de ahí entra en marcha la red de autobuses nocturnos, conocidos como "búhos", con salida principal desde la Plaza de Cibeles y frecuencias de 15 a 35 minutos según la línea. El taxi es la alternativa más rápida de madrugada: los taxis oficiales llevan licencia visible, GPS y no aplican tarifas dinámicas como sí hacen algunas apps de VTC.',
      precio: 'La entrada a una discoteca de Madrid suele rondar entre 15 y 25 € con una consumición incluida, tanto en Teatro Kapital como en Teatro Barceló. En Fabrik, según el evento, puede ir de 20 a 60 €. Comprar la entrada anticipada suele salir más barato que pagar en puerta.',
      vestimenta: 'Las discotecas grandes del centro (Kapital, Barceló) suelen pedir ir arreglado, sin ropa deportiva. En Malasaña y Chueca el ambiente es bastante más relajado, con ropa informal aceptada en la mayoría de locales.',
      seguridad: 'Las zonas más concurridas de fiesta (Malasaña, Chueca, Huertas) son también las más vigiladas, con bastante gente en la calle hasta tarde. Aun así, conviene vigilar tus pertenencias entre la multitud y no perder de vista tu copa. El Metro y los búhos nocturnos son opciones seguras para volver a casa; si vas a beber, lo más sensato es planear el regreso antes de salir.',
    },
    en: {
      intro: 'Madrid is the city with the most nightlife in Spain: it is not one single party area but several neighbourhoods each with its own personality, and the night starts late and runs until dawn on almost any day of the week, not just weekends. It is a city where you can go out year-round, without depending on a beach season.',
      zonas: [
        { titulo: 'Malasaña', texto: 'The neighbourhood that was the centre of the 1980s Movida madrileña. Alternative, indie vibe, with cocktail bars, live music and smaller venues than other areas.' },
        { titulo: 'Chueca', texto: 'The most party-driven neighbourhood in the centre, also the hub of the city´s LGBTQ+ nightlife. Electronic, pop and reggaeton, with Plaza de Chueca as the meeting point.' },
        { titulo: 'Art Triangle and Huertas', texto: 'Home to the city´s biggest and best-known clubs, like Teatro Kapital or Teatro Barceló. More classic nightclub than neighbourhood bar, with stricter entry and dress code.' },
        { titulo: 'La Latina', texto: 'More tapas-and-terrace than nightclub, especially on Sundays after the Rastro flea market. A good starting point before moving to another area.' },
      ],
      temporada: 'Unlike coastal cities, Madrid doesn´t shut its nightlife down in winter: the central clubs stay open all year, mostly Thursday to Sunday. Summer adds outdoor terraces and the odd festival, but the club scene stays active regardless of season.',
      discotecasFamosas: 'Teatro Kapital, with seven floors and different vibes on each, is the city´s best-known club, right in the art triangle. Teatro Barceló occupies a converted 1930s cinema, with a theatrical look that sets it apart from the rest. Fabrik, on the outskirts of Madrid in Humanes, is one of Spain´s biggest electronic music superclubs, holding several thousand people. Where We Go´s listings show what´s active right now, not a fixed ranking.',
      transporte: 'The Madrid Metro closes between 1:30 and 2:00am, with extra service some weekends. After that, the night bus network known as "búhos" (owls) takes over, running mainly from Plaza de Cibeles with 15 to 35 minute frequencies depending on the line. A taxi is the fastest option in the small hours: official taxis carry a visible licence, GPS and don´t apply surge pricing the way some ride-hailing apps do.',
      precio: 'A club ticket in Madrid usually runs €15 to €25 with a drink included, both at Teatro Kapital and Teatro Barceló. At Fabrik, depending on the event, it can range from €20 to €60. Buying in advance is usually cheaper than paying at the door.',
      vestimenta: 'The big central clubs (Kapital, Barceló) usually expect smart dress, no sportswear. Malasaña and Chueca are far more relaxed, with casual clothing fine in most venues.',
      seguridad: 'The busiest party areas (Malasaña, Chueca, Huertas) are also the most watched, with plenty of people out late. Still, keep an eye on your belongings in the crowd and don´t lose sight of your drink. The Metro and night buses are safe ways home; if you´re drinking, planning your way back before heading out is the sensible move.',
    },
    de: {
      intro: 'Madrid ist die Stadt mit dem meisten Nachtleben Spaniens: keine einzelne Partyzone, sondern mehrere Viertel mit ganz eigenem Charakter, und die Nacht beginnt spät und geht fast an jedem Wochentag bis zum Morgengrauen, nicht nur am Wochenende. Eine Stadt, in der man das ganze Jahr ausgehen kann, unabhängig von einer Strandsaison.',
      zonas: [
        { titulo: 'Malasaña', texto: 'Das Viertel, das in den 1980ern das Zentrum der Movida madrileña war. Alternative, Indie-Atmosphäre, mit Cocktailbars, Live-Musik und kleineren Locations als in anderen Vierteln.' },
        { titulo: 'Chueca', texto: 'Das partyreichste Viertel im Zentrum, auch Zentrum des LGBTQ+-Nachtlebens der Stadt. Electronic, Pop und Reggaeton, mit der Plaza de Chueca als Treffpunkt.' },
        { titulo: 'Kunstdreieck und Huertas', texto: 'Hier stehen die größten und bekanntesten Clubs der Stadt, wie Teatro Kapital oder Teatro Barceló. Eher klassischer Nachtclub als Viertelbar, mit strengerem Einlass und Dresscode.' },
        { titulo: 'La Latina', texto: 'Eher Tapas und Terrasse als Nachtclub, besonders sonntags nach dem Rastro-Flohmarkt. Ein guter Startpunkt, bevor man in ein anderes Viertel weiterzieht.' },
      ],
      temporada: 'Anders als Küstenstädte legt Madrid sein Nachtleben im Winter nicht still: die zentralen Clubs bleiben das ganze Jahr geöffnet, meist von Donnerstag bis Sonntag. Der Sommer bringt zusätzlich Außenterrassen und das ein oder andere Festival, aber die Club-Szene bleibt unabhängig von der Saison aktiv.',
      discotecasFamosas: 'Teatro Kapital mit sieben Stockwerken und unterschiedlichen Stimmungen auf jedem ist der bekannteste Club der Stadt, mitten im Kunstdreieck. Teatro Barceló befindet sich in einem umgebauten Kino aus den 1930ern, mit einer theatralischen Optik, die es vom Rest abhebt. Fabrik, am Stadtrand von Madrid in Humanes, ist einer der größten Electronic-Superclubs Spaniens mit Platz für mehrere Tausend Gäste. Das Programm von Where We Go zeigt, was gerade aktiv ist, kein festes Ranking.',
      transporte: 'Die Madrider Metro schließt zwischen 1:30 und 2:00 Uhr, an manchen Wochenenden mit Zusatzservice. Danach übernimmt das Nachtbusnetz "búhos" (Eulen), hauptsächlich ab der Plaza de Cibeles, mit 15 bis 35 Minuten Takt je nach Linie. Ein Taxi ist in den frühen Morgenstunden die schnellste Option: offizielle Taxis haben sichtbare Lizenz, GPS und berechnen keine dynamischen Preise wie manche Fahrdienst-Apps.',
      precio: 'Der Eintritt in einen Madrider Club liegt meist bei 15 bis 25 € inklusive Getränk, sowohl im Teatro Kapital als auch im Teatro Barceló. Im Fabrik kann er je nach Event zwischen 20 und 60 € liegen. Der Vorverkauf ist meist günstiger als der Kauf an der Tür.',
      vestimenta: 'Die großen zentralen Clubs (Kapital, Barceló) erwarten meist gepflegte Kleidung, keine Sportbekleidung. In Malasaña und Chueca ist es deutlich lockerer, legere Kleidung reicht in den meisten Locations.',
      seguridad: 'Die belebtesten Partyviertel (Malasaña, Chueca, Huertas) sind auch die am besten überwachten, mit vielen Menschen bis spät auf der Straße. Trotzdem: im Gedränge auf die eigenen Sachen achten und das Glas nicht aus den Augen lassen. Metro und Nachtbusse sind sichere Heimwege; wer trinkt, plant den Rückweg am besten vorher.',
    },
  },
  Valencia: {
    es: {
      intro: 'Valencia combina la fiesta de playa con la de barrio urbano: no hay una única zona dominante, sino varias con ambientes muy distintos entre sí, desde los clubs frente al mar de la Malvarrosa hasta el ambiente alternativo de Ruzafa. Es una ciudad que se sale de fiesta durante todo el año, con un salto claro de intensidad en los meses de calor.',
      zonas: [
        { titulo: 'Playa de la Malvarrosa y el Puerto', texto: 'La zona de beach clubs de Valencia, con locales frente al mar que combinan chiringuito de día y discoteca de noche. Ambiente turístico y local a partes iguales en verano.' },
        { titulo: 'Ruzafa', texto: 'El barrio más alternativo y multicultural de la ciudad, con propuestas LGTBI+, música indie y electrónica experimental. Público joven e internacional.' },
        { titulo: 'El Carmen', texto: 'El casco histórico, con ambiente de bares de copas y música en vivo más que de gran discoteca. Buena zona para empezar la noche antes de moverse a la playa.' },
      ],
      temporada: 'Los clubs de playa de la Malvarrosa tienen temporada marcada: la mayoría abre a partir de la primavera y funciona a pleno rendimiento en verano, con las fiestas de julio y agosto como punto álgido. Las discotecas del centro y de Ruzafa, en cambio, mantienen agenda activa durante todo el año, sin depender del calor.',
      discotecasFamosas: 'Akuarela Playa es uno de los clubs de playa más conocidos de la Malvarrosa, con varias salas y vistas al mar. Marina Beach Club, junto al edificio Veles e Vents, es otra referencia de la zona del puerto. En el centro, Únic, en pleno barrio del Carmen, es una de las salas de referencia para fiestas temáticas. La agenda de Where We Go recoge las salas activas ahora mismo, no un ranking fijo.',
      transporte: 'El metro de Valencia suele cerrar sobre las 00:30, así que a partir de esa hora la vuelta depende del autobús nocturno de la EMT o del taxi. Varias líneas de la EMT dan servicio directo a las zonas de discotecas del puerto y la Malvarrosa, aunque conviene consultar el horario nocturno actualizado antes de salir, porque varía según la línea.',
      precio: 'La entrada a una discoteca en Valencia suele moverse entre 12 y 25 €, con algunos locales de playa o eventos especiales que suben hasta 40 €. Comprar con antelación suele ahorrar unos euros frente a pagar en puerta.',
      vestimenta: 'En los clubs de playa el ambiente es informal durante el día y algo más cuidado por la noche. En las salas del centro y del Carmen el criterio es relajado, salvo en eventos concretos con dress code propio.',
      seguridad: 'Las zonas más concurridas (Malvarrosa, Ruzafa, El Carmen) tienen buena presencia de gente hasta tarde, lo que ayuda a la sensación de seguridad, pero conviene vigilar bolsos y pertenencias en las zonas de playa más masificadas en verano. Volver en autobús nocturno, taxi o en grupo es la opción más sensata de madrugada.',
    },
    en: {
      intro: 'Valencia mixes beach partying with urban neighbourhood nightlife: there is no single dominant area, but several with very different vibes, from the seafront clubs in Malvarrosa to the alternative scene in Ruzafa. It is a city that parties year-round, with a clear jump in intensity during the hot months.',
      zonas: [
        { titulo: 'Malvarrosa beach and the Port', texto: 'Valencia´s beach club area, with seafront venues that mix a beach bar by day with a nightclub by night. Both tourist and local crowd in summer.' },
        { titulo: 'Ruzafa', texto: 'The city´s most alternative, multicultural neighbourhood, with LGBTQ+ spots, indie and experimental electronic music. Young, international crowd.' },
        { titulo: 'El Carmen', texto: 'The old town, more cocktail bars and live music than big clubs. A good place to start the night before heading to the beach.' },
      ],
      temporada: 'Malvarrosa´s beach clubs are strongly seasonal: most open from spring and run at full capacity in summer, peaking in July and August. The clubs in the centre and Ruzafa, on the other hand, keep an active listing year-round, regardless of the heat.',
      discotecasFamosas: 'Akuarela Playa is one of Malvarrosa´s best-known beach clubs, with several rooms and sea views. Marina Beach Club, next to the Veles e Vents building, is another reference point in the port area. In the centre, Únic, right in the Carmen neighbourhood, is a go-to for themed parties. Where We Go´s listings show what´s active right now, not a fixed ranking.',
      transporte: 'Valencia´s metro usually closes around 00:30, so after that getting home depends on the EMT night bus or a taxi. Several EMT lines serve the port and Malvarrosa club areas directly, though it´s worth checking the current night schedule before heading out, as it varies by line.',
      precio: 'A club ticket in Valencia usually runs €12 to €25, with some beach venues or special events going up to €40. Buying ahead usually saves a few euros compared to paying at the door.',
      vestimenta: 'Beach clubs are casual by day and a bit smarter by night. Venues in the centre and El Carmen are relaxed, except for specific events with their own dress code.',
      seguridad: 'The busiest areas (Malvarrosa, Ruzafa, El Carmen) have plenty of people out late, which helps, but keep an eye on bags and belongings in the more crowded beach areas in summer. Getting home by night bus, taxi or with your group is the sensible option in the small hours.',
    },
    de: {
      intro: 'Valencia verbindet Strandparty mit urbanem Viertel-Nachtleben: es gibt keine einzelne dominante Zone, sondern mehrere mit ganz unterschiedlicher Atmosphäre, von den Strandclubs in Malvarrosa bis zur alternativen Szene in Ruzafa. Eine Stadt, die das ganze Jahr feiert, mit deutlichem Intensitaetssprung in den heißen Monaten.',
      zonas: [
        { titulo: 'Strand Malvarrosa und der Hafen', texto: 'Valencias Beachclub-Gegend, mit Strandlocations, die tagsüber Strandbar und nachts Nachtclub sind. Im Sommer touristisches und lokales Publikum gleichermaßen.' },
        { titulo: 'Ruzafa', texto: 'Das alternativste, multikulturellste Viertel der Stadt, mit LGBTQ+-Locations, Indie und experimenteller Electronic-Musik. Junges, internationales Publikum.' },
        { titulo: 'El Carmen', texto: 'Die Altstadt, eher Cocktailbars und Live-Musik als große Clubs. Ein guter Ort, um die Nacht zu beginnen, bevor es an den Strand geht.' },
      ],
      temporada: 'Die Strandclubs von Malvarrosa sind stark saisonabhängig: die meisten öffnen ab dem Frühling und laufen im Sommer auf Hochtouren, mit Höhepunkt im Juli und August. Die Clubs im Zentrum und in Ruzafa dagegen haben das ganze Jahr über ein aktives Programm, unabhängig von der Hitze.',
      discotecasFamosas: 'Akuarela Playa ist einer der bekanntesten Strandclubs von Malvarrosa, mit mehreren Räumen und Meerblick. Marina Beach Club, neben dem Gebäude Veles e Vents, ist ein weiterer Fixpunkt im Hafengebiet. Im Zentrum ist Únic, mitten im Carmen-Viertel, ein Anlaufpunkt für Themenpartys. Das Programm von Where We Go zeigt, was gerade aktiv ist, kein festes Ranking.',
      transporte: 'Die Metro von Valencia schließt meist gegen 0:30 Uhr, danach hängt der Heimweg vom EMT-Nachtbus oder Taxi ab. Mehrere EMT-Linien bedienen die Club-Gegenden am Hafen und in Malvarrosa direkt, es lohnt sich aber, den aktuellen Nachtfahrplan vorher zu prüfen, da er je nach Linie variiert.',
      precio: 'Der Eintritt in einen Club in Valencia liegt meist bei 12 bis 25 €, bei manchen Strandlocations oder Sonderevents bis zu 40 €. Der Vorverkauf spart meist ein paar Euro gegenüber dem Kauf an der Tür.',
      vestimenta: 'Strandclubs sind tagsüber leger und abends etwas gepflegter. Locations im Zentrum und in El Carmen sind entspannt, außer bei bestimmten Events mit eigenem Dresscode.',
      seguridad: 'Die belebtesten Gegenden (Malvarrosa, Ruzafa, El Carmen) haben bis spät viele Menschen auf der Straße, was hilft, aber im Sommer sollte man in den überfüllteren Strandbereichen auf Taschen und Wertsachen achten. Nachtbus, Taxi oder die Rückkehr in der Gruppe sind in den frühen Morgenstunden die sinnvollste Option.',
    },
  },
  Castellón: {
    es: {
      intro: 'La vida nocturna de la provincia de Castellón se concentra en Benicàssim, un pueblo costero que en verano multiplica su población y su oferta de ocio con turismo nacional e internacional. Fuera de la temporada de playa, la fiesta se reduce mucho: es una vida nocturna muy marcada por el calendario estival.',
      zonas: [
        { titulo: 'Benicàssim y su paseo marítimo', texto: 'El centro de la fiesta de la zona, con discotecas y salas concentradas cerca de la playa. Ambiente joven, muy activo en julio y agosto, coincidiendo también con festivales de música cercanos como el FIB.' },
      ],
      temporada: 'La oferta de discotecas de Benicàssim es fuertemente estival: la mayoría de las salas abren de mayo o junio a septiembre, con julio y agosto como los meses de más actividad, coincidiendo con las vacaciones y con el Festival Internacional de Benicàssim, que atrae público de fuera de la zona. Fuera de esos meses, la agenda nocturna se reduce de forma notable.',
      discotecasFamosas: 'La Santa, en Benicàssim, es la discoteca de referencia de la zona, con fiestas temáticas y una programación que va del pop y la electrónica al reggaetón. Oasis es otra de las salas conocidas del pueblo. La agenda de Where We Go recoge las salas activas ahora mismo, no un ranking fijo.',
      transporte: 'Benicàssim es un pueblo pequeño y la mayoría de la vida nocturna está a poca distancia andando desde las zonas de alojamiento turístico y el paseo marítimo. Para moverse hacia Castellón capital u otras localidades cercanas de madrugada, la opción habitual es el taxi, ya que el transporte público nocturno es muy limitado fuera de temporada alta.',
      precio: 'La entrada a las discotecas de Benicàssim suele moverse en un rango similar al resto de la Comunidad Valenciana, aproximadamente entre 10 y 20 €, algo más en fechas de festival o con DJs invitados.',
      vestimenta: 'El ambiente es informal, típico de pueblo costero en temporada de playa: ropa de verano cómoda es la norma, sin exigencias especiales salvo en eventos concretos.',
      seguridad: 'Al ser una zona pequeña y muy concentrada, la vida nocturna de Benicàssim es bastante controlable a pie: aun así, en los meses de mayor afluencia (coincidiendo con el FIB) conviene vigilar las pertenencias en las zonas más masificadas y planificar cómo volver al alojamiento antes de salir.',
    },
    en: {
      intro: 'Nightlife in Castellón province is concentrated in Benicàssim, a coastal town that multiplies its population and its nightlife offer in summer with national and international tourism. Outside beach season, the party scene shrinks a lot: this is nightlife very much tied to the summer calendar.',
      zonas: [
        { titulo: 'Benicàssim and its seafront', texto: 'The centre of the area´s nightlife, with clubs concentrated near the beach. Young crowd, very active in July and August, also coinciding with nearby music festivals like the FIB.' },
      ],
      temporada: 'Benicàssim´s club scene is heavily seasonal: most venues open from May or June to September, with July and August as the busiest months, coinciding with the summer holidays and the Benicàssim International Festival, which draws crowds from outside the area. Outside those months, the nightlife listings shrink noticeably.',
      discotecasFamosas: 'La Santa, in Benicàssim, is the area´s go-to club, with themed parties and a line-up ranging from pop and electronic to reggaeton. Oasis is another well-known venue in town. Where We Go´s listings show what´s active right now, not a fixed ranking.',
      transporte: 'Benicàssim is a small town and most of its nightlife is within walking distance of the tourist accommodation areas and the seafront. To get to Castellón city or other nearby towns in the small hours, a taxi is the usual option, since night public transport is very limited outside peak season.',
      precio: 'Entry to Benicàssim´s clubs usually falls in a similar range to the rest of the Valencian Community, roughly €10 to €20, a bit more during festival dates or with guest DJs.',
      vestimenta: 'The vibe is casual, typical of a coastal town in beach season: comfortable summer clothes are the norm, no special requirements except for specific events.',
      seguridad: 'Being a small, tightly concentrated area, Benicàssim´s nightlife is fairly walkable and manageable: still, during the busiest months (coinciding with the FIB) it´s worth watching your belongings in the most crowded spots and planning how to get back to your accommodation before heading out.',
    },
    de: {
      intro: 'Das Nachtleben der Provinz Castellón konzentriert sich auf Benicàssim, einen Küstenort, der im Sommer seine Einwohnerzahl und sein Freizeitangebot durch nationalen und internationalen Tourismus vervielfacht. Außerhalb der Strandsaison schrumpft die Partyszene stark: ein Nachtleben, das eng an den Sommerkalender gebunden ist.',
      zonas: [
        { titulo: 'Benicàssim und seine Strandpromenade', texto: 'Das Zentrum des Nachtlebens der Gegend, mit Clubs in Strandnähe. Junges Publikum, im Juli und August besonders aktiv, auch wegen nahegelegener Musikfestivals wie dem FIB.' },
      ],
      temporada: 'Das Clubangebot in Benicàssim ist stark saisonal: die meisten Locations öffnen von Mai oder Juni bis September, mit Juli und August als aktivsten Monaten, zeitgleich mit den Sommerferien und dem Benicàssim International Festival, das Publikum von außerhalb der Region anzieht. Außerhalb dieser Monate schrumpft das nächtliche Programm deutlich.',
      discotecasFamosas: 'La Santa in Benicàssim ist der wichtigste Club der Gegend, mit Themenpartys und einem Programm von Pop und Electronic bis Reggaeton. Oasis ist eine weitere bekannte Location im Ort. Das Programm von Where We Go zeigt, was gerade aktiv ist, kein festes Ranking.',
      transporte: 'Benicàssim ist ein kleiner Ort, und das meiste Nachtleben liegt in Gehdistanz zu den touristischen Unterkünften und der Strandpromenade. Fuer den Weg nach Castellón oder in andere nahegelegene Orte in den frühen Morgenstunden ist das Taxi die übliche Option, da der öffentliche Nachtverkehr außerhalb der Hochsaison sehr eingeschränkt ist.',
      precio: 'Der Eintritt in die Clubs von Benicàssim bewegt sich in einem ähnlichen Rahmen wie im Rest der Valencianischen Gemeinschaft, etwa 10 bis 20 €, an Festivaltagen oder mit Gast-DJs etwas mehr.',
      vestimenta: 'Die Stimmung ist leger, typisch für einen Küstenort in der Strandsaison: bequeme Sommerkleidung ist die Norm, keine besonderen Anforderungen außer bei bestimmten Events.',
      seguridad: 'Als kleine, dicht konzentrierte Gegend ist das Nachtleben von Benicàssim zu Fuß gut überschaubar: trotzdem sollte man in den stärksten Monaten (zeitgleich mit dem FIB) an den überfüllteren Stellen auf seine Sachen achten und den Rückweg zur Unterkunft vorher planen.',
    },
  },
  Ibiza: {
    es: {
      intro: 'Ibiza es la referencia mundial de la música electrónica y la fiesta de club, con una industria nocturna que mueve la economía de la isla entera durante medio año. No es solo una isla con discotecas: es donde nació buena parte de la cultura de club tal como se conoce hoy, con locales que llevan medio siglo en activo.',
      zonas: [
        { titulo: 'Playa d\'en Bossa', texto: 'La zona más intensa de la isla en los últimos años, con Ushuaïa y Hï Ibiza a pocos metros uno de otro. De día, beach clubs y piscina; de tarde-noche, shows al aire libre y clubbing de primer nivel.' },
        { titulo: 'San Antonio', texto: 'Zona más económica y de ambiente informal, con el famoso Café del Mar como punto clásico para ver la puesta de sol antes de salir de fiesta.' },
        { titulo: 'Dalt Vila e Ibiza ciudad', texto: 'El casco histórico, Patrimonio de la Humanidad, con bares y ambiente más tranquilo antes de moverse a las discotecas grandes de las afueras.' },
      ],
      temporada: 'La temporada de clubs en Ibiza está muy definida: arranca a finales de abril y se extiende hasta mediados de octubre, con las opening y closing parties como los eventos más señalados del calendario. Fuera de esas fechas, la práctica totalidad de las grandes discotecas cierra por completo.',
      discotecasFamosas: 'Pachá, abierta desde 1973, es la única gran discoteca de la isla que se mantiene abierta todo el año y una de las marcas más reconocidas de la fiesta a nivel mundial. Amnesia, en el mismo emplazamiento desde 1974, ha sido nombrada varias veces mejor discoteca del mundo. Ushuaïa, inaugurada en 2011 en Playa d\'en Bossa, es la más reciente de las grandes salas, con un formato de hotel-discoteca al aire libre. La agenda de Where We Go recoge las salas activas ahora mismo, no un ranking fijo.',
      transporte: 'Durante la temporada alta (de junio a septiembre) funciona un servicio de discobús nocturno con líneas específicas que conectan San Antonio, Ibiza ciudad y las discotecas principales, como Amnesia, Pachá, Ushuaïa o Hï Ibiza. Fuera de esas fechas o de ese horario, el taxi es la opción habitual, y conviene contar con esperas largas en las horas de más salida de las discotecas.',
      precio: 'Los precios de entrada en Ibiza son de los más altos de España: entre 30 y 70 € en Pachá, desde 55 € en Amnesia y entre 45 y 100 € en Ushuaïa, según el evento y los artistas. Las copas también son más caras que en el resto del país, habitualmente entre 16 y 22 €.',
      vestimenta: 'El código de vestimenta varía mucho según el local y la fiesta concreta: algunas discotecas piden un estilo cuidado o directamente temático, mientras que en los beach clubs de día el ambiente es de bañador y ropa de playa. Conviene revisar el evento concreto antes de ir.',
      seguridad: 'Al ser una isla con mucha afluencia turística y locales con aforos muy grandes, conviene vigilar las pertenencias en las colas y dentro de las discotecas más masificadas. El discobús nocturno y los taxis oficiales son las formas más seguras de moverse de madrugada; evita coches sin licencia que se ofrecen fuera de los locales.',
    },
    en: {
      intro: 'Ibiza is the world reference for electronic music and club culture, with a nightlife industry that drives the entire island´s economy for half the year. It´s not just an island with nightclubs: it´s where much of modern club culture as we know it was born, with venues that have been running for half a century.',
      zonas: [
        { titulo: 'Playa d\'en Bossa', texto: 'The most intense area on the island in recent years, with Ushuaïa and Hï Ibiza just metres apart. Beach clubs and pool parties by day, open-air shows and top-tier clubbing by evening and night.' },
        { titulo: 'San Antonio', texto: 'A cheaper, more casual area, home to the famous Café del Mar, a classic sunset spot before heading out to party.' },
        { titulo: 'Dalt Vila and Ibiza Town', texto: 'The old town, a UNESCO World Heritage site, with bars and a calmer vibe before moving on to the big clubs outside town.' },
      ],
      temporada: 'The Ibiza club season is very clearly defined: it starts in late April and runs until mid-October, with opening and closing parties as the calendar´s biggest events. Outside those dates, almost all the big clubs shut down completely.',
      discotecasFamosas: 'Pachá, open since 1973, is the only major club on the island that stays open all year and one of the most recognised party brands worldwide. Amnesia, on the same site since 1974, has been named best club in the world several times. Ushuaïa, opened in 2011 in Playa d\'en Bossa, is the newest of the big venues, an open-air hotel-nightclub format. Where We Go´s listings show what´s active right now, not a fixed ranking.',
      transporte: 'During peak season (June to September) a night disco-bus service runs specific lines connecting San Antonio, Ibiza Town and the main clubs, such as Amnesia, Pachá, Ushuaïa or Hï Ibiza. Outside those dates or hours, a taxi is the usual option, and it´s worth expecting long waits right after clubs close.',
      precio: 'Ibiza´s entry prices are among the highest in Spain: €30 to €70 at Pachá, from €55 at Amnesia, and €45 to €100 at Ushuaïa depending on the event and the artists. Drinks are also pricier than the rest of the country, usually €16 to €22.',
      vestimenta: 'Dress code varies a lot by venue and specific party: some clubs expect a polished or themed look, while daytime beach clubs are swimwear-and-beachwear territory. It´s worth checking the specific event before you go.',
      seguridad: 'As an island with heavy tourist traffic and very large-capacity venues, it´s worth watching your belongings in queues and inside the more crowded clubs. The night disco-bus and official taxis are the safest ways to get around in the small hours; avoid unlicensed cars offered outside venues.',
    },
    de: {
      intro: 'Ibiza ist die weltweite Referenz für elektronische Musik und Clubkultur, mit einer Nachtlebensindustrie, die die Wirtschaft der ganzen Insel ein halbes Jahr lang antreibt. Nicht nur eine Insel mit Discos: hier entstand ein großer Teil der modernen Clubkultur, mit Locations, die seit einem halben Jahrhundert aktiv sind.',
      zonas: [
        { titulo: 'Playa d\'en Bossa', texto: 'Die intensivste Gegend der Insel der letzten Jahre, mit Ushuaïa und Hï Ibiza nur wenige Meter voneinander entfernt. Tagsüber Beachclubs und Pool-Partys, abends und nachts Open-Air-Shows und Clubbing auf Top-Niveau.' },
        { titulo: 'San Antonio', texto: 'Günstigere, legerere Gegend, Heimat des berühmten Café del Mar, ein klassischer Sonnenuntergangs-Spot vor dem Ausgehen.' },
        { titulo: 'Dalt Vila und Ibiza-Stadt', texto: 'Die Altstadt, UNESCO-Weltkulturerbe, mit Bars und ruhigerer Atmosphäre, bevor es zu den großen Clubs außerhalb der Stadt weitergeht.' },
      ],
      temporada: 'Die Clubsaison auf Ibiza ist klar definiert: sie beginnt Ende April und läuft bis Mitte Oktober, mit Opening- und Closing-Partys als größten Terminen im Kalender. Außerhalb dieser Zeit schließen fast alle großen Clubs komplett.',
      discotecasFamosas: 'Pachá, seit 1973 geöffnet, ist der einzige große Club der Insel, der das ganze Jahr über offen bleibt, und eine der bekanntesten Party-Marken weltweit. Amnesia, seit 1974 am selben Standort, wurde mehrfach zum besten Club der Welt gekürt. Ushuaïa, eröffnet 2011 in Playa d\'en Bossa, ist die neueste der großen Locations, ein Open-Air-Hotel-Club-Format. Das Programm von Where We Go zeigt, was gerade aktiv ist, kein festes Ranking.',
      transporte: 'Während der Hochsaison (Juni bis September) verkehrt ein nächtlicher Discobus mit speziellen Linien, die San Antonio, Ibiza-Stadt und die wichtigsten Clubs wie Amnesia, Pachá, Ushuaïa oder Hï Ibiza verbinden. Außerhalb dieser Zeiten ist das Taxi die übliche Option, wobei man direkt nach Clubschluss mit langen Wartezeiten rechnen sollte.',
      precio: 'Ibizas Eintrittspreise gehören zu den höchsten Spaniens: 30 bis 70 € bei Pachá, ab 55 € bei Amnesia und 45 bis 100 € bei Ushuaïa, je nach Event und Künstlern. Auch Getränke sind teurer als im Rest des Landes, meist 16 bis 22 €.',
      vestimenta: 'Der Dresscode variiert stark je nach Location und Party: manche Clubs erwarten einen gepflegten oder thematischen Look, während die Beachclubs tagsüber Badekleidung-Territorium sind. Es lohnt sich, das konkrete Event vorher zu checken.',
      seguridad: 'Als Insel mit starkem Touristenandrang und sehr großen Locations sollte man in Schlangen und in den volleren Clubs auf seine Sachen achten. Der nächtliche Discobus und offizielle Taxis sind die sichersten Wege in den frühen Morgenstunden; unlizenzierte Autos vor den Locations meiden.',
    },
  },
  Amsterdam: {
    es: {
      intro: 'Ámsterdam tiene una vida nocturna compacta y muy caminable: la mayoría de las zonas de fiesta están cerca del centro y se puede ir de una a otra a pie. Es una ciudad con ambiente internacional todo el año, no solo en verano, y con una cultura de club consolidada dentro de la escena de música electrónica europea.',
      zonas: [
        { titulo: 'Leidseplein', texto: 'La zona más popular para salir tanto entre locales como turistas, con salas como Melkweg y Paradiso. Buena mezcla de público y ubicación central, ideal para no tener que desplazarte fuera del centro.' },
        { titulo: 'Rembrandtplein', texto: 'Otra de las plazas con más ambiente de fiesta, con Escape como local de referencia y varios bares de copas alrededor.' },
        { titulo: 'Red Light District (De Wallen)', texto: 'Más allá de su fama, tiene también bares y locales de ocio nocturno propios, con un ambiente distinto al resto de la ciudad.' },
      ],
      temporada: 'A diferencia de las ciudades de playa, Ámsterdam mantiene su vida nocturna activa todo el año. El verano suma eventos al aire libre y festivales, pero los clubs del centro funcionan con normalidad en cualquier época.',
      discotecasFamosas: 'Jimmy Woo, en Leidseplein, es conocido por su política de entrada estricta y por haber sido premiado por el diseño de su interior y su sonido. Melkweg y Paradiso, también en Leidseplein, combinan conciertos en directo con sesiones de club. Escape, en Rembrandtplein, es uno de los nombres grandes de la plaza. La agenda de Where We Go recoge las salas activas ahora mismo, no un ranking fijo.',
      transporte: 'El transporte público de Ámsterdam deja de funcionar sobre la 1:00 de la madrugada, así que moverse de noche depende sobre todo de la bicicleta (se puede alquilar en la estación de tren) o de los autobuses nocturnos, con líneas específicas como la N80, N81 o N82 hacia las afueras.',
      precio: 'La entrada a un club en Ámsterdam suele ir de 10 a 20 €, aunque los locales con artistas conocidos pueden pedir entre 25 y 40 € o más, sobre todo de jueves a domingo. Comprar la entrada por adelantado suele salir más barato que pagar en la puerta.',
      vestimenta: 'El código de vestimenta en Ámsterdam es bastante relajado: no hace falta ir de traje, pero conviene evitar zapatillas deportivas y ropa de chándal. Con una camisa cuidada, pantalón decente o unos vaqueros en buen estado suele ser suficiente en la mayoría de locales.',
      seguridad: 'Ámsterdam es una ciudad relativamente segura, pero como en cualquier zona turística concurrida conviene ir atento a los descuideros, sobre todo con el móvil y la cartera en bolsillos delanteros o bolsos cerrados. Volver en bicicleta o en autobús nocturno es la opción más habitual entre quienes viven en la ciudad.',
    },
    en: {
      intro: 'Amsterdam has a compact, very walkable nightlife: most party areas are close to the centre and you can move between them on foot. It´s a city with an international vibe year-round, not just in summer, with a well-established club culture within the European electronic music scene.',
      zonas: [
        { titulo: 'Leidseplein', texto: 'The most popular area to go out for both locals and tourists, with venues like Melkweg and Paradiso. A good mix of crowd and a central location, ideal if you don´t want to travel outside the centre.' },
        { titulo: 'Rembrandtplein', texto: 'Another of the squares with the most party atmosphere, with Escape as the go-to venue and several cocktail bars around it.' },
        { titulo: 'Red Light District (De Wallen)', texto: 'Beyond its reputation, it also has its own bars and nightlife spots, with a different vibe from the rest of the city.' },
      ],
      temporada: 'Unlike beach cities, Amsterdam keeps its nightlife active year-round. Summer adds outdoor events and festivals, but the central clubs run as normal any time of year.',
      discotecasFamosas: 'Jimmy Woo, in Leidseplein, is known for its strict door policy and for being awarded for its interior design and sound system. Melkweg and Paradiso, also in Leidseplein, mix live concerts with club nights. Escape, in Rembrandtplein, is one of the square´s biggest names. Where We Go´s listings show what´s active right now, not a fixed ranking.',
      transporte: 'Amsterdam´s public transport stops running around 1:00am, so getting around at night depends mostly on a bike (you can rent one at the train station) or night buses, with specific lines like N80, N81 or N82 to the outskirts.',
      precio: 'Club entry in Amsterdam usually runs €10 to €20, though venues with well-known acts can charge €25 to €40 or more, especially Thursday through Sunday. Buying ahead is usually cheaper than paying at the door.',
      vestimenta: 'Amsterdam´s dress code is fairly relaxed: no suit needed, but it´s best to avoid trainers and tracksuits. A neat shirt, decent trousers or good jeans is usually enough for most venues.',
      seguridad: 'Amsterdam is a relatively safe city, but as in any busy tourist area it´s worth staying alert to pickpockets, especially keeping your phone and wallet in front pockets or zipped bags. Getting home by bike or night bus is the most common option among locals.',
    },
    de: {
      intro: 'Amsterdam hat ein kompaktes, sehr fussgaengerfreundliches Nachtleben: die meisten Partyzonen liegen nahe am Zentrum und lassen sich zu Fuß verbinden. Eine Stadt mit internationaler Atmosphäre das ganze Jahr über, nicht nur im Sommer, mit einer etablierten Clubkultur innerhalb der europäischen Electronic-Szene.',
      zonas: [
        { titulo: 'Leidseplein', texto: 'Die beliebteste Gegend zum Ausgehen, sowohl bei Locals als auch Touristen, mit Locations wie Melkweg und Paradiso. Gute Publikumsmischung und zentrale Lage, ideal ohne Wege außerhalb des Zentrums.' },
        { titulo: 'Rembrandtplein', texto: 'Einer der weiteren Plätze mit viel Partystimmung, mit Escape als Anlaufpunkt und mehreren Cocktailbars drumherum.' },
        { titulo: 'Red Light District (De Wallen)', texto: 'Jenseits seines Rufs gibt es hier auch eigene Bars und Nachtleben-Spots, mit einer anderen Atmosphäre als im Rest der Stadt.' },
      ],
      temporada: 'Anders als Strandstädte hält Amsterdam sein Nachtleben das ganze Jahr über aktiv. Der Sommer bringt zusätzliche Open-Air-Events und Festivals, aber die zentralen Clubs laufen zu jeder Jahreszeit normal weiter.',
      discotecasFamosas: 'Jimmy Woo in Leidseplein ist bekannt für seine strenge Einlasspolitik und wurde für Innendesign und Sound ausgezeichnet. Melkweg und Paradiso, ebenfalls in Leidseplein, verbinden Live-Konzerte mit Clubnächten. Escape in Rembrandtplein ist einer der großen Namen des Platzes. Das Programm von Where We Go zeigt, was gerade aktiv ist, kein festes Ranking.',
      transporte: 'Der öffentliche Nahverkehr in Amsterdam stellt den Betrieb gegen 1:00 Uhr ein, daher hängt das nächtliche Fortbewegen vor allem vom Fahrrad ab (Leihräder gibt es am Bahnhof) oder von Nachtbussen mit speziellen Linien wie N80, N81 oder N82 in die Außenbezirke.',
      precio: 'Der Clubeintritt in Amsterdam liegt meist bei 10 bis 20 €, Locations mit bekannten Acts können aber 25 bis 40 € oder mehr verlangen, besonders von Donnerstag bis Sonntag. Der Vorverkauf ist meist günstiger als der Kauf an der Tür.',
      vestimenta: 'Der Dresscode in Amsterdam ist recht entspannt: kein Anzug nötig, aber Sneaker und Jogginganzüge sollte man meiden. Ein gepflegtes Hemd, eine ordentliche Hose oder gute Jeans reichen in den meisten Locations.',
      seguridad: 'Amsterdam ist eine relativ sichere Stadt, aber wie in jeder belebten Touristengegend sollte man auf Taschendiebe achten, vor allem Handy und Portemonnaie in Vordertaschen oder verschlossenen Taschen tragen. Der Heimweg per Fahrrad oder Nachtbus ist unter Locals die gängigste Option.',
    },
  },
  // Barcelona todavia no tiene ningun club dado de alta en la base de datos,
  // asi que /barcelona no existe como pagina: resolveZoneSlug no la
  // encuentra y generateStaticParams no la genera. Esta guia queda lista y
  // se conecta sola en cuanto se cargue el primer club con zone="Barcelona".
  Barcelona: {
    es: {
      intro: 'Barcelona tiene una de las escenas de club más completas de España, con salas que van del indie y el rock al techno más serio, y una zona de playa junto al Port Olímpic que en verano funciona como un distrito de fiesta propio. Es una ciudad con vida nocturna activa todo el año, no solo en temporada de playa, y con público muy internacional gracias al turismo constante.',
      zonas: [
        { titulo: 'Port Olímpic y Barceloneta', texto: 'La zona de clubs frente al mar, con salas grandes muy conocidas por el turismo internacional. Ambiente de club clásico, con terrazas junto a la playa y sesiones que arrancan de noche.' },
        { titulo: 'Poblenou', texto: 'Antiguo barrio industrial reconvertido en epicentro de la escena alternativa, con Razzmatazz como sala de referencia y su combinación de indie, techno, pop y música urbana en distintas salas del mismo edificio.' },
        { titulo: 'Poble Sec', texto: 'Zona con Sala Apolo como local histórico, con una programación muy variada entre conciertos, fiestas temáticas y sesiones de DJ, y un ambiente algo más ecléctico que el de la playa.' },
        { titulo: 'El Raval y el Gòtic', texto: 'El centro histórico, con bares de copas y salas más pequeñas, buena opción para empezar la noche antes de moverse a una discoteca grande.' },
      ],
      temporada: 'Barcelona mantiene su agenda de clubs activa durante todo el año, a diferencia de las ciudades donde la fiesta depende de la playa. El verano suma a esa agenda las terrazas y los clubs del Port Olímpic al aire libre, con más ambiente turístico, mientras que las salas de Poblenou y Poble Sec funcionan a pleno rendimiento también en invierno.',
      discotecasFamosas: 'Razzmatazz, en Poblenou, es una de las discotecas más grandes de la ciudad, con cinco salas distintas bajo el mismo techo que combinan indie, techno, pop y música urbana según la sesión. Sala Apolo, en Poble Sec, es un local histórico que mezcla conciertos en directo con fiestas de club. En la zona de playa, Pacha Barcelona, Opium y Shoko concentran buena parte del ambiente de club junto al mar, con capacidad para varios miles de personas entre los tres. La agenda de Where We Go recogerá las salas activas ahora mismo en cuanto se den de alta.',
      transporte: 'El servicio de autobús nocturno de Barcelona (NitBus) cuenta con más de 20 líneas, todas con parada común en Plaça de Catalunya para facilitar el cambio de línea, y con cámaras de seguridad en toda la flota. El metro amplía su horario los viernes y sábados hasta las 2:00 de la madrugada. Fuera de ese horario, el taxi oficial o una app de VTC reconocida son la alternativa más rápida para volver a casa.',
      precio: 'La entrada a las discotecas de la zona de playa (Pacha, Opium, Shoko) suele rondar entre 20 y 35 €, normalmente con una consumición incluida y algo más barata si se compra por adelantado. En salas como Razzmatazz o Sala Apolo el precio varía mucho según el evento concreto.',
      vestimenta: 'En los clubs de la zona de playa el código de vestimenta suele ser algo más exigente, con ropa arreglada y sin chanclas ni bañador. En Poblenou y Poble Sec el ambiente es bastante más relajado e informal.',
      seguridad: 'Barcelona es una de las ciudades más seguras de Europa para salir de noche, aunque los hurtos por descuido son el riesgo más habitual en las zonas turísticas con más afluencia, como el Port Olímpic o el Gòtic: conviene vigilar el móvil y la cartera en bolsillos delanteros o bolsos cerrados. El NitBus incluye parada a demanda para dejar más cerca del destino a quien viaja solo de madrugada.',
    },
    en: {
      intro: 'Barcelona has one of the most complete club scenes in Spain, with venues ranging from indie and rock to serious techno, and a beach area by the Port Olímpic that in summer works as its own party district. A city with nightlife active year-round, not just in beach season, with a very international crowd thanks to steady tourism.',
      zonas: [
        { titulo: 'Port Olímpic and Barceloneta', texto: 'The seafront club area, with big venues well known among international tourists. Classic nightclub vibe, with terraces right by the beach and sessions starting at night.' },
        { titulo: 'Poblenou', texto: 'A former industrial neighbourhood turned into the alternative scene´s hub, with Razzmatazz as the go-to venue, mixing indie, techno, pop and urban music across different rooms in the same building.' },
        { titulo: 'Poble Sec', texto: 'Home to Sala Apolo, a historic venue with a very varied line-up of concerts, themed parties and DJ sets, and a slightly more eclectic vibe than the beach area.' },
        { titulo: 'El Raval and El Gòtic', texto: 'The old town, with cocktail bars and smaller venues, a good place to start the night before heading to a bigger club.' },
      ],
      temporada: 'Barcelona keeps its club listings active year-round, unlike cities where partying depends on the beach. Summer adds outdoor terraces and Port Olímpic clubs to the mix, with a more touristy vibe, while Poblenou and Poble Sec venues run at full capacity in winter too.',
      discotecasFamosas: 'Razzmatazz, in Poblenou, is one of the city´s biggest clubs, with five different rooms under one roof mixing indie, techno, pop and urban music depending on the night. Sala Apolo, in Poble Sec, is a historic venue that mixes live concerts with club nights. In the beach area, Pacha Barcelona, Opium and Shoko cover much of the seafront club scene, holding several thousand people between the three. Where We Go´s listings will show what´s active as soon as venues are added.',
      transporte: 'Barcelona´s night bus service (NitBus) has over 20 lines, all sharing a stop at Plaça de Catalunya for easy transfers, with security cameras across the whole fleet. The metro extends its hours on Fridays and Saturdays until 2:00am. Outside those hours, an official taxi or a recognised ride-hailing app is the fastest way home.',
      precio: 'Entry to the beach-area clubs (Pacha, Opium, Shoko) usually runs €20 to €35, typically with a drink included and a bit cheaper if bought in advance. At venues like Razzmatazz or Sala Apolo, price varies a lot depending on the specific event.',
      vestimenta: 'Beach-area clubs tend to have a stricter dress code, smart clothes and no flip-flops or swimwear. Poblenou and Poble Sec are far more relaxed and casual.',
      seguridad: 'Barcelona is one of the safest cities in Europe for a night out, though petty theft is the most common risk in the busiest tourist areas, like Port Olímpic or El Gòtic: keep your phone and wallet in front pockets or zipped bags. NitBus includes an on-demand stop to drop solo travellers closer to their destination in the small hours.',
    },
    de: {
      intro: 'Barcelona hat eine der vielseitigsten Clubszenen Spaniens, mit Locations von Indie und Rock bis zu ernsthaftem Techno, und einem Strandgebiet am Port Olímpic, das im Sommer wie ein eigenes Party-Viertel funktioniert. Eine Stadt mit das ganze Jahr über aktivem Nachtleben, nicht nur in der Strandsaison, mit sehr internationalem Publikum dank ständigem Tourismus.',
      zonas: [
        { titulo: 'Port Olímpic und Barceloneta', texto: 'Die Club-Gegend am Meer, mit großen, bei internationalen Touristen bekannten Locations. Klassische Nachtclub-Atmosphäre, mit Terrassen direkt am Strand und Sessions, die abends beginnen.' },
        { titulo: 'Poblenou', texto: 'Ein ehemaliges Industrieviertel, heute Zentrum der alternativen Szene, mit Razzmatazz als Anlaufpunkt, der Indie, Techno, Pop und Urban Music in verschiedenen Räumen im selben Gebäude mischt.' },
        { titulo: 'Poble Sec', texto: 'Heimat der Sala Apolo, einer historischen Location mit sehr abwechslungsreichem Programm aus Konzerten, Themenpartys und DJ-Sets, mit einer etwas eklektischeren Stimmung als am Strand.' },
        { titulo: 'El Raval und El Gòtic', texto: 'Die Altstadt, mit Cocktailbars und kleineren Locations, ein guter Ort, um die Nacht zu beginnen, bevor es in einen größeren Club geht.' },
      ],
      temporada: 'Barcelona hält sein Clubprogramm das ganze Jahr über aktiv, anders als Städte, in denen die Party von der Strandsaison abhängt. Der Sommer bringt zusätzlich Außenterrassen und die Clubs am Port Olímpic mit touristischerer Stimmung, während die Locations in Poblenou und Poble Sec auch im Winter auf Hochtouren laufen.',
      discotecasFamosas: 'Razzmatazz in Poblenou ist einer der größten Clubs der Stadt, mit fünf verschiedenen Räumen unter einem Dach, die je nach Abend Indie, Techno, Pop und Urban Music mischen. Sala Apolo in Poble Sec ist eine historische Location, die Live-Konzerte mit Clubnächten verbindet. Am Strand decken Pacha Barcelona, Opium und Shoko einen großen Teil der Club-Szene am Meer ab, zusammen mit Platz für mehrere Tausend Gäste. Das Programm von Where We Go zeigt, was aktiv ist, sobald Locations hinzugefügt werden.',
      transporte: 'Barcelonas Nachtbusdienst (NitBus) hat über 20 Linien, alle mit gemeinsamer Haltestelle an der Plaça de Catalunya für einfaches Umsteigen, mit Ueberwachungskameras in der gesamten Flotte. Die Metro verlängert ihre Betriebszeiten freitags und samstags bis 2:00 Uhr. Außerhalb dieser Zeiten sind ein offizielles Taxi oder eine anerkannte Fahrdienst-App der schnellste Weg nach Hause.',
      precio: 'Der Eintritt in die Strand-Clubs (Pacha, Opium, Shoko) liegt meist bei 20 bis 35 €, meist inklusive Getränk und etwas günstiger im Vorverkauf. Bei Locations wie Razzmatazz oder Sala Apolo variiert der Preis stark je nach Event.',
      vestimenta: 'Die Strand-Clubs haben meist einen strengeren Dresscode, gepflegte Kleidung, keine Flip-Flops oder Badekleidung. Poblenou und Poble Sec sind deutlich entspannter und legerer.',
      seguridad: 'Barcelona ist eine der sichersten Städte Europas für einen Abend unterwegs, auch wenn Taschendiebstahl das häufigste Risiko in den belebtesten Touristengegenden wie Port Olímpic oder El Gòtic ist: Handy und Portemonnaie in Vordertaschen oder verschlossenen Taschen tragen. NitBus bietet eine Haltestelle auf Anfrage, um Alleinreisende in den frühen Morgenstunden näher an ihr Ziel zu bringen.',
    },
  },
}

export function zoneGuideHeadings(locale: string) {
  const copy: Record<string, {
    vidaNocturna: (z: string) => string; zonas: (z: string) => string
    temporada: (z: string) => string; discotecasFamosas: (z: string) => string; transporte: (z: string) => string
    precio: (z: string) => string; vestimenta: (z: string) => string; seguridad: (z: string) => string
  }> = {
    es: {
      vidaNocturna: (z) => `Vida nocturna en ${z}`,
      zonas: (z) => `Zonas para salir de fiesta en ${z}`,
      temporada: (z) => `Cuándo ir de fiesta a ${z}`,
      discotecasFamosas: (z) => `Discotecas más conocidas de ${z}`,
      transporte: (z) => `Cómo moverte de noche en ${z}`,
      precio: (z) => `Cuánto cuesta salir de fiesta en ${z}`,
      vestimenta: (z) => `Cómo vestir para salir de fiesta en ${z}`,
      seguridad: (z) => `Seguridad al salir de fiesta en ${z}`,
    },
    en: {
      vidaNocturna: (z) => `${z} nightlife`,
      zonas: (z) => `Where to party in ${z}`,
      temporada: (z) => `When to party in ${z}`,
      discotecasFamosas: (z) => `${z}'s best-known nightclubs`,
      transporte: (z) => `Getting around ${z} at night`,
      precio: (z) => `How much does a night out cost in ${z}`,
      vestimenta: (z) => `What to wear to go out in ${z}`,
      seguridad: (z) => `Staying safe on a night out in ${z}`,
    },
    // "auf Mallorca", no "in Mallorca": las islas llevan otra preposicion, y
    // el titulo de la pagina (zoneMeta) ya usaba germanZonePrep mientras estos
    // encabezados decian "in". Quedaba la incoherencia a la vista, en la misma
    // pantalla, que es justo lo que delata una traduccion sin revisar.
    de: {
      vidaNocturna: (z) => `Nachtleben ${germanZonePrep(z)} ${z}`,
      zonas: (z) => `Wo man ${germanZonePrep(z)} ${z} feiern geht`,
      temporada: (z) => `Wann man ${germanZonePrep(z)} ${z} feiern gehen sollte`,
      discotecasFamosas: (z) => `Die bekanntesten Clubs ${germanZonePrep(z)} ${z}`,
      transporte: (z) => `Nachts unterwegs ${germanZonePrep(z)} ${z}`,
      precio: (z) => `Was ein Abend ${germanZonePrep(z)} ${z} kostet`,
      vestimenta: (z) => `Was man ${germanZonePrep(z)} ${z} anzieht`,
      seguridad: (z) => `Sicherheit beim Feiern ${germanZonePrep(z)} ${z}`,
    },
  }
  return copy[locale] || copy[routing.defaultLocale]
}

// undefined si la ciudad no tiene guia investigada: la pagina sigue
// funcionando igual que antes, sin este bloque.
export function zoneGuide(zone: string, locale: string): ZoneGuide | undefined {
  const porZona = ZONE_GUIDES[zone]
  if (!porZona) return undefined
  return porZona[locale] || porZona[routing.defaultLocale]
}

// ─────────────────────────────────────────────────────────────────────────────
// Guia evergreen del cruce zona x genero
//
// Mismo motivo y misma regla que ZONE_GUIDES: solo entra el cruce que se ha
// investigado de verdad, con datos verificables (nombres de sala, horarios,
// rango de precio), nunca una plantilla generica repetida por genero. Nace
// para /mallorca/genre/techno, la primera keyword que un cliente pidio
// posicionar en el numero 1: la pagina ya tenia agenda real (eventos +
// clubs etiquetados Techno), pero nada de contenido fijo que sostuviera la
// URL fuera de temporada o le diera a Google algo mas que un listado.
export type GenreZoneGuide = {
  intro: string
  salas: { titulo: string; texto: string; slug: string }[]
  temporada: string
  precio: string
  consejos: string
}

const GENRE_ZONE_GUIDES: Record<string, Record<string, Record<string, GenreZoneGuide>>> = {
  Mallorca: {
    Techno: {
      es: {
        intro: 'Mallorca tiene una escena de techno propia, separada de los macroclubs turísticos de Magaluf. Junto a Amok, la sala de referencia de los últimos años, hay un circuito de salas de 200 a 400 personas en Palma con sesiones semanales de techno y tech house todo el año, no solo en temporada alta.',
        salas: [
          { titulo: 'Amok', slug: 'amok-mallorca', texto: 'La sala de techno y house más relevante de la isla, cerca del aeropuerto en Playa de Palma. Programa sesiones de viernes a sábado (00:00-06:00) con nombres del circuito europeo, y los domingos monta la Tribu Sunset Party en su terraza.' },
          { titulo: 'BCM Mallorca', slug: 'bcm-mallorca', texto: 'El macroclub de Magaluf, el más grande y con más producción de la isla. No es una sala de techno en sí, pero sus noches de temporada alta traen a DJs internacionales de la escena (Hannah Laing entre los carteles de 2026).' },
          { titulo: 'Wave Club', slug: 'wave-club', texto: 'Sala de Ponent, en Palma, con programación semanal de techno y tech house dentro del circuito de clubs más pequeños y menos turísticos de la ciudad.' },
          { titulo: 'Selva Club', slug: 'selva-club', texto: 'Otra de las salas de referencia del circuito underground palmesano, con sesiones de techno regulares fuera del radar de las guías turísticas.' },
        ],
        temporada: 'Amok programa techno y house los siete días de la semana durante buena parte del año, así que no depende solo del verano. BCM y el resto de macroclubs de Magaluf sí son estacionales: abren de abril/mayo a octubre y cierran por completo en invierno. Julio y agosto concentran los carteles más fuertes, pero también las entradas más caras y las salas más llenas.',
        precio: 'La entrada estándar en Amok ronda entre 15 y 35 €, más barata cuanto antes se compre (early bird). En el resto de salas de techno de Palma, fuera del circuito de macroclubs, lo habitual es un rango de 10 a 20 €. El ambiente arranca tarde: la hora punta real está entre las 2:00 y las 5:00.',
        consejos: 'Comprar la entrada con antelación es lo que marca la diferencia de precio, sobre todo en Amok. Si el plan es solo techno y no macroclub turístico, las salas de Ponent (Wave, Selva) dan un ambiente más local que Magaluf. Y como el pico de la noche es de madrugada, llegar antes de las 2:00 significa encontrarse la sala todavía vacía.',
      },
      en: {
        intro: "Mallorca has its own techno scene, separate from the touristy megaclubs of Magaluf. Alongside Amok, the island's reference venue of the last few years, there's a circuit of 200-to-400-capacity rooms in Palma running weekly techno and tech house sessions year-round, not just in high season.",
        salas: [
          { titulo: 'Amok', slug: 'amok-mallorca', texto: "The island's leading techno and house venue, near the airport in Playa de Palma. Runs Friday-to-Saturday sessions (midnight-6am) with names from the European circuit, plus a Sunday sunset party on its terrace." },
          { titulo: 'BCM Mallorca', slug: 'bcm-mallorca', texto: "The Magaluf megaclub, the island's biggest and most production-heavy. Not a dedicated techno room, but its high-season nights bring in international names from the scene (Hannah Laing was on the 2026 lineup)." },
          { titulo: 'Wave Club', slug: 'wave-club', texto: "A room in Palma's Ponent district with a weekly techno and tech house line-up, part of the city's smaller, less touristy club circuit." },
          { titulo: 'Selva Club', slug: 'selva-club', texto: "Another reference venue on Palma's underground circuit, with regular techno sessions off the tourist-guide radar." },
        ],
        temporada: "Amok books techno and house seven nights a week for most of the year, so it isn't just a summer thing. BCM and the rest of the Magaluf megaclubs are seasonal: they run from April/May to October and close completely over winter. July and August bring the biggest line-ups, but also the highest prices and the most crowded rooms.",
        precio: 'A standard ticket at Amok runs €15 to €35, cheaper the earlier you buy (early bird). Elsewhere on the Palma techno circuit, outside the megaclub scene, expect €10 to €20. The night starts late: the real peak runs from 2am to 5am.',
        consejos: "Buying ahead is what makes the price difference, especially at Amok. If the plan is pure techno rather than a touristy megaclub, the Ponent rooms (Wave, Selva) give a more local vibe than Magaluf. And since the peak hits in the small hours, arriving before 2am means the room is still empty.",
      },
      de: {
        intro: 'Mallorca hat eine eigene Techno-Szene, getrennt von den touristischen Megaclubs in Magaluf. Neben Amok, dem wichtigsten Club der letzten Jahre, gibt es in Palma einen Kreis von Locations für 200 bis 400 Gäste mit wöchentlichen Techno- und Tech-House-Sets, das ganze Jahr über, nicht nur in der Hochsaison.',
        salas: [
          { titulo: 'Amok', slug: 'amok-mallorca', texto: 'Der wichtigste Techno- und House-Club der Insel, nahe dem Flughafen in Playa de Palma. Freitag bis Samstag von Mitternacht bis 6 Uhr mit Namen aus der europäischen Szene, sonntags Sunset Party auf der Terrasse.' },
          { titulo: 'BCM Mallorca', slug: 'bcm-mallorca', texto: 'Der Megaclub in Magaluf, der größte und produktionsstärkste der Insel. Kein reiner Techno-Club, aber in der Hochsaison holt er internationale Namen der Szene (2026 unter anderem Hannah Laing).' },
          { titulo: 'Wave Club', slug: 'wave-club', texto: 'Club im Palmaer Stadtteil Ponent mit wöchentlichem Techno- und Tech-House-Programm, Teil der kleineren, weniger touristischen Club-Szene der Stadt.' },
          { titulo: 'Selva Club', slug: 'selva-club', texto: 'Ein weiterer wichtiger Club der Palmaer Underground-Szene mit regelmäßigen Techno-Sets abseits der Touristenführer.' },
        ],
        temporada: 'Amok bucht Techno und House an sieben Abenden die Woche, fast das ganze Jahr über, unabhängig von der Sommersaison. BCM und die übrigen Megaclubs in Magaluf sind dagegen saisonal: geöffnet von April/Mai bis Oktober, im Winter komplett geschlossen. Juli und August bringen die stärksten Line-ups, aber auch die höchsten Preise und die vollsten Clubs.',
        precio: 'Der Standardeintritt bei Amok liegt bei 15 bis 35 €, günstiger im Vorverkauf (Early Bird). In den übrigen Techno-Clubs von Palma, außerhalb der Megaclub-Szene, sind 10 bis 20 € üblich. Die Nacht beginnt spät: der eigentliche Höhepunkt liegt zwischen 2 und 5 Uhr.',
        consejos: 'Der Vorverkauf macht den Preisunterschied aus, vor allem bei Amok. Wer reinen Techno statt eines touristischen Megaclubs sucht, findet in Ponent (Wave, Selva) eine lokalere Atmosphäre als in Magaluf. Und da der Höhepunkt erst in den frühen Morgenstunden kommt, ist der Club vor 2 Uhr noch leer.',
      },
    },
  },
}

export function genreZoneGuide(zone: string, genre: string, locale: string): GenreZoneGuide | undefined {
  const porZona = GENRE_ZONE_GUIDES[zone]
  const porGenero = porZona?.[genre]
  if (!porGenero) return undefined
  return porGenero[locale] || porGenero[routing.defaultLocale]
}

export function genreZoneGuideHeadings(locale: string) {
  const copy: Record<string, {
    escena: (g: string, z: string) => string; salas: (g: string, z: string) => string
    temporada: (g: string, z: string) => string; precio: (g: string, z: string) => string; consejos: (g: string, z: string) => string
  }> = {
    es: {
      escena: (g, z) => `La escena de ${g} en ${z}`,
      salas: (g, z) => `Dónde escuchar ${g} en ${z}`,
      temporada: (g, z) => `Cuándo ir a fiestas de ${g} en ${z}`,
      precio: (g, z) => `Cuánto cuesta una fiesta de ${g} en ${z}`,
      consejos: (g, z) => `Consejos para una noche de ${g} en ${z}`,
    },
    en: {
      escena: (g, z) => `The ${g} scene in ${z}`,
      salas: (g, z) => `Where to hear ${g} in ${z}`,
      temporada: (g, z) => `When to go to ${g} parties in ${z}`,
      precio: (g, z) => `How much a ${g} night costs in ${z}`,
      consejos: (g, z) => `Tips for a ${g} night in ${z}`,
    },
    de: {
      escena: (g, z) => `Die ${g}-Szene in ${z}`,
      salas: (g, z) => `Wo man ${g} in ${z} hört`,
      temporada: (g, z) => `Wann man zu ${g}-Partys in ${z} gehen sollte`,
      precio: (g, z) => `Was eine ${g}-Nacht in ${z} kostet`,
      consejos: (g, z) => `Tipps für eine ${g}-Nacht in ${z}`,
    },
  }
  return copy[locale] || copy[routing.defaultLocale]
}

// Etiquetas de los enlaces internos que llevan desde /[zona] a sus paginas
// hijas. Sin estos enlaces las paginas nuevas solo existirian en el sitemap.
export function relatedLinksLabels(locale: string) {
  const copy: Record<string, { heading: string; today: string; weekend: string; genres: string }> = {
    es: { heading: 'Filtra tu plan', today: 'Fiestas hoy', weekend: 'Este fin de semana', genres: 'Por género musical' },
    en: { heading: 'Narrow it down', today: 'Parties tonight', weekend: 'This weekend', genres: 'By music genre' },
    de: { heading: 'Eingrenzen', today: 'Partys heute', weekend: 'Dieses Wochenende', genres: 'Nach Musikrichtung' },
  }
  return copy[locale] || copy[routing.defaultLocale]
}

// Encabezado del bloque de /genre/[name] que enlaza a cada cruce zona x
// genero con agenda real. Sin este texto la pagina de genero global se
// quedaba sin ninguna salida hacia sus paginas hijas.
export function genreZonesHeading(locale: string) {
  const copy: Record<string, string> = { es: 'Por ciudad', en: 'By city', de: 'Nach Stadt' }
  return copy[locale] || copy[routing.defaultLocale]
}

// Formato de fecha por idioma. Las fichas existentes formatean siempre en
// es-ES, aunque la URL sea /en o /de.
const DATE_LOCALES: Record<string, string> = { es: 'es-ES', en: 'en-GB', de: 'de-DE' }

// La ficha de evento formatea su propia fecha larga y necesita la etiqueta.
export function dateTag(locale: string) {
  return DATE_LOCALES[locale] || DATE_LOCALES[routing.defaultLocale]
}

// Encabezados de seccion de las fichas.
//
// Estaban en el diccionario como textos sueltos ("Proximos eventos", "Line-up")
// porque se usaban en varias fichas a la vez. Un h2 generico repetido en 1.662
// paginas no le dice nada a Google; con el nombre delante, cada seccion habla
// de su entidad y ademas cubre la consulta larga ("proximos eventos en La
// Santa", "sesiones de AJ Christou").
type Seccion = (nombre: string) => string
const SECCIONES: Record<string, {
  clubAgenda: Seccion; clubDireccion: Seccion; clubFotos: Seccion; clubHorario: Seccion
  djAgenda: Seccion; djSimilares: Seccion; djEscuchar: Seccion
  eventoLineup: Seccion; eventoMasDelClub: Seccion; eventoRelacionados: Seccion
}> = {
  es: {
    clubAgenda: (n) => `Próximos eventos en ${n}`,
    clubDireccion: (n) => `Dónde está ${n}`,
    clubFotos: (n) => `Fotos de ${n}`,
    clubHorario: (n) => `Horario de ${n}`,
    djAgenda: (n) => `Próximas sesiones de ${n}`,
    djSimilares: (n) => `DJs parecidos a ${n}`,
    djEscuchar: (n) => `Escucha a ${n}`,
    eventoLineup: (n) => `Line-up de ${n}`,
    eventoMasDelClub: (n) => `Más en ${n}`,
    eventoRelacionados: () => 'Otras fiestas que te pueden encajar',
  },
  en: {
    clubAgenda: (n) => `Upcoming events at ${n}`,
    clubDireccion: (n) => `Where ${n} is`,
    clubFotos: (n) => `Photos of ${n}`,
    clubHorario: (n) => `${n} opening hours`,
    djAgenda: (n) => `Upcoming ${n} sets`,
    djSimilares: (n) => `DJs similar to ${n}`,
    djEscuchar: (n) => `Listen to ${n}`,
    eventoLineup: (n) => `${n} line-up`,
    eventoMasDelClub: (n) => `More at ${n}`,
    eventoRelacionados: () => 'Other parties you might like',
  },
  de: {
    clubAgenda: (n) => `Kommende Events im ${n}`,
    clubDireccion: (n) => `Wo ${n} liegt`,
    clubFotos: (n) => `Fotos von ${n}`,
    clubHorario: (n) => `Öffnungszeiten von ${n}`,
    djAgenda: (n) => `Kommende Sets von ${n}`,
    djSimilares: (n) => `DJs ähnlich wie ${n}`,
    djEscuchar: (n) => `${n} anhören`,
    eventoLineup: (n) => `Line-up von ${n}`,
    eventoMasDelClub: (n) => `Mehr im ${n}`,
    eventoRelacionados: () => 'Andere Partys, die dir gefallen könnten',
  },
}

export function secciones(locale: string) {
  return SECCIONES[locale] || SECCIONES[routing.defaultLocale]
}

// Texto alternativo de las imagenes que no lo tenian util: el logo del club
// iba como "logo" y las fotos de la galeria como "foto-2", que no describen
// nada ni para un lector de pantalla ni para Google Imagenes. Van aqui y no
// escritos en la ficha porque, como los encabezados, tienen que salir en el
// idioma de la URL.
// La portada de club/DJ/evento y las miniaturas de agenda llevaban solo el
// nombre como alt ("LA SANTA", "AJ CHRISTOU"): decia quien es, no que es la
// imagen. Un lector de pantalla o un buscador de imagenes no puede distinguir
// eso de un logo o de un texto suelto.
const ALTS: Record<string, {
  logo: (n: string) => string; foto: (n: string, i: number) => string
  portadaClub: (n: string) => string; portadaDj: (n: string) => string; portadaEvento: (n: string) => string
  miniEvento: (n: string) => string; miniDj: (n: string) => string
}> = {
  es: {
    logo: (n) => `Logo de ${n}`, foto: (n, i) => `Interior de ${n}, foto ${i}`,
    portadaClub: (n) => `Foto de ${n}`, portadaDj: (n) => `Foto de ${n}`, portadaEvento: (n) => `Cartel de ${n}`,
    miniEvento: (n) => `Cartel de ${n}`, miniDj: (n) => `Foto de ${n}`,
  },
  en: {
    logo: (n) => `${n} logo`, foto: (n, i) => `Inside ${n}, photo ${i}`,
    portadaClub: (n) => `Photo of ${n}`, portadaDj: (n) => `Photo of ${n}`, portadaEvento: (n) => `${n} flyer`,
    miniEvento: (n) => `${n} flyer`, miniDj: (n) => `Photo of ${n}`,
  },
  de: {
    logo: (n) => `Logo von ${n}`, foto: (n, i) => `Innenraum von ${n}, Foto ${i}`,
    portadaClub: (n) => `Foto von ${n}`, portadaDj: (n) => `Foto von ${n}`, portadaEvento: (n) => `Flyer von ${n}`,
    miniEvento: (n) => `Flyer von ${n}`, miniDj: (n) => `Foto von ${n}`,
  },
}

export function alts(locale: string) {
  return ALTS[locale] || ALTS[routing.defaultLocale]
}

// Mensajes de listado vacio. Estaban escritos en castellano dentro de cada
// pagina, asi que un usuario en /en o /de se encontraba "No hay clubs
// disponibles" en medio de una pagina por lo demas traducida. Es ademas el
// unico texto de la pagina cuando no hay inventario.
const VACIOS: Record<string, {
  clubs: string; djs: string
  eventosFiltro: string; clubsZona: string; djsBusqueda: string
  genero: (n: string) => string; verAgenda: string
}> = {
  es: {
    clubs: 'No hay clubs disponibles.',
    djs: 'No hay DJs disponibles.',
    eventosFiltro: 'No hay eventos para esta combinación.',
    clubsZona: 'No hay clubs para esta zona.',
    djsBusqueda: 'No hay DJs para esta búsqueda.',
    genero: (n) => `No hay eventos de ${n} programados ahora mismo.`,
    verAgenda: 'Ver toda la agenda',
  },
  en: {
    clubs: 'No clubs available.',
    djs: 'No DJs available.',
    eventosFiltro: 'No events match this combination.',
    clubsZona: 'No clubs in this area.',
    djsBusqueda: 'No DJs match this search.',
    genero: (n) => `No ${n} events are scheduled right now.`,
    verAgenda: 'See all listings',
  },
  de: {
    clubs: 'Keine Clubs verfügbar.',
    djs: 'Keine DJs verfügbar.',
    eventosFiltro: 'Keine Events für diese Auswahl.',
    clubsZona: 'Keine Clubs in dieser Gegend.',
    djsBusqueda: 'Keine DJs für diese Suche.',
    genero: (n) => `Aktuell sind keine ${n} Events geplant.`,
    verAgenda: 'Ganzes Programm ansehen',
  },
}

export function vacios(locale: string) {
  return VACIOS[locale] || VACIOS[routing.defaultLocale]
}

// Pagina 404. No habia ninguna: el layout raiz solo delega el <html>, asi que
// la de serie de Next se renderizaba sin cabecera ni estilos y el usuario veia
// una pantalla en negro vacia, sin saber que habia pasado ni por donde seguir.
const NO_ENCONTRADO: Record<string, { code: string; title: string; text: string; home: string; discover: string }> = {
  es: {
    code: '404',
    title: 'Esta página no existe',
    text: 'El enlace está roto o la fiesta que buscabas ya no está en la agenda.',
    home: 'Ir al inicio',
    discover: 'Ver toda la agenda',
  },
  en: {
    code: '404',
    title: 'This page does not exist',
    text: 'The link is broken, or the party you were looking for is no longer listed.',
    home: 'Go to homepage',
    discover: 'See all listings',
  },
  de: {
    code: '404',
    title: 'Diese Seite gibt es nicht',
    text: 'Der Link ist defekt, oder die gesuchte Party steht nicht mehr im Programm.',
    home: 'Zur Startseite',
    discover: 'Ganzes Programm ansehen',
  },
}

export function noEncontrado(locale: string) {
  return NO_ENCONTRADO[locale] || NO_ENCONTRADO[routing.defaultLocale]
}

export function formatEventDate(iso: string, locale: string) {
  const tag = DATE_LOCALES[locale] || DATE_LOCALES[routing.defaultLocale]
  return new Date(iso).toLocaleString(tag, {
    weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  })
}

// Fecha corta para la descripcion del resultado de Google: "sab 15 ago".
// formatEventDate lleva ademas la hora, que ahi solo gasta caracteres.
export function formatShortDate(iso: string, locale: string) {
  const tag = DATE_LOCALES[locale] || DATE_LOCALES[routing.defaultLocale]
  return new Date(iso).toLocaleString(tag, {
    weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC',
  })
    .replace(/,/g, '')
    // El aleman abrevia el mes con punto ("Di. 11. Aug."), y al pegarle la
    // frase siguiente quedaba "Aug..". Se quita el punto final: el de la
    // plantilla hace de los dos, que es lo correcto tambien en aleman.
    .replace(/\.\s*$/, '')
}

// Fecha de actualizacion visible en la ficha. Es una senal de frescura tanto
// para quien lee (¿esta info es de este año?) como para Google, que la lee
// tambien en dateModified del schema — ver la nota en club/[id]/page.tsx.
const UPDATED_AT_LABEL: Record<string, string> = {
  es: 'Ficha actualizada el',
  en: 'Listing updated on',
  de: 'Eintrag aktualisiert am',
}

export function updatedAtLabel(iso: string, locale: string) {
  const tag = DATE_LOCALES[locale] || DATE_LOCALES[routing.defaultLocale]
  const fecha = new Date(iso).toLocaleDateString(tag, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  return `${UPDATED_AT_LABEL[locale] || UPDATED_AT_LABEL[routing.defaultLocale]} ${fecha}`
}

// Recorta respetando la palabra. Antes las descripciones salian cortadas en
// seco a los 155 caracteres ("...de la zona turistica de Mallorc"), que en el
// resultado de busqueda queda a medias y invita a Google a reescribirlas.
export function recortar(texto: string, max = 155) {
  const limpio = texto.replace(/\s+/g, ' ').trim()
  if (limpio.length <= max) return limpio
  const corte = limpio.slice(0, max - 1)
  const espacio = corte.lastIndexOf(' ')
  const base = espacio > max * 0.5 ? corte.slice(0, espacio) : corte
  return `${base.replace(/[.,;:¡!¿?\-–—]+$/, '')}…`
}

// Descripcion de una ficha de local o de DJ para el resultado de busqueda.
//
// Quien busca "la santa benicasim" ya sabe lo que es La Santa: repetirselo no
// le da ningun motivo para entrar aqui en vez de en la web oficial, en Maps o
// en su Instagram. Lo que no encuentra en esos sitios es la agenda, asi que la
// agenda va delante siempre que exista. Sin eventos anunciados se cae a la
// descripcion de la ficha, que es lo unico honesto que queda por decir.
type DescPartes = { nombre: string; lugar?: string | null; eventos: number; proxima?: string | null; slug?: string | null }

const CLUB_DESC: Record<string, (p: DescPartes) => string> = {
  es: (p) => `Agenda de ${p.nombre}${p.lugar ? ` en ${p.lugar}` : ''}: ${p.eventos} ${p.eventos === 1 ? 'fiesta próxima' : 'fiestas próximas'}${p.proxima ? `, la siguiente el ${p.proxima}` : ''}. Line-ups, entradas y cómo llegar.`,
  en: (p) => `${p.nombre}${p.lugar ? ` in ${p.lugar}` : ''} listings: ${p.eventos} upcoming ${p.eventos === 1 ? 'party' : 'parties'}${p.proxima ? `, next one on ${p.proxima}` : ''}. Line-ups, tickets and how to get there.`,
  de: (p) => `${p.nombre}${p.lugar ? ` in ${p.lugar}` : ''}: ${p.eventos} ${p.eventos === 1 ? 'kommende Party' : 'kommende Partys'}${p.proxima ? `, die nächste am ${p.proxima}` : ''}. Line-ups, Tickets und Anfahrt.`,
}

const DJ_DESC: Record<string, (p: DescPartes) => string> = {
  es: (p) => `${p.nombre}${p.lugar ? ` en ${p.lugar}` : ''}: ${p.eventos} ${p.eventos === 1 ? 'sesión anunciada' : 'sesiones anunciadas'}${p.proxima ? `, la siguiente el ${p.proxima}` : ''}. Fechas, salas y entradas.`,
  en: (p) => `${p.nombre}${p.lugar ? ` in ${p.lugar}` : ''}: ${p.eventos} announced ${p.eventos === 1 ? 'set' : 'sets'}${p.proxima ? `, next one on ${p.proxima}` : ''}. Dates, venues and tickets.`,
  de: (p) => `${p.nombre}${p.lugar ? ` in ${p.lugar}` : ''}: ${p.eventos} ${p.eventos === 1 ? 'angekündigtes Set' : 'angekündigte Sets'}${p.proxima ? `, das nächste am ${p.proxima}` : ''}. Termine, Clubs und Tickets.`,
}

function construir(
  plantillas: Record<string, (p: DescPartes) => string>,
  partes: DescPartes,
  locale: string,
  respaldo?: string | null,
) {
  if (partes.eventos > 0) {
    const f = plantillas[locale] || plantillas[routing.defaultLocale]
    return recortar(f(partes))
  }
  return respaldo ? recortar(respaldo) : ''
}

// Snippet de busqueda curado por club, para cuando no hay agenda.
//
// El respaldo generico (la descripcion larga de la ficha) suele abrir con
// "[Nombre] es la discoteca de..." — quien busca "la santa benicassim" ya lo
// sabe. Lo que de verdad teclea antes de ir es "precio entrada X", "codigo
// vestimenta X", "que musica pone X": eso es lo que va aqui, sacado de las
// mismas reviews que alimentan el CLUB_FAQS. Solo entra el club investigado;
// el resto sigue cayendo al hook + descripcion de siempre.
const CLUB_META_DESC: Record<string, Record<string, string>> = {
  'la-santa': {
    es: 'Entrada 10-20€. Código de vestimenta estricto: evita tirantes y chanclas. Reguetón de martes a domingo, techno los viernes con LA CLANDESTINA.',
    en: 'Entry €10-20. Strict dress code: no tank tops or flip-flops. Reggaeton Tue-Sun, techno on Fridays with LA CLANDESTINA.',
    de: 'Eintritt 10-20€. Strenger Dresscode: keine Trägershirts oder Flip-Flops. Reggaeton Di-So, freitags Techno mit LA CLANDESTINA.',
  },
  'perro-negro-madrid': {
    es: 'Reguetón colombiano en el barrio de Salamanca. Abre jueves, viernes y sábado de 00:00 a 06:00. Entrada desde 30€ con consumición. Metro Lista o Serrano.',
    en: 'Colombian reggaeton in the Salamanca district. Open Thursday to Saturday, midnight to 6am. Entry from €30 with a drink. Metro Lista or Serrano.',
    de: 'Kolumbianischer Reggaeton im Viertel Salamanca. Donnerstag bis Samstag von 0 bis 6 Uhr. Eintritt ab 30€ inklusive Getränk. Metro Lista oder Serrano.',
  },
  'koya-club': {
    es: 'El antiguo Magic de S\'Arenal, en Playa de Palma. Afro house, latin tech y reguetón. Entrada en puerta desde 10€ y lista gratuita limitada en verano 2026.',
    en: 'The former Magic in S\'Arenal, Playa de Palma. Afro house, Latin tech and reggaeton. Door entry from €10 and a limited free guest list in summer 2026.',
    de: 'Das frühere Magic in S\'Arenal an der Playa de Palma. Afro House, Latin Tech und Reggaeton. Abendkasse ab 10€ und begrenzte Gästeliste im Sommer 2026.',
  },
  'calablava-beach-club': {
    es: 'Piscina frente al mar, hamacas y camas balinesas a unos 20 minutos de Valencia. Cocina mediterránea y tardeo con DJ, de mayo a septiembre.',
    en: 'Seafront pool, sunbeds and Balinese beds about 20 minutes from Valencia. Mediterranean food and afternoon DJ sessions, from May to September.',
    de: 'Pool am Meer, Liegen und Balibetten rund 20 Minuten von Valencia. Mediterrane Küche und DJ-Sets am Nachmittag, von Mai bis September.',
  },
  'todos-santos': {
    es: 'Entrada 25€ con consumición. Lista gratis para chicas hasta la 1:00. Mayores de 20, vestimenta casual. Jueves desde las 23:30, viernes y sábado a las 00:00.',
    en: 'Entry €25 with a drink. Free guest list for women until 1am. Ages 20+, casual dress. Thursdays from 11:30pm, Fridays and Saturdays from midnight.',
    de: 'Eintritt 25€ inklusive Getränk. Gästeliste für Frauen bis 1 Uhr gratis. Ab 20, Dresscode casual. Donnerstags ab 23:30, freitags und samstags ab 0 Uhr.',
  },
  'panama-jack-magaluf': {
    es: 'Reguetón y música latina en la Strip de Magaluf. Abre cada día de 22:00 a 06:00 en temporada. Mayores de 18, vestimenta casual. Mesas VIP sin cola.',
    en: 'Reggaeton and Latin music on the Magaluf Strip. Open daily 10pm to 6am in season. Ages 18+, casual dress. VIP tables with priority entry.',
    de: 'Reggaeton und Latin am Strip von Magaluf. In der Saison täglich von 22 bis 6 Uhr. Ab 18 Jahren, Dresscode casual. VIP-Tische mit bevorzugtem Einlass.',
  },
  'terraza-karau': {
    es: 'Terraza en el jardín del Palacio de Linares, junto a Cibeles. Abre de miércoles a domingo desde las 17:00. Cócteles, picoteo y tardeo con DJ.',
    en: 'Terrace in the garden of Palacio de Linares, next to Cibeles. Open Wednesday to Sunday from 5pm. Cocktails, small plates and afternoon DJ sessions.',
    de: 'Terrasse im Garten des Palacio de Linares, direkt an der Plaza de Cibeles. Mittwoch bis Sonntag ab 17 Uhr. Cocktails, Snacks und DJ-Sets.',
  },
  'bcm-mallorca': {
    es: 'Entrada entre 30 y 50€ según la noche. Mayores de 18 con documento original. Smart casual: sin chanclas ni ropa de playa. Abre de abril a septiembre.',
    en: 'Entry €30-50 depending on the night. Ages 18+ with original ID. Smart casual: no flip-flops or beachwear. Open from April to September.',
    de: 'Eintritt je nach Abend 30 bis 50€. Ab 18 mit Originalausweis. Smart casual: keine Flip-Flops oder Strandkleidung. Geöffnet von April bis September.',
  },
  'blvd-maritimo-club': {
    es: 'En el Paseo Marítimo de Palma. Abre viernes y sábado de 23:45 a 06:00. Éxitos comerciales, reguetón y música latina, con las fiestas KAOS y EUPHORIA.',
    en: "On Palma's Paseo Marítimo. Open Friday and Saturday, 11:45pm to 6am. Commercial hits, reggaeton and Latin music, with the KAOS and EUPHORIA parties.",
    de: 'Am Paseo Marítimo in Palma. Freitag und Samstag von 23:45 bis 6 Uhr. Charthits, Reggaeton und Latin, dazu die Partys KAOS und EUPHORIA.',
  },
  'overclub': {
    es: 'Techno y tech house en el polígono Son Rossinyol de Palma. Abre viernes y sábado desde las 23:00. El precio de la entrada depende del cartel.',
    en: "Techno and tech house in Palma's Son Rossinyol industrial estate. Open Friday and Saturday from 11pm. Ticket prices depend on the lineup.",
    de: 'Techno und Tech House im Gewerbegebiet Son Rossinyol in Palma. Freitag und Samstag ab 23 Uhr. Der Eintritt hängt vom Line-up ab.',
  },
  'calle-365': {
    es: 'Speakeasy del Barrio de las Letras que cambia de país cada año. Se entra con la contraseña del mes. Abre a diario desde las 18:00. Metro Antón Martín.',
    en: 'Speakeasy in Barrio de las Letras that switches country every year. You get in with the monthly password. Open daily from 6pm. Metro Antón Martín.',
    de: 'Speakeasy im Barrio de las Letras, das jedes Jahr das Land wechselt. Einlass mit dem Passwort des Monats. Täglich ab 18 Uhr. Metro Antón Martín.',
  },
  'wave-club': {
    es: 'Club del polígono Can Valero, en Palma. Los viernes, techno y house con R33 desde medianoche; el resto, reguetón. A 15 minutos en taxi del centro.',
    en: "Club in Palma's Can Valero industrial estate. Fridays bring techno and house with R33 from midnight. Other nights, reggaeton. 15 minutes by taxi.",
    de: 'Club im Gewerbegebiet Can Valero in Palma. Freitags Techno und House mit R33 ab Mitternacht, sonst Reggaeton. 15 Minuten mit dem Taxi vom Zentrum.',
  },
  'fitz-mallorca': {
    es: 'El antiguo Tito\'s del Paseo Marítimo de Palma, reabierto en julio de 2026 por Grupo Sounds. House, tech house y música urbana. Vestimenta casual.',
    en: "The former Tito's on Palma's Paseo Marítimo, reopened in July 2026 by Grupo Sounds. House, tech house and urban music. Casual dress code.",
    de: 'Das frühere Tito\'s am Paseo Marítimo in Palma, im Juli 2026 von Grupo Sounds neu eröffnet. House, Tech House und Urban. Dresscode casual.',
  },
  'enredo-club': {
    es: 'Club a pie de Paseo Marítimo, en Portopí. Abre viernes y sábado de 23:00 a 05:00. MENEO los sábados con reguetón y perreo; cumbia los viernes.',
    en: "Club right on Palma's Paseo Marítimo, in Portopí. Open Friday and Saturday, 11pm to 5am. MENEO on Saturdays with reggaeton; cumbia on Fridays.",
    de: 'Club direkt am Paseo Marítimo in Portopí. Freitag und Samstag von 23 bis 5 Uhr. Samstags MENEO mit Reggaeton, freitags Cumbia.',
  },
  'brokers-valencia': {
    es: 'Bank Club en la Avenida de Francia, junto a la Ciudad de las Artes. Tardeo desde las 17:00 y noche hasta las 03:30, de jueves a domingo. Metro línea 10.',
    en: 'Bank Club on Avenida de Francia, next to the City of Arts and Sciences. Afternoon sessions from 5pm, nights until 3:30am, Thursday to Sunday.',
    de: 'Bank Club an der Avenida de Francia, neben der Stadt der Künste. Tardeo ab 17 Uhr, nachts bis 3:30 Uhr, Donnerstag bis Sonntag. Metro Linie 10.',
  },
}

export function clubMetaDescription(partes: DescPartes, locale: string, respaldo?: string | null) {
  if (partes.eventos === 0) {
    const curado = partes.slug ? CLUB_META_DESC[partes.slug]?.[locale] : null
    if (curado) return recortar(curado)
    if (!respaldo) return ''
    return recortar(respaldo)
  }
  return construir(CLUB_DESC, partes, locale, respaldo)
}

// Con sesiones anunciadas, construir() usa solo la plantilla de fechas y
// descarta el short_bio: mucha demanda de busqueda sobre DJs es "quien es"
// (nombre real, origen), no "cuando toca", y esa plantilla nunca lo responde
// aunque el dato exista en la ficha. El short_bio va primero: es lo que
// falta en la busqueda "quien es", y si el recorte de 155 caracteres tiene
// que comerse algo, mejor que sea la fecha de la sesion que ya se ve en el
// hero de la ficha.
export function djMetaDescription(partes: DescPartes, locale: string, respaldo?: string | null) {
  if (partes.eventos > 0 && respaldo) {
    const f = DJ_DESC[locale] || DJ_DESC[routing.defaultLocale]
    return recortar(`${respaldo} ${f(partes)}`)
  }
  return construir(DJ_DESC, partes, locale, respaldo)
}

// ─────────────────────────────────────────────────────────────────────────────
// Bloque de respuesta de las fichas
//
// Un asistente (ChatGPT, Perplexity, AI Overviews) no cita una galeria ni un
// listado de tarjetas: cita una frase que responde la pregunta entera y que se
// sostiene sola fuera de la pagina. Las fichas tenian los datos repartidos en
// hero, chips, direccion y agenda, asi que no habia ninguna frase citable.
//
// Va en texto plano y debajo de la descripcion, y solo con datos que estan en
// la base: nada de rellenar con adjetivos. Es solo la frase: nombre, lugar,
// direccion y generos ya se ven en el hero y en los chips justo encima, asi
// que declararlos otra vez aqui en forma de tabla era la redundancia visual
// que se veia en pantalla.
export type ResumenFicha = string

// El nombre y el lugar ya estan en el hero, y los generos en los chips justo
// encima: repetirlos aqui era la redundancia que se veia en pantalla. Solo
// queda la parte que no esta en ningun otro sitio de la ficha en forma de
// texto: cuantas fiestas hay y cuando es la siguiente.
const RESUMEN_CLUB: Record<string, (p: {
  nombre: string; lugar: string | null; eventos: number; proxima: string | null; generos: string[]
}) => string> = {
  es: (p) => p.eventos > 0
    ? `${p.nombre} tiene ${p.eventos} ${p.eventos === 1 ? 'fiesta anunciada' : 'fiestas anunciadas'}${p.proxima ? `, la próxima el ${p.proxima}` : ''}.`
    : `${p.nombre} no tiene fiestas anunciadas ahora mismo.`,
  en: (p) => p.eventos > 0
    ? `${p.nombre} has ${p.eventos} announced ${p.eventos === 1 ? 'party' : 'parties'}${p.proxima ? `, the next one on ${p.proxima}` : ''}.`
    : `${p.nombre} has no announced parties right now.`,
  de: (p) => p.eventos > 0
    ? `${p.nombre}: ${p.eventos === 1 ? '1 Party angekündigt' : `${p.eventos} Partys angekündigt`}${p.proxima ? `, die nächste am ${p.proxima}` : ''}.`
    : `${p.nombre}: aktuell keine Partys angekündigt.`,
}

// Tres generos como mucho. La Santa tiene nueve dados de alta y la frase salia
// con una lista de nueve estilos al final, que ya no es una frase que nadie
// vaya a citar. La ficha los sigue mostrando todos en los chips.
const TOPE_GENEROS = 3

export function resumenClub(p: {
  nombre: string; lugar: string | null; direccion: string | null
  eventos: number; proxima: string | null; generos: string[]
}, locale: string): ResumenFicha {
  const f = RESUMEN_CLUB[locale] || RESUMEN_CLUB[routing.defaultLocale]
  return f({ ...p, generos: p.generos.slice(0, TOPE_GENEROS) })
}

// El genero ya sale en los chips justo encima: aqui solo queda la agenda.
const RESUMEN_DJ: Record<string, (p: {
  nombre: string; generos: string[]; eventos: number; proxima: string | null; club: string | null
}) => string> = {
  es: (p) => p.eventos > 0
    ? `${p.nombre} tiene ${p.eventos} ${p.eventos === 1 ? 'sesión anunciada' : 'sesiones anunciadas'}${p.proxima ? `, la próxima el ${p.proxima}` : ''}${p.club ? ` en ${p.club}` : ''}.`
    : `${p.nombre} no tiene sesiones anunciadas ahora mismo.`,
  en: (p) => p.eventos > 0
    ? `${p.nombre} has ${p.eventos} announced ${p.eventos === 1 ? 'set' : 'sets'}${p.proxima ? `, the next one on ${p.proxima}` : ''}${p.club ? ` at ${p.club}` : ''}.`
    : `${p.nombre} has no announced sets right now.`,
  de: (p) => p.eventos > 0
    ? `${p.nombre}: ${p.eventos === 1 ? '1 Set angekündigt' : `${p.eventos} Sets angekündigt`}${p.proxima ? `, das nächste am ${p.proxima}` : ''}${p.club ? ` im ${p.club}` : ''}.`
    : `${p.nombre}: aktuell keine Sets angekündigt.`,
}

export function resumenDj(p: {
  nombre: string; generos: string[]; eventos: number; proxima: string | null; club: string | null
}, locale: string): ResumenFicha {
  const f = RESUMEN_DJ[locale] || RESUMEN_DJ[routing.defaultLocale]
  return f({ ...p, generos: p.generos.slice(0, TOPE_GENEROS) })
}

// Nombre, fecha, local y zona ya estan bajo el hero; los generos, en los
// chips; el line-up, en sus propias tarjetas mas abajo. Lo unico que no esta
// dicho como frase en ningun otro sitio de la ficha es si se puede reservar.
const RESUMEN_EVENTO: Record<string, (p: {
  nombre: string; generos: string[]; lugar: string | null; zona: string | null
  cuando: string; lineup: string[]; reserva: boolean
}) => string> = {
  es: (p) => p.reserva
    ? `Las entradas para ${p.nombre} se reservan desde esta ficha.`
    : `${p.nombre} no tiene reserva de entradas online todavía.`,
  en: (p) => p.reserva
    ? `Tickets for ${p.nombre} can be booked from this page.`
    : `${p.nombre} has no online ticket booking yet.`,
  de: (p) => p.reserva
    ? `Tickets für ${p.nombre} können über diese Seite gebucht werden.`
    : `Fuer ${p.nombre} gibt es noch keine Online-Ticketbuchung.`,
}

export function resumenEvento(p: {
  nombre: string; generos: string[]; lugar: string | null; zona: string | null
  cuando: string; lineup: string[]; reserva: boolean
}, locale: string): ResumenFicha {
  const f = RESUMEN_EVENTO[locale] || RESUMEN_EVENTO[routing.defaultLocale]
  return f(p)
}

// Respaldo cuando el evento no tiene description ni description_i18n: mismo
// motivo que descripcionLocal en la ficha de club (ver su comentario) pero
// aqui faltaba del todo, asi que /en/event/x y /de/event/x servian
// "Reserva tus entradas en Where We Go" en castellano fijo.
const EVENT_DESC_FALLBACK: Record<string, (nombre: string, venue: string, fecha: string) => string> = {
  es: (n, v, f) => `${n}${v ? ` en ${v}` : ''}, ${f}. Reserva tus entradas en Where We Go.`,
  en: (n, v, f) => `${n}${v ? ` at ${v}` : ''}, ${f}. Book your tickets on Where We Go.`,
  de: (n, v, f) => `${n}${v ? ` im ${v}` : ''}, ${f}. Tickets sichern auf Where We Go.`,
}

export function eventMetaDescription(nombre: string, venue: string, fecha: string, locale: string) {
  const f = EVENT_DESC_FALLBACK[locale] || EVENT_DESC_FALLBACK[routing.defaultLocale]
  return f(nombre, venue, fecha)
}

// Parrafo de relleno cuando el evento no tiene description propia (la mayoria
// no la tiene todavia): sin esto la ficha se queda en el resumen de una frase
// de resumenEvento, sin texto real que la distinga de las otras 600 fichas
// iguales. Igual que genreZoneSummary, usa solo datos reales que la pagina ya
// trae (genero, club, zona, line-up), nunca precios ni horarios inventados.
const EVENT_CONTENT_SUMMARY: Record<string, (p: {
  genero: string | null; club: string | null; zona: string | null; djs: string[]
}) => string> = {
  es: (p) => {
    const genero = p.genero ? `Sesión de ${p.genero}` : 'Esta sesión'
    const lugar = p.club ? ` en ${p.club}` : (p.zona ? ` en ${p.zona}` : '')
    const cabina = p.djs.length ? ` con ${p.djs.join(', ')} en cabina` : ''
    return `${genero}${lugar}${cabina}.`
  },
  en: (p) => {
    const genero = p.genero ? `A ${p.genero} session` : 'This session'
    const lugar = p.club ? ` at ${p.club}` : (p.zona ? ` in ${p.zona}` : '')
    const cabina = p.djs.length ? ` with ${p.djs.join(', ')} on the decks` : ''
    return `${genero}${lugar}${cabina}.`
  },
  de: (p) => {
    const genero = p.genero ? `Ein ${p.genero}-Abend` : 'Dieser Abend'
    const lugar = p.club ? ` im ${p.club}` : (p.zona ? ` in ${p.zona}` : '')
    const cabina = p.djs.length ? ` mit ${p.djs.join(', ')} am Pult` : ''
    return `${genero}${lugar}${cabina}.`
  },
}

export function eventContentSummary(p: {
  genero: string | null; club: string | null; zona: string | null; djs: string[]
}, locale: string): string {
  if (!p.club && !p.zona && !p.djs.length && !p.genero) return ''
  const f = EVENT_CONTENT_SUMMARY[locale] || EVENT_CONTENT_SUMMARY[routing.defaultLocale]
  return f(p)
}

// ─────────────────────────────────────────────────────────────────────────────
// Titulos de las fichas
//
// Estaban escritos en castellano para los tres idiomas, y el del DJ concatenaba
// hasta tres generos: "AJ CHRISTOU — DJ de Tech House, Minimal tech house,
// Groove | Where We Go" son 74 caracteres y Google corta sobre los 60. Un solo
// genero es ademas lo que se busca de verdad ("dj tech house mallorca"), no la
// lista entera.
// El titulo describe la ficha. En septiembre de 2026 se cambio a "entradas y
// agenda" en todas a la vez; se vuelve al formato con el que posicionaban.
const TITULO_CLUB: Record<string, (n: string, lugar: string | null) => string> = {
  es: (n, l) => `${n}: discoteca${l ? ` en ${l}` : ''}`,
  en: (n, l) => `${n}: nightclub${l ? ` in ${l}` : ''}`,
  de: (n, l) => `${n}: Club${l ? ` in ${l}` : ''}`,
}

export function tituloClub(nombre: string, lugar: string | null, locale: string) {
  return (TITULO_CLUB[locale] || TITULO_CLUB[routing.defaultLocale])(nombre, lugar)
}

const TITULO_DJ: Record<string, (n: string, g: string | null) => string> = {
  es: (n, g) => `${n}: DJ${g ? ` de ${g}` : ''}`,
  en: (n, g) => `${n}: ${g ? `${g} ` : ''}DJ`,
  de: (n, g) => `${n}: ${g ? `${g} ` : ''}DJ`,
}

// Un solo genero a proposito: ver la nota de TITULO_CLUB.
export function tituloDj(nombre: string, generos: string[], locale: string) {
  const g = generos.length ? generos[0] : null
  return (TITULO_DJ[locale] || TITULO_DJ[routing.defaultLocale])(nombre, g)
}

// ─────────────────────────────────────────────────────────────────────────────
// FAQ por club.
//
// zoneFaq() y nearFaq() ya cubren la ciudad; aqui falta el club, que es
// donde esta la intencion de busqueda mas concreta ("codigo de vestimenta
// [club]", "precio entrada [club]"). Precio y vestimenta no son campos de la
// base de datos: salen de reviews reales, investigadas una por una, igual
// que ZONE_GUIDES. Por eso va por slug y curado a mano, no generado con cada
// club nuevo — sin entrada aqui, la ficha sigue funcionando igual, solo sin
// este bloque.
const CLUB_FAQS: Record<string, Record<string, ZoneFaq[]>> = {
  'la-santa': {
    es: [
      { q: '¿Hay código de vestimenta en La Santa?', a: 'Sí, y lo aplican con firmeza en la puerta aunque no siempre se comunique de antemano. Varios clientes cuentan que les han dejado fuera por tirantes, chanclas o ropa muy informal, así que conviene ir algo arreglado.' },
      { q: '¿Cuánto cuesta la entrada en La Santa?', a: 'Según las reseñas de clientes, la entrada suele moverse entre 10 y 20€ según la noche y el cartel.' },
      { q: '¿Qué música suena en La Santa?', a: 'De martes a domingo, reguetón, música urbana y los éxitos comerciales del momento. Los viernes cambia el registro con LA CLANDESTINA (techno, tech house y deep house), y en temporada alta se suma OASiS Benicàssim los lunes.' },
      { q: '¿Cómo es el ambiente y el servicio en La Santa?', a: 'Los clientes destacan de forma recurrente el sonido y la iluminación cuidados, la decoración de la sala y un personal atento que responde rápido incluso en las noches de más gente.' },
    ],
    en: [
      { q: 'Is there a dress code at La Santa?', a: "Yes, and it's enforced firmly at the door even if it isn't always announced beforehand. Several customers report being turned away for tank tops, flip-flops or very casual clothing, so it's worth dressing up a bit." },
      { q: 'How much is a ticket at La Santa?', a: 'Based on customer reviews, entry usually runs between €10 and €20 depending on the night and the lineup.' },
      { q: 'What music plays at La Santa?', a: "Tuesday through Sunday it's reggaeton, urban music and the current commercial hits. Fridays switch to LA CLANDESTINA (techno, tech house and deep house), and in high season OASiS Benicàssim joins on Mondays." },
      { q: 'What is the vibe and service like at La Santa?', a: 'Customers consistently mention well-looked-after sound and lighting, considered decor, and attentive staff who respond quickly even on the busiest nights.' },
    ],
    de: [
      { q: 'Gibt es bei La Santa eine Kleiderordnung?', a: 'Ja, und sie wird am Einlass konsequent durchgesetzt, auch wenn das nicht immer vorher angekündigt wird. Mehrere Gäste berichten, wegen Trägershirts, Flip-Flops oder sehr legerer Kleidung abgewiesen worden zu sein — etwas herausgeputzt zu erscheinen lohnt sich also.' },
      { q: 'Was kostet der Eintritt bei La Santa?', a: 'Nach Kundenbewertungen liegt der Eintritt je nach Abend und Line-up meist zwischen 10 und 20€.' },
      { q: 'Welche Musik läuft bei La Santa?', a: 'Von Dienstag bis Sonntag laufen Reggaeton, Urban Music und aktuelle Charterfolge. Freitags übernimmt LA CLANDESTINA (Techno, Tech House und Deep House), und in der Hochsaison kommt montags OASiS Benicàssim dazu.' },
      { q: 'Wie sind Stimmung und Service bei La Santa?', a: 'Gäste erwähnen immer wieder gepflegten Sound und gepflegte Beleuchtung, eine durchdachte Dekoration und aufmerksames Personal, das auch an den vollsten Abenden schnell reagiert.' },
    ],
  },
  'perro-negro-madrid': {
    es: [
      { q: '¿Qué días abre Perro Negro Madrid?', a: 'Abre jueves, viernes y sábado, de 00:00 a 06:00.' },
      { q: '¿Cuánto cuesta la entrada en Perro Negro Madrid?', a: 'Según Time Out (febrero de 2025), la entrada parte de 30€ e incluye una consumición. El precio puede cambiar según la noche, así que conviene confirmarlo antes de ir.' },
      { q: '¿Qué música suena en Perro Negro Madrid?', a: 'Reguetón colombiano y música urbana, con DJs residentes llegados de Medellín, la ciudad donde nació el club en 2017.' },
      { q: '¿Cómo llegar a Perro Negro Madrid en metro?', a: 'Está en la calle Don Ramón de la Cruz, 28, en el barrio de Salamanca. Las estaciones más cercanas son Lista, Serrano y Velázquez (línea 4) y Núñez de Balboa (líneas 5 y 9).' },
      { q: '¿Cómo es la sala de Perro Negro Madrid?', a: 'Es una sala pequeña, para unas 300 personas. Se entra por un pasillo estrecho de espejos que lleva a unas escaleras y a la pista, con la cabina del DJ al fondo y reservados VIP a ambos lados. Abrió el 14 de noviembre de 2024 como primera sede de la marca en Europa.' },
    ],
    en: [
      { q: 'Which days is Perro Negro Madrid open?', a: 'It opens Thursday, Friday and Saturday, from midnight to 6am.' },
      { q: 'How much is entry at Perro Negro Madrid?', a: 'According to Time Out (February 2025), entry starts at €30 and includes one drink. Prices can change from night to night, so check before you go.' },
      { q: 'What music plays at Perro Negro Madrid?', a: 'Colombian reggaeton and urban music, with resident DJs from Medellín, the city where the club was founded in 2017.' },
      { q: 'How do I get to Perro Negro Madrid by metro?', a: 'It is at Calle Don Ramón de la Cruz, 28, in the Salamanca district. The closest stations are Lista, Serrano and Velázquez (line 4) and Núñez de Balboa (lines 5 and 9).' },
      { q: 'What is the venue like?', a: 'It is a small club for around 300 people. A narrow mirrored corridor leads to stairs and the dance floor, with the DJ booth at the back and VIP areas on both sides. It opened on 14 November 2024 as the brand\'s first venue in Europe.' },
    ],
    de: [
      { q: 'An welchen Tagen hat Perro Negro Madrid geöffnet?', a: 'Geöffnet ist donnerstags, freitags und samstags von 0 bis 6 Uhr.' },
      { q: 'Was kostet der Eintritt bei Perro Negro Madrid?', a: 'Laut Time Out (Februar 2025) kostet der Eintritt ab 30€ und enthält ein Getränk. Der Preis kann je nach Abend abweichen, vorher nachzusehen lohnt sich.' },
      { q: 'Welche Musik läuft bei Perro Negro Madrid?', a: 'Kolumbianischer Reggaeton und Urban Music, mit Resident-DJs aus Medellín, wo der Club 2017 gegründet wurde.' },
      { q: 'Wie komme ich mit der Metro zu Perro Negro Madrid?', a: 'Der Club liegt in der Calle Don Ramón de la Cruz, 28, im Viertel Salamanca. Die nächsten Stationen sind Lista, Serrano und Velázquez (Linie 4) sowie Núñez de Balboa (Linien 5 und 9).' },
      { q: 'Wie ist der Club aufgebaut?', a: 'Es ist ein kleiner Club für rund 300 Personen. Ein schmaler, verspiegelter Gang führt über eine Treppe zur Tanzfläche, mit dem DJ-Pult am Ende und VIP-Bereichen auf beiden Seiten. Eröffnet wurde er am 14. November 2024 als erster Standort der Marke in Europa.' },
    ],
  },
  'koya-club': {
    es: [
      { q: '¿Koya Club es el antiguo Magic de El Arenal?', a: 'Sí. Koya ocupa el local del antiguo Magic, en la Avenida Nacional, 21, en Playa de Palma (S\'Arenal).' },
      { q: '¿Cuánto cuesta la entrada en Koya Club?', a: 'En las fiestas del verano de 2026 la entrada en puerta costaba 10€, con una lista gratuita de plazas limitadas. El precio depende de la fiesta y del promotor.' },
      { q: '¿Qué música suena en Koya Club?', a: 'Afro house, latin tech, electro latino y reguetón, según los carteles de sus fiestas de 2026.' },
      { q: '¿Cuándo abre Koya Club?', a: 'Funciona por temporada. Se estrenó el 4 de julio de 2026 y sus fiestas empezaban a las 23:45. Fuera del verano no siempre hay programación, así que conviene mirar la agenda antes de ir.' },
    ],
    en: [
      { q: 'Is Koya Club the former Magic in El Arenal?', a: 'Yes. Koya took over the former Magic venue at Avenida Nacional, 21, in Playa de Palma (S\'Arenal).' },
      { q: 'How much is entry at Koya Club?', a: 'At its summer 2026 parties, door entry was €10, with a limited free guest list. The price depends on the night and the promoter.' },
      { q: 'What music plays at Koya Club?', a: 'Afro house, Latin tech, electro latino and reggaeton, according to its 2026 lineups.' },
      { q: 'When is Koya Club open?', a: 'It runs seasonally. It opened on 4 July 2026 and its parties started at 11:45pm. Outside summer there is not always a programme, so check the listings before you go.' },
    ],
    de: [
      { q: 'Ist der Koya Club das frühere Magic in El Arenal?', a: 'Ja. Koya hat die Räume des früheren Magic in der Avenida Nacional, 21, an der Playa de Palma (S\'Arenal) übernommen.' },
      { q: 'Was kostet der Eintritt im Koya Club?', a: 'Bei den Partys im Sommer 2026 kostete der Eintritt an der Abendkasse 10€, dazu gab es eine begrenzte kostenlose Gästeliste. Der Preis hängt vom Abend und vom Veranstalter ab.' },
      { q: 'Welche Musik läuft im Koya Club?', a: 'Afro House, Latin Tech, Electro Latino und Reggaeton, so die Line-ups von 2026.' },
      { q: 'Wann hat der Koya Club geöffnet?', a: 'Der Club läuft saisonal. Eröffnet wurde er am 4. Juli 2026, die Partys begannen um 23:45 Uhr. Außerhalb des Sommers gibt es nicht immer Programm, ein Blick in den Kalender lohnt sich.' },
    ],
  },
  'calablava-beach-club': {
    es: [
      { q: '¿Qué ofrece Calablava Beach Club?', a: 'Es un club de piscina frente al mar, con hamacas, camas balinesas y una zona VIP separada pensada para grupos. Está planteado para pasar el día entero.' },
      { q: '¿Dónde está Calablava y a cuánto queda de Valencia?', a: 'En el Passeig del Port, 6, junto al puerto deportivo de la Pobla de Farnals, a unos veinte minutos de Valencia. La playa queda justo delante.' },
      { q: '¿Se puede comer en Calablava Beach Club?', a: 'Sí. Tiene carta mediterránea, con arroces, que se puede pedir en la hamaca o en mesa con vistas al mar.' },
      { q: '¿Cuándo es mejor ir a Calablava?', a: 'De mayo a septiembre. Las condiciones de acceso y de reserva cambian según la temporada, así que conviene confirmarlas con el club antes de ir.' },
    ],
    en: [
      { q: 'What does Calablava Beach Club offer?', a: 'It is a seafront pool club with sunbeds, Balinese beds and a separate VIP area for groups. It is designed for spending the whole day.' },
      { q: 'Where is Calablava and how far is it from Valencia?', a: 'At Passeig del Port, 6, next to the marina in La Pobla de Farnals, about twenty minutes from Valencia. The beach is right in front.' },
      { q: 'Can you eat at Calablava Beach Club?', a: 'Yes. It has a Mediterranean menu, including rice dishes, served at your sunbed or at a table with sea views.' },
      { q: 'When is the best time to go to Calablava?', a: 'From May to September. Access and booking conditions change with the season, so confirm them with the club before you go.' },
    ],
    de: [
      { q: 'Was bietet der Calablava Beach Club?', a: 'Ein Poolclub direkt am Meer mit Liegen, Balibetten und einem separaten VIP-Bereich für Gruppen. Er ist darauf ausgelegt, den ganzen Tag dort zu verbringen.' },
      { q: 'Wo liegt Calablava und wie weit ist es von Valencia?', a: 'Am Passeig del Port, 6, neben dem Yachthafen von La Pobla de Farnals, rund zwanzig Minuten von Valencia. Der Strand liegt direkt davor.' },
      { q: 'Kann man im Calablava Beach Club essen?', a: 'Ja. Es gibt eine mediterrane Karte mit Reisgerichten, serviert an der Liege oder am Tisch mit Meerblick.' },
      { q: 'Wann ist die beste Zeit für Calablava?', a: 'Von Mai bis September. Zugangs- und Reservierungsbedingungen ändern sich je nach Saison, am besten vorher beim Club nachfragen.' },
    ],
  },
  'todos-santos': {
    es: [
      { q: '¿Cuánto cuesta la entrada en Todos Santos?', a: 'En su venta de entradas de septiembre de 2026, la entrada general costaba 25€ con una consumición. Entrando antes de la 1:30, esos 25€ incluían dos consumiciones.' },
      { q: '¿Hay lista gratuita en Todos Santos?', a: 'Sí, para chicas: lista gratuita hasta la 1:00, sujeta a aforo.' },
      { q: '¿Qué edad mínima y qué vestimenta piden en Todos Santos?', a: 'El acceso es para mayores de 20 años y el estilo indicado es casual, según su página de entradas.' },
      { q: '¿Qué días abre Todos Santos?', a: 'Los jueves de 23:30 a 06:00, y viernes y sábado de 00:00 a 06:00. Está en la calle de Génova, 28.' },
      { q: '¿Cuánto cuesta una mesa en Todos Santos?', a: 'Las mesas parten de 300€, según su página de entradas de septiembre de 2026.' },
    ],
    en: [
      { q: 'How much is entry at Todos Santos?', a: 'On its September 2026 ticket listing, general entry was €25 with one drink. Arriving before 1:30am, the same €25 included two drinks.' },
      { q: 'Is there a free guest list at Todos Santos?', a: 'Yes, for women: free guest list until 1am, subject to capacity.' },
      { q: 'What are the minimum age and dress code at Todos Santos?', a: 'Entry is for ages 20 and over, and the listed style is casual, according to its ticket page.' },
      { q: 'Which days is Todos Santos open?', a: 'Thursdays from 11:30pm to 6am, and Fridays and Saturdays from midnight to 6am. It is at Calle de Génova, 28.' },
      { q: 'How much is a table at Todos Santos?', a: 'Tables start at €300, according to its September 2026 ticket page.' },
    ],
    de: [
      { q: 'Was kostet der Eintritt im Todos Santos?', a: 'Im Ticketverkauf vom September 2026 kostete der normale Eintritt 25€ inklusive eines Getränks. Wer vor 1:30 Uhr kam, bekam für dieselben 25€ zwei Getränke.' },
      { q: 'Gibt es im Todos Santos eine kostenlose Gästeliste?', a: 'Ja, für Frauen: kostenlose Gästeliste bis 1 Uhr, solange Kapazität vorhanden ist.' },
      { q: 'Welches Mindestalter und welcher Dresscode gelten im Todos Santos?', a: 'Einlass ab 20 Jahren, der angegebene Stil ist casual, so die Ticketseite.' },
      { q: 'An welchen Tagen hat Todos Santos geöffnet?', a: 'Donnerstags von 23:30 bis 6 Uhr, freitags und samstags von 0 bis 6 Uhr. Der Club liegt in der Calle de Génova, 28.' },
      { q: 'Was kostet ein Tisch im Todos Santos?', a: 'Tische gibt es ab 300€, so die Ticketseite vom September 2026.' },
    ],
  },
  'panama-jack-magaluf': {
    es: [
      { q: '¿Qué horario tiene Panama Jack Magaluf?', a: 'En temporada abre todos los días de 22:00 a 06:00.' },
      { q: '¿Qué edad mínima y qué vestimenta piden en Panama Jack?', a: 'El acceso es para mayores de 18 años y el código de vestimenta es casual, según sus listados de eventos.' },
      { q: '¿Qué música suena en Panama Jack Magaluf?', a: 'Sobre todo reguetón y música latina, con noches temáticas que cambian durante la semana. También suenan R&B y hip hop.' },
      { q: '¿Cómo se consiguen entradas o mesa en Panama Jack?', a: 'Las entradas y la lista se gestionan por Fourvenues. El club ofrece mesas reservables con acceso prioritario, sin cola.' },
      { q: '¿Dónde está Panama Jack Magaluf?', a: 'En la Avinguda de l\'Olivera, 13, en plena Strip de Magaluf, a pocos metros de BCM Mallorca.' },
    ],
    en: [
      { q: 'What are the opening hours of Panama Jack Magaluf?', a: 'In season it opens every day from 10pm to 6am.' },
      { q: 'What are the minimum age and dress code at Panama Jack?', a: 'Entry is for ages 18 and over and the dress code is casual, according to its event listings.' },
      { q: 'What music plays at Panama Jack Magaluf?', a: 'Mainly reggaeton and Latin music, with themed nights that change through the week. You will also hear R&B and hip hop.' },
      { q: 'How do I get tickets or a table at Panama Jack?', a: 'Tickets and guest list are handled through Fourvenues. The club offers bookable tables with priority entry, skipping the queue.' },
      { q: 'Where is Panama Jack Magaluf?', a: 'At Avinguda de l\'Olivera, 13, right on the Magaluf Strip, a few metres from BCM Mallorca.' },
    ],
    de: [
      { q: 'Welche Öffnungszeiten hat Panama Jack Magaluf?', a: 'In der Saison ist täglich von 22 bis 6 Uhr geöffnet.' },
      { q: 'Welches Mindestalter und welcher Dresscode gelten im Panama Jack?', a: 'Einlass ab 18 Jahren, der Dresscode ist casual, so die Veranstaltungslisten des Clubs.' },
      { q: 'Welche Musik läuft im Panama Jack Magaluf?', a: 'Vor allem Reggaeton und Latin, mit Mottoabenden, die im Lauf der Woche wechseln. Dazu kommen R&B und Hip-Hop.' },
      { q: 'Wie bekomme ich Tickets oder einen Tisch im Panama Jack?', a: 'Tickets und Gästeliste laufen über Fourvenues. Der Club bietet reservierbare Tische mit bevorzugtem Einlass ohne Warteschlange.' },
      { q: 'Wo liegt Panama Jack Magaluf?', a: 'In der Avinguda de l\'Olivera, 13, mitten am Strip von Magaluf, wenige Meter vom BCM Mallorca entfernt.' },
    ],
  },
  'terraza-karau': {
    es: [
      { q: '¿Dónde está la Terraza Karãu?', a: 'En el jardín del Palacio de Linares, sede de Casa de América, en el Paseo de Recoletos, 2. Queda junto a la plaza de Cibeles y la estación de metro más cercana es Banco de España (línea 2).' },
      { q: '¿Qué días abre la Terraza Karãu?', a: 'De miércoles a domingo, desde las 17:00. El cierre cambia según el día y la fiesta, y al ser una terraza al aire libre la programación se concentra entre mayo y octubre. Conviene confirmar el horario antes de ir.' },
      { q: '¿Hay que reservar en la Terraza Karãu?', a: 'Las mesas se reservan desde su web o por WhatsApp. Algunas sesiones son de acceso libre: el tardeo Madridterrãneo de junio de 2026, por ejemplo, se anunció como gratuito.' },
      { q: '¿Qué música suena en la Terraza Karãu?', a: 'Lounge, deep house y soft house para la puesta de sol, con sesiones de tardeo y DJ invitados. En 2026 programó una White Party en mayo, los tardeos Madridterrãneo en verano y una fiesta de Halloween con disfraces.' },
    ],
    en: [
      { q: 'Where is Terraza Karãu?', a: 'In the garden of Palacio de Linares, home of Casa de América, at Paseo de Recoletos, 2. It sits next to Plaza de Cibeles and the closest metro station is Banco de España (line 2).' },
      { q: 'Which days is Terraza Karãu open?', a: 'Wednesday to Sunday, from 5pm. Closing time changes with the day and the event, and as an open-air terrace its programme runs mainly from May to October. Check the hours before you go.' },
      { q: 'Do I need a reservation at Terraza Karãu?', a: 'Tables are booked through its website or by WhatsApp. Some sessions are free to enter: the Madridterrãneo afternoon party in June 2026, for example, was announced as free.' },
      { q: 'What music plays at Terraza Karãu?', a: 'Lounge, deep house and soft house for sunset, with afternoon sessions and guest DJs. In 2026 it hosted a White Party in May, the Madridterrãneo afternoon parties in summer and a costume Halloween party.' },
    ],
    de: [
      { q: 'Wo liegt die Terraza Karãu?', a: 'Im Garten des Palacio de Linares, Sitz der Casa de América, am Paseo de Recoletos, 2. Sie liegt direkt an der Plaza de Cibeles, die nächste Metrostation ist Banco de España (Linie 2).' },
      { q: 'An welchen Tagen hat die Terraza Karãu geöffnet?', a: 'Mittwoch bis Sonntag ab 17 Uhr. Die Schließzeit hängt vom Tag und von der Veranstaltung ab, und als Open-Air-Terrasse läuft das Programm vor allem von Mai bis Oktober. Die Zeiten vorher zu prüfen lohnt sich.' },
      { q: 'Muss man in der Terraza Karãu reservieren?', a: 'Tische werden über die Website oder per WhatsApp reserviert. Manche Sessions sind frei zugänglich: Der Tardeo Madridterrãneo im Juni 2026 wurde zum Beispiel als kostenlos angekündigt.' },
      { q: 'Welche Musik läuft in der Terraza Karãu?', a: 'Lounge, Deep House und Soft House zum Sonnenuntergang, mit Tardeo-Sessions und Gast-DJs. 2026 gab es im Mai eine White Party, im Sommer die Madridterrãneo-Tardeos und eine Halloween-Party mit Kostümen.' },
    ],
  },
  'bcm-mallorca': {
    es: [
      { q: '¿Cuánto cuesta la entrada en BCM Mallorca?', a: 'Según mallorca.com, la entrada estándar suele costar entre 30 y 50€ y algunas incluyen bebidas. En taquilla la misma noche suele ser más cara, y los grandes carteles se agotan con días de antelación. Las mesas VIP parten de unos 100€ por persona.' },
      { q: '¿Cuál es la edad mínima para entrar en BCM?', a: 'Hay que tener 18 años y enseñar un documento original en vigor: DNI, pasaporte o carné de conducir. No aceptan fotos ni copias en el móvil.' },
      { q: '¿Hay código de vestimenta en BCM Mallorca?', a: 'Smart casual. Chanclas, ropa de playa y chándal no pasan la puerta, y las noches de cabeza de cartel y las zonas VIP son más exigentes.' },
      { q: '¿Cuándo abre BCM Mallorca?', a: 'Abre sobre todo en verano, de abril a septiembre aproximadamente. Las puertas suelen abrir entre las 22:00 y las 23:00 y el cierre llega entre las 05:00 y las 06:00, según el evento. Fuera de temporada programa fechas sueltas, como Navidad y Nochevieja.' },
      { q: '¿Qué salas tiene BCM y cómo se llega?', a: 'Tiene una pista principal de varias plantas, la planta Millennium, conocida por sus fiestas de la espuma, y una zona exterior. Está en la Avinguda de l\'Olivera de Magaluf, a unos 20 o 25 minutos en coche de Palma. Al cierre se forman colas de taxis, así que conviene tener prevista la vuelta.' },
    ],
    en: [
      { q: 'How much is entry at BCM Mallorca?', a: 'According to mallorca.com, a standard ticket usually costs between €30 and €50 and some include drinks. Buying at the door on the night tends to cost more, and big lineups sell out days ahead. VIP tables start at around €100 per person.' },
      { q: 'What is the minimum age at BCM?', a: 'You must be 18 and show a valid original document: national ID, passport or driving licence. Photos and copies on your phone are not accepted.' },
      { q: 'Is there a dress code at BCM Mallorca?', a: 'Smart casual. Flip-flops, beachwear and tracksuits are turned away at the door, and headliner nights and VIP areas are stricter.' },
      { q: 'When is BCM Mallorca open?', a: 'Mainly in summer, roughly from April to September. Doors usually open between 10pm and 11pm and closing comes between 5am and 6am, depending on the event. Out of season it runs one-off dates such as Christmas and New Year\'s Eve.' },
      { q: 'What rooms does BCM have and how do I get there?', a: 'There is a multi-level main floor, the Millennium level, known for its foam parties, and an outdoor area. It is on Avinguda de l\'Olivera in Magaluf, about 20 to 25 minutes by car from Palma. Taxi queues build up at closing time, so plan your way back.' },
    ],
    de: [
      { q: 'Was kostet der Eintritt im BCM Mallorca?', a: 'Laut mallorca.com kostet ein Standardticket meist zwischen 30 und 50€, teils inklusive Getränken. An der Abendkasse ist es in der Regel teurer, und große Line-ups sind Tage vorher ausverkauft. VIP-Tische beginnen bei rund 100€ pro Person.' },
      { q: 'Wie alt muss man für das BCM sein?', a: 'Einlass ab 18 Jahren mit gültigem Originaldokument: Personalausweis, Reisepass oder Führerschein. Fotos und Kopien auf dem Handy werden nicht akzeptiert.' },
      { q: 'Gibt es im BCM Mallorca einen Dresscode?', a: 'Smart casual. Flip-Flops, Strandkleidung und Trainingsanzüge kommen nicht durch die Tür, bei Headliner-Abenden und in den VIP-Bereichen wird strenger kontrolliert.' },
      { q: 'Wann hat das BCM Mallorca geöffnet?', a: 'Vor allem im Sommer, etwa von April bis September. Einlass ist meist zwischen 22 und 23 Uhr, Schluss zwischen 5 und 6 Uhr, je nach Veranstaltung. Außerhalb der Saison gibt es einzelne Termine wie Weihnachten und Silvester.' },
      { q: 'Welche Bereiche hat das BCM und wie kommt man hin?', a: 'Es gibt eine Hauptfläche über mehrere Ebenen, die Millennium-Ebene, bekannt für ihre Schaumpartys, und einen Außenbereich. Der Club liegt an der Avinguda de l\'Olivera in Magaluf, etwa 20 bis 25 Autominuten von Palma. Nach Schluss bilden sich Taxischlangen, die Rückfahrt sollte man also einplanen.' },
    ],
  },
  'blvd-maritimo-club': {
    es: [
      { q: '¿Qué días abre BLVD Marítimo Club?', a: 'Viernes y sábado, de 23:45 a 06:00.' },
      { q: '¿Qué música suena en BLVD Marítimo Club?', a: 'Éxitos comerciales, dance, reguetón y música latina. La programación se organiza por fiestas: los sábados de noviembre de 2026 los ocupan KAOS x BLVD y EUPHORIA.' },
      { q: '¿Hay sesiones para menores de 18 en BLVD Marítimo?', a: 'Algunas fiestas, como EUPHORIA, se anuncian para mayores de 16. La edad mínima cambia con cada sesión, así que conviene mirarla en la ficha del evento antes de comprar.' },
      { q: '¿Dónde está BLVD Marítimo Club?', a: 'En la Avinguda de Gabriel Roca, 29, en pleno Paseo Marítimo de Palma, a pocos pasos de otros clubs de la zona como Fitz Mallorca. Se puede llegar andando desde el centro bordeando el puerto, y hay taxis en el propio paseo.' },
    ],
    en: [
      { q: 'Which days is BLVD Marítimo Club open?', a: 'Friday and Saturday, from 11:45pm to 6am.' },
      { q: 'What music plays at BLVD Marítimo Club?', a: 'Commercial hits, dance, reggaeton and Latin music. The programme is built around parties: in November 2026, Saturdays belong to KAOS x BLVD and EUPHORIA.' },
      { q: 'Are there under-18 sessions at BLVD Marítimo?', a: 'Some parties, such as EUPHORIA, are announced for ages 16 and over. The minimum age changes with each session, so check the event page before buying.' },
      { q: 'Where is BLVD Marítimo Club?', a: "At Avinguda de Gabriel Roca, 29, right on Palma's Paseo Marítimo, a short walk from other clubs in the area such as Fitz Mallorca. You can walk from the centre along the harbour, and there are taxis on the promenade itself." },
    ],
    de: [
      { q: 'An welchen Tagen hat der BLVD Marítimo Club geöffnet?', a: 'Freitag und Samstag von 23:45 bis 6 Uhr.' },
      { q: 'Welche Musik läuft im BLVD Marítimo Club?', a: 'Charthits, Dance, Reggaeton und Latin. Das Programm besteht aus festen Partys: Im November 2026 gehören die Samstage KAOS x BLVD und EUPHORIA.' },
      { q: 'Gibt es im BLVD Marítimo Partys für unter 18-Jährige?', a: 'Einige Partys, etwa EUPHORIA, sind ab 16 Jahren angekündigt. Das Mindestalter wechselt je nach Abend, ein Blick auf die Veranstaltungsseite vor dem Kauf lohnt sich.' },
      { q: 'Wo liegt der BLVD Marítimo Club?', a: 'In der Avinguda de Gabriel Roca, 29, direkt am Paseo Marítimo in Palma, wenige Schritte von anderen Clubs wie Fitz Mallorca entfernt. Vom Zentrum aus läuft man am Hafen entlang, Taxis stehen an der Promenade.' },
    ],
  },
  'overclub': {
    es: [
      { q: '¿Qué música suena en Overclub?', a: 'Sobre todo techno y tech house, con nombres internacionales que traen promotoras como VANNDAL, GOODLIFE, DISORDER 360º y OVERLOAD. Los jueves, PARAO va rotando de estilo, del reguetón antiguo al tech house, y hay fechas sueltas de otros estilos, como remember o makina.' },
      { q: '¿Cuánto cuesta la entrada en Overclub?', a: 'Depende de la fiesta. Como referencia, LA DEMENCE de octubre de 2026 vendía la entrada general con consumición entre 20 y 35€, según la hora de llegada, y mesas en zona VIP desde 250€.' },
      { q: '¿Cuál es la edad mínima en Overclub?', a: 'Las fiestas de electrónica se anuncian para mayores de 18. Cada promotora fija sus condiciones, así que conviene revisar la ficha del evento.' },
      { q: '¿Cómo llegar a Overclub y dónde aparcar?', a: 'Está en la calle Gremi de Passamaners, 17, en el polígono Son Rossinyol, al norte de Palma. Suele haber aparcamiento en las calles del polígono, aunque lo más cómodo para volver de madrugada es el taxi desde el centro.' },
      { q: '¿Qué días abre Overclub?', a: 'Viernes y sábado desde las 23:00 hasta las 06:00, con algunas sesiones de tarde los fines de semana.' },
    ],
    en: [
      { q: 'What music plays at Overclub?', a: 'Mostly techno and tech house, with international names brought in by promoters such as VANNDAL, GOODLIFE, DISORDER 360º and OVERLOAD. On Thursdays PARAO rotates styles, from old-school reggaeton to tech house, and there are one-off nights in other styles such as remember or makina.' },
      { q: 'How much is entry at Overclub?', a: 'It depends on the party. As a reference, LA DEMENCE in October 2026 sold general admission with a drink for €20 to €35, depending on arrival time, and VIP area tables from €250.' },
      { q: 'What is the minimum age at Overclub?', a: 'Electronic music nights are announced for ages 18 and over. Each promoter sets its own terms, so check the event page.' },
      { q: 'How do I get to Overclub and where can I park?', a: 'It is at Calle Gremi de Passamaners, 17, in the Son Rossinyol industrial estate, north of Palma. There is usually street parking in the estate, though a taxi from the centre is the easiest way back in the early hours.' },
      { q: 'Which days is Overclub open?', a: 'Friday and Saturday from 11pm to 6am, with some afternoon sessions at weekends.' },
    ],
    de: [
      { q: 'Welche Musik läuft im Overclub?', a: 'Vor allem Techno und Tech House, mit internationalen Namen, die Veranstalter wie VANNDAL, GOODLIFE, DISORDER 360º und OVERLOAD holen. Donnerstags wechselt PARAO den Stil, von Oldschool-Reggaeton bis Tech House, dazu kommen einzelne Abende mit Remember oder Makina.' },
      { q: 'Was kostet der Eintritt im Overclub?', a: 'Das hängt von der Party ab. Als Anhaltspunkt: LA DEMENCE im Oktober 2026 kostete im allgemeinen Eintritt mit Getränk je nach Ankunftszeit 20 bis 35€, Tische im VIP-Bereich gab es ab 250€.' },
      { q: 'Wie alt muss man für den Overclub sein?', a: 'Die Elektro-Nächte sind ab 18 Jahren angekündigt. Jeder Veranstalter legt seine Bedingungen fest, ein Blick auf die Veranstaltungsseite lohnt sich.' },
      { q: 'Wie komme ich zum Overclub und wo kann ich parken?', a: 'Der Club liegt in der Calle Gremi de Passamaners, 17, im Gewerbegebiet Son Rossinyol im Norden von Palma. In den Straßen des Gebiets findet man meist einen Parkplatz, für die Rückfahrt am frühen Morgen ist das Taxi aus dem Zentrum aber am bequemsten.' },
      { q: 'An welchen Tagen hat der Overclub geöffnet?', a: 'Freitag und Samstag von 23 bis 6 Uhr, am Wochenende teils auch mit Nachmittags-Sessions.' },
    ],
  },
  'calle-365': {
    es: [
      { q: '¿Cómo se entra en Calle 365?', a: 'El local está oculto tras una puerta en la calle Echegaray, 18. Para pasar hay que decir la contraseña del mes, que publican en su Instagram (@calle_365).' },
      { q: '¿Se puede reservar en Calle 365?', a: 'Según Time Out, no admite reservas como tal, pero puedes apuntarte a su guest list, que además da descuento en la entrada. El precio cambia según el evento de cada noche y es habitual tener que esperar para entrar.' },
      { q: '¿Qué temática tiene Calle 365?', a: 'Cambia cada año: el callejón se redecora por completo y estrena carta de cócteles para llevarte a un país distinto. Ha pasado por México, Colombia, India y Brasil.' },
      { q: '¿Qué horario tiene Calle 365?', a: 'Abre todos los días a las 18:00. De domingo a jueves cierra a las 03:00 y los viernes y sábados a las 03:30.' },
      { q: '¿Cómo llegar a Calle 365 en metro?', a: 'Está en el Barrio de las Letras. Las estaciones más cercanas son Antón Martín (línea 1), Sevilla (línea 2) y Sol (líneas 1, 2 y 3, además de Cercanías).' },
    ],
    en: [
      { q: 'How do you get into Calle 365?', a: 'The venue is hidden behind a door at Calle Echegaray, 18. To get in you have to give the monthly password, which is posted on its Instagram (@calle_365).' },
      { q: 'Can I book at Calle 365?', a: 'According to Time Out, it does not take reservations as such, but you can sign up for its guest list, which also gives a discount on entry. The price changes with each night\'s event and queuing to get in is common.' },
      { q: 'What is the theme at Calle 365?', a: 'It changes every year: the alley is fully redecorated and gets a new cocktail menu to take you to a different country. So far it has been Mexico, Colombia, India and Brazil.' },
      { q: 'What are the opening hours of Calle 365?', a: 'It opens every day at 6pm. Sunday to Thursday it closes at 3am, and on Fridays and Saturdays at 3:30am.' },
      { q: 'How do I get to Calle 365 by metro?', a: 'It is in Barrio de las Letras. The closest stations are Antón Martín (line 1), Sevilla (line 2) and Sol (lines 1, 2 and 3, plus Cercanías trains).' },
    ],
    de: [
      { q: 'Wie kommt man ins Calle 365?', a: 'Das Lokal versteckt sich hinter einer Tür in der Calle Echegaray, 18. Für den Einlass braucht man das Passwort des Monats, das auf Instagram (@calle_365) veröffentlicht wird.' },
      { q: 'Kann man im Calle 365 reservieren?', a: 'Laut Time Out gibt es keine klassischen Reservierungen, man kann sich aber auf die Gästeliste setzen lassen, die auch einen Rabatt auf den Eintritt bringt. Der Preis hängt von der jeweiligen Veranstaltung ab, Wartezeiten am Einlass sind üblich.' },
      { q: 'Welches Motto hat das Calle 365?', a: 'Es wechselt jedes Jahr: Die Gasse wird komplett neu dekoriert und bekommt eine neue Cocktailkarte, die in ein anderes Land führt. Bisher waren es Mexiko, Kolumbien, Indien und Brasilien.' },
      { q: 'Welche Öffnungszeiten hat das Calle 365?', a: 'Geöffnet ist täglich ab 18 Uhr. Sonntag bis Donnerstag bis 3 Uhr, freitags und samstags bis 3:30 Uhr.' },
      { q: 'Wie komme ich mit der Metro zum Calle 365?', a: 'Es liegt im Barrio de las Letras. Die nächsten Stationen sind Antón Martín (Linie 1), Sevilla (Linie 2) und Sol (Linien 1, 2 und 3 sowie Cercanías).' },
    ],
  },
  'wave-club': {
    es: [
      { q: '¿Qué es R33 en Wave Club?', a: 'Es la noche de electrónica de los viernes: house y techno underground con artistas internacionales y cartel nuevo cada semana, desde medianoche hasta el amanecer.' },
      { q: '¿Qué música suena en Wave Club el resto de noches?', a: 'Fuera de los viernes de R33, la programación gira hacia el reguetón y la música urbana, con sesiones de perreo y fiestas temáticas.' },
      { q: '¿Cuánto cuesta la entrada en Wave Club?', a: 'Depende de la sesión. Como referencia, una fecha de R33 se vendió desde 15€ en preventa anticipada hasta 40€ a última hora, sin consumición. Comprar por adelantado sale más barato y evita cola.' },
      { q: '¿Dónde está Wave Club y cómo se llega?', a: 'En el Carrer Poima, 24, en el polígono Can Valero, a las afueras de Palma. Desde el centro son unos 15 minutos en taxi, que es la forma más práctica de ir y volver de madrugada.' },
      { q: '¿Cómo es la sala de Wave Club?', a: 'Tiene una sala principal para unas 500 personas, de estética industrial y con grandes pantallas LED, y una terraza para cambiar de ambiente durante la noche.' },
    ],
    en: [
      { q: 'What is R33 at Wave Club?', a: 'It is the Friday electronic night: underground house and techno with international artists and a new lineup every week, from midnight until dawn.' },
      { q: 'What music plays at Wave Club on other nights?', a: 'Outside R33 Fridays, the programme leans towards reggaeton and urban music, with perreo sessions and themed parties.' },
      { q: 'How much is entry at Wave Club?', a: 'It depends on the session. As a reference, one R33 date sold from €15 as an early bird up to €40 at the last minute, without a drink. Buying ahead is cheaper and avoids the queue.' },
      { q: 'Where is Wave Club and how do I get there?', a: 'At Carrer Poima, 24, in the Can Valero industrial estate on the outskirts of Palma. It is about 15 minutes by taxi from the centre, the most practical way to get there and back in the early hours.' },
      { q: 'What is the venue like?', a: 'It has a main room for around 500 people, with an industrial look and large LED screens, plus a terrace for a change of scene during the night.' },
    ],
    de: [
      { q: 'Was ist R33 im Wave Club?', a: 'Die Elektro-Nacht am Freitag: Underground-House und Techno mit internationalen Acts und jede Woche neuem Line-up, von Mitternacht bis zum Morgen.' },
      { q: 'Welche Musik läuft im Wave Club an den anderen Abenden?', a: 'Abseits der R33-Freitage geht das Programm in Richtung Reggaeton und Urban, mit Perreo-Sessions und Mottopartys.' },
      { q: 'Was kostet der Eintritt im Wave Club?', a: 'Das hängt vom Abend ab. Als Anhaltspunkt: Ein R33-Termin kostete von 15€ als Early Bird bis 40€ kurz vor Beginn, ohne Getränk. Im Vorverkauf ist es günstiger und man spart sich die Schlange.' },
      { q: 'Wo liegt der Wave Club und wie kommt man hin?', a: 'Im Carrer Poima, 24, im Gewerbegebiet Can Valero am Stadtrand von Palma. Vom Zentrum sind es etwa 15 Minuten mit dem Taxi, für Hin- und Rückweg in der Nacht die praktischste Lösung.' },
      { q: 'Wie ist der Club aufgebaut?', a: 'Es gibt einen Hauptraum für rund 500 Personen im Industrial-Look mit großen LED-Wänden und eine Terrasse für einen Szenenwechsel während der Nacht.' },
    ],
  },
  'fitz-mallorca': {
    es: [
      { q: '¿Fitz Mallorca es el antiguo Tito\'s?', a: 'Sí. Ocupa el local histórico de Tito\'s en el Paseo Marítimo de Palma, que después fue Lío Mallorca. Lo gestiona Grupo Sounds, la empresa madrileña detrás de Fitz Madrid.' },
      { q: '¿Cuándo abrió Fitz Mallorca?', a: 'El 16 de julio de 2026, con una fiesta de doce horas, de 18:30 a 06:00, en la que pincharon PAWSA, Nic Fanciulli y Miguelle & Tons.' },
      { q: '¿Qué música suena en Fitz Mallorca?', a: 'House y tech house con DJs internacionales dentro de su programa The House of Artists, además de noches de música urbana y latina: en su primer mes pasaron por allí GORDO, Chimbala, Ozuna y Mëstiza.' },
      { q: '¿Hay código de vestimenta y edad mínima en Fitz Mallorca?', a: 'La vestimenta que indican sus eventos es casual. La edad mínima depende de la noche: hay sesiones para mayores de 18 y algunos sábados se anuncian para mayores de 23.' },
      { q: '¿Cómo es la sala de Fitz Mallorca y cómo se llega?', a: 'Según Mixmag, tiene aforo para 1.300 personas, sonido d&b Audiotechnik y ventanales de suelo a techo con vistas a la bahía. Aparcar de noche en el Paseo Marítimo es difícil, así que lo más práctico es ir en taxi o VTC.' },
    ],
    en: [
      { q: "Is Fitz Mallorca the former Tito's?", a: "Yes. It occupies the historic Tito's venue on Palma's Paseo Marítimo, which later became Lío Mallorca. It is run by Grupo Sounds, the Madrid company behind Fitz Madrid." },
      { q: 'When did Fitz Mallorca open?', a: 'On 16 July 2026, with a twelve-hour party from 6:30pm to 6am featuring PAWSA, Nic Fanciulli and Miguelle & Tons.' },
      { q: 'What music plays at Fitz Mallorca?', a: 'House and tech house with international DJs under its The House of Artists programme, plus urban and Latin nights: GORDO, Chimbala, Ozuna and Mëstiza all played in its first month.' },
      { q: 'Is there a dress code or minimum age at Fitz Mallorca?', a: 'Its event listings give the dress code as casual. The minimum age depends on the night: some sessions are 18+ and certain Saturdays are announced as 23+.' },
      { q: 'What is the venue like and how do I get there?', a: 'According to Mixmag, it holds 1,300 people and has a d&b Audiotechnik sound system and floor-to-ceiling windows overlooking the bay. Parking on the Paseo Marítimo at night is difficult, so a taxi or ride-hailing car is the practical option.' },
    ],
    de: [
      { q: 'Ist Fitz Mallorca das frühere Tito\'s?', a: 'Ja. Der Club belegt die historischen Räume des Tito\'s am Paseo Marítimo in Palma, die später Lío Mallorca waren. Betreiber ist Grupo Sounds, das Madrider Unternehmen hinter Fitz Madrid.' },
      { q: 'Wann hat Fitz Mallorca eröffnet?', a: 'Am 16. Juli 2026 mit einer zwölfstündigen Party von 18:30 bis 6 Uhr, bei der PAWSA, Nic Fanciulli und Miguelle & Tons auflegten.' },
      { q: 'Welche Musik läuft im Fitz Mallorca?', a: 'House und Tech House mit internationalen DJs im Programm The House of Artists, dazu Urban- und Latin-Nächte: Im ersten Monat traten GORDO, Chimbala, Ozuna und Mëstiza auf.' },
      { q: 'Gibt es im Fitz Mallorca einen Dresscode und ein Mindestalter?', a: 'Die Veranstaltungen geben als Dresscode casual an. Das Mindestalter hängt vom Abend ab: Manche Sessions sind ab 18, einzelne Samstage ab 23 Jahren angekündigt.' },
      { q: 'Wie ist der Club aufgebaut und wie kommt man hin?', a: 'Laut Mixmag fasst er 1.300 Personen und hat eine Anlage von d&b Audiotechnik sowie bodentiefe Fenster mit Blick auf die Bucht. Nachts ist das Parken am Paseo Marítimo schwierig, am praktischsten sind Taxi oder Fahrdienst.' },
    ],
  },
  'enredo-club': {
    es: [
      { q: '¿Qué días abre Enredo Club?', a: 'Viernes y sábado, de 23:00 a 05:00. Algunas fiestas de viernes arrancan antes, a las 22:30.' },
      { q: '¿Qué fiestas hay en Enredo Club?', a: 'MENEO ocupa los sábados desde las 23:00 con reguetón, perreo y música urbana. Los viernes se reparten entre EGOÍSTA, de house comercial y éxitos del momento, y DESPELOTE, la noche de cumbia. En verano se suma SALAO, sesión de atardecer en la terraza con deep house y afro house.' },
      { q: '¿Dónde está Enredo Club?', a: 'En la Avinguda de Gabriel Roca, 45, en Portopí, a pie de Paseo Marítimo. Es de los pocos clubs de Palma a los que se puede ir y volver andando por el puerto, sin desplazarse a los polígonos.' },
      { q: '¿Cómo consigo entradas para Enredo Club?', a: 'Las entradas de cada fiesta se reservan desde la ficha del evento. El precio y las condiciones de acceso cambian según la noche.' },
    ],
    en: [
      { q: 'Which days is Enredo Club open?', a: 'Friday and Saturday, from 11pm to 5am. Some Friday parties start earlier, at 10:30pm.' },
      { q: 'What parties run at Enredo Club?', a: 'MENEO takes Saturdays from 11pm with reggaeton, perreo and urban music. Fridays are shared between EGOÍSTA, with commercial house and current hits, and DESPELOTE, the cumbia night. In summer there is also SALAO, a sunset session on the terrace with deep house and afro house.' },
      { q: 'Where is Enredo Club?', a: "At Avinguda de Gabriel Roca, 45, in Portopí, right on the Paseo Marítimo. It is one of the few clubs in Palma you can walk to and from along the harbour, with no trip out to the industrial estates." },
      { q: 'How do I get tickets for Enredo Club?', a: 'Tickets for each party are booked from the event page. Prices and entry conditions change from night to night.' },
    ],
    de: [
      { q: 'An welchen Tagen hat der Enredo Club geöffnet?', a: 'Freitag und Samstag von 23 bis 5 Uhr. Manche Freitagspartys beginnen schon um 22:30 Uhr.' },
      { q: 'Welche Partys gibt es im Enredo Club?', a: 'MENEO belegt die Samstage ab 23 Uhr mit Reggaeton, Perreo und Urban. Die Freitage teilen sich EGOÍSTA mit Commercial House und aktuellen Hits und DESPELOTE, die Cumbia-Nacht. Im Sommer kommt SALAO dazu, eine Sunset-Session auf der Terrasse mit Deep House und Afro House.' },
      { q: 'Wo liegt der Enredo Club?', a: 'In der Avinguda de Gabriel Roca, 45, in Portopí, direkt am Paseo Marítimo. Er ist einer der wenigen Clubs in Palma, die man zu Fuß am Hafen entlang erreicht, ohne in die Gewerbegebiete zu fahren.' },
      { q: 'Wie bekomme ich Tickets für den Enredo Club?', a: 'Tickets für jede Party werden über die Veranstaltungsseite reserviert. Preis und Einlassbedingungen wechseln je nach Abend.' },
    ],
  },
  'brokers-valencia': {
    es: [
      { q: '¿Qué es el concepto Bank Club de Brokers?', a: 'Es la temática del local: una decoración inspirada en el mundo financiero, con iluminación LED, barras de coctelería de autor y zonas de mesas VIP. Además de la sala interior tiene una terraza con butacas y mesas altas.' },
      { q: '¿Qué días y a qué hora abre Brokers Valencia?', a: 'De jueves a domingo. Los tardeos empiezan a las 17:00 y las sesiones de noche a las 22:00, y cierra a las 03:30.' },
      { q: '¿Qué música suena en Brokers Valencia?', a: 'Por la tarde, pop comercial y éxitos internacionales. A partir de medianoche sube el reguetón y la música urbana. Programa tardeos como RETROSPECTIVE los sábados, además de fiestas universitarias.' },
      { q: '¿Cómo llegar a Brokers Valencia?', a: 'Está en la Avenida de Francia, 4, junto a la Ciudad de las Artes y las Ciencias. La parada de metro más cercana es Ciutat Arts i Ciències - Justícia (línea 10) y pasan por la avenida las líneas 19, 35, 40 y 94 de la EMT.' },
    ],
    en: [
      { q: 'What is the Bank Club concept at Brokers?', a: 'It is the theme of the venue: decor inspired by the financial world, with LED lighting, signature cocktail bars and VIP table areas. Besides the indoor room there is a terrace with armchairs and high tables.' },
      { q: 'Which days and hours is Brokers Valencia open?', a: 'Thursday to Sunday. Afternoon sessions start at 5pm and night sessions at 10pm, and it closes at 3:30am.' },
      { q: 'What music plays at Brokers Valencia?', a: 'In the afternoon, commercial pop and international hits. From midnight on, reggaeton and urban music take over. It runs afternoon parties such as RETROSPECTIVE on Saturdays, plus student nights.' },
      { q: 'How do I get to Brokers Valencia?', a: 'It is at Avenida de Francia, 4, next to the City of Arts and Sciences. The closest metro stop is Ciutat Arts i Ciències - Justícia (line 10), and EMT bus lines 19, 35, 40 and 94 run along the avenue.' },
    ],
    de: [
      { q: 'Was bedeutet das Bank-Club-Konzept im Brokers?', a: 'Es ist das Motto des Lokals: eine von der Finanzwelt inspirierte Einrichtung mit LED-Beleuchtung, Bars mit Signature-Cocktails und VIP-Tischbereichen. Neben dem Innenraum gibt es eine Terrasse mit Sesseln und Stehtischen.' },
      { q: 'An welchen Tagen und zu welchen Zeiten hat Brokers Valencia geöffnet?', a: 'Donnerstag bis Sonntag. Die Tardeos beginnen um 17 Uhr, die Nacht-Sessions um 22 Uhr, Schluss ist um 3:30 Uhr.' },
      { q: 'Welche Musik läuft im Brokers Valencia?', a: 'Nachmittags Pop und internationale Hits, ab Mitternacht übernehmen Reggaeton und Urban. Dazu kommen Tardeos wie RETROSPECTIVE am Samstag und Studentenpartys.' },
      { q: 'Wie komme ich zum Brokers Valencia?', a: 'Der Club liegt an der Avenida de Francia, 4, neben der Stadt der Künste und der Wissenschaften. Die nächste Metrostation ist Ciutat Arts i Ciències - Justícia (Linie 10), außerdem fahren die EMT-Buslinien 19, 35, 40 und 94 durch die Avenida.' },
    ],
  },
}

export function clubFaq(slug: string | null | undefined, locale: string): ZoneFaq[] {
  if (!slug) return []
  const byLocale = CLUB_FAQS[slug]
  if (!byLocale) return []
  return byLocale[locale] || byLocale[routing.defaultLocale] || []
}
