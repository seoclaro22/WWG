import { getSupabaseClient } from '@/lib/supabase'
import { fetchZonesMap } from '@/lib/db'

export const revalidate = 3600

const BASE = 'https://wherewego.site'

export async function GET() {
  const sb = getSupabaseClient()
  const nowIso = new Date().toISOString()

  const [eventsRes, clubsRes, djsRes, zonesMap] = await Promise.all([
    sb.from('events_public')
      .select('id,name,club_name,start_at,zone')
      .gte('start_at', nowIso)
      .eq('status', 'published')
      .order('start_at', { ascending: true })
      .limit(40),
    sb.from('clubs')
      .select('id,name,zone')
      .eq('status', 'approved')
      .order('name', { ascending: true })
      .limit(40),
    sb.from('djs')
      .select('id,name,genres')
      .order('name', { ascending: true })
      .limit(60),
    fetchZonesMap(),
  ])

  // Ciudades reales en base de datos: se mantiene solo al abrir ciudad nueva.
  const cities = Array.from(zonesMap.values()).sort((a, b) => a.localeCompare(b, 'es'))

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
    })

  const events = (eventsRes.data || []) as any[]
  const clubs = (clubsRes.data || []) as any[]
  const djs = (djsRes.data || []) as any[]

  const lines: string[] = []
  lines.push('# Where We Go')
  lines.push('')
  lines.push('> Where We Go (WWG) es una guia de vida nocturna para descubrir donde salir de fiesta en tu ciudad: discotecas, eventos y DJs. Los usuarios exploran la agenda de fiestas, ven los line-ups de DJs y reservan entradas a traves de la plataforma.')
  lines.push('')
  lines.push(`Ciudades con agenda activa: ${cities.join(', ')}. Idiomas: espanol, ingles, aleman. Modelo: descubrimiento de eventos y afiliacion de venta de entradas.`)
  lines.push('')
  lines.push('## Paginas principales')
  lines.push(`- [Descubrir eventos](${BASE}/discover): agenda completa de discotecas, eventos y DJs con filtros por zona, fecha y genero musical.`)
  lines.push(`- [Clubs](${BASE}/clubs): listado de discotecas y salas.`)
  lines.push(`- [Promociona tu evento](${BASE}/promote): alta de eventos y clubs para promotores y salas.`)
  lines.push('')

  if (events.length) {
    lines.push('## Proximos eventos')
    for (const e of events) {
      const where = [e.club_name, e.zone].filter(Boolean).join(', ')
      lines.push(`- [${e.name}](${BASE}/event/${e.id}): ${where}, ${fmtDate(e.start_at)}.`)
    }
    lines.push('')
  }

  if (clubs.length) {
    lines.push('## Discotecas')
    for (const c of clubs) {
      lines.push(`- [${c.name}](${BASE}/club/${c.id})${c.zone ? `: ${c.zone}` : ''}`)
    }
    lines.push('')
  }

  if (djs.length) {
    lines.push('## DJs')
    for (const d of djs) {
      const genres = Array.isArray(d.genres) && d.genres.length ? ` (${d.genres.slice(0, 3).join(', ')})` : ''
      lines.push(`- [${d.name}](${BASE}/dj/${d.id})${genres}`)
    }
    lines.push('')
  }

  lines.push('## Notas')
  lines.push('- El contenido de eventos se actualiza a diario; esta pagina se regenera cada hora.')
  lines.push('- Para reservar entradas, cada ficha de evento enlaza al sistema de venta oficial.')

  const body = lines.join('\n')
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
