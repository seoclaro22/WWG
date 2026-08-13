import { getSupabaseClient } from '@/lib/supabase'
import type { EventPublic, Club } from './types'

function normalizeEventFromDate(from?: string) {
  const now = new Date()
  if (!from) return now.toISOString()
  const parsed = new Date(from)
  if (Number.isNaN(parsed.getTime()) || parsed < now) return now.toISOString()
  return from
}

// Un evento sigue siendo relevante mientras no haya terminado, no solo
// mientras no haya empezado. Filtrar por start_at >= ahora hacia que una
// fiesta que ya arranco pero sigue abierta desapareciera del listado, aunque
// alguien pudiera llegar y comprar entrada en ese mismo momento.
// end_at esta poblado en el 100% de los eventos actuales, pero el or() cubre
// tambien el caso de que algun evento futuro se cree sin end_at.
function applyStillOnFilter<T extends { or: (s: string) => T }>(q: T, effectiveFrom: string): T {
  return q.or(`end_at.gte.${effectiveFrom},and(end_at.is.null,start_at.gte.${effectiveFrom})`)
}

export async function fetchEvents(params?: { q?: string; limit?: number; from?: string; to?: string; genre?: string; zone?: string; sponsoredFirst?: boolean }) {
  const sb = getSupabaseClient()
  const effectiveFrom = normalizeEventFromDate(params?.from)
  let q = sb.from('events_public').select('*')
  if (params?.sponsoredFirst) {
    q = q.order('sponsored', { ascending: false }).order('start_at', { ascending: true })
  } else {
    q = q.order('start_at', { ascending: true })
  }
  if (params?.q) {
    // Búsqueda simple por nombre/desc/club
    q = q.or(`name.ilike.%${params.q}%,description.ilike.%${params.q}%,club_name.ilike.%${params.q}%`)
  }
  q = applyStillOnFilter(q, effectiveFrom)
  if (params?.to) q = q.lte('start_at', params.to)
  if (params?.genre) q = q.contains('genres', [params.genre])
  if (params?.zone) q = (q as any).eq('zone', params.zone)
  q = (q as any).eq('status', 'published')
  if (params?.limit) q = q.limit(params.limit)
  let { data, error } = await q
  if (error) {
    const msg = String(error.message || '').toLowerCase()
    const zoneMissing = msg.includes('zone')
    const statusMissing = msg.includes('status')
    const sponsoredMissing = msg.includes('sponsored')
    if (zoneMissing || statusMissing || sponsoredMissing) {
      // Fallback si alguna columna no existe en la vista
      let retryQ = sb.from('events_public').select('*')
      if (params?.sponsoredFirst && !sponsoredMissing) {
        retryQ = retryQ.order('sponsored', { ascending: false }).order('start_at', { ascending: true })
      } else {
        retryQ = retryQ.order('start_at', { ascending: true })
      }
      if (params?.q) {
        retryQ = retryQ.or(`name.ilike.%${params.q}%,description.ilike.%${params.q}%,club_name.ilike.%${params.q}%`)
      }
      retryQ = applyStillOnFilter(retryQ, effectiveFrom)
      if (params?.to) retryQ = retryQ.lte('start_at', params.to)
      if (params?.genre) retryQ = retryQ.contains('genres', [params.genre])
      if (params?.zone && !zoneMissing) retryQ = (retryQ as any).eq('zone', params.zone)
      if (!statusMissing) retryQ = (retryQ as any).eq('status', 'published')
      // Sin limit propio: el fallback tiene que devolver lo mismo que la
      // consulta principal. Un tope aqui recortaba en silencio solo cuando
      // fallaba una columna, que es justo cuando peor se detecta.
      if (params?.limit) retryQ = retryQ.limit(params.limit)
      const retry = await retryQ
      data = retry.data as any
      error = retry.error as any
    }
  }
  if (error) {
    console.error('fetchEvents error', error)
    return []
  }
  return (data || []) as EventPublic[]
}

export async function countUpcomingEvents(params?: { zone?: string }) {
  const sb = getSupabaseClient()
  const nowIso = new Date().toISOString()
  let q = applyStillOnFilter(sb.from('events_public').select('id', { count: 'exact', head: true }) as any, nowIso)
  if (params?.zone) q = (q as any).eq('zone', params.zone)
  q = (q as any).eq('status', 'published')
  let { count, error } = await q
  if (error) {
    // Fallback si status/zone no existen en la vista
    const retry = await applyStillOnFilter(sb.from('events_public').select('id', { count: 'exact', head: true }) as any, nowIso)
    count = retry.count
    error = retry.error
  }
  if (error) {
    console.error('countUpcomingEvents error', error)
    return 0
  }
  return count || 0
}

// Mismo patron que countUpcomingEvents, para el numero que acompana a las
// pestanas "Clubs" y "DJs" de /discover (antes solo la de eventos lo tenia).
export async function countClubs(params?: { zone?: string }) {
  const sb = getSupabaseClient()
  let q = sb.from('clubs').select('id', { count: 'exact', head: true }).eq('status', 'approved')
  if (params?.zone) {
    // Igual que fetchClubsPublic: un club sin zona asignada no debe
    // desaparecer del conteo solo por no tener ese dato.
    q = (q as any).or(`zone.eq.${params.zone},zone.is.null`)
  }
  const { count, error } = await q
  if (error) { console.error('countClubs error', error); return 0 }
  return count || 0
}

// Los DJs no tienen zona (son globales), asi que aqui no hay filtro que
// aplicar: el total es el mismo se mire desde la ciudad que se mire.
export async function countDjs() {
  const sb = getSupabaseClient()
  const { count, error } = await sb.from('djs').select('id', { count: 'exact', head: true })
  if (error) { console.error('countDjs error', error); return 0 }
  return count || 0
}

// Generos con eventos proximos en una zona, y cuantos. Alimenta tanto los
// enlaces internos de /[zona] como el sitemap: solo se publica el cruce
// zona x genero que tiene agenda real detras.
export async function fetchZoneGenreCounts(zone: string) {
  const events = await fetchEvents({ zone, limit: 500 })
  const counts = new Map<string, number>()
  for (const e of events) {
    for (const g of (e.genres || [])) {
      counts.set(g, (counts.get(g) || 0) + 1)
    }
  }
  return counts
}

// Si el genero existe de verdad en los datos.
//
// /genre/[name] montaba la pagina con cualquier cadena que le llegase en la
// URL: /genre/zzz devolvia un 200 con su titulo y su descripcion. Eso es un
// soft 404, y ademas abre un numero infinito de URLs indexables.
//
// Mira eventos y DJs, no solo la agenda proxima: un genero que existe pero se
// ha quedado sin fechas sigue siendo una pagina legitima, y hacerla 404 seria
// romper una URL que ya esta posicionada.
export async function genreExists(genre: string) {
  const sb = getSupabaseClient()
  const [events, djs] = await Promise.all([
    (sb.from('events').select('id', { count: 'exact', head: true }) as any).contains('genres', [genre]),
    (sb.from('djs').select('id', { count: 'exact', head: true }) as any).contains('genres', [genre]),
  ])
  if (events.error) console.error('genreExists events error', events.error)
  if (djs.error) console.error('genreExists djs error', djs.error)
  return (events.count || 0) > 0 || (djs.count || 0) > 0
}

export async function fetchClubsPublic(params?: { q?: string; limit?: number; zone?: string; genre?: string }) {
  const sb = getSupabaseClient()
  let q = sb.from('clubs').select('*').eq('status','approved').order('name', { ascending: true })
  if (params?.q) q = q.ilike('name', `%${params.q}%`)
  if (params?.zone) {
    // Incluir clubs sin zona asignada para no ocultar datos antiguos
    q = (q as any).or(`zone.eq.${params.zone},zone.is.null`)
  }
  if (params?.genre) {
    // Filtrar si el array de generos contiene el genero seleccionado
    q = (q as any).contains('genres', [params.genre])
  }
  if (params?.limit) q = q.limit(params.limit)
  const { data, error } = await q
  if (error) { console.error('fetchClubsPublic error', error); return [] }
  return (data || []) as any[]
}

export async function fetchDjsPublic(params?: { q?: string; limit?: number; genre?: string }) {
  const sb = getSupabaseClient()
  let q = sb
    .from('djs')
    .select('id,slug,name,name_i18n,short_bio,short_bio_i18n,bio,bio_i18n,genres,images,verified')
    .order('name', { ascending: true })
  if (params?.q) q = q.ilike('name', `%${params.q}%`)
  if (params?.genre) q = (q as any).contains('genres', [params.genre])
  if (params?.limit) q = q.limit(params.limit)
  const { data, error } = await q
  if (error) { console.error('fetchDjsPublic error', error); return [] }
  return (data || []) as any[]
}

export async function fetchEvent(idOrSlug: string) {
  const sb = getSupabaseClient()
  const campo = isUuid(idOrSlug) ? 'id' : 'slug'
  let { data, error } = await sb.from('events_public').select('*').eq(campo, idOrSlug).eq('status', 'published').maybeSingle()
  if (error && String(error.message || '').toLowerCase().includes('status')) {
    const retry = await sb.from('events_public').select('*').eq(campo, idOrSlug).maybeSingle()
    data = retry.data as any
    error = retry.error as any
  }
  if (error) {
    console.error('fetchEvent error', error)
    return null
  }
  return (data as EventPublic) || null
}

export async function fetchEventLineup(eventId: string) {
  const sb = getSupabaseClient()
  const { data, error } = await sb
    .from('event_djs')
    .select('position,djs(id,slug,name,name_i18n,spotify_embed,images)')
    .eq('event_id', eventId)
    .order('position', { ascending: true })
  if (error) { console.error('fetchEventLineup error', error); return [] }
  return (data || []).map((r: any) => ({
    id: r.djs?.id,
    slug: r.djs?.slug || null,
    name: r.djs?.name,
    name_i18n: r.djs?.name_i18n || null,
    spotify_embed: r.djs?.spotify_embed || null,
    images: r.djs?.images || null,
    position: r.position
  }))
}

export async function fetchRelatedEvents(eventId: string, genres: string[] | null | undefined, zone: string | null | undefined, limit = 4) {
  const sb = getSupabaseClient()
  const nowIso = new Date().toISOString()
  const base = () => {
    let q = sb.from('events_public').select('*').neq('id', eventId).or(`end_at.gte.${nowIso},and(end_at.is.null,start_at.gte.${nowIso})`).order('start_at', { ascending: true }).limit(limit)
    q = (q as any).eq('status', 'published')
    return q
  }
  // La zona manda sobre el genero. A una fiesta se va desde donde estas: el
  // mismo estilo a 200 km, o peor, en otra isla, no le sirve a nadie. Antes
  // iba el genero primero y una ficha de Valencia recomendaba Mallorca.
  if (zone) {
    if (genres && genres.length) {
      const { data } = await (base() as any).eq('zone', zone).overlaps('genres', genres)
      if (data?.length) return data as any[]
    }
    const { data } = await (base() as any).eq('zone', zone)
    if (data?.length) return data as any[]
  }
  // Sin nada en la zona, cualquier alternativa va a estar lejos igual, asi
  // que al menos que coincida el estilo.
  if (genres && genres.length) {
    const { data } = await (base() as any).overlaps('genres', genres)
    if (data?.length) return data as any[]
  }
  const { data } = await base()
  return (data || []) as any[]
}

export type ZoneFacts = {
  events: number
  venues: number
  /** Hora de inicio mas repetida, en hora local de Madrid. */
  usualStartHour: number | null
  priceMin: number | null
  priceMax: number | null
  /** Dia de la semana con mas agenda (0 domingo ... 6 sabado). */
  busiestWeekday: number | null
  topGenres: string[]
}

// Resumen de la agenda de una zona a partir de los eventos reales.
//
// Es la unica forma honesta de dar a una pagina de ciudad el contenido que
// pide quien busca "salir de fiesta en X" (a que hora se sale, cuanto cuesta,
// que noche es la buena) sin escribir a mano una guia por ciudad que ademas
// quedaria desactualizada. Se recalcula solo con cada evento nuevo.
export async function fetchZoneFacts(zone: string): Promise<ZoneFacts> {
  const events = await fetchEvents({ zone, limit: 500 })
  const hours = new Map<number, number>()
  const weekdays = new Map<number, number>()
  const genres = new Map<string, number>()
  const venues = new Set<string>()
  let priceMin: number | null = null
  let priceMax: number | null = null

  for (const e of events) {
    const d = new Date(e.start_at)
    // Los eventos importados sin hora se guardan a las 00:00:00 UTC exactas.
    // Convertidos a Madrid dan las 02:00, que es una hora de fiesta plausible,
    // asi que no hay forma de distinguirlos salvo por el sello exacto.
    const isPlaceholder = d.getUTCHours() === 0 && d.getUTCMinutes() === 0
    // Hora local de Madrid: un evento guardado a las 21:00 UTC empieza a las
    // 23:00 en la calle, y es esa la que responde "a que hora se sale".
    const hour = Number(new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Madrid', hour: '2-digit', hour12: false,
    }).format(d).slice(0, 2))
    if (!isPlaceholder && !Number.isNaN(hour)) hours.set(hour, (hours.get(hour) || 0) + 1)
    const wd = new Date(e.start_at).getDay()
    weekdays.set(wd, (weekdays.get(wd) || 0) + 1)
    for (const g of e.genres || []) genres.set(g, (genres.get(g) || 0) + 1)
    if (e.club_name) venues.add(e.club_name)
    // Solo precios reales: un 0 aqui suele ser "sin dato", no entrada gratis.
    if (e.price_min && e.price_min > 0) priceMin = priceMin === null ? e.price_min : Math.min(priceMin, e.price_min)
    if (e.price_max && e.price_max > 0) priceMax = priceMax === null ? e.price_max : Math.max(priceMax, e.price_max)
  }

  const top = <K,>(m: Map<K, number>) =>
    Array.from(m.entries()).sort((a, b) => b[1] - a[1])

  // Buena parte del catalogo llega sin hora y se guarda a medianoche, asi que
  // la hora mas repetida suele ser ese relleno y no un horario real. Solo se
  // da por buena si cae en horario de noche; si no, no se afirma nada.
  const nightHours = Array.from(hours.entries()).filter(([h]) => h >= 20 || h <= 6)
  const usualStartHour = nightHours.sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  return {
    events: events.length,
    venues: venues.size,
    usualStartHour,
    priceMin,
    priceMax,
    busiestWeekday: top(weekdays)[0]?.[0] ?? null,
    topGenres: top(genres).slice(0, 5).map(([g]) => g),
  }
}

export function slugifyZone(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function fetchZonesMap() {
  const sb = getSupabaseClient()
  const [clubsRes, eventsRes] = await Promise.all([
    sb.from('clubs').select('zone').eq('status', 'approved').not('zone', 'is', null).limit(1000),
    sb.from('events_public').select('zone').not('zone', 'is', null).limit(1000),
  ])
  const rows = [...(clubsRes.data || []), ...(eventsRes.data || [])] as Array<{ zone?: string | null }>
  const map = new Map<string, string>()
  for (const row of rows) {
    const zone = (row.zone || '').trim()
    if (!zone) continue
    const slug = slugifyZone(zone)
    if (!slug || map.has(slug)) continue
    map.set(slug, zone)
  }
  return map
}

export async function resolveZoneSlug(slug: string) {
  const map = await fetchZonesMap()
  return map.get(slug) || null
}

// Las fichas viven en /club/la-santa, pero /club/<uuid> lleva indexado desde
// julio y no se retira nunca: la ruta acepta las dos formas y redirige la
// vieja a la nueva. De ahi que estos fetch resuelvan por id o por slug.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function isUuid(value: string) {
  return UUID_RE.test(value)
}

export async function fetchClub(idOrSlug: string) {
  const sb = getSupabaseClient()
  const { data, error } = await sb
    .from('clubs')
    .select('*')
    .eq(isUuid(idOrSlug) ? 'id' : 'slug', idOrSlug)
    .maybeSingle()
  if (error) {
    console.error('fetchClub error', error)
    return null
  }
  return (data as Club) || null
}

export async function fetchClubEvents(clubId: string, limit = 10) {
  const sb = getSupabaseClient()
  const nowIso = new Date().toISOString()
  let { data, error } = await sb
    .from('events_public')
    .select('*')
    .eq('club_id', clubId)
    .or(`end_at.gte.${nowIso},and(end_at.is.null,start_at.gte.${nowIso})`)
    .eq('status', 'published')
    .order('start_at', { ascending: true })
    .limit(limit)
  if (error && String(error.message || '').toLowerCase().includes('status')) {
    const retry = await sb
      .from('events_public')
      .select('*')
      .eq('club_id', clubId)
      .or(`end_at.gte.${nowIso},and(end_at.is.null,start_at.gte.${nowIso})`)
      .order('start_at', { ascending: true })
      .limit(limit)
    data = retry.data as any
    error = retry.error as any
  }
  if (error) {
    console.error('fetchClubEvents error', error)
    return []
  }
  return (data || []) as EventPublic[]
}

export async function fetchDj(idOrSlug: string) {
  const sb = getSupabaseClient()
  const { data, error } = await sb
    .from('djs')
    .select('id,slug,name,name_i18n,short_bio,short_bio_i18n,bio,bio_i18n,spotify_embed,genres,images,verified,socials')
    .eq(isUuid(idOrSlug) ? 'id' : 'slug', idOrSlug)
    .maybeSingle()
  if (error) { console.error('fetchDj error', error); return null }
  return data as any
}

export async function fetchDjEvents(djId: string, limit = 10) {
  const sb = getSupabaseClient()
  const nowIso = new Date().toISOString()
  const idsRes = await sb.from('event_djs').select('event_id').eq('dj_id', djId).order('position', { ascending: true })
  const ids = (idsRes.data || []).map((r: any) => r.event_id)
  if (!ids.length) return []
  let { data, error } = await sb
    .from('events_public')
    .select('*')
    .in('id', ids)
    .or(`end_at.gte.${nowIso},and(end_at.is.null,start_at.gte.${nowIso})`)
    .eq('status', 'published')
    .order('start_at', { ascending: true })
    .limit(limit)
  if (error && String(error.message || '').toLowerCase().includes('status')) {
    const retry = await sb
      .from('events_public')
      .select('*')
      .in('id', ids)
      .or(`end_at.gte.${nowIso},and(end_at.is.null,start_at.gte.${nowIso})`)
      .order('start_at', { ascending: true })
      .limit(limit)
    data = retry.data as any
    error = retry.error as any
  }
  if (error) { console.error('fetchDjEvents error', error); return [] }
  return (data || []) as EventPublic[]
}

// Ids de los DJ con al menos una sesion anunciada.
//
// Va en dos consultas para todo el catalogo, no una por DJ: quien pregunta
// esto es el sitemap, que tiene que decidir sobre ~200 fichas de una vez.
export async function fetchDjIdsWithUpcomingEvents(): Promise<Set<string>> {
  const sb = getSupabaseClient()
  const nowIso = new Date().toISOString()
  let { data: events, error } = await sb
    .from('events_public')
    .select('id')
    .or(`end_at.gte.${nowIso},and(end_at.is.null,start_at.gte.${nowIso})`)
    .eq('status', 'published')
    .limit(1000)
  if (error && String(error.message || '').toLowerCase().includes('status')) {
    const retry = await sb.from('events_public').select('id').or(`end_at.gte.${nowIso},and(end_at.is.null,start_at.gte.${nowIso})`).limit(1000)
    events = retry.data as any
    error = retry.error as any
  }
  if (error) { console.error('fetchDjIdsWithUpcomingEvents error', error); return new Set() }
  const ids = (events || []).map((e: any) => e.id)
  if (!ids.length) return new Set()
  const links = await sb.from('event_djs').select('dj_id').in('event_id', ids)
  if (links.error) { console.error('fetchDjIdsWithUpcomingEvents links error', links.error); return new Set() }
  return new Set((links.data || []).map((r: any) => r.dj_id).filter(Boolean))
}

// Line-ups de varios eventos de una vez.
//
// fetchEventLineup resuelve uno por consulta, que va bien en una ficha pero
// no en un listado de 30. Aqui interesa una sola consulta para toda la pagina.
export async function fetchLineupsForEvents(eventIds: string[]) {
  const out = new Map<string, Array<{ id: string; name: string }>>()
  if (!eventIds.length) return out
  const sb = getSupabaseClient()
  const { data, error } = await sb
    .from('event_djs')
    .select('event_id,position,djs(id,name)')
    .in('event_id', eventIds)
    .order('position', { ascending: true })
  if (error) { console.error('fetchLineupsForEvents error', error); return out }
  for (const row of (data || []) as any[]) {
    if (!row.djs?.id) continue
    const list = out.get(row.event_id) || []
    list.push({ id: row.djs.id, name: row.djs.name })
    out.set(row.event_id, list)
  }
  return out
}

export async function fetchSimilarDjs(currentId: string, genres: string[] | null | undefined, max = 1) {
  const sb = getSupabaseClient()
  const base = Array.isArray(genres) ? genres.filter(Boolean) : []
  // try overlap by genre
  let q = sb.from('djs').select('id,slug,name,genres,images').neq('id', currentId)
  if (base.length) {
    // overlap returns rows that share any of the provided genres
    q = (q as any).overlaps('genres', base)
  }
  let { data, error } = await q.limit(10)
  if (error) { console.error('fetchSimilarDjs error', error); return [] }
  let pool = (data || []) as any[]
  if (!pool.length) {
    // fallback: any other DJs
    const { data: anyDjs } = await sb.from('djs').select('id,slug,name,genres,images').neq('id', currentId).limit(10)
    pool = anyDjs || []
  }
  // pick up to max randomly
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]] }
  return pool.slice(0, Math.max(0, max))
}
