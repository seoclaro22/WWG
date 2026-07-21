import { routing } from '@/i18n/routing'

const BASE = 'https://wherewego.site'

// Construye la URL absoluta de un path para un idioma dado.
// El idioma por defecto (es) va sin prefijo; el resto con /en, /de.
export function localizedUrl(path: string, locale: string) {
  const p = path === '/' ? '' : path
  if (locale === routing.defaultLocale) return `${BASE}${p || '/'}`
  return `${BASE}/${locale}${p}`
}

// Ruta relativa con prefijo de idioma, para enlaces en componentes de
// servidor: '/clubs' -> '/de/clubs' (o '/clubs' si es el idioma por defecto).
export function localePath(path: string, locale: string) {
  if (locale === routing.defaultLocale) return path
  return `/${locale}${path === '/' ? '' : path}`
}

// Mapa de hreflang { es, en, de, x-default } para un path.
export function hreflangMap(path: string): Record<string, string> {
  const map: Record<string, string> = {}
  for (const locale of routing.locales) {
    map[locale] = localizedUrl(path, locale)
  }
  map['x-default'] = localizedUrl(path, routing.defaultLocale)
  return map
}

// Bloque `alternates` de Next para una pagina: canonical auto-referencial
// al idioma actual + hreflang de todas las versiones.
export function buildAlternates(path: string, locale: string) {
  return {
    canonical: localizedUrl(path, locale),
    languages: hreflangMap(path),
  }
}

// Variante para rutas cuyo slug se traduce (/mallorca/hoy -> /en/mallorca/today,
// /salir-de-fiesta-cerca-de-mi -> /en/nightlife-near-me).
//
// Con buildAlternates estas paginas anunciaban como version inglesa el slug
// espanol bajo /en, que es un 404: un hreflang que apunta a una URL rota
// invalida el grupo entero para Google.
export function buildAlternatesFor(pathFor: (locale: string) => string, locale: string) {
  const languages: Record<string, string> = {}
  for (const l of routing.locales) languages[l] = localizedUrl(pathFor(l), l)
  languages['x-default'] = languages[routing.defaultLocale]
  return {
    canonical: localizedUrl(pathFor(locale), locale),
    languages,
  }
}

// Imagen de compartir de las paginas de listado, generada en /og con el texto
// de cada pagina. Absoluta a proposito: Facebook, WhatsApp y X no resuelven
// rutas relativas en og:image.
export function ogImage(parts: { eyebrow?: string; title: string; subtitle?: string }) {
  const q = new URLSearchParams()
  if (parts.eyebrow) q.set('eyebrow', parts.eyebrow)
  q.set('title', parts.title)
  if (parts.subtitle) q.set('subtitle', parts.subtitle)
  return [{ url: `${BASE}/og?${q.toString()}`, width: 1200, height: 630 }]
}

// Titulo y descripcion de la portada por idioma.
//
// Criterio: la portada NO persigue consultas de ciudad, genero, club ni DJ;
// de eso se encargan /[zona], /genre/[x] y las fichas. Aqui se posiciona la
// marca y el producto en generico ("tu ciudad", sin nombrarla), para no
// competir con las paginas de zona ni quedarse obsoleta al abrir ciudades.
//
// Formato: keyword primero (Google ya muestra el dominio encima, abrir con la
// marca gasta espacio util) y descripcion aprovechando los ~155 caracteres
// que Google recorta, cerrando con llamada a la accion.
export const HOME_META: Record<string, { title: string; description: string; tagline: string }> = {
  es: {
    title: 'Dónde salir de fiesta en tu ciudad | Where We Go',
    description:
      'Descubre las mejores discotecas, fiestas y DJs de tu ciudad. Agenda actualizada a diario con line-ups, horarios y entradas. Encuentra tu plan en segundos.',
    tagline: 'La noche de tu ciudad, cada día',
  },
  en: {
    title: 'Where to Go Out in Your City | Where We Go',
    description:
      "Discover the best clubs, parties and DJs in your city. Daily updated listings with line-ups, times and tickets. Find tonight's plan in seconds.",
    tagline: "Your city's nightlife, updated daily",
  },
  de: {
    title: 'Wo du in deiner Stadt feierst | Where We Go',
    description:
      'Entdecke die besten Clubs, Partys und DJs in deiner Stadt. Täglich aktualisiert mit Line-ups, Zeiten und Tickets. Finde deinen Plan in Sekunden.',
    tagline: 'Das Nachtleben deiner Stadt, täglich aktuell',
  },
}

export function homeMeta(locale: string) {
  return HOME_META[locale] || HOME_META[routing.defaultLocale]
}

// Metadata por defecto del layout. Solo la heredan paginas sin titulo propio
// (cuenta, auth, favoritos...), pero igualmente no debe atarse a una ciudad.
export const SITE_META: Record<string, { title: string; description: string }> = {
  es: {
    title: 'Where We Go — Discotecas y eventos en tu ciudad',
    description: 'Descubre discotecas, fiestas y DJs en tu ciudad. Agenda actualizada a diario.',
  },
  en: {
    title: 'Where We Go — Clubs and events in your city',
    description: 'Discover clubs, parties and DJs in your city. Listings updated daily.',
  },
  de: {
    title: 'Where We Go — Clubs und Events in deiner Stadt',
    description: 'Entdecke Clubs, Partys und DJs in deiner Stadt. Täglich aktualisiert.',
  },
}

export function siteMeta(locale: string) {
  return SITE_META[locale] || SITE_META[routing.defaultLocale]
}

// Listados generales. Son transversales a todas las ciudades: quien busca por
// ciudad aterriza en /[zona], no aqui.
const LIST_META: Record<string, Record<'discover' | 'clubs', { title: string; description: string }>> = {
  es: {
    discover: {
      title: 'Agenda de eventos y fiestas',
      description: 'Todas las fiestas, discotecas y DJs de tu ciudad en un solo sitio. Filtra por zona, género o fecha y reserva tus entradas con Where We Go.',
    },
    clubs: {
      title: 'Discotecas y clubs',
      description: 'Descubre las discotecas de tu ciudad: fotos, ubicación, géneros musicales y su agenda de próximos eventos. Encuentra dónde salir esta noche.',
    },
  },
  en: {
    discover: {
      title: 'Events and Parties',
      description: 'Every party, club and DJ in your city in one place. Filter by area, genre or date and book your tickets with Where We Go.',
    },
    clubs: {
      title: 'Clubs and Venues',
      description: 'Discover the clubs in your city: photos, location, music genres and their upcoming events. Find where to go out tonight.',
    },
  },
  de: {
    discover: {
      title: 'Events und Partys',
      description: 'Alle Partys, Clubs und DJs deiner Stadt an einem Ort. Filtere nach Gegend, Genre oder Datum und buche deine Tickets mit Where We Go.',
    },
    clubs: {
      title: 'Clubs und Locations',
      description: 'Entdecke die Clubs deiner Stadt: Fotos, Lage, Musikrichtungen und kommende Events. Finde heraus, wo du heute Nacht feierst.',
    },
  },
}

export function listMeta(page: 'discover' | 'clubs', locale: string) {
  return (LIST_META[locale] || LIST_META[routing.defaultLocale])[page]
}

// Paginas de genero. Antes decian "en Mallorca" en duro, lo que era falso en
// cuanto el genero tenia eventos en otra ciudad, y ademas solo existian en
// espanol aunque la URL fuese /en o /de.
export function genreMeta(name: string, locale: string) {
  const copy: Record<string, { title: string; description: string; eyebrow: string; intro: string }> = {
    es: {
      title: `Eventos de ${name}`,
      description: `Descubre los próximos eventos de ${name}: discotecas, DJs y fiestas de música ${name}. Agenda actualizada a diario con Where We Go.`,
      eyebrow: 'Género musical',
      intro: `Las próximas fiestas y sesiones de ${name}: discotecas, DJs y line-ups actualizados a diario.`,
    },
    en: {
      title: `${name} Events`,
      description: `Discover upcoming ${name} events: clubs, DJs and ${name} parties. Listings updated daily with Where We Go.`,
      eyebrow: 'Music genre',
      intro: `Upcoming ${name} parties and sets: clubs, DJs and line-ups updated daily.`,
    },
    de: {
      title: `${name} Events`,
      description: `Entdecke kommende ${name} Events: Clubs, DJs und ${name} Partys. Täglich aktualisiert mit Where We Go.`,
      eyebrow: 'Musikrichtung',
      intro: `Kommende ${name} Partys und Sets: Clubs, DJs und Line-ups, täglich aktualisiert.`,
    },
  }
  return copy[locale] || copy[routing.defaultLocale]
}
