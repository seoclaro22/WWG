"use client"
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

const normalizeZone = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export function Filters() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const q = params.get('q') ?? ''
  const date = params.get('date') ?? ''
  const genre = params.get('genre') ?? ''
  const zone = params.get('zone') ?? ''
  const tab = params.get('tab') ?? 'events'
  const { t } = useI18n()
  const [genres, setGenres] = useState<string[]>([])
  const [zones, setZones] = useState<string[]>(['Mallorca','Ibiza','Barcelona','Madrid'])
  const [zonesReady, setZonesReady] = useState(false)

  // Asegura que la zona actual en la URL sea valida para el selector
  useEffect(() => {
    if (!zone || zones.includes(zone) || !zonesReady) return
    const zoneNormalized = normalizeZone(zone)
    const matched = zones.find((z) => {
      const zNormalized = normalizeZone(z)
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
    // Intenta enriquecer lista de zonas leyendo de eventos_public si existe columna 'zone'
    ;(async () => {
      try {
        const { data, error } = await sb.from('events_public').select('zone').not('zone','is',null).limit(100)
        if (!error && data) {
          const found = Array.from(new Set((data as any[]).map(x=>x.zone).filter(Boolean)))
          if (found.length) setZones(prev => Array.from(new Set([...prev, ...found])))
        }
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

  const cols = tab === 'events'
    ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-5'
    : (tab === 'djs' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4')
  return (
    <div className={`grid ${cols} gap-2`}>
      <input
        className="col-span-1 sm:col-span-2 bg-base-card border border-white/10 rounded-xl p-2 text-sm min-w-0"
        placeholder={t('filters.search')}
        defaultValue={q}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const val = (e.target as HTMLInputElement).value
            const sp = new URLSearchParams(params as any)
            if (val) sp.set('q', val); else sp.delete('q')
            router.push(`${pathname}?${sp.toString()}`)
            // Log búsqueda (solo si hay término)
            try {
              const sbc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
              if (val.trim().length >= 2){
                const tab = params.get('tab') || 'events'
                sbc.from('search_logs').insert({ q: val.trim(), zone: zone || null, genre: genre || null, tab })
              }
            } catch {}
          }
        }}
      />
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
      {tab === 'events' && (
      <select
        value={date}
        onChange={(e)=>{
          const sp = new URLSearchParams(params as any)
          const v = e.target.value
          if (v) sp.set('date', v); else sp.delete('date')
          router.push(`${pathname}?${sp.toString()}`)
        }}
        className="bg-base-card border border-white/10 rounded-xl p-2 text-sm w-full min-w-0"
      >
        <option value="">{t('filters.date')}</option>
        <option value="today">{t('date.today')}</option>
        <option value="tomorrow">{t('date.tomorrow')}</option>
        <option value="weekend">{t('date.weekend')}</option>
        <option value="week">{t('date.week')}</option>
        <option value="month">{t('date.month')}</option>
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
        className="bg-base-card border border-white/10 rounded-xl p-2 text-sm w-full min-w-0"
      >
        <option value="">{t('filters.genre')}</option>
        {genres.map(g => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>
    </div>
  )
}
