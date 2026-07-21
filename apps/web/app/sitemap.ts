import { MetadataRoute } from 'next'
import { getSupabaseClient } from '@/lib/supabase'
import { fetchEvents, fetchZoneGenreCounts, fetchZonesMap } from '@/lib/db'
import { localizedUrl, hreflangMap } from '@/lib/seo'
import { MIN_EVENTS_TO_INDEX, WHEN_KEYS, nearSlug, whenRange, whenSlug } from '@/lib/seo-pages'
import { routing } from '@/i18n/routing'

type Entry = MetadataRoute.Sitemap[number]

// Cada idioma tiene su propia entrada <loc> con el juego completo de
// alternates. Es lo que pide Google para el hreflang en sitemaps y lo que
// permite que descubra /en y /de como URLs por derecho propio, en vez de
// solo como anotacion de la version espanola.
function entries(path: string, rest: Omit<Entry, 'url' | 'alternates'>): Entry[] {
  const languages = hreflangMap(path)
  return routing.locales.map((locale) => ({
    url: localizedUrl(path, locale),
    alternates: { languages },
    ...rest,
  }))
}

// Variante para rutas cuyo slug cambia con el idioma (/mallorca/hoy,
// /en/mallorca/today). Aqui el path no es comun a los tres arboles, asi que
// el mapa de hreflang hay que construirlo idioma a idioma.
function localizedEntries(pathFor: (locale: string) => string, rest: Omit<Entry, 'url' | 'alternates'>): Entry[] {
  const languages: Record<string, string> = {}
  for (const locale of routing.locales) languages[locale] = localizedUrl(pathFor(locale), locale)
  languages['x-default'] = languages[routing.defaultLocale]
  return routing.locales.map((locale) => ({
    url: localizedUrl(pathFor(locale), locale),
    alternates: { languages },
    ...rest,
  }))
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sb = getSupabaseClient()
  const nowIso = new Date().toISOString()

  const [eventsRes, clubsRes, djsRes, genresRes, zonesMap] = await Promise.all([
    sb.from('events_public').select('id,start_at').gte('start_at', nowIso).eq('status', 'published').limit(1000),
    sb.from('clubs').select('id,created_at').eq('status', 'approved').limit(1000),
    sb.from('djs').select('id,created_at').limit(1000),
    sb.from('genres').select('name').eq('status', 'active').limit(200),
    fetchZonesMap(),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    ...entries('/', { changeFrequency: 'daily', priority: 1 }),
    ...entries('/discover', { changeFrequency: 'hourly', priority: 0.9 }),
    ...entries('/clubs', { changeFrequency: 'daily', priority: 0.7 }),
    ...entries('/promote', { changeFrequency: 'monthly', priority: 0.5 }),
    // Slug distinto por idioma: la keyword es la ruta.
    ...localizedEntries((locale) => `/${nearSlug(locale)}`, { changeFrequency: 'daily', priority: 0.9 }),
  ]

  const events: MetadataRoute.Sitemap = (eventsRes.data || []).flatMap((e: any) =>
    entries(`/event/${e.id}`, { changeFrequency: 'daily', priority: 0.8 }),
  )

  const clubs: MetadataRoute.Sitemap = (clubsRes.data || []).flatMap((c: any) =>
    entries(`/club/${c.id}`, { changeFrequency: 'weekly', priority: 0.7 }),
  )

  const djs: MetadataRoute.Sitemap = (djsRes.data || []).flatMap((d: any) =>
    entries(`/dj/${d.id}`, { changeFrequency: 'weekly', priority: 0.6 }),
  )

  // Un genero activo en la tabla no implica que tenga eventos: se comprueba
  // antes de publicarlo, igual que el resto de paginas generadas.
  const genres: MetadataRoute.Sitemap = (
    await Promise.all((genresRes.data || []).map(async (g: any) => {
      const found = await fetchEvents({ genre: g.name, limit: MIN_EVENTS_TO_INDEX })
      if (found.length < MIN_EVENTS_TO_INDEX) return []
      return entries(`/genre/${encodeURIComponent(g.name)}`, { changeFrequency: 'daily', priority: 0.6 })
    }))
  ).flat()

  const zones: MetadataRoute.Sitemap = Array.from(zonesMap.keys()).flatMap((slug) =>
    entries(`/${slug}`, { changeFrequency: 'daily', priority: 0.8 }),
  )

  // Paginas temporales y cruces zona x genero. Solo entran las que superan el
  // umbral de inventario: una pagina "fiestas hoy en X" sin eventos es peor
  // que no tenerla, tanto para el usuario como para la calidad del dominio.
  const zoneSlugs = Array.from(zonesMap.keys())
  const generated: MetadataRoute.Sitemap = (
    await Promise.all(zoneSlugs.map(async (slug) => {
      const zoneName = zonesMap.get(slug)
      if (!zoneName) return []
      const out: MetadataRoute.Sitemap = []

      for (const key of WHEN_KEYS) {
        const { from, to } = whenRange(key)
        const found = await fetchEvents({ zone: zoneName, from, to, limit: MIN_EVENTS_TO_INDEX })
        if (found.length < MIN_EVENTS_TO_INDEX) continue
        out.push(...localizedEntries(
          (locale) => `/${slug}/${whenSlug(key, locale)}`,
          { changeFrequency: 'hourly', priority: 0.9 },
        ))
      }

      const counts = await fetchZoneGenreCounts(zoneName)
      for (const [genre, n] of counts) {
        if (n < MIN_EVENTS_TO_INDEX) continue
        out.push(...entries(`/${slug}/genre/${encodeURIComponent(genre)}`, { changeFrequency: 'daily', priority: 0.7 }))
      }

      return out
    }))
  ).flat()

  return [...staticRoutes, ...zones, ...generated, ...events, ...clubs, ...djs, ...genres]
}

export const revalidate = 3600
