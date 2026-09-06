import { getSupabaseClient } from '@/lib/supabase'
import { isTimeoutError } from '@/lib/supabase-fetch'
import { cachedRead, dedupedRead } from '@/lib/query-cache'
import type { EventPublic, Club } from './types'
import { genreSlug } from '@/lib/hrefs'

// Columnas que necesita un LISTADO de eventos.
//
// Antes esto era select('*'), y el peso importaba: la vista pesa ~2,2 MB en
// 978 filas, y de los 2,2 KB de fila media 1,2 KB son description_i18n, que
// solo lee la ficha del evento. location y geo no los lee nadie en la web.
// Traerse y parsear esos tres campos en cada listado (y /discover llega a
// pedir el catalogo entero) era la mitad larga del trabajo de CPU de la
// pagina, para pintar tarjetas que usan seis campos.
//
// La ficha individual (fetchEvent) sigue con select('*') porque si necesita
// description_i18n.
const EVENT_LIST_COLUMNS =
  'id,slug,name,name_i18n,description,start_at,end_at,genres,sponsored,price_min,price_max,images,url_referral,status,created_at,club_id,club_name,club_slug,zone'

// Reintenta una consulta a Supabase cuando falla. La API de Supabase se ha
// visto devolver un 522 de Cloudflare (gateway timeout) de forma puntual;
// sin reintento eso tumbaba fetchDj/countUpcomingEvents/countClubs/countDjs
// entera, dejando la pagina vacia o en 404 justo cuando Google la rastreaba.
//
// Lo que no se reintenta es el tiempo agotado (ver lib/supabase-fetch.ts): si
// la API no contesta en 6 s, insistir solo multiplica por tres lo que tarda en
// rendirse la funcion, que es justo lo que disparo la factura de CPU.
async function withRetry<T extends { error: any }>(run: () => PromiseLike<T>, attempts = 2, baseDelayMs = 250): Promise<T> {
  let result = await run()
  for (let i = 1; i < attempts && result.error; i++) {
    if (isTimeoutError(result.error)) break
    await new Promise((r) => setTimeout(r, baseDelayMs * i))
    result = await run()
  }
  return result
}

// PostgREST recibe los filtros en la URL, asi que un .in('id', [...]) con
// muchos UUID acaba en una peticion que el servidor rechaza entera:
//
//   HeadersOverflowError ... Your request URL is 16935 characters
//
// Pasaba de verdad en produccion, no en teoria: el sitemap de DJs (hasta 1000
// ids) y los line-ups de /discover (hasta 600) fallaban asi, y como el error
// se resolvia devolviendo vacio, el sitemap salia sin fichas de DJ y las
// tarjetas sin cartel, en silencio. 150 ids por tanda deja la URL sobre 6 KB.
const IN_CHUNK_SIZE = 150

function chunk<T>(items: T[], size = IN_CHUNK_SIZE): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

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
//
// Ademas de eso, el listado general (y la pagina "hoy") dan un margen tras
// el end_at antes de retirar el evento: alguien mirando el sabado de
// madrugada (justo cuando termino la fiesta del viernes) tiene que poder
// seguir viendola, no que desaparezca en el segundo exacto en que acaba.
const GRACE_MS = 15 * 60 * 60 * 1000

function applyStillOnFilter<T extends { or: (s: string) => T }>(q: T, effectiveFrom: string, graceMs = 0): T {
  const cutoff = graceMs ? new Date(new Date(effectiveFrom).getTime() - graceMs).toISOString() : effectiveFrom
  return q.or(`end_at.gte.${cutoff},and(end_at.is.null,start_at.gte.${cutoff})`)
}

// Un evento "vie 00:00" es, para quien mira el listado, el cierre de la
// noche del viernes, no la apertura del sabado: tiene que salir despues del
// ultimo evento etiquetado "viernes" y antes del primero etiquetado
// "sabado", aunque cronologicamente las 00:00 sean anteriores a las 23:45
// del mismo dia. Sumar 24h a la hora de cualquier evento de madrugada
// (00:00-05:59) lo manda al final de SU PROPIO dia mostrado sin tocar
// start_at ni la fecha/hora que se ensena.
function displayOrderKey(iso: string): number {
  const ms = new Date(iso).getTime()
  const hour = new Date(iso).getUTCHours()
  return hour < 6 ? ms + 24 * 60 * 60 * 1000 : ms
}

export type FetchEventsParams = {
  q?: string
  limit?: number
  from?: string
  to?: string
  genre?: string
  zone?: string
  sponsoredFirst?: boolean
  grace?: boolean
}

async function loadEvents(params: FetchEventsParams): Promise<EventPublic[]> {
  const sb = getSupabaseClient()
  const effectiveFrom = normalizeEventFromDate(params?.from)
  let q = sb.from('events_public').select(EVENT_LIST_COLUMNS)
  if (params?.sponsoredFirst) {
    q = q.order('sponsored', { ascending: false }).order('start_at', { ascending: true })
  } else {
    q = q.order('start_at', { ascending: true })
  }
  if (params?.q) {
    // Búsqueda simple por nombre/desc/club
    q = q.or(`name.ilike.%${params.q}%,description.ilike.%${params.q}%,club_name.ilike.%${params.q}%`)
  }
  // Con "to" la llamada pide una ventana concreta (hoy, fin de semana, un dia
  // del calendario). Por defecto ahi no hay margen para no desvirtuar la
  // ventana, salvo que el llamador pida explicitamente "grace: true" (la
  // pagina "hoy", que si debe incluir la cola de la noche anterior).
  // Sin "to" es el listado general, donde el margen aplica siempre.
  const applyGrace = params?.grace ?? !params?.to
  q = applyStillOnFilter(q, effectiveFrom, applyGrace ? GRACE_MS : 0)
  if (params?.to) q = q.lte('start_at', params.to)
  if (params?.genre) q = q.contains('genres', [params.genre])
  if (params?.zone) q = (q as any).eq('zone', params.zone)
  q = (q as any).eq('status', 'published')
  // Sin limit aqui: el orden final (displayOrderKey) puede mover eventos de
  // madrugada al final de su dia, asi que el recorte se hace despues de
  // reordenar, no antes.
  let { data, error } = await q
  if (error) {
    const msg = String(error.message || '').toLowerCase()
    const zoneMissing = msg.includes('zone')
    const statusMissing = msg.includes('status')
    const sponsoredMissing = msg.includes('sponsored')
    if (zoneMissing || statusMissing || sponsoredMissing) {
      // Fallback si alguna columna no existe en la vista. Aqui vuelve el
      // select('*'): si la lista explicita de columnas es lo que ha fallado,
      // pedirla otra vez fallaria igual.
      let retryQ = sb.from('events_public').select('*')
      if (params?.sponsoredFirst && !sponsoredMissing) {
        retryQ = retryQ.order('sponsored', { ascending: false }).order('start_at', { ascending: true })
      } else {
        retryQ = retryQ.order('start_at', { ascending: true })
      }
      if (params?.q) {
        retryQ = retryQ.or(`name.ilike.%${params.q}%,description.ilike.%${params.q}%,club_name.ilike.%${params.q}%`)
      }
      retryQ = applyStillOnFilter(retryQ, effectiveFrom, applyGrace ? GRACE_MS : 0)
      if (params?.to) retryQ = retryQ.lte('start_at', params.to)
      if (params?.genre) retryQ = retryQ.contains('genres', [params.genre])
      if (params?.zone && !zoneMissing) retryQ = (retryQ as any).eq('zone', params.zone)
      if (!statusMissing) retryQ = (retryQ as any).eq('status', 'published')
      const retry = await retryQ
      data = retry.data as any
      error = retry.error as any
    }
  }
  // Lanza en vez de devolver []: un fallo cacheado dejaria la web vacia
  // durante todo el TTL. Ver lib/query-cache.ts.
  if (error) throw error
  let events = (data || []) as unknown as EventPublic[]
  events = events
    .map((e, i) => ({ e, i }))
    .sort((a, b) => {
      if (params?.sponsoredFirst) {
        const sa = a.e.sponsored ? 0 : 1
        const sb = b.e.sponsored ? 0 : 1
        if (sa !== sb) return sa - sb
      }
      const ka = displayOrderKey(a.e.start_at)
      const kb = displayOrderKey(b.e.start_at)
      if (ka !== kb) return ka - kb
      return a.i - b.i
    })
    .map(({ e }) => e)
  if (params?.limit) events = events.slice(0, params.limit)
  return events
}

const readEvents = cachedRead('db-events', loadEvents)

export async function fetchEvents(params?: FetchEventsParams) {
  try {
    return await readEvents(params || {})
  } catch (error) {
    console.error('fetchEvents error', error)
    return [] as EventPublic[]
  }
}

async function loadUpcomingEventCount(params: { zone?: string }): Promise<number> {
  const sb = getSupabaseClient()
  const nowIso = new Date().toISOString()
  const buildQuery = () => {
    let q = applyStillOnFilter(sb.from('events_public').select('id', { count: 'exact', head: true }) as any, nowIso, GRACE_MS)
    if (params?.zone) q = (q as any).eq('zone', params.zone)
    q = (q as any).eq('status', 'published')
    return q
  }
  let { count, error } = await withRetry<{ count: number | null; error: any }>(buildQuery)
  if (error && !isTimeoutError(error)) {
    // Fallback si status/zone no existen en la vista
    const retry = await withRetry<{ count: number | null; error: any }>(() => applyStillOnFilter(sb.from('events_public').select('id', { count: 'exact', head: true }) as any, nowIso, GRACE_MS))
    count = retry.count
    error = retry.error
  }
  if (error) throw error
  return count || 0
}

const readUpcomingEventCount = cachedRead('db-events-count', loadUpcomingEventCount)

export async function countUpcomingEvents(params?: { zone?: string }) {
  try {
    return await readUpcomingEventCount(params || {})
  } catch (error) {
    console.error('countUpcomingEvents error', error)
    return 0
  }
}

// Mismo patron que countUpcomingEvents, para el numero que acompana a las
// pestanas "Clubs" y "DJs" de /discover (antes solo la de eventos lo tenia).
async function loadClubCount(params: { zone?: string }): Promise<number> {
  const sb = getSupabaseClient()
  const { count, error } = await withRetry<{ count: number | null; error: any }>(() => {
    let q = sb.from('clubs').select('id', { count: 'exact', head: true }).eq('status', 'approved')
    if (params?.zone) {
      // Igual que fetchClubsPublic: un club sin zona asignada no debe
      // desaparecer del conteo solo por no tener ese dato.
      q = (q as any).or(`zone.eq.${params.zone},zone.is.null`)
    }
    return q as any
  })
  if (error) throw error
  return count || 0
}

const readClubCount = cachedRead('db-clubs-count', loadClubCount)

export async function countClubs(params?: { zone?: string }) {
  try {
    return await readClubCount(params || {})
  } catch (error) {
    console.error('countClubs error', error)
    return 0
  }
}

// Los DJs no tienen zona (son globales), asi que aqui no hay filtro que
// aplicar: el total es el mismo se mire desde la ciudad que se mire.
const readDjCount = cachedRead('db-djs-count', async (_params: Record<string, never>): Promise<number> => {
  const sb = getSupabaseClient()
  const { count, error } = await withRetry<{ count: number | null; error: any }>(() => sb.from('djs').select('id', { count: 'exact', head: true }))
  if (error) throw error
  return count || 0
})

export async function countDjs() {
  try {
    return await readDjCount({})
  } catch (error) {
    console.error('countDjs error', error)
    return 0
  }
}

// Generos con eventos proximos en una zona, y cuantos. Alimenta tanto los
// enlaces internos de /[zona] como el sitemap: solo se publica el cruce
// zona x genero que tiene agenda real detras.
//
// Se apoya en fetchEvents, que ya esta cacheado: la pagina de zona pide
// exactamente los mismos eventos aqui y en fetchZoneFacts, y con la cache esa
// consulta sale una sola vez.
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

// Inversa de fetchZoneGenreCounts: para un genero, cuantos eventos proximos
// tiene en cada zona. Alimenta el bloque de "genero en cada ciudad" de
// /genre/[name], que hasta ahora no enlazaba hacia ningun cruce zona x
// genero y dejaba la pagina con mas trafico potencial sin salida interna.
export async function fetchGenreZoneCounts(genre: string) {
  const zonesMap = await fetchZonesMap()
  const zones = Array.from(zonesMap.entries())
  const counts = await Promise.all(
    zones.map(([, name]) => fetchEvents({ zone: name, genre, limit: 500 })),
  )
  return zones
    .map(([slug, name], i) => ({ slug, name, count: counts[i].length }))
    .filter((z) => z.count > 0)
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
const readGenreExists = cachedRead('db-genre-exists', async ({ genre }: { genre: string }): Promise<boolean> => {
  const sb = getSupabaseClient()
  const [events, djs] = await Promise.all([
    (sb.from('events').select('id', { count: 'exact', head: true }) as any).contains('genres', [genre]),
    (sb.from('djs').select('id', { count: 'exact', head: true }) as any).contains('genres', [genre]),
  ])
  if (events.error) throw events.error
  if (djs.error) throw djs.error
  return (events.count || 0) > 0 || (djs.count || 0) > 0
}, 300)

export async function genreExists(genre: string) {
  try {
    return await readGenreExists({ genre })
  } catch (error) {
    console.error('genreExists error', error)
    // Ante un fallo de la base no se convierte en 404 una pagina que puede
    // existir: se deja pasar y como mucho se sirve vacia.
    return true
  }
}

const readClubsPublic = cachedRead('db-clubs', async (params: { q?: string; limit?: number; zone?: string; genre?: string }): Promise<any[]> => {
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
  if (error) throw error
  return (data || []) as any[]
})

export async function fetchClubsPublic(params?: { q?: string; limit?: number; zone?: string; genre?: string }) {
  try {
    return await readClubsPublic(params || {})
  } catch (error) {
    console.error('fetchClubsPublic error', error)
    return [] as any[]
  }
}

const readDjsPublic = cachedRead('db-djs', async (params: { q?: string; limit?: number; genre?: string }): Promise<any[]> => {
  const sb = getSupabaseClient()
  let q = sb
    .from('djs')
    .select('id,slug,name,name_i18n,short_bio,short_bio_i18n,bio,bio_i18n,genres,images,verified')
    .order('name', { ascending: true })
  if (params?.q) q = q.ilike('name', `%${params.q}%`)
  if (params?.genre) q = (q as any).contains('genres', [params.genre])
  if (params?.limit) q = q.limit(params.limit)
  const { data, error } = await q
  if (error) throw error
  return (data || []) as any[]
})

export async function fetchDjsPublic(params?: { q?: string; limit?: number; genre?: string }) {
  try {
    return await readDjsPublic(params || {})
  } catch (error) {
    console.error('fetchDjsPublic error', error)
    return [] as any[]
  }
}

const readEvent = cachedRead('db-event', async ({ idOrSlug }: { idOrSlug: string }): Promise<EventPublic | null> => {
  const sb = getSupabaseClient()
  const campo = isUuid(idOrSlug) ? 'id' : 'slug'
  let { data, error } = await sb.from('events_public').select('*').eq(campo, idOrSlug).eq('status', 'published').maybeSingle()
  if (error && String(error.message || '').toLowerCase().includes('status')) {
    const retry = await sb.from('events_public').select('*').eq(campo, idOrSlug).maybeSingle()
    data = retry.data as any
    error = retry.error as any
  }
  if (error) throw error
  return (data as EventPublic) || null
})

export async function fetchEvent(idOrSlug: string) {
  try {
    return await readEvent({ idOrSlug })
  } catch (error) {
    console.error('fetchEvent error', error)
    return null
  }
}

const readEventLineup = cachedRead('db-event-lineup', async ({ eventId }: { eventId: string }): Promise<any[]> => {
  const sb = getSupabaseClient()
  const { data, error } = await sb
    .from('event_djs')
    .select('position,djs(id,slug,name,name_i18n,spotify_embed,images)')
    .eq('event_id', eventId)
    .order('position', { ascending: true })
  if (error) throw error
  return (data || []).map((r: any) => ({
    id: r.djs?.id,
    slug: r.djs?.slug || null,
    name: r.djs?.name,
    name_i18n: r.djs?.name_i18n || null,
    spotify_embed: r.djs?.spotify_embed || null,
    images: r.djs?.images || null,
    position: r.position
  }))
})

export async function fetchEventLineup(eventId: string) {
  try {
    return await readEventLineup({ eventId })
  } catch (error) {
    console.error('fetchEventLineup error', error)
    return [] as any[]
  }
}

const readRelatedEvents = dedupedRead(async ({ eventId, genres, zone, limit }: { eventId: string; genres: string[] | null | undefined; zone: string | null | undefined; limit: number }) => {
  const sb = getSupabaseClient()
  const nowIso = new Date().toISOString()
  const base = () => {
    let q = sb.from('events_public').select(EVENT_LIST_COLUMNS).neq('id', eventId).or(`end_at.gte.${nowIso},and(end_at.is.null,start_at.gte.${nowIso})`).order('start_at', { ascending: true }).limit(limit)
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
})

export async function fetchRelatedEvents(eventId: string, genres: string[] | null | undefined, zone: string | null | undefined, limit = 4) {
  try {
    return await readRelatedEvents({ eventId, genres: genres || null, zone: zone || null, limit })
  } catch (error) {
    console.error('fetchRelatedEvents error', error)
    return [] as any[]
  }
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

// slug -> nombre real del genero ("global-hits" -> "Global Hits").
//
// Se construye de los mismos datos que mira genreExists (eventos y DJs) y no
// de la tabla `genres`: hay generos usados en eventos que no estan dados de
// alta ahi, y esas paginas ya devolvian 200 antes de este cambio. Resolver
// solo por la tabla las habria convertido en 404.
//
// Lo que se cachea son los nombres en crudo, no el Map: el Data Cache guarda
// JSON, y un Map no sobrevive a esa ida y vuelta.
const readGenreNames = cachedRead('db-genre-names', async (_p: Record<string, never>): Promise<string[]> => {
  const sb = getSupabaseClient()
  const [eventsRes, djsRes] = await Promise.all([
    sb.from('events').select('genres').not('genres', 'is', null).limit(2000),
    sb.from('djs').select('genres').not('genres', 'is', null).limit(1000),
  ])
  if (eventsRes.error) throw eventsRes.error
  if (djsRes.error) throw djsRes.error
  const rows = [...(eventsRes.data || []), ...(djsRes.data || [])] as Array<{ genres?: string[] | null }>
  const names: string[] = []
  for (const row of rows) for (const raw of row.genres || []) names.push(String(raw))
  return names
}, 300)

export async function fetchGenresMap() {
  const map = new Map<string, string>()
  let names: string[] = []
  try {
    names = await readGenreNames({})
  } catch (error) {
    console.error('fetchGenresMap error', error)
    return map
  }
  for (const raw of names) {
    const name = raw.trim()
    if (!name) continue
    const slug = genreSlug(name)
    if (!slug || map.has(slug)) continue
    map.set(slug, name)
  }
  return map
}

export async function resolveGenreSlug(slug: string) {
  return (await fetchGenresMap()).get(slug) || null
}

const readZoneNames = cachedRead('db-zone-names', async (_p: Record<string, never>): Promise<string[]> => {
  const sb = getSupabaseClient()
  const [clubsRes, eventsRes] = await Promise.all([
    sb.from('clubs').select('zone').eq('status', 'approved').not('zone', 'is', null).limit(1000),
    sb.from('events_public').select('zone').not('zone', 'is', null).limit(1000),
  ])
  if (clubsRes.error) throw clubsRes.error
  if (eventsRes.error) throw eventsRes.error
  const rows = [...(clubsRes.data || []), ...(eventsRes.data || [])] as Array<{ zone?: string | null }>
  return rows.map((row) => row.zone || '').filter(Boolean)
}, 300)

export async function fetchZonesMap() {
  const map = new Map<string, string>()
  let zones: string[] = []
  try {
    zones = await readZoneNames({})
  } catch (error) {
    console.error('fetchZonesMap error', error)
    return map
  }
  for (const raw of zones) {
    const zone = raw.trim()
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

// Un evento cuya URL sigue viva pero ya paso por archive_old_events(): no
// esta en `events` ni en events_public, asi que fetchEvent devuelve null y
// la ficha caia en un 404 seco. events_archive_public da lo justo (club_id)
// para mandar a la ficha del club en su lugar. Requiere haber aplicado
// supabase/fix-archive-images.sql; si esa vista no existe todavia esto
// simplemente no encuentra nada y la pagina sigue cayendo en 404 como antes.
export async function fetchArchivedEventClub(idOrSlug: string) {
  const sb = getSupabaseClient()
  const { data, error } = await sb
    .from('events_archive_public')
    .select('club_id')
    .eq(isUuid(idOrSlug) ? 'id' : 'slug', idOrSlug)
    .maybeSingle()
  if (error) return null
  return (data as { club_id: string | null } | null)?.club_id || null
}

const readClub = cachedRead('db-club', async ({ idOrSlug }: { idOrSlug: string }): Promise<Club | null> => {
  const sb = getSupabaseClient()
  const { data, error } = await sb
    .from('clubs')
    .select('*')
    .eq(isUuid(idOrSlug) ? 'id' : 'slug', idOrSlug)
    .maybeSingle()
  if (error) throw error
  return (data as Club) || null
})

export async function fetchClub(idOrSlug: string) {
  try {
    return await readClub({ idOrSlug })
  } catch (error) {
    console.error('fetchClub error', error)
    return null
  }
}

const readClubEvents = cachedRead('db-club-events', async ({ clubId, limit }: { clubId: string; limit: number }): Promise<EventPublic[]> => {
  const sb = getSupabaseClient()
  const nowIso = new Date().toISOString()
  let { data, error } = await sb
    .from('events_public')
    .select(EVENT_LIST_COLUMNS)
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
  if (error) throw error
  return (data || []) as unknown as EventPublic[]
})

export async function fetchClubEvents(clubId: string, limit = 10) {
  try {
    return await readClubEvents({ clubId, limit })
  } catch (error) {
    console.error('fetchClubEvents error', error)
    return [] as EventPublic[]
  }
}

const readDj = cachedRead('db-dj', async ({ idOrSlug }: { idOrSlug: string }): Promise<any> => {
  const sb = getSupabaseClient()
  const { data, error } = await withRetry(() =>
    sb
      .from('djs')
      .select('id,slug,name,name_i18n,short_bio,short_bio_i18n,bio,bio_i18n,spotify_embed,genres,images,verified,socials')
      .eq(isUuid(idOrSlug) ? 'id' : 'slug', idOrSlug)
      .maybeSingle()
  )
  if (error) throw error
  return data as any
})

export async function fetchDj(idOrSlug: string) {
  try {
    return await readDj({ idOrSlug })
  } catch (error) {
    console.error('fetchDj error', error)
    return null
  }
}

const readDjEvents = cachedRead('db-dj-events', async ({ djId, limit }: { djId: string; limit: number }): Promise<EventPublic[]> => {
  const sb = getSupabaseClient()
  const nowIso = new Date().toISOString()
  const idsRes = await sb.from('event_djs').select('event_id').eq('dj_id', djId).order('position', { ascending: true })
  if (idsRes.error) throw idsRes.error
  const ids = (idsRes.data || []).map((r: any) => r.event_id)
  if (!ids.length) return []
  let { data, error } = await sb
    .from('events_public')
    .select(EVENT_LIST_COLUMNS)
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
  if (error) throw error
  return (data || []) as unknown as EventPublic[]
})

export async function fetchDjEvents(djId: string, limit = 10) {
  try {
    return await readDjEvents({ djId, limit })
  } catch (error) {
    console.error('fetchDjEvents error', error)
    return [] as EventPublic[]
  }
}

// Ids de los DJ con al menos una sesion anunciada.
//
// Va en dos consultas para todo el catalogo, no una por DJ: quien pregunta
// esto es el sitemap, que tiene que decidir sobre ~200 fichas de una vez.
// Los clubs que tienen agenda anunciada, en una sola consulta. Es lo que
// distingue una ficha nuestra de la de Google Maps, y por tanto el primer
// criterio de clubIsIndexable.
const readClubIdsWithUpcomingEvents = cachedRead('db-club-ids-upcoming', async (_p: Record<string, never>): Promise<string[]> => {
  const sb = getSupabaseClient()
  const nowIso = new Date().toISOString()
  let { data, error } = await sb
    .from('events_public')
    .select('club_id')
    .not('club_id', 'is', null)
    .or(`end_at.gte.${nowIso},and(end_at.is.null,start_at.gte.${nowIso})`)
    .eq('status', 'published')
    .limit(2000)
  // Mismo respaldo que el resto de consultas a events_public: la vista no
  // siempre expone `status`.
  if (error && String(error.message || '').toLowerCase().includes('status')) {
    const retry = await sb
      .from('events_public')
      .select('club_id')
      .not('club_id', 'is', null)
      .or(`end_at.gte.${nowIso},and(end_at.is.null,start_at.gte.${nowIso})`)
      .limit(2000)
    data = retry.data as any
    error = retry.error as any
  }
  if (error) throw error
  return (data || []).map((e: any) => e.club_id).filter(Boolean)
}, 300)

export async function fetchClubIdsWithUpcomingEvents(): Promise<Set<string>> {
  try {
    return new Set(await readClubIdsWithUpcomingEvents({}))
  } catch (error) {
    console.error('fetchClubIdsWithUpcomingEvents error', error)
    return new Set()
  }
}

const readDjIdsWithUpcomingEvents = cachedRead('db-dj-ids-upcoming', async (_p: Record<string, never>): Promise<string[]> => {
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
  if (error) throw error
  const ids = (events || []).map((e: any) => e.id)
  if (!ids.length) return []
  const batches = await Promise.all(
    chunk(ids).map((slice) => sb.from('event_djs').select('dj_id').in('event_id', slice)),
  )
  const djIds: string[] = []
  for (const links of batches) {
    if (links.error) throw links.error
    for (const r of (links.data || []) as any[]) if (r.dj_id) djIds.push(r.dj_id)
  }
  return djIds
}, 300)

export async function fetchDjIdsWithUpcomingEvents(): Promise<Set<string>> {
  try {
    return new Set(await readDjIdsWithUpcomingEvents({}))
  } catch (error) {
    console.error('fetchDjIdsWithUpcomingEvents error', error)
    return new Set()
  }
}

// Line-ups de varios eventos de una vez.
//
// fetchEventLineup resuelve uno por consulta, que va bien en una ficha pero
// no en un listado de 30. Aqui interesa una sola consulta para toda la pagina.
const readLineups = cachedRead('db-lineups', async ({ ids }: { ids: string[] }): Promise<Array<{ event_id: string; id: string; name: string }>> => {
  const sb = getSupabaseClient()
  const batches = await Promise.all(
    chunk(ids).map((slice) =>
      sb
        .from('event_djs')
        .select('event_id,position,djs(id,name)')
        .in('event_id', slice)
        .order('position', { ascending: true }),
    ),
  )
  const rows: Array<{ event_id: string; id: string; name: string }> = []
  for (const batch of batches) {
    if (batch.error) throw batch.error
    for (const row of (batch.data || []) as any[]) {
      if (!row.djs?.id) continue
      rows.push({ event_id: row.event_id, id: row.djs.id, name: row.djs.name })
    }
  }
  return rows
})

export async function fetchLineupsForEvents(eventIds: string[]) {
  const out = new Map<string, Array<{ id: string; name: string }>>()
  if (!eventIds.length) return out
  let rows: Array<{ event_id: string; id: string; name: string }> = []
  try {
    // Ordenados para que la clave de cache no dependa del orden en que llegue
    // el listado.
    rows = await readLineups({ ids: [...eventIds].sort() })
  } catch (error) {
    console.error('fetchLineupsForEvents error', error)
    return out
  }
  for (const row of rows) {
    const list = out.get(row.event_id) || []
    list.push({ id: row.id, name: row.name })
    out.set(row.event_id, list)
  }
  return out
}

// Sin cache entre peticiones a proposito: la gracia es que la seleccion varie.
const readSimilarDjPool = dedupedRead(async ({ currentId, genres }: { currentId: string; genres: string[] }): Promise<any[]> => {
  const sb = getSupabaseClient()
  // try overlap by genre
  let q = sb.from('djs').select('id,slug,name,genres,images').neq('id', currentId)
  if (genres.length) {
    // overlap returns rows that share any of the provided genres
    q = (q as any).overlaps('genres', genres)
  }
  const { data, error } = await q.limit(10)
  if (error) throw error
  let pool = (data || []) as any[]
  if (!pool.length) {
    // fallback: any other DJs
    const { data: anyDjs } = await sb.from('djs').select('id,slug,name,genres,images').neq('id', currentId).limit(10)
    pool = anyDjs || []
  }
  return pool
})

export async function fetchSimilarDjs(currentId: string, genres: string[] | null | undefined, max = 1) {
  const base = Array.isArray(genres) ? genres.filter(Boolean) : []
  let pool: any[] = []
  try {
    pool = [...(await readSimilarDjPool({ currentId, genres: base }))]
  } catch (error) {
    console.error('fetchSimilarDjs error', error)
    return [] as any[]
  }
  // pick up to max randomly
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]] }
  return pool.slice(0, Math.max(0, max))
}
