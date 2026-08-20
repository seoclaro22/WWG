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

// Las fichas de DJ eran la unica pagina generada sin umbral: entraban las ~200
// al sitemap aunque fuesen un nombre suelto sobre fondo negro, y por volumen
// eran mas de la mitad del dominio indexable. Se indexa la ficha que dice
// algo: o tiene sesiones anunciadas, o tiene una biografia de verdad.
//
// El minimo de biografia es el largo de una meta description. Por debajo de
// eso no hay contenido que justifique una URL propia.
export const MIN_DJ_BIO_TO_INDEX = 160

export function djIsIndexable(
  dj: { bio?: string | null; short_bio?: string | null } | null | undefined,
  upcomingEvents: number,
) {
  if (!dj) return false
  if (upcomingEvents > 0) return true
  return (dj.short_bio || dj.bio || '').trim().length >= MIN_DJ_BIO_TO_INDEX
}

// Las fichas de club eran el ultimo bloque generado sin umbral: entraban al
// sitemap con solo `status = 'approved'`, mientras zonas, DJs y generos ya
// pasaban por su filtro. Una ficha sin agenda, sin foto y con dos lineas de
// descripcion no le gana a la ficha de Google Maps del mismo local: es la
// misma informacion con menos datos, y por volumen arrastra la calidad media
// del dominio.
//
// La ficha sigue existiendo y enlazada desde /clubs y desde las zonas; lo que
// se retira es la invitacion a indexarla hasta que tenga algo propio.
export const MIN_CLUB_DESC_TO_INDEX = 160

export function clubIsIndexable(
  club: { description?: string | null; images?: unknown; logo_url?: string | null } | null | undefined,
  upcomingEvents: number,
) {
  if (!club) return false
  // Con agenda propia la ficha ya aporta lo que no tiene ninguna otra fuente.
  if (upcomingEvents > 0) return true
  const hasImage = (Array.isArray(club.images) && club.images.length > 0) || !!club.logo_url
  const hasText = (club.description || '').trim().length >= MIN_CLUB_DESC_TO_INDEX
  return hasImage && hasText
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
// 23:30 pertenece al viernes, y uno de las 02:00 del sabado tambien. Por eso
// ambos rangos cierran a las 06:00 y no a las 00:00.
export function whenRange(key: WhenKey, now = new Date()) {
  if (key === 'today') {
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 6))
    return { from: now.toISOString(), to: to.toISOString() }
  }

  // Fin de semana: viernes 18:00 -> lunes 06:00. Si ya estamos dentro de esa
  // ventana devuelve el fin de semana en curso, no el siguiente.
  const day = now.getUTCDay() // 0 domingo ... 5 viernes, 6 sabado
  const daysToFriday = day === 0 ? -2 : 5 - day
  const friday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysToFriday, 18))
  const monday = new Date(friday.getTime())
  monday.setUTCDate(monday.getUTCDate() + 3)
  monday.setUTCHours(6, 0, 0, 0)
  return { from: (friday > now ? friday : now).toISOString(), to: monday.toISOString() }
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
        title: `Heute Abend feiern in ${zone}`,
        description: `Die Partys und Clubs in ${zone} für heute Abend: Line-ups, Zeiten, Preise und Tickets. Täglich aktualisiert, damit du in Minuten einen Plan hast.`,
        eyebrow: 'Heute Abend',
        intro: `Alles, was heute in ${zone} läuft. Die Liste aktualisiert sich selbst: hier stehen nur Partys, die heute Abend noch stattfinden.`,
        empty: `Heute läuft nichts in ${zone}.`,
      },
      weekend: {
        title: `Am Wochenende feiern in ${zone}`,
        description: `Alle Partys am Wochenende in ${zone}: Freitag, Samstag und Sonntag mit Line-ups, Zeiten und Tickets. Plane deine Nacht mit Where We Go.`,
        eyebrow: 'Dieses Wochenende',
        intro: `Das ganze Wochenende in ${zone}, von Freitagnacht bis Sonntag. Vergleiche Line-ups und buche, bevor es ausverkauft ist.`,
        empty: `An diesem Wochenende läuft nichts in ${zone}.`,
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
      title: `${genre} Partys in ${zone}`,
      description: `Wo du ${genre} in ${zone} hörst: Clubs, DJs und kommende Sets mit Zeiten und Tickets. ${genre} Termine, täglich aktualisiert.`,
      eyebrow: `${genre} in ${zone}`,
      intro: `Kommende ${genre} Sets in ${zone}, mit Line-ups und den Clubs, die sie spielen.`,
      empty: `Aktuell sind keine ${genre} Sets in ${zone} geplant.`,
    },
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
      title: 'Salir de fiesta cerca de mí',
      description: 'Encuentra dónde salir de fiesta cerca de ti: discotecas, fiestas y DJs de tu ciudad con horarios y entradas. Detectamos tu ciudad y te mostramos la agenda de hoy.',
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

// Pagina de zona. Estaba escrita solo en espanol aunque la URL fuese /en o
// /de, asi que /en/mallorca competia en Google con un titulo en castellano.
export function zoneMeta(zone: string, locale: string) {
  const copy: Record<string, { title: string; description: string; eyebrow: string; intro: string; clubs: string; events: string; empty: string }> = {
    es: {
      title: `Discotecas y eventos en ${zone}`,
      description: `Descubre las mejores discotecas, fiestas y DJs de ${zone}. Agenda de eventos nocturnos actualizada a diario con line-ups, horarios y entradas.`,
      eyebrow: 'Zona',
      intro: `La agenda nocturna de ${zone}: discotecas, fiestas y DJs actualizados a diario. Encuentra tu plan y reserva entradas con Where We Go.`,
      clubs: `Discotecas en ${zone}`,
      events: `Próximos eventos en ${zone}`,
      empty: `No hay eventos programados en ${zone} ahora mismo.`,
    },
    en: {
      title: `Clubs and Events in ${zone}`,
      description: `Discover the best clubs, parties and DJs in ${zone}. Nightlife listings updated daily with line-ups, times and tickets.`,
      eyebrow: 'Area',
      intro: `${zone} nightlife: clubs, parties and DJs updated daily. Find your plan and book tickets with Where We Go.`,
      clubs: `Clubs in ${zone}`,
      events: `Upcoming events in ${zone}`,
      empty: `Nothing is scheduled in ${zone} right now.`,
    },
    de: {
      title: `Clubs und Events in ${zone}`,
      description: `Entdecke die besten Clubs, Partys und DJs in ${zone}. Täglich aktualisierte Termine mit Line-ups, Zeiten und Tickets.`,
      eyebrow: 'Gegend',
      intro: `Das Nachtleben von ${zone}: Clubs, Partys und DJs, täglich aktualisiert. Finde deinen Plan und buche Tickets mit Where We Go.`,
      clubs: `Clubs in ${zone}`,
      events: `Kommende Events in ${zone}`,
      empty: `Aktuell ist nichts in ${zone} geplant.`,
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
  const partysDe = n('angekuendigte Party', 'angekuendigte Partys', facts.events)
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
      hour: { q: `Wann beginnen die Partys in ${zone}?`, a: `Die meisten Sets in ${zone} starten gegen ${hour}. Jede Veranstaltung zeigt ihre genaue Uhrzeit, denn Rooftop- und After-Partys fallen aus diesem Rahmen.` },
      price: { q: `Was kostet der Eintritt in ${zone}?`, a: `Die Tickets im aktuellen Programm von ${zone} liegen bei ${price}. Der Preis haengt vom Line-up ab und davon, ob du im Vorverkauf oder an der Tuer kaufst.` },
      day: { q: `An welchem Abend ist in ${zone} am meisten los?`, a: `${day} ist aktuell der Abend mit den meisten Partys in ${zone}. Dann oeffnen auch die meisten Clubs gleichzeitig.` },
      genres: { q: `Welche Musik laeuft in ${zone}?`, a: `Am haeufigsten laeuft in ${zone} ${genres}. Du kannst das Programm nach Musikrichtung filtern.` },
      venues: { q: `Wie viele Clubs gibt es in ${zone}?`, a: `Wir verfolgen derzeit ${facts.venues} ${clubsDe} in ${zone} mit ${facts.events} ${partysDe}. Taeglich aktualisiert.` },
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
    de: 'Haeufige Fragen',
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
      intro: 'Das Nachtleben auf Mallorca bewegt sowohl die Inselbewohner als auch Touristen, die nur ein paar Sommertage bleiben. Fast jeder Plan findet Platz: Beachclubs mit touristischem Publikum, Electronic-Clubs mit internationalem Line-up und Dachterrassen im Viertel fuer einen ruhigen Start in die Nacht. In den 1960er-Jahren gab es auf der Insel mehr Discos als in Madrid und Barcelona zusammen, und dieses Gewicht ist bis heute spuerbar: Mallorcas Nachtleben ist nicht nur ein Nebeneffekt des Sonne-und-Strand-Tourismus, sondern eine eigene Branche mit jahrzehntelanger Geschichte.',
      zonas: [
        { titulo: 'Magaluf und Punta Ballena', texto: 'Die intensivste Gegend der Insel. Die Punta Ballena ist eine gut einen Kilometer lange Strasse voller Bars und Clubs direkt nebeneinander, gemacht fuer einen Barhopping-Abend. Junges, sehr touristisches Publikum, vor allem im Sommer, mit der hoechsten Dichte an grossen Clubs der Insel.' },
        { titulo: 'Palma und der Paseo Marítimo', texto: 'Hier stehen die groessten Clubs und internationalen Line-ups, direkt am Yachthafen. Das produktionsstaerkste Nachtleben der Insel, mit etwas strengerem Eintrittspreis und Dresscode als in Magaluf.' },
        { titulo: 'Santa Catalina', texto: 'Palmas altes Fischerviertel, heute das angesagte Cocktail- und Rooftop-Viertel. Weniger Club, mehr Vorgluehen: lokales Publikum, ruhigere Stimmung.' },
        { titulo: 'El Arenal und Can Pastilla', texto: 'Strandgebiet zwischen Palma und Magaluf mit guenstigeren Clubs und Bars und gemischtem Publikum aus Locals und Touristen. Eine gute Option ohne die Preise von Palmas Zentrum.' },
        { titulo: 'Alcúdia und die Nordbucht', texto: 'Neben Magaluf der zweite grosse Sommer-Party-Hotspot der Insel. Tagsueber familienfreundlicher, nachts Beachclubs, mit internationalerem und weniger dichtem Publikum als im Sueden.' },
      ],
      temporada: 'Feiern auf Mallorca ist stark saisonabhaengig. Die meisten grossen Clubs in Magaluf und Alcúdia oeffnen nur zwischen April/Mai und Oktober und schliessen im Winter komplett (November bis Maerz). Juni, Juli und August sind Hochsaison, mit der meisten Energie, aber auch den groessten Menschenmengen und hoechsten Preisen. September gilt bei Insel-Kennern oft als bester Monat: noch warm, das Meer noch angenehm, und die touristischen Gegenden deutlich ruhiger. In Palma bleiben einige Electronic-Clubs und Stadtlocations das ganze Jahr ueber geoeffnet, unabhaengig von der Strandsaison.',
      discotecasFamosas: 'BCM Planet Dance in Magaluf ist einer der groessten Nachtclubs Europas: ueber 38 Jahre Geschichte, Platz fuer mehrere Tausend Gaeste und jede Saison internationale DJ-Line-ups, von April bis Oktober. Auch Pachá betreibt einen Club in Palma, am Paseo Marítimo, Teil derselben Gruppe, die die Marke auf Ibiza bekannt gemacht hat. Tito´s, Palmas hundert Jahre alter Club, in dem einst Gaeste von Josephine Baker bis Grace Kelly verkehrten, hat 2021 endgueltig geschlossen und existiert heute nicht mehr: Er wird hier erwaehnt, weil er Teil der Geschichte des Inselnachtlebens ist, nicht weil er noch geoeffnet hat. Das Programm von Where We Go zeigt nur Locations, die gerade aktiv sind, kein historisches Ranking.',
      transporte: 'Palma hat einen Nachtbusdienst (NIT-Linien), der die Innenstadt mit den Aussenbezirken verbindet, mit gemeinsamer Haltestelle an der Plaza de España zum Umsteigen. Ausserhalb Palmas, in Magaluf und Alcúdia, ist der oeffentliche Nachtverkehr deutlich eingeschraenkter, ueblich ist das Taxi. An Sommernaechten, vor allem direkt nach Clubschluss in den fruehen Morgenstunden, kann es dauern, ein freies Taxi zu finden: am besten vorbestellen oder teilen. Immer offizielle Taxis oder anerkannte Fahrdienst-Apps nutzen, nie unlizenzierte Autos, die auf der Strasse angeboten werden.',
      precio: 'Der Standardeintritt in Mallorcas Clubs liegt meist zwischen 10 und 25 €, je nach Abend und Line-up. Die groesseren Clubs in Magaluf und Palma koennen an Abenden mit internationalen DJs ueber 30 € kosten, VIP-Bereiche und Tische ab etwa 100 € pro Person. Getraenke kosten meist 3 bis 8 €. Jede Event-Seite auf Where We Go zeigt den echten Preis, sobald der Veranstalter ihn veroeffentlicht.',
      vestimenta: 'Der Dresscode haengt vom Laden ab. Beachclubs und die touristischen Teile von Magalufs sind leger, in den gehobeneren Locations wird aber etwas mehr Stil erwartet. In Palmas Electronic-Clubs ist es entspannter: bequeme Kleidung reicht, nur keine Flip-Flops oder Badekleidung.',
      seguridad: 'Die touristischsten Gegenden wie Magaluf, Palmas Zentrum und El Arenal verzeichnen die meisten Taschendiebstaehle und unbeaufsichtigten Getraenke: Behalte dein Glas im Blick und lass es nie bei Fremden stehen. Es empfiehlt sich, in den fruehen Morgenstunden nicht allein durch schlecht beleuchtete Strassen nahe der Partyzonen zu laufen, sondern in Begleitung oder mit dem Taxi zurueckzukehren. Trinken auf der Strasse ausserhalb lizenzierter Lokale ist nicht erlaubt und kann ein Bussgeld nach sich ziehen. Wie in jeder belebten touristischen Nachtlebenszone gilt: in der Gruppe bleiben, das Trinktempo im Blick behalten und den Rueckweg vorher planen senkt fast jedes Risiko.',
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
      intro: 'Madrid ist die Stadt mit dem meisten Nachtleben Spaniens: keine einzelne Partyzone, sondern mehrere Viertel mit ganz eigenem Charakter, und die Nacht beginnt spaet und geht fast an jedem Wochentag bis zum Morgengrauen, nicht nur am Wochenende. Eine Stadt, in der man das ganze Jahr ausgehen kann, unabhaengig von einer Strandsaison.',
      zonas: [
        { titulo: 'Malasaña', texto: 'Das Viertel, das in den 1980ern das Zentrum der Movida madrileña war. Alternative, Indie-Atmosphaere, mit Cocktailbars, Live-Musik und kleineren Locations als in anderen Vierteln.' },
        { titulo: 'Chueca', texto: 'Das partyreichste Viertel im Zentrum, auch Zentrum des LGBTQ+-Nachtlebens der Stadt. Electronic, Pop und Reggaeton, mit der Plaza de Chueca als Treffpunkt.' },
        { titulo: 'Kunstdreieck und Huertas', texto: 'Hier stehen die groessten und bekanntesten Clubs der Stadt, wie Teatro Kapital oder Teatro Barceló. Eher klassischer Nachtclub als Viertelbar, mit strengerem Einlass und Dresscode.' },
        { titulo: 'La Latina', texto: 'Eher Tapas und Terrasse als Nachtclub, besonders sonntags nach dem Rastro-Flohmarkt. Ein guter Startpunkt, bevor man in ein anderes Viertel weiterzieht.' },
      ],
      temporada: 'Anders als Kuestenstaedte legt Madrid sein Nachtleben im Winter nicht still: die zentralen Clubs bleiben das ganze Jahr geoeffnet, meist von Donnerstag bis Sonntag. Der Sommer bringt zusaetzlich Aussenterrassen und das ein oder andere Festival, aber die Club-Szene bleibt unabhaengig von der Saison aktiv.',
      discotecasFamosas: 'Teatro Kapital mit sieben Stockwerken und unterschiedlichen Stimmungen auf jedem ist der bekannteste Club der Stadt, mitten im Kunstdreieck. Teatro Barceló befindet sich in einem umgebauten Kino aus den 1930ern, mit einer theatralischen Optik, die es vom Rest abhebt. Fabrik, am Stadtrand von Madrid in Humanes, ist einer der groessten Electronic-Superclubs Spaniens mit Platz fuer mehrere Tausend Gaeste. Das Programm von Where We Go zeigt, was gerade aktiv ist, kein festes Ranking.',
      transporte: 'Die Madrider Metro schliesst zwischen 1:30 und 2:00 Uhr, an manchen Wochenenden mit Zusatzservice. Danach uebernimmt das Nachtbusnetz "búhos" (Eulen), hauptsaechlich ab der Plaza de Cibeles, mit 15 bis 35 Minuten Takt je nach Linie. Ein Taxi ist in den fruehen Morgenstunden die schnellste Option: offizielle Taxis haben sichtbare Lizenz, GPS und berechnen keine dynamischen Preise wie manche Fahrdienst-Apps.',
      precio: 'Der Eintritt in einen Madrider Club liegt meist bei 15 bis 25 € inklusive Getraenk, sowohl im Teatro Kapital als auch im Teatro Barceló. Im Fabrik kann er je nach Event zwischen 20 und 60 € liegen. Der Vorverkauf ist meist guenstiger als der Kauf an der Tuer.',
      vestimenta: 'Die grossen zentralen Clubs (Kapital, Barceló) erwarten meist gepflegte Kleidung, keine Sportbekleidung. In Malasaña und Chueca ist es deutlich lockerer, legere Kleidung reicht in den meisten Locations.',
      seguridad: 'Die belebtesten Partyviertel (Malasaña, Chueca, Huertas) sind auch die am besten ueberwachten, mit vielen Menschen bis spaet auf der Strasse. Trotzdem: im Gedraenge auf die eigenen Sachen achten und das Glas nicht aus den Augen lassen. Metro und Nachtbusse sind sichere Heimwege; wer trinkt, plant den Rueckweg am besten vorher.',
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
      intro: 'Valencia verbindet Strandparty mit urbanem Viertel-Nachtleben: es gibt keine einzelne dominante Zone, sondern mehrere mit ganz unterschiedlicher Atmosphaere, von den Strandclubs in Malvarrosa bis zur alternativen Szene in Ruzafa. Eine Stadt, die das ganze Jahr feiert, mit deutlichem Intensitaetssprung in den heissen Monaten.',
      zonas: [
        { titulo: 'Strand Malvarrosa und der Hafen', texto: 'Valencias Beachclub-Gegend, mit Strandlocations, die tagsueber Strandbar und nachts Nachtclub sind. Im Sommer touristisches und lokales Publikum gleichermassen.' },
        { titulo: 'Ruzafa', texto: 'Das alternativste, multikulturellste Viertel der Stadt, mit LGBTQ+-Locations, Indie und experimenteller Electronic-Musik. Junges, internationales Publikum.' },
        { titulo: 'El Carmen', texto: 'Die Altstadt, eher Cocktailbars und Live-Musik als grosse Clubs. Ein guter Ort, um die Nacht zu beginnen, bevor es an den Strand geht.' },
      ],
      temporada: 'Die Strandclubs von Malvarrosa sind stark saisonabhaengig: die meisten oeffnen ab dem Fruehling und laufen im Sommer auf Hochtouren, mit Hoehepunkt im Juli und August. Die Clubs im Zentrum und in Ruzafa dagegen haben das ganze Jahr ueber ein aktives Programm, unabhaengig von der Hitze.',
      discotecasFamosas: 'Akuarela Playa ist einer der bekanntesten Strandclubs von Malvarrosa, mit mehreren Raeumen und Meerblick. Marina Beach Club, neben dem Gebaeude Veles e Vents, ist ein weiterer Fixpunkt im Hafengebiet. Im Zentrum ist Únic, mitten im Carmen-Viertel, ein Anlaufpunkt fuer Themenpartys. Das Programm von Where We Go zeigt, was gerade aktiv ist, kein festes Ranking.',
      transporte: 'Die Metro von Valencia schliesst meist gegen 0:30 Uhr, danach haengt der Heimweg vom EMT-Nachtbus oder Taxi ab. Mehrere EMT-Linien bedienen die Club-Gegenden am Hafen und in Malvarrosa direkt, es lohnt sich aber, den aktuellen Nachtfahrplan vorher zu pruefen, da er je nach Linie variiert.',
      precio: 'Der Eintritt in einen Club in Valencia liegt meist bei 12 bis 25 €, bei manchen Strandlocations oder Sonderevents bis zu 40 €. Der Vorverkauf spart meist ein paar Euro gegenueber dem Kauf an der Tuer.',
      vestimenta: 'Strandclubs sind tagsueber leger und abends etwas gepflegter. Locations im Zentrum und in El Carmen sind entspannt, ausser bei bestimmten Events mit eigenem Dresscode.',
      seguridad: 'Die belebtesten Gegenden (Malvarrosa, Ruzafa, El Carmen) haben bis spaet viele Menschen auf der Strasse, was hilft, aber im Sommer sollte man in den ueberfuellteren Strandbereichen auf Taschen und Wertsachen achten. Nachtbus, Taxi oder die Rueckkehr in der Gruppe sind in den fruehen Morgenstunden die sinnvollste Option.',
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
      intro: 'Das Nachtleben der Provinz Castellón konzentriert sich auf Benicàssim, einen Kuestenort, der im Sommer seine Einwohnerzahl und sein Freizeitangebot durch nationalen und internationalen Tourismus vervielfacht. Ausserhalb der Strandsaison schrumpft die Partyszene stark: ein Nachtleben, das eng an den Sommerkalender gebunden ist.',
      zonas: [
        { titulo: 'Benicàssim und seine Strandpromenade', texto: 'Das Zentrum des Nachtlebens der Gegend, mit Clubs in Strandnaehe. Junges Publikum, im Juli und August besonders aktiv, auch wegen nahegelegener Musikfestivals wie dem FIB.' },
      ],
      temporada: 'Das Clubangebot in Benicàssim ist stark saisonal: die meisten Locations oeffnen von Mai oder Juni bis September, mit Juli und August als aktivsten Monaten, zeitgleich mit den Sommerferien und dem Benicàssim International Festival, das Publikum von ausserhalb der Region anzieht. Ausserhalb dieser Monate schrumpft das naechtliche Programm deutlich.',
      discotecasFamosas: 'La Santa in Benicàssim ist der wichtigste Club der Gegend, mit Themenpartys und einem Programm von Pop und Electronic bis Reggaeton. Oasis ist eine weitere bekannte Location im Ort. Das Programm von Where We Go zeigt, was gerade aktiv ist, kein festes Ranking.',
      transporte: 'Benicàssim ist ein kleiner Ort, und das meiste Nachtleben liegt in Gehdistanz zu den touristischen Unterkuenften und der Strandpromenade. Fuer den Weg nach Castellón oder in andere nahegelegene Orte in den fruehen Morgenstunden ist das Taxi die uebliche Option, da der oeffentliche Nachtverkehr ausserhalb der Hochsaison sehr eingeschraenkt ist.',
      precio: 'Der Eintritt in die Clubs von Benicàssim bewegt sich in einem aehnlichen Rahmen wie im Rest der Valencianischen Gemeinschaft, etwa 10 bis 20 €, an Festivaltagen oder mit Gast-DJs etwas mehr.',
      vestimenta: 'Die Stimmung ist leger, typisch fuer einen Kuestenort in der Strandsaison: bequeme Sommerkleidung ist die Norm, keine besonderen Anforderungen ausser bei bestimmten Events.',
      seguridad: 'Als kleine, dicht konzentrierte Gegend ist das Nachtleben von Benicàssim zu Fuss gut ueberschaubar: trotzdem sollte man in den staerksten Monaten (zeitgleich mit dem FIB) an den ueberfuellteren Stellen auf seine Sachen achten und den Rueckweg zur Unterkunft vorher planen.',
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
      intro: 'Ibiza ist die weltweite Referenz fuer elektronische Musik und Clubkultur, mit einer Nachtlebensindustrie, die die Wirtschaft der ganzen Insel ein halbes Jahr lang antreibt. Nicht nur eine Insel mit Discos: hier entstand ein grosser Teil der modernen Clubkultur, mit Locations, die seit einem halben Jahrhundert aktiv sind.',
      zonas: [
        { titulo: 'Playa d\'en Bossa', texto: 'Die intensivste Gegend der Insel der letzten Jahre, mit Ushuaïa und Hï Ibiza nur wenige Meter voneinander entfernt. Tagsueber Beachclubs und Pool-Partys, abends und nachts Open-Air-Shows und Clubbing auf Top-Niveau.' },
        { titulo: 'San Antonio', texto: 'Guenstigere, legerere Gegend, Heimat des beruehmten Café del Mar, ein klassischer Sonnenuntergangs-Spot vor dem Ausgehen.' },
        { titulo: 'Dalt Vila und Ibiza-Stadt', texto: 'Die Altstadt, UNESCO-Weltkulturerbe, mit Bars und ruhigerer Atmosphaere, bevor es zu den grossen Clubs ausserhalb der Stadt weitergeht.' },
      ],
      temporada: 'Die Clubsaison auf Ibiza ist klar definiert: sie beginnt Ende April und laeuft bis Mitte Oktober, mit Opening- und Closing-Partys als groessten Terminen im Kalender. Ausserhalb dieser Zeit schliessen fast alle grossen Clubs komplett.',
      discotecasFamosas: 'Pachá, seit 1973 geoeffnet, ist der einzige grosse Club der Insel, der das ganze Jahr ueber offen bleibt, und eine der bekanntesten Party-Marken weltweit. Amnesia, seit 1974 am selben Standort, wurde mehrfach zum besten Club der Welt gekuert. Ushuaïa, eroeffnet 2011 in Playa d\'en Bossa, ist die neueste der grossen Locations, ein Open-Air-Hotel-Club-Format. Das Programm von Where We Go zeigt, was gerade aktiv ist, kein festes Ranking.',
      transporte: 'Waehrend der Hochsaison (Juni bis September) verkehrt ein naechtlicher Discobus mit speziellen Linien, die San Antonio, Ibiza-Stadt und die wichtigsten Clubs wie Amnesia, Pachá, Ushuaïa oder Hï Ibiza verbinden. Ausserhalb dieser Zeiten ist das Taxi die uebliche Option, wobei man direkt nach Clubschluss mit langen Wartezeiten rechnen sollte.',
      precio: 'Ibizas Eintrittspreise gehoeren zu den hoechsten Spaniens: 30 bis 70 € bei Pachá, ab 55 € bei Amnesia und 45 bis 100 € bei Ushuaïa, je nach Event und Kuenstlern. Auch Getraenke sind teurer als im Rest des Landes, meist 16 bis 22 €.',
      vestimenta: 'Der Dresscode variiert stark je nach Location und Party: manche Clubs erwarten einen gepflegten oder thematischen Look, waehrend die Beachclubs tagsueber Badekleidung-Territorium sind. Es lohnt sich, das konkrete Event vorher zu checken.',
      seguridad: 'Als Insel mit starkem Touristenandrang und sehr grossen Locations sollte man in Schlangen und in den volleren Clubs auf seine Sachen achten. Der naechtliche Discobus und offizielle Taxis sind die sichersten Wege in den fruehen Morgenstunden; unlizenzierte Autos vor den Locations meiden.',
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
      intro: 'Amsterdam hat ein kompaktes, sehr fussgaengerfreundliches Nachtleben: die meisten Partyzonen liegen nahe am Zentrum und lassen sich zu Fuss verbinden. Eine Stadt mit internationaler Atmosphaere das ganze Jahr ueber, nicht nur im Sommer, mit einer etablierten Clubkultur innerhalb der europaeischen Electronic-Szene.',
      zonas: [
        { titulo: 'Leidseplein', texto: 'Die beliebteste Gegend zum Ausgehen, sowohl bei Locals als auch Touristen, mit Locations wie Melkweg und Paradiso. Gute Publikumsmischung und zentrale Lage, ideal ohne Wege ausserhalb des Zentrums.' },
        { titulo: 'Rembrandtplein', texto: 'Einer der weiteren Plaetze mit viel Partystimmung, mit Escape als Anlaufpunkt und mehreren Cocktailbars drumherum.' },
        { titulo: 'Red Light District (De Wallen)', texto: 'Jenseits seines Rufs gibt es hier auch eigene Bars und Nachtleben-Spots, mit einer anderen Atmosphaere als im Rest der Stadt.' },
      ],
      temporada: 'Anders als Strandstaedte haelt Amsterdam sein Nachtleben das ganze Jahr ueber aktiv. Der Sommer bringt zusaetzliche Open-Air-Events und Festivals, aber die zentralen Clubs laufen zu jeder Jahreszeit normal weiter.',
      discotecasFamosas: 'Jimmy Woo in Leidseplein ist bekannt fuer seine strenge Einlasspolitik und wurde fuer Innendesign und Sound ausgezeichnet. Melkweg und Paradiso, ebenfalls in Leidseplein, verbinden Live-Konzerte mit Clubnaechten. Escape in Rembrandtplein ist einer der grossen Namen des Platzes. Das Programm von Where We Go zeigt, was gerade aktiv ist, kein festes Ranking.',
      transporte: 'Der oeffentliche Nahverkehr in Amsterdam stellt den Betrieb gegen 1:00 Uhr ein, daher haengt das naechtliche Fortbewegen vor allem vom Fahrrad ab (Leihraeder gibt es am Bahnhof) oder von Nachtbussen mit speziellen Linien wie N80, N81 oder N82 in die Aussenbezirke.',
      precio: 'Der Clubeintritt in Amsterdam liegt meist bei 10 bis 20 €, Locations mit bekannten Acts koennen aber 25 bis 40 € oder mehr verlangen, besonders von Donnerstag bis Sonntag. Der Vorverkauf ist meist guenstiger als der Kauf an der Tuer.',
      vestimenta: 'Der Dresscode in Amsterdam ist recht entspannt: kein Anzug noetig, aber Sneaker und Jogginganzuege sollte man meiden. Ein gepflegtes Hemd, eine ordentliche Hose oder gute Jeans reichen in den meisten Locations.',
      seguridad: 'Amsterdam ist eine relativ sichere Stadt, aber wie in jeder belebten Touristengegend sollte man auf Taschendiebe achten, vor allem Handy und Portemonnaie in Vordertaschen oder verschlossenen Taschen tragen. Der Heimweg per Fahrrad oder Nachtbus ist unter Locals die gaengigste Option.',
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
      intro: 'Barcelona hat eine der vielseitigsten Clubszenen Spaniens, mit Locations von Indie und Rock bis zu ernsthaftem Techno, und einem Strandgebiet am Port Olímpic, das im Sommer wie ein eigenes Party-Viertel funktioniert. Eine Stadt mit das ganze Jahr ueber aktivem Nachtleben, nicht nur in der Strandsaison, mit sehr internationalem Publikum dank staendigem Tourismus.',
      zonas: [
        { titulo: 'Port Olímpic und Barceloneta', texto: 'Die Club-Gegend am Meer, mit grossen, bei internationalen Touristen bekannten Locations. Klassische Nachtclub-Atmosphaere, mit Terrassen direkt am Strand und Sessions, die abends beginnen.' },
        { titulo: 'Poblenou', texto: 'Ein ehemaliges Industrieviertel, heute Zentrum der alternativen Szene, mit Razzmatazz als Anlaufpunkt, der Indie, Techno, Pop und Urban Music in verschiedenen Raeumen im selben Gebaeude mischt.' },
        { titulo: 'Poble Sec', texto: 'Heimat der Sala Apolo, einer historischen Location mit sehr abwechslungsreichem Programm aus Konzerten, Themenpartys und DJ-Sets, mit einer etwas eklektischeren Stimmung als am Strand.' },
        { titulo: 'El Raval und El Gòtic', texto: 'Die Altstadt, mit Cocktailbars und kleineren Locations, ein guter Ort, um die Nacht zu beginnen, bevor es in einen groesseren Club geht.' },
      ],
      temporada: 'Barcelona haelt sein Clubprogramm das ganze Jahr ueber aktiv, anders als Staedte, in denen die Party von der Strandsaison abhaengt. Der Sommer bringt zusaetzlich Aussenterrassen und die Clubs am Port Olímpic mit touristischerer Stimmung, waehrend die Locations in Poblenou und Poble Sec auch im Winter auf Hochtouren laufen.',
      discotecasFamosas: 'Razzmatazz in Poblenou ist einer der groessten Clubs der Stadt, mit fuenf verschiedenen Raeumen unter einem Dach, die je nach Abend Indie, Techno, Pop und Urban Music mischen. Sala Apolo in Poble Sec ist eine historische Location, die Live-Konzerte mit Clubnaechten verbindet. Am Strand decken Pacha Barcelona, Opium und Shoko einen grossen Teil der Club-Szene am Meer ab, zusammen mit Platz fuer mehrere Tausend Gaeste. Das Programm von Where We Go zeigt, was aktiv ist, sobald Locations hinzugefuegt werden.',
      transporte: 'Barcelonas Nachtbusdienst (NitBus) hat ueber 20 Linien, alle mit gemeinsamer Haltestelle an der Plaça de Catalunya fuer einfaches Umsteigen, mit Ueberwachungskameras in der gesamten Flotte. Die Metro verlaengert ihre Betriebszeiten freitags und samstags bis 2:00 Uhr. Ausserhalb dieser Zeiten sind ein offizielles Taxi oder eine anerkannte Fahrdienst-App der schnellste Weg nach Hause.',
      precio: 'Der Eintritt in die Strand-Clubs (Pacha, Opium, Shoko) liegt meist bei 20 bis 35 €, meist inklusive Getraenk und etwas guenstiger im Vorverkauf. Bei Locations wie Razzmatazz oder Sala Apolo variiert der Preis stark je nach Event.',
      vestimenta: 'Die Strand-Clubs haben meist einen strengeren Dresscode, gepflegte Kleidung, keine Flip-Flops oder Badekleidung. Poblenou und Poble Sec sind deutlich entspannter und legerer.',
      seguridad: 'Barcelona ist eine der sichersten Staedte Europas fuer einen Abend unterwegs, auch wenn Taschendiebstahl das haeufigste Risiko in den belebtesten Touristengegenden wie Port Olímpic oder El Gòtic ist: Handy und Portemonnaie in Vordertaschen oder verschlossenen Taschen tragen. NitBus bietet eine Haltestelle auf Anfrage, um Alleinreisende in den fruehen Morgenstunden naeher an ihr Ziel zu bringen.',
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
    de: {
      vidaNocturna: (z) => `Nachtleben in ${z}`,
      zonas: (z) => `Wo man in ${z} feiern geht`,
      temporada: (z) => `Wann man in ${z} feiern gehen sollte`,
      discotecasFamosas: (z) => `Die bekanntesten Clubs in ${z}`,
      transporte: (z) => `Nachts unterwegs in ${z}`,
      precio: (z) => `Was ein Abend in ${z} kostet`,
      vestimenta: (z) => `Was man in ${z} anzieht`,
      seguridad: (z) => `Sicherheit beim Feiern in ${z}`,
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
  clubAgenda: Seccion; clubDireccion: Seccion; clubFotos: Seccion
  djAgenda: Seccion; djSimilares: Seccion; djEscuchar: Seccion
  eventoLineup: Seccion; eventoMasDelClub: Seccion; eventoRelacionados: Seccion
}> = {
  es: {
    clubAgenda: (n) => `Próximos eventos en ${n}`,
    clubDireccion: (n) => `Dónde está ${n}`,
    clubFotos: (n) => `Fotos de ${n}`,
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
    clubs: 'Keine Clubs verfuegbar.',
    djs: 'Keine DJs verfuegbar.',
    eventosFiltro: 'Keine Events fuer diese Auswahl.',
    clubsZona: 'Keine Clubs in dieser Gegend.',
    djsBusqueda: 'Keine DJs fuer diese Suche.',
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
type DescPartes = { nombre: string; lugar?: string | null; eventos: number; proxima?: string | null }

const CLUB_DESC: Record<string, (p: DescPartes) => string> = {
  es: (p) => p.eventos > 0
    ? `Agenda de ${p.nombre}${p.lugar ? ` en ${p.lugar}` : ''}: ${p.eventos} ${p.eventos === 1 ? 'fiesta próxima' : 'fiestas próximas'}${p.proxima ? `, la siguiente el ${p.proxima}` : ''}. Line-ups, entradas y cómo llegar.`
    : `${p.nombre}${p.lugar ? ` en ${p.lugar}` : ''}: horario, entrada, cómo llegar. Descubre dónde salir de fiesta con línea-ups, precios y reservas online en Where We Go.`,
  en: (p) => p.eventos > 0
    ? `${p.nombre}${p.lugar ? ` in ${p.lugar}` : ''} listings: ${p.eventos} upcoming ${p.eventos === 1 ? 'party' : 'parties'}${p.proxima ? `, next one on ${p.proxima}` : ''}. Line-ups, tickets and how to get there.`
    : `${p.nombre}${p.lugar ? ` in ${p.lugar}` : ''}: hours, entry price, directions. Find nightlife, DJs, line-ups, and online ticket booking at Where We Go.`,
  de: (p) => p.eventos > 0
    ? `${p.nombre}${p.lugar ? ` in ${p.lugar}` : ''}: ${p.eventos} ${p.eventos === 1 ? 'kommende Party' : 'kommende Partys'}${p.proxima ? `, die naechste am ${p.proxima}` : ''}. Line-ups, Tickets und Anfahrt.`
    : `${p.nombre}${p.lugar ? ` in ${p.lugar}` : ''}: Oeffnungszeiten, Eintritt, Anfahrt. Entdecke Nachtleben, DJs, Line-ups und Online-Ticketbuchung im Where We Go Club-Guide.`,
}

const DJ_DESC: Record<string, (p: DescPartes) => string> = {
  es: (p) => `${p.nombre}${p.lugar ? ` en ${p.lugar}` : ''}: ${p.eventos} ${p.eventos === 1 ? 'sesión anunciada' : 'sesiones anunciadas'}${p.proxima ? `, la siguiente el ${p.proxima}` : ''}. Fechas, salas y entradas.`,
  en: (p) => `${p.nombre}${p.lugar ? ` in ${p.lugar}` : ''}: ${p.eventos} announced ${p.eventos === 1 ? 'set' : 'sets'}${p.proxima ? `, next one on ${p.proxima}` : ''}. Dates, venues and tickets.`,
  de: (p) => `${p.nombre}${p.lugar ? ` in ${p.lugar}` : ''}: ${p.eventos} ${p.eventos === 1 ? 'angekuendigtes Set' : 'angekuendigte Sets'}${p.proxima ? `, das naechste am ${p.proxima}` : ''}. Termine, Clubs und Tickets.`,
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

export function clubMetaDescription(partes: DescPartes, locale: string, respaldo?: string | null) {
  return construir(CLUB_DESC, partes, locale, respaldo)
}

export function djMetaDescription(partes: DescPartes, locale: string, respaldo?: string | null) {
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
    ? `${p.nombre}: ${p.eventos === 1 ? '1 Party angekuendigt' : `${p.eventos} Partys angekuendigt`}${p.proxima ? `, die naechste am ${p.proxima}` : ''}.`
    : `${p.nombre}: aktuell keine Partys angekuendigt.`,
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
    ? `${p.nombre}: ${p.eventos === 1 ? '1 Set angekuendigt' : `${p.eventos} Sets angekuendigt`}${p.proxima ? `, das naechste am ${p.proxima}` : ''}${p.club ? ` im ${p.club}` : ''}.`
    : `${p.nombre}: aktuell keine Sets angekuendigt.`,
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
    ? `Tickets fuer ${p.nombre} koennen ueber diese Seite gebucht werden.`
    : `Fuer ${p.nombre} gibt es noch keine Online-Ticketbuchung.`,
}

export function resumenEvento(p: {
  nombre: string; generos: string[]; lugar: string | null; zona: string | null
  cuando: string; lineup: string[]; reserva: boolean
}, locale: string): ResumenFicha {
  const f = RESUMEN_EVENTO[locale] || RESUMEN_EVENTO[routing.defaultLocale]
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
const TITULO_CLUB: Record<string, (n: string, lugar: string | null) => string> = {
  es: (n, l) => `${n}${l ? ` ${l}` : ''} - Horario, entrada y reservas | Where We Go`,
  en: (n, l) => `${n}${l ? ` ${l}` : ''} - Hours, tickets & reservations | Where We Go`,
  de: (n, l) => `${n}${l ? ` ${l}` : ''} - Öffnungszeiten, Eintritt & Tickets | Where We Go`,
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
