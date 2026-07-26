import { getSupabaseClient } from '@/lib/supabase'
import type { EventPublic, Club } from './types'

function normalizeEventFromDate(from?: string) {
  const now = new Date()
  if (!from) return now.toISOString()
  const parsed = new Date(from)
  if (Number.isNaN(parsed.getTime()) || parsed < now) return now.toISOString()
  return from
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
  q = q.gte('start_at', effectiveFrom)
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
      retryQ = retryQ.gte('start_at', effectiveFrom)
      if (params?.to) retryQ = retryQ.lte('start_at', params.to)
      if (params?.genre) retryQ = retryQ.contains('genres', [params.genre])
      if (params?.zone && !zoneMissing) retryQ = (retryQ as any).eq('zone', params.zone)
      if (!statusMissing) retryQ = (retryQ as any).eq('status', 'published')
      retryQ = retryQ.limit(params?.limit || 100)
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
  let q = sb.from('events_public').select('id', { count: 'exact', head: true }).gte('start_at', nowIso)
  if (params?.zone) q = (q as any).eq('zone', params.zone)
  q = (q as any).eq('status', 'published')
  let { count, error } = await q
  if (error) {
    // Fallback si status/zone no existen en la vista
    const retry = await sb.from('events_public').select('id', { count: 'exact', head: true }).gte('start_at', nowIso)
    count = retry.count
    error = retry.error
  }
  if (error) {
    console.error('countUpcomingEvents error', error)
    return 0
  }
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
    .select('id,name,name_i18n,short_bio,short_bio_i18n,bio,bio_i18n,genres,images')
    .order('name', { ascending: true })
  if (params?.q) q = q.ilike('name', `%${params.q}%`)
  if (params?.genre) q = (q as any).contains('genres', [params.genre])
  if (params?.limit) q = q.limit(params.limit)
  const { data, error } = await q
  if (error) { console.error('fetchDjsPublic error', error); return [] }
  return (data || []) as any[]
}

export async function fetchEvent(id: string) {
  const sb = getSupabaseClient()
  let { data, error } = await sb.from('events_public').select('*').eq('id', id).eq('status', 'published').maybeSingle()
  if (error && String(error.message || '').toLowerCase().includes('status')) {
    const retry = await sb.from('events_public').select('*').eq('id', id).maybeSingle()
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
    .select('position,djs(id,name,name_i18n,spotify_embed,images)')
    .eq('event_id', eventId)
    .order('position', { ascending: true })
  if (error) { console.error('fetchEventLineup error', error); return [] }
  return (data || []).map((r: any) => ({
    id: r.djs?.id,
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
    let q = sb.from('events_public').select('*').neq('id', eventId).gte('start_at', nowIso).order('start_at', { ascending: true }).limit(limit)
    q = (q as any).eq('status', 'published')
    return q
  }
  if (genres && genres.length) {
    const { data } = await (base() as any).overlaps('genres', genres)
    if (data?.length) return data as any[]
  }
  if (zone) {
    const { data } = await (base() as any).eq('zone', zone)
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

export async function fetchClub(id: string) {
  const sb = getSupabaseClient()
  const { data, error } = await sb
    .from('clubs')
    .select('*')
    .eq('id', id)
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
    .gte('start_at', nowIso)
    .eq('status', 'published')
    .order('start_at', { ascending: true })
    .limit(limit)
  if (error && String(error.message || '').toLowerCase().includes('status')) {
    const retry = await sb
      .from('events_public')
      .select('*')
      .eq('club_id', clubId)
      .gte('start_at', nowIso)
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

export async function fetchDj(id: string) {
  const sb = getSupabaseClient()
  const { data, error } = await sb
    .from('djs')
    .select('id,name,name_i18n,short_bio,short_bio_i18n,bio,bio_i18n,spotify_embed,genres,images')
    .eq('id', id)
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
    .gte('start_at', nowIso)
    .eq('status', 'published')
    .order('start_at', { ascending: true })
    .limit(limit)
  if (error && String(error.message || '').toLowerCase().includes('status')) {
    const retry = await sb
      .from('events_public')
      .select('*')
      .in('id', ids)
      .gte('start_at', nowIso)
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
    .gte('start_at', nowIso)
    .eq('status', 'published')
    .limit(1000)
  if (error && String(error.message || '').toLowerCase().includes('status')) {
    const retry = await sb.from('events_public').select('id').gte('start_at', nowIso).limit(1000)
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
  let q = sb.from('djs').select('id,name,genres,images').neq('id', currentId)
  if (base.length) {
    // overlap returns rows that share any of the provided genres
    q = (q as any).overlaps('genres', base)
  }
  let { data, error } = await q.limit(10)
  if (error) { console.error('fetchSimilarDjs error', error); return [] }
  let pool = (data || []) as any[]
  if (!pool.length) {
    // fallback: any other DJs
    const { data: anyDjs } = await sb.from('djs').select('id,name,genres,images').neq('id', currentId).limit(10)
    pool = anyDjs || []
  }
  // pick up to max randomly
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]] }
  return pool.slice(0, Math.max(0, max))
}
