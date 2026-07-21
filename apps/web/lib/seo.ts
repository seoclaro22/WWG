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
