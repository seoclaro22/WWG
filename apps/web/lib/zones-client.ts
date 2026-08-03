"use client"
import { supabaseBrowser } from '@/lib/supabase-browser'
import { normalizeZoneKey } from '@/lib/zone-key'

const normalizeZone = normalizeZoneKey

export async function fetchKnownZones() {
  // Cliente compartido y no uno nuevo: ver lib/supabase-browser.ts. Se llama
  // desde la home y desde Filters en cada montaje.
  const sb = supabaseBrowser

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
