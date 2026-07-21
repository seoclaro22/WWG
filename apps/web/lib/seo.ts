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

// Titulo y descripcion de la portada por idioma.
// Criterio: la keyword primero (Google ya muestra el dominio encima, asi que
// abrir con la marca gasta espacio util) y descripcion aprovechando los ~155
// caracteres que Google recorta, cerrando con llamada a la accion.
export const HOME_META: Record<string, { title: string; description: string; tagline: string }> = {
  es: {
    title: 'Discotecas y eventos en Mallorca | Where We Go',
    description:
      'Descubre qué discotecas y fiestas hay hoy en Mallorca: line-ups, DJs y entradas. Agenda actualizada a diario. Encuentra tu plan para esta noche.',
    tagline: 'La noche de Mallorca, cada día',
  },
  en: {
    title: 'Clubs and Events in Mallorca | Where We Go',
    description:
      "Find out which clubs and parties are on tonight in Mallorca: line-ups, DJs and tickets. Updated daily. Find tonight's plan in seconds.",
    tagline: 'Mallorca nightlife, updated daily',
  },
  de: {
    title: 'Clubs und Events auf Mallorca | Where We Go',
    description:
      'Entdecke, welche Clubs und Partys heute auf Mallorca stattfinden: Line-ups, DJs und Tickets. Täglich aktualisiert. Finde deinen Plan für heute Nacht.',
    tagline: 'Mallorcas Nachtleben, täglich aktuell',
  },
}

export function homeMeta(locale: string) {
  return HOME_META[locale] || HOME_META[routing.defaultLocale]
}
