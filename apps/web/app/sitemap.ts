import { MetadataRoute } from 'next'
import { getSupabaseClient } from '@/lib/supabase'
import { fetchZonesMap } from '@/lib/db'

const BASE = 'https://wherewego.site'

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
    { url: BASE, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/discover`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE}/clubs`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE}/promote`, changeFrequency: 'monthly', priority: 0.5 },
  ]

  const events: MetadataRoute.Sitemap = (eventsRes.data || []).map((e: any) => ({
    url: `${BASE}/event/${e.id}`,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  const clubs: MetadataRoute.Sitemap = (clubsRes.data || []).map((c: any) => ({
    url: `${BASE}/club/${c.id}`,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const djs: MetadataRoute.Sitemap = (djsRes.data || []).map((d: any) => ({
    url: `${BASE}/dj/${d.id}`,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  const genres: MetadataRoute.Sitemap = (genresRes.data || []).map((g: any) => ({
    url: `${BASE}/genre/${encodeURIComponent(g.name)}`,
    changeFrequency: 'daily' as const,
    priority: 0.6,
  }))

  const zones: MetadataRoute.Sitemap = Array.from(zonesMap.keys()).map((slug) => ({
    url: `${BASE}/${slug}`,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  return [...staticRoutes, ...zones, ...events, ...clubs, ...djs, ...genres]
}

export const revalidate = 3600
