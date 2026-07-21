import { MetadataRoute } from 'next'
import { getSupabaseClient } from '@/lib/supabase'
import { fetchZonesMap } from '@/lib/db'
import { localizedUrl, hreflangMap } from '@/lib/seo'

type Entry = MetadataRoute.Sitemap[number]

// Genera una entrada con la URL en espanol (raiz) y los alternates hreflang
// hacia /en y /de, para que Google indexe las 3 versiones de cada pagina.
function entry(path: string, rest: Omit<Entry, 'url' | 'alternates'>): Entry {
  return {
    url: localizedUrl(path, 'es'),
    alternates: { languages: hreflangMap(path) },
    ...rest,
  }
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
    entry('/', { changeFrequency: 'daily', priority: 1 }),
    entry('/discover', { changeFrequency: 'hourly', priority: 0.9 }),
    entry('/clubs', { changeFrequency: 'daily', priority: 0.7 }),
    entry('/promote', { changeFrequency: 'monthly', priority: 0.5 }),
  ]

  const events: MetadataRoute.Sitemap = (eventsRes.data || []).map((e: any) =>
    entry(`/event/${e.id}`, { changeFrequency: 'daily', priority: 0.8 }),
  )

  const clubs: MetadataRoute.Sitemap = (clubsRes.data || []).map((c: any) =>
    entry(`/club/${c.id}`, { changeFrequency: 'weekly', priority: 0.7 }),
  )

  const djs: MetadataRoute.Sitemap = (djsRes.data || []).map((d: any) =>
    entry(`/dj/${d.id}`, { changeFrequency: 'weekly', priority: 0.6 }),
  )

  const genres: MetadataRoute.Sitemap = (genresRes.data || []).map((g: any) =>
    entry(`/genre/${encodeURIComponent(g.name)}`, { changeFrequency: 'daily', priority: 0.6 }),
  )

  const zones: MetadataRoute.Sitemap = Array.from(zonesMap.keys()).map((slug) =>
    entry(`/${slug}`, { changeFrequency: 'daily', priority: 0.8 }),
  )

  return [...staticRoutes, ...zones, ...events, ...clubs, ...djs, ...genres]
}

export const revalidate = 3600
