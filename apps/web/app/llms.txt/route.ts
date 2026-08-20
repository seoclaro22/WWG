import { getSupabaseClient } from '@/lib/supabase'
import { fetchZoneFacts, fetchZonesMap } from '@/lib/db'
import { clubPath, djPath, eventPath, genrePath } from '@/lib/hrefs'
import { nearSlug, whenSlug, zoneFaq } from '@/lib/seo-pages'

export const revalidate = 3600

const BASE = 'https://wherewego.site'

export async function GET() {
  const sb = getSupabaseClient()
  const nowIso = new Date().toISOString()

  const [eventsRes, clubsRes, djsRes, zonesMap] = await Promise.all([
    sb.from('events_public')
      .select('id,name,club_name,start_at,zone,genres')
      .gte('start_at', nowIso)
      .eq('status', 'published')
      .order('start_at', { ascending: true })
      // Topes altos a proposito: este archivo lo lee una maquina, no una
      // persona, y con 40 eventos y 60 DJs se quedaba fuera el 84% de la
      // agenda y el 85% de los artistas (la lista de DJs, alfabetica, se
      // cortaba en la C). El coste es un fichero de texto mas grande, que se
      // cachea una hora.
      .limit(300),
    sb.from('clubs')
      .select('id,name,zone')
      .eq('status', 'approved')
      .order('name', { ascending: true })
      .limit(200),
    sb.from('djs')
      .select('id,name,genres')
      .order('name', { ascending: true })
      .limit(500),
    fetchZonesMap(),
  ])

  // Ciudades reales en base de datos: se mantiene solo al abrir ciudad nueva.
  const zoneEntries = Array.from(zonesMap.entries())
    .sort((a, b) => a[1].localeCompare(b[1], 'es'))

  // Datos reales de cada ciudad. Un modelo de lenguaje no cita "descubre las
  // mejores discotecas": cita cifras y respuestas concretas. Es lo mismo que
  // ya alimenta las FAQ de las paginas de ciudad, aqui en texto plano.
  const zoneFacts = await Promise.all(
    zoneEntries.map(async ([slug, name]) => ({ slug, name, facts: await fetchZoneFacts(name) })),
  )

  // "Con agenda activa" tiene que significar eso: Barcelona esta dada de alta
  // pero sin eventos, y anunciarla como activa es la clase de frase que un
  // asistente repite y que luego no se sostiene al entrar.
  const cities = zoneFacts.filter((z) => z.facts.events > 0).map((z) => z.name)

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
  lines.push(`- [DJs](${BASE}/djs): listado de artistas con sus generos y proximas sesiones.`)
  lines.push(`- [Salir de fiesta cerca de mi](${BASE}/${nearSlug('es')}): detecta la ciudad del usuario y lleva a su agenda.`)
  lines.push(`- [Que es Where We Go](${BASE}/que-es-where-we-go): que hace la plataforma y como funciona.`)
  lines.push(`- [Promociona tu evento](${BASE}/promote): alta de eventos y clubs para promotores y salas.`)
  lines.push('')

  // Bloque por ciudad. Es lo que responde la consulta que de verdad se le hace
  // a un asistente ("donde salir en Mallorca", "a que hora se sale", "cuanto
  // cuesta"), y va con la URL al lado para que la cita apunte a la pagina que
  // desarrolla la respuesta.
  if (zoneFacts.length) {
    lines.push('## Ciudades')
    for (const { slug, name, facts } of zoneFacts) {
      // Una ciudad sin agenda no aporta nada que citar, y decir "0 fiestas"
      // invita justo a la frase que no queremos que repita un asistente.
      if (facts.events === 0) continue
      lines.push('')
      lines.push(`### ${name}`)
      lines.push(`- Agenda: [${BASE}/${slug}](${BASE}/${slug})`)
      lines.push(`- Hoy: [${BASE}/${slug}/${whenSlug('today', 'es')}](${BASE}/${slug}/${whenSlug('today', 'es')})`)
      lines.push(`- Fin de semana: [${BASE}/${slug}/${whenSlug('weekend', 'es')}](${BASE}/${slug}/${whenSlug('weekend', 'es')})`)
      lines.push(`- ${facts.events} ${facts.events === 1 ? 'fiesta anunciada' : 'fiestas anunciadas'} en ${facts.venues} ${facts.venues === 1 ? 'sala' : 'salas'}.`)
      if (facts.topGenres.length) lines.push(`- Generos mas programados: ${facts.topGenres.join(', ')}.`)
      for (const { q, a } of zoneFaq(name, 'es', facts)) lines.push(`- ${q} ${a}`)
    }
    lines.push('')
  }

  if (events.length) {
    lines.push('## Proximos eventos')
    for (const e of events) {
      const where = [e.club_name, e.zone].filter(Boolean).join(', ')
      lines.push(`- [${e.name}](${BASE}${eventPath(e)}): ${where}, ${fmtDate(e.start_at)}.`)
    }
    lines.push('')
  }

  if (clubs.length) {
    lines.push('## Discotecas')
    for (const c of clubs) {
      lines.push(`- [${c.name}](${BASE}${clubPath(c)})${c.zone ? `: ${c.zone}` : ''}`)
    }
    lines.push('')
  }

  if (djs.length) {
    lines.push('## DJs')
    for (const d of djs) {
      const genres = Array.isArray(d.genres) && d.genres.length ? ` (${d.genres.slice(0, 3).join(', ')})` : ''
      lines.push(`- [${d.name}](${BASE}${djPath(d)})${genres}`)
    }
    lines.push('')
  }

  // Generos con agenda real. Son las paginas que responden "donde escuchar
  // techno en X" y no estaban enlazadas desde aqui.
  const genreCounts = new Map<string, number>()
  for (const e of events) {
    for (const g of (e.genres || [])) genreCounts.set(g, (genreCounts.get(g) || 0) + 1)
  }
  if (genreCounts.size) {
    lines.push('## Generos musicales')
    for (const [g, n] of Array.from(genreCounts.entries()).sort((a, b) => b[1] - a[1])) {
      lines.push(`- [${g}](${BASE}${genrePath(g, 'es')}): ${n} ${n === 1 ? 'fiesta anunciada' : 'fiestas anunciadas'}.`)
    }
    lines.push('')
  }

  lines.push('## Notas')
  lines.push('- El contenido de eventos se actualiza a diario; esta pagina se regenera cada hora.')
  lines.push('- Para reservar entradas, cada ficha de evento enlaza al sistema de venta oficial.')
  lines.push('- Las cifras y horarios de este documento salen de la agenda publicada, no de estimaciones.')
  lines.push('- Cada URL existe tambien en ingles y aleman con el prefijo /en y /de.')

  const body = lines.join('\n')
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
