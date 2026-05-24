"use client"
import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@supabase/supabase-js'
import { fetchKnownZones, normalizeZoneKey } from '@/lib/zones-client'

type GeoStatus = 'idle' | 'locating' | 'success' | 'error'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

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

const PLACEHOLDER_CITIES = ['Palma de Mallorca', 'Ibiza', 'Barcelona', 'Madrid', 'Amsterdam']

type PreviewClub = { id: string; name: string; genres: string[]; address: string | null }

export default function LandingPage() {
  const { t } = useI18n()
  const router = useRouter()
  const [zone, setZone] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle')
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [knownZones, setKnownZones] = useState<string[]>(['Palma de Mallorca', 'Mallorca', 'Ibiza', 'Barcelona', 'Madrid'])
  const [previewClubs, setPreviewClubs] = useState<PreviewClub[]>([])
  const [displayPlaceholder, setDisplayPlaceholder] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [hasSpeech, setHasSpeech] = useState(false)

  // Detectar soporte de Speech API
  useEffect(() => {
    setHasSpeech(typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window))
  }, [])

  // Animación de typing en el placeholder
  useEffect(() => {
    let cityIdx = 0
    let charIdx = 0
    let deleting = false
    let timeout: ReturnType<typeof setTimeout>

    function tick() {
      const city = PLACEHOLDER_CITIES[cityIdx]
      if (!deleting) {
        charIdx++
        setDisplayPlaceholder(city.slice(0, charIdx))
        if (charIdx === city.length) {
          deleting = true
          timeout = setTimeout(tick, 1400) // pausa antes de borrar
          return
        }
      } else {
        charIdx--
        setDisplayPlaceholder(city.slice(0, charIdx))
        if (charIdx === 0) {
          deleting = false
          cityIdx = (cityIdx + 1) % PLACEHOLDER_CITIES.length
        }
      }
      timeout = setTimeout(tick, deleting ? 40 : 65)
    }
    timeout = setTimeout(tick, 600)
    return () => clearTimeout(timeout)
  }, [])

  function startVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.lang = 'es-ES'
    rec.interimResults = false
    rec.maxAlternatives = 1
    setIsListening(true)
    rec.start()
    rec.onresult = (e: any) => {
      const spoken = e.results[0][0].transcript
      setZone(spoken)
      setIsListening(false)
      goToDiscover(spoken)
    }
    rec.onerror = () => setIsListening(false)
    rec.onend = () => setIsListening(false)
  }

  useEffect(() => {
    function spawnFlash(x: number, y: number) {
      const container = document.getElementById('landing-bg')
      if (!container) return
      const rect = container.getBoundingClientRect()
      const cx = x - rect.left
      const cy = y - rect.top

      // Central flash
      const flash = document.createElement('div')
      flash.className = 'click-flash'
      flash.style.left = cx + 'px'
      flash.style.top = cy + 'px'
      container.appendChild(flash)
      setTimeout(() => flash.remove(), 600)

      // Particles
      const count = 10
      for (let i = 0; i < count; i++) {
        const p = document.createElement('div')
        p.className = 'click-particle'
        const angle = (i / count) * 360
        const dist = 28 + Math.random() * 32
        const rad = (angle * Math.PI) / 180
        p.style.left = cx + 'px'
        p.style.top = cy + 'px'
        p.style.setProperty('--tx', `${Math.cos(rad) * dist}px`)
        p.style.setProperty('--ty', `${Math.sin(rad) * dist}px`)
        container.appendChild(p)
        setTimeout(() => p.remove(), 700)
      }
    }

    const el = document.getElementById('landing-bg')
    if (!el) return
    const handler = (e: MouseEvent) => spawnFlash(e.clientX, e.clientY)
    el.addEventListener('click', handler)
    return () => el.removeEventListener('click', handler)
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const { data: featured } = await sb()
          .from('clubs')
          .select('id, name, genres, address')
          .eq('status', 'approved')
          .eq('featured', true)
          .limit(3)
        if (featured?.length) {
          setPreviewClubs(featured as PreviewClub[])
          return
        }
        const { data: fallback } = await sb()
          .from('clubs')
          .select('id, name, genres, address')
          .eq('status', 'approved')
          .limit(3)
        if (fallback?.length) setPreviewClubs(fallback as PreviewClub[])
      } catch {}
    })()
  }, [])

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

  useEffect(() => {
    ;(async () => {
      try {
        const zones = await fetchKnownZones()
        if (!zones.length) return
        setKnownZones((prev) => Array.from(new Set([...prev, ...zones])).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })))
      } catch {}
    })()
  }, [])

  async function resolveZoneWithFallback(zoneName: string) {
    const client = sb()
    const nowIso = new Date().toISOString()
    const [eventsRes, clubsRes] = await Promise.all([
      client.from('events_public').select('zone').gte('start_at', nowIso).not('zone', 'is', null).limit(1000),
      client.from('clubs').select('zone').eq('status', 'approved').not('zone', 'is', null).limit(1000),
    ])

    const eventZoneError = String((eventsRes.error as any)?.message || '').toLowerCase()
    const clubZoneError = String((clubsRes.error as any)?.message || '').toLowerCase()

    if ((eventsRes.error && !eventZoneError.includes('zone')) || (clubsRes.error && !clubZoneError.includes('zone'))) {
      return { zone: zoneName, fallback: null, hasEvents: false }
    }

    const counts = new Map<string, number>()
    const labelByKey = new Map<string, string>()
    const allRows = [
      ...((eventsRes.data || []) as any[]),
      ...((clubsRes.data || []) as any[]),
    ]

    for (const row of allRows) {
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
    <div id="landing-bg" className="relative -mx-4 md:-mx-6 lg:-mx-10 px-4 md:px-6 lg:px-10 pt-6 pb-10 min-h-[100vh] overflow-hidden rounded-[28px] border border-[#d8af3a]/10 bg-[#07060a]">
      <div className="absolute inset-0 pointer-events-none landing-gold-base" />
      <div className="absolute inset-0 pointer-events-none landing-gold-aurora" />
      <div className="absolute inset-0 pointer-events-none landing-gold-vignette" />
      <div className="relative z-10 flex flex-col items-center justify-start text-center gap-6 md:gap-8 pt-10 md:pt-16 min-h-[70vh]">
        <div className="anim-logo">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-[#d8af3a]/10 border border-[#d8af3a]/25 flex items-center justify-center shadow-[0_0_32px_rgba(216,175,58,0.25)]">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="13" r="5" stroke="#d8af3a" strokeWidth="2"/>
                <path d="M16 32 C16 32 6 20 6 13 C6 7.477 10.477 3 16 3 C21.523 3 26 7.477 26 13 C26 20 16 32 16 32Z" stroke="#d8af3a" strokeWidth="2" fill="none"/>
                <circle cx="16" cy="13" r="2" fill="#d8af3a"/>
              </svg>
            </div>
          </div>
          <div className="text-5xl md:text-6xl font-black tracking-tight bg-gradient-to-b from-white to-gray-400 text-transparent bg-clip-text drop-shadow-[0_12px_45px_rgba(0,0,0,0.35)] wwg-gold-sheen">
            WWG
          </div>
          <div className="mt-3 text-lg md:text-xl font-medium tracking-[0.35em] text-white/80 wwg-neon anim-subtitle">WHERE WE GO</div>
          <div className="mt-4 text-base md:text-lg text-white/55 max-w-sm anim-subtitle">
            {t('landing.subtitle')}
          </div>
        </div>
        <form onSubmit={onSubmit} className="w-full max-w-lg space-y-2 anim-form">
          <p className="text-sm text-white/50 text-center">{t('landing.placeholder')}</p>
          <div className="relative">
            <div className="flex items-center bg-black/30 border border-[#d8af3a]/30 rounded-full px-5 py-2 shadow-[0_0_28px_rgba(216,175,58,0.18),0_15px_60px_rgba(0,0,0,0.45)] backdrop-blur transition-shadow hover:shadow-[0_0_42px_rgba(216,175,58,0.32),0_15px_60px_rgba(0,0,0,0.45)]">
            <svg className="w-4 h-4 text-[#d8af3a] mr-3 shrink-0" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M7 16 C7 16 2 10 2 6 C2 3.24 4.24 1 7 1 C9.76 1 12 3.24 12 6 C12 10 7 16 7 16Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </svg>
            <input
              className="flex-1 bg-transparent outline-none text-white py-3 text-base md:text-lg placeholder:text-white/35"
              placeholder={displayPlaceholder}
              value={zone}
              onChange={(e) => {
                const val = e.target.value
                setZone(val)
                const norm = normalizeZone(val)
                const matches = knownZones.filter(z => normalizeZoneKey(z).startsWith(normalizeZoneKey(norm)) && norm.length >= 2)
                setSuggestions(matches.slice(0, 5))
              }}
              onBlur={() => {
                // Auto-completar Palma -> Palma de Mallorca
                setZone(prev => normalizeZone(prev))
                setTimeout(() => setSuggestions([]), 120)
              }}
              onFocus={() => {
                const norm = normalizeZone(zone)
                const matches = knownZones.filter(z => normalizeZoneKey(z).startsWith(normalizeZoneKey(norm)) && norm.length >= 2)
                setSuggestions(matches.slice(0, 5))
              }}
            />
            {hasSpeech && (
              <button
                type="button"
                onClick={startVoice}
                aria-label="Buscar por voz"
                className={`ml-1 w-10 h-10 rounded-full flex items-center justify-center transition ${isListening ? 'bg-red-500/80 shadow-[0_0_16px_rgba(255,60,60,0.6)]' : 'bg-white/8 hover:bg-white/12'}`}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="5" y="1" width="6" height="9" rx="3" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M2.5 8.5A5.5 5.5 0 008 14a5.5 5.5 0 005.5-5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  <line x1="8" y1="14" x2="8" y2="16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </button>
            )}
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
      </div>

    </div>
  )
}
