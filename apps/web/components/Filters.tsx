"use client"
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { getAnalyticsContext, hasAnalyticsConsent } from '@/lib/analytics-client'
import { fetchKnownZones, normalizeZoneKey } from '@/lib/zones-client'
import { useDebounce } from '@/components/hooks/useDebounce'

export function Filters() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { user } = useAuth()
  const q = params.get('q') ?? ''
  const genre = params.get('genre') ?? ''
  const zone = params.get('zone') ?? ''
  const tab = params.get('tab') ?? 'events'
  const { t } = useI18n()
  const [genres, setGenres] = useState<string[]>([])
  const [zones, setZones] = useState<string[]>([])
  const [zonesReady, setZonesReady] = useState(false)
  const [term, setTerm] = useState(q)
  const [suggestions, setSuggestions] = useState<{ id: string; name: string; sub?: string }[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debouncedTerm = useDebounce(term, 250)

  // Autocompletar segun la pestaña activa
  useEffect(() => {
    const val = debouncedTerm.trim()
    if (val.length < 2) { setSuggestions([]); return }
    let cancelled = false
    const sbc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    ;(async () => {
      try {
        let rows: { id: string; name: string; sub?: string }[] = []
        if (tab === 'clubs') {
          const { data } = await sbc.from('clubs').select('id,name,zone').eq('status', 'approved').ilike('name', `%${val}%`).order('name').limit(6)
          rows = (data || []).map((r: any) => ({ id: r.id, name: r.name, sub: r.zone || undefined }))
        } else if (tab === 'djs') {
          const { data } = await sbc.from('djs').select('id,name,genres').ilike('name', `%${val}%`).order('name').limit(6)
          rows = (data || []).map((r: any) => ({ id: r.id, name: r.name, sub: (r.genres || []).slice(0, 2).join(', ') || undefined }))
        } else {
          const { data } = await sbc.from('events_public').select('id,name,club_name').ilike('name', `%${val}%`).gte('start_at', new Date().toISOString()).order('start_at').limit(6)
          rows = (data || []).map((r: any) => ({ id: r.id, name: r.name, sub: r.club_name || undefined }))
        }
        if (!cancelled) { setSuggestions(rows); setShowSuggestions(true) }
      } catch { if (!cancelled) setSuggestions([]) }
    })()
    return () => { cancelled = true }
  }, [debouncedTerm, tab])

  function goToSuggestion(id: string) {
    setShowSuggestions(false)
    const base = tab === 'clubs' ? '/club' : tab === 'djs' ? '/dj' : '/event'
    router.push(`${base}/${id}`)
  }

  // Asegura que la zona actual en la URL sea valida para el selector
  useEffect(() => {
    if (!zone || zones.includes(zone) || !zonesReady) return
    const zoneNormalized = normalizeZoneKey(zone)
    const matched = zones.find((z) => {
      const zNormalized = normalizeZoneKey(z)
      return zoneNormalized === zNormalized || zoneNormalized.includes(zNormalized) || zNormalized.includes(zoneNormalized)
    })
    const sp = new URLSearchParams(params as any)
    if (matched) {
      sp.set('zone', matched)
      if (typeof window !== 'undefined') localStorage.setItem('nighthub-zone', matched)
      router.replace(`${pathname}?${sp.toString()}`)
      return
    }
    sp.delete('zone')
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nighthub-zone')
      if (saved === zone) localStorage.removeItem('nighthub-zone')
    }
    router.replace(`${pathname}?${sp.toString()}`)
  }, [zone, zones, zonesReady, params, pathname, router])

  useEffect(() => {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    sb.from('genres').select('name').order('name').then(({ data }) => setGenres((data||[]).map(g=>g.name)))
    ;(async () => {
      try {
        const found = await fetchKnownZones()
        setZones(found)
      } catch {} finally {
        setZonesReady(true)
      }
    })()
  }, [])

  // Default zone from localStorage if not present in URL
  useEffect(() => {
    if (tab !== 'djs') {
      if (!zone && typeof window !== 'undefined') {
        const saved = localStorage.getItem('nighthub-zone') || ''
        if (saved) {
          const sp = new URLSearchParams(params as any)
          sp.set('zone', saved)
          router.replace(`${pathname}?${sp.toString()}`)
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const cols = tab === 'djs' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'
  return (
    <div className={`grid ${cols} gap-2`}>
      <div className="col-span-2 relative min-w-0">
      <input
        className="w-full bg-base-card border border-white/10 rounded-xl p-2 text-sm min-w-0"
        placeholder={t('filters.search')}
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onFocus={() => { if (suggestions.length) setShowSuggestions(true) }}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setShowSuggestions(false); return }
          if (e.key === 'Enter') {
            setShowSuggestions(false)
            const val = (e.target as HTMLInputElement).value
            const sp = new URLSearchParams(params as any)
            if (val) sp.set('q', val); else sp.delete('q')
            router.push(`${pathname}?${sp.toString()}`)
            // Log búsqueda (solo si hay término)
            try {
              const sbc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
              if (val.trim().length >= 2 && hasAnalyticsConsent()){
                const tab = params.get('tab') || 'events'
                const ctx = getAnalyticsContext()
                sbc.from('search_logs').insert({
                  q: val.trim(),
                  zone: zone || null,
                  genre: genre || null,
                  tab,
                  user_id: user?.id || null,
                  device_id: ctx?.deviceId || null,
                  session_id: ctx?.sessionId || null,
                  path: pathname
                })
              }
            } catch {}
          }
        }}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-40 rounded-2xl bg-[#12101a] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden">
          {suggestions.map(s => (
            <button
              key={s.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); goToSuggestion(s.id) }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#d8af3a]/10 transition-colors flex items-center justify-between gap-3"
            >
              <span className="text-white truncate">{s.name}</span>
              {s.sub && <span className="text-xs text-white/40 truncate shrink-0 max-w-[45%]">{s.sub}</span>}
            </button>
          ))}
        </div>
      )}
      </div>
      {tab !== 'djs' && (
      <select
        value={zone}
        onChange={(e)=>{
          const v = e.target.value
          if (typeof window !== 'undefined') localStorage.setItem('nighthub-zone', v)
          const sp = new URLSearchParams(params as any)
          if (v) sp.set('zone', v); else sp.delete('zone')
          router.push(`${pathname}?${sp.toString()}`)
        }}
        className="bg-base-card border border-white/10 rounded-xl p-2 text-sm w-full min-w-0"
      >
        <option value=""><span>{t('filters.zone')}</span></option>
        {zones.map(z => (
          <option key={z} value={z}>{z}</option>
        ))}
      </select>
      )}
      <select
        value={genre}
        onChange={(e)=>{
          const sp = new URLSearchParams(params as any)
          const v = e.target.value
          if (v) sp.set('genre', v); else sp.delete('genre')
          router.push(`${pathname}?${sp.toString()}`)
        }}
        className={`bg-base-card border border-white/10 rounded-xl p-2 text-sm w-full min-w-0 ${tab === 'djs' ? 'col-span-2 sm:col-span-1' : ''}`}
      >
        <option value="">{t('filters.genre')}</option>
        {genres.map(g => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>
    </div>
  )
}
