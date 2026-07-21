import { MetadataRoute } from 'next'
import { getSupabaseClient } from '@/lib/supabase'
import { fetchEvents, fetchZoneGenreCounts, fetchZonesMap } from '@/lib/db'
import { localizedUrl, hreflangMap } from '@/lib/seo'
import { MIN_EVENTS_TO_INDEX, WHEN_KEYS, nearSlug, whenRange, whenSlug } from '@/lib/seo-pages'
import { routing } from '@/i18n/routing'

// Los datos de cada bloque del sitemap, separados de la ruta que los sirve.
// Antes vivian todos en app/sitemap.ts; se extrajeron al partir el sitemap en
// un indice con un fichero por tipo de contenido, para poder ver en Search
// Console la tasa de indexacion de cada bloque por separado.

export type Entry = MetadataRoute.Sitemap[number]

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

// Ninguna tabla tiene updated_at, asi que la fecha honesta que podemos dar es
// la de creacion. Un lastModified inventado (por ejemplo "ahora") le dice a
// Google que vuelva a rastrear paginas que no han cambiado, y acaba
// ignorandolo por poco fiable.
function lastMod(value?: string | null): Date | undefined {
  if (!value) return undefined
  const d = new Date(value)
  return isNaN(d.getTime()) ? undefined : d
}

export async function staticEntries(): Promise<Entry[]> {
  return [
    ...entries('/', { changeFrequency: 'daily', priority: 1 }),
    ...entries('/discover', { changeFrequency: 'hourly', priority: 0.9 }),
    ...entries('/clubs', { changeFrequency: 'daily', priority: 0.7 }),
    ...entries('/djs', { changeFrequency: 'daily', priority: 0.7 }),
    ...entries('/promote', { changeFrequency: 'monthly', priority: 0.5 }),
    // Slug distinto por idioma: la keyword es la ruta.
    ...localizedEntries((locale) => `/${nearSlug(locale)}`, { changeFrequency: 'daily', priority: 0.9 }),
  ]
}

export async function eventEntries(): Promise<Entry[]> {
  const sb = getSupabaseClient()
  const { data } = await sb
    .from('events_public')
    .select('id,start_at,created_at')
    .gte('start_at', new Date().toISOString())
    .eq('status', 'published')
    .limit(1000)
  return (data || []).flatMap((e: any) =>
    entries(`/event/${e.id}`, { changeFrequency: 'daily', priority: 0.8, lastModified: lastMod(e.created_at) }),
  )
}

export async function clubEntries(): Promise<Entry[]> {
  const sb = getSupabaseClient()
  const { data } = await sb.from('clubs').select('id,created_at').eq('status', 'approved').limit(1000)
  return (data || []).flatMap((c: any) =>
    entries(`/club/${c.id}`, { changeFrequency: 'weekly', priority: 0.7, lastModified: lastMod(c.created_at) }),
  )
}

export async function djEntries(): Promise<Entry[]> {
  const sb = getSupabaseClient()
  const { data } = await sb.from('djs').select('id,created_at').limit(1000)
  return (data || []).flatMap((d: any) =>
    entries(`/dj/${d.id}`, { changeFrequency: 'weekly', priority: 0.6, lastModified: lastMod(d.created_at) }),
  )
}

export async function genreEntries(): Promise<Entry[]> {
  const sb = getSupabaseClient()
  const { data } = await sb.from('genres').select('name').eq('status', 'active').limit(200)
  // Un genero activo en la tabla no implica que tenga eventos: se comprueba
  // antes de publicarlo, igual que el resto de paginas generadas.
  const out = await Promise.all((data || []).map(async (g: any) => {
    const found = await fetchEvents({ genre: g.name, limit: MIN_EVENTS_TO_INDEX })
    if (found.length < MIN_EVENTS_TO_INDEX) return []
    return entries(`/genre/${encodeURIComponent(g.name)}`, { changeFrequency: 'daily', priority: 0.6 })
  }))
  return out.flat()
}

// Zonas mas las paginas generadas encima de ellas (temporales y cruces zona x
// genero). Van juntas porque comparten la consulta de zonas y porque en Search
// Console interesa verlas como un solo bloque: son las paginas de captacion.
export async function zoneEntries(): Promise<Entry[]> {
  const zonesMap = await fetchZonesMap()
  const slugs = Array.from(zonesMap.keys())

  const zones = slugs.flatMap((slug) => entries(`/${slug}`, { changeFrequency: 'daily', priority: 0.8 }))

  // Solo entran las que superan el umbral de inventario: una pagina "fiestas
  // hoy en X" sin eventos es peor que no tenerla, tanto para el usuario como
  // para la calidad del dominio.
  const generated = (
    await Promise.all(slugs.map(async (slug) => {
      const zoneName = zonesMap.get(slug)
      if (!zoneName) return []
      const out: Entry[] = []

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

  return [...zones, ...generated]
}

// Los bloques en los que se parte el sitemap. El orden es el del indice.
export const SITEMAP_SEGMENTS = {
  paginas: staticEntries,
  zonas: zoneEntries,
  eventos: eventEntries,
  clubs: clubEntries,
  djs: djEntries,
  generos: genreEntries,
} as const

export type SegmentName = keyof typeof SITEMAP_SEGMENTS
