import { getSupabaseClient } from '@/lib/supabase'
import type { EventPublic, Club } from './types'

function normalizeEventFromDate(from?: string) {
  const now = new Date()
  if (!from) return now.toISOString()
  const parsed = new Date(from)
  if (Number.isNaN(parsed.getTime()) || parsed < now) return now.toISOString()
  return from
}

export async function fetchEvents(params?: { q?: string; limit?: number; from?: string; to?: string; genre?: string; zone?: string }) {
  const sb = getSupabaseClient()
  const effectiveFrom = normalizeEventFromDate(params?.from)
  let q = sb.from('events_public').select('*').order('start_at', { ascending: true })
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
    if (zoneMissing || statusMissing) {
      // Fallback si alguna columna no existe en la vista
      let retryQ = sb.from('events_public').select('*').order('start_at', { ascending: true })
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
    .select('position,djs(id,name,name_i18n,spotify_embed)')
    .eq('event_id', eventId)
    .order('position', { ascending: true })
  if (error) { console.error('fetchEventLineup error', error); return [] }
  return (data || []).map((r: any) => ({
    id: r.djs?.id,
    name: r.djs?.name,
    name_i18n: r.djs?.name_i18n || null,
    spotify_embed: r.djs?.spotify_embed || null,
    position: r.position
  }))
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
