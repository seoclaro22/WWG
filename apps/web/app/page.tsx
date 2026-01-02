"use client"
import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@supabase/supabase-js'

type GeoStatus = 'idle' | 'locating' | 'success' | 'error'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

const normalizeZoneKey = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
    if (!res.ok) return null
    const json = await res.json()
    const city = json?.address?.city || json?.address?.town || json?.address?.village || json?.address?.county
    const state = json?.address?.state || ''
    const country = json?.address?.country || ''
    const parts = [city, state, country].filter(Boolean)
    return parts[0] ? parts.slice(0, 2).join(', ') : null
  } catch {
    return null
  }
}

export default function LandingPage() {
  const { t } = useI18n()
  const router = useRouter()
  const [zone, setZone] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle')
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const presetZones = ['Palma de Mallorca', 'Mallorca', 'Ibiza', 'Barcelona', 'Madrid']

  const normalizeZone = (raw: string) => {
    const cleaned = raw.trim()
    const lc = cleaned.toLowerCase()
    if (lc === 'palma' || (lc.startsWith('palma') && !lc.includes('mallorca'))) return 'Palma de Mallorca'
    if (lc === 'palma de mallorca') return 'Palma de Mallorca'
    return cleaned
  }

  useEffect(() => {
    // Precargar la ultima zona usada para que el usuario pueda lanzar rapido
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nighthub-zone') || ''
      if (saved) setZone(saved)
    }
  }, [])

  async function resolveZoneWithFallback(zoneName: string) {
    const client = sb()
    const nowIso = new Date().toISOString()
    const { data, error } = await client
      .from('events_public')
      .select('zone')
      .gte('start_at', nowIso)
      .not('zone', 'is', null)
      .limit(1000)
    if (error) {
      const msg = String((error as any)?.message || '').toLowerCase()
      if (msg.includes('zone')) {
        return { zone: zoneName, fallback: null, hasEvents: true }
      }
      return { zone: zoneName, fallback: null, hasEvents: false }
    }

    const counts = new Map<string, number>()
    const labelByKey = new Map<string, string>()
    for (const row of (data || []) as any[]) {
      const z = (row.zone || '').toString().trim()
      if (!z) continue
      const key = normalizeZoneKey(z)
      if (!key) continue
      const next = (counts.get(key) || 0) + 1
      counts.set(key, next)
      if (!labelByKey.has(key)) labelByKey.set(key, z)
    }

    const inputKey = normalizeZoneKey(zoneName)
    const inputCount = counts.get(inputKey) || 0
    if (inputCount > 0) {
      return { zone: labelByKey.get(inputKey) || zoneName, fallback: null, hasEvents: true }
    }

    let bestKey = ''
    let bestCount = 0
    for (const [key, count] of counts.entries()) {
      if (count > bestCount) {
        bestCount = count
        bestKey = key
      }
    }
    if (bestKey) {
      const fallback = labelByKey.get(bestKey) || zoneName
      return { zone: fallback, fallback, hasEvents: false }
    }
    return { zone: zoneName, fallback: null, hasEvents: false }
  }

  async function goToDiscover(targetZone: string) {
    const cleaned = normalizeZone(targetZone)
    if (!cleaned) {
      setStatusMsg(t('landing.error_empty'))
      return
    }
    const resolved = await resolveZoneWithFallback(cleaned)
    if (typeof window !== 'undefined') {
      localStorage.setItem('nighthub-zone', resolved.zone)
      if (!resolved.hasEvents) {
        const msg = resolved.fallback
          ? t('landing.no_events_fallback')
              .replace('{zone}', cleaned)
              .replace('{fallback}', resolved.fallback)
          : t('landing.no_events')
        window.dispatchEvent(new CustomEvent('nighthub-toast', { detail: { message: msg } }))
      }
    }
    router.push(`/discover?tab=events&zone=${encodeURIComponent(resolved.zone)}`)
  }

  async function requestGeo(autoNavigate = false) {
    if (geoStatus === 'locating') return
    if (!navigator.geolocation) {
      setGeoStatus('error')
      setStatusMsg(t('landing.geo_not_supported'))
      return
    }
    setGeoStatus('locating')
    setStatusMsg(autoNavigate ? t('landing.locating_auto') : t('landing.locating'))
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords
      const name = await reverseGeocode(latitude, longitude)
      const fallback = `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`
      const resolved = name || fallback
      setZone(resolved)
      setGeoStatus('success')
      setStatusMsg(name ? t('landing.located') : t('landing.located_fallback'))
      if (autoNavigate) await goToDiscover(resolved)
    }, (err) => {
      console.error('geolocation error', err)
      setGeoStatus('error')
      setStatusMsg(t('landing.geo_denied'))
    }, { enableHighAccuracy: false, timeout: 8000 })
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    await goToDiscover(zone)
  }

  return (
    <div className="relative -mx-4 md:-mx-6 lg:-mx-10 px-4 md:px-6 lg:px-10 py-10 min-h-[100vh] overflow-hidden rounded-[28px] border border-white/5 bg-[radial-gradient(circle_at_20%_20%,rgba(88,57,176,0.35),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(91,12,245,0.3),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(255,76,181,0.28),transparent_28%),#070a14]">
      <div className="absolute inset-0 pointer-events-none mix-blend-screen opacity-70 landing-aurora" />
      <div className="absolute inset-0 pointer-events-none mix-blend-screen opacity-35 landing-gold" />
      <div className="absolute inset-0 pointer-events-none mix-blend-screen opacity-60" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(44,191,255,0.15), rgba(7,10,20,0.1) 35%, transparent 50%)' }} />
      <div className="relative z-10 flex flex-col items-center justify-center text-center gap-8 md:gap-10 min-h-[70vh]">
        <div>
          <div className="text-5xl md:text-6xl font-black tracking-tight bg-gradient-to-b from-white to-gray-400 text-transparent bg-clip-text drop-shadow-[0_12px_45px_rgba(0,0,0,0.35)] wwg-gold-sheen">
            WWG
          </div>
          <div className="mt-3 text-lg md:text-xl font-medium tracking-[0.35em] text-white/80 wwg-neon">WHERE WE GO</div>
          <div className="mt-4 text-base md:text-lg text-white/60 max-w-2xl">
            {t('landing.subtitle')}
          </div>
        </div>
        <form onSubmit={onSubmit} className="w-full max-w-2xl space-y-3">
          <div className="relative">
            <div className="flex items-center bg-white/5 border border-white/10 rounded-full px-4 py-2 shadow-[0_15px_60px_rgba(0,0,0,0.45)] backdrop-blur neon-hover">
            <input
              className="flex-1 bg-transparent outline-none text-white px-2 py-3 text-base md:text-lg placeholder:text-white/40"
              placeholder={t('landing.placeholder')}
              value={zone}
              onChange={(e) => {
                const val = e.target.value
                setZone(val)
                const norm = normalizeZone(val)
                const matches = presetZones.filter(z => z.toLowerCase().startsWith(norm.toLowerCase()) && norm.length >= 2)
                setSuggestions(matches.slice(0, 5))
              }}
              onBlur={() => {
                // Auto-completar Palma -> Palma de Mallorca
                setZone(prev => normalizeZone(prev))
                setTimeout(() => setSuggestions([]), 120)
              }}
              onFocus={() => {
                const norm = normalizeZone(zone)
                const matches = presetZones.filter(z => z.toLowerCase().startsWith(norm.toLowerCase()) && norm.length >= 2)
                setSuggestions(matches.slice(0, 5))
              }}
            />
            <button
              type="submit"
              className="ml-2 w-12 h-12 rounded-full bg-gold text-black hover:opacity-90 transition active:scale-95 flex items-center justify-center text-xl shadow-[0_0_24px_rgba(216,175,58,0.35)] cta-arrow"
              aria-label={t('landing.cta')}
            >
              →
            </button>
            </div>
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 rounded-2xl bg-black/70 border border-white/10 backdrop-blur shadow-glow text-left text-sm overflow-hidden">
                {suggestions.map(s => (
                  <button
                    key={s}
                    type="button"
                    className="w-full text-left px-4 py-2 hover:bg-white/5"
                    onMouseDown={(e)=>e.preventDefault()}
                    onClick={() => { setZone(s); setSuggestions([]); goToDiscover(s) }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => requestGeo(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:border-white/30 transition text-sm text-white/80"
            >
              <span className="inline-block w-2 h-2 rounded-full bg-[#8dd0ff] shadow-[0_0_10px_rgba(141,208,255,0.8)]" />
              {geoStatus === 'locating' ? t('landing.using_location') : t('landing.use_location')}
            </button>
            {statusMsg && <div className="text-xs text-white/60">{statusMsg}</div>}
          </div>
        </form>
        <div className="flex items-center gap-6 text-sm text-white/60">
          <span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#72f0ff]" /> {t('landing.point_curated')}</span>
          <span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#ff87e0]" /> {t('landing.point_live')}</span>
          <span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#8cf0a7]" /> {t('landing.point_multi')}</span>
        </div>
      </div>
    </div>
  )
}
