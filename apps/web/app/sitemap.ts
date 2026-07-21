import { MetadataRoute } from 'next'
import { getSupabaseClient } from '@/lib/supabase'
import { fetchZonesMap } from '@/lib/db'
import { localizedUrl, hreflangMap } from '@/lib/seo'
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

  const genres: MetadataRoute.Sitemap = (genresRes.data || []).flatMap((g: any) =>
    entries(`/genre/${encodeURIComponent(g.name)}`, { changeFrequency: 'daily', priority: 0.6 }),
  )

  const zones: MetadataRoute.Sitemap = Array.from(zonesMap.keys()).flatMap((slug) =>
    entries(`/${slug}`, { changeFrequency: 'daily', priority: 0.8 }),
  )

  return [...staticRoutes, ...zones, ...events, ...clubs, ...djs, ...genres]
}

export const revalidate = 3600
