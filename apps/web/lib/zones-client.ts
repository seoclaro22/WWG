"use client"
import { createClient } from '@supabase/supabase-js'
import { normalizeZoneKey } from '@/lib/zone-key'

const normalizeZone = normalizeZoneKey

export async function fetchKnownZones() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [clubsRes, eventsRes] = await Promise.all([
    sb.from('clubs').select('zone').eq('status', 'approved').not('zone', 'is', null).limit(1000),
    sb.from('events_public').select('zone').not('zone', 'is', null).limit(1000),
  ])

  const rawZones = [
    ...((clubsRes.data || []) as Array<{ zone?: string | null }>),
    ...((eventsRes.data || []) as Array<{ zone?: string | null }>),
  ]

  const seen = new Set<string>()
  const zones: string[] = []

  for (const row of rawZones) {
    const zone = (row.zone || '').trim()
    if (!zone) continue
    const key = normalizeZone(zone)
    if (!key || seen.has(key)) continue
    seen.add(key)
    zones.push(zone)
  }

  return zones.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
}

// Se reexporta para no tocar los modulos que ya la importaban de aqui.
export { normalizeZoneKey }
