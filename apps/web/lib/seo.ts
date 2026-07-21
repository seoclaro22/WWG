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
