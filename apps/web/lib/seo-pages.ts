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

// Formato de fecha por idioma. Las fichas existentes formatean siempre en
// es-ES, aunque la URL sea /en o /de.
const DATE_LOCALES: Record<string, string> = { es: 'es-ES', en: 'en-GB', de: 'de-DE' }

export function formatEventDate(iso: string, locale: string) {
  const tag = DATE_LOCALES[locale] || DATE_LOCALES[routing.defaultLocale]
  return new Date(iso).toLocaleString(tag, {
    weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  })
}
