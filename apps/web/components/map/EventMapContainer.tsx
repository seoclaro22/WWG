"use client"
import React, { useState, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useI18n } from '@/lib/i18n'
import type { MapVenue } from '@/lib/map-data'
import { KNOWN_ZONES } from '@/lib/map-data'
import { VenueEventsDrawer } from './VenueEventsDrawer'
import { haversineKm } from '@/lib/geo-client'

// Carga dinámica del mapa 3D para evitar errores de SSR
const EventMap3D = dynamic(
  () => import('./EventMap3D').then((mod) => mod.EventMap3D),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[550px] rounded-3xl bg-[#070a0e] flex flex-col items-center justify-center border border-white/10 p-6 text-center">
        <div className="w-12 h-12 rounded-full border-2 border-[#d8af3a] border-t-transparent animate-spin mb-4 shadow-[0_0_15px_rgba(216,175,58,0.4)]" />
        <p className="text-sm font-semibold text-white/80 tracking-wide">Cargando Mapa 3D Satelital & Nocturno...</p>
        <p className="text-xs text-white/40 mt-1">Ubicando locales oficiales en sus coordenadas reales</p>
      </div>
    ),
  }
)

interface EventMapContainerProps {
  initialVenues: MapVenue[]
  defaultZone?: string
}

type DateFilterType = 'all' | 'today' | 'tomorrow' | 'weekend' | 'week'
type MapStyleKey = 'dark' | 'satellite' | 'streets'

export function EventMapContainer({ initialVenues, defaultZone = 'mallorca' }: EventMapContainerProps) {
  const { t } = useI18n()

  // Estados de Filtros
  const [activeZone, setActiveZone] = useState<string>(
    KNOWN_ZONES[defaultZone.toLowerCase()] ? defaultZone.toLowerCase() : 'mallorca'
  )
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all')
  const [selectedGenre, setSelectedGenre] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  
  // Estado del LOCAL (Discoteca) seleccionado
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)

  // Estados de Cámara 3D
  const [is3D, setIs3D] = useState<boolean>(true)
  const [isLocating, setIsLocating] = useState<boolean>(false)

  // Drawer general / Lista de todos los locales
  const [showAllDrawer, setShowAllDrawer] = useState<boolean>(false)

  const mapRef = useRef<any>(null)

  // Extraer todos los géneros únicos de los eventos
  const availableGenres = useMemo(() => {
    const set = new Set<string>()
    for (const v of initialVenues) {
      for (const ev of v.events) {
        if (ev.genres && Array.isArray(ev.genres)) {
          for (const g of ev.genres) {
            if (g.trim()) set.add(g.trim())
          }
        }
      }
    }
    return Array.from(set).slice(0, 12)
  }, [initialVenues])

  // 1. Filtrado de locales y sus eventos según Ciudad, Fechas, Género y Búsqueda
  const filteredVenues = useMemo(() => {
    const now = new Date()
    // Rangos de fecha en UTC para evaluar de forma exacta las fiestas según su fecha calendario
    const todayStartUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    const tomorrowStartUtc = todayStartUtc + 24 * 60 * 60 * 1000
    const dayAfterTomorrowUtc = tomorrowStartUtc + 24 * 60 * 60 * 1000

    // Fin de semana: Viernes a Domingo (0=Dom, 1=Lun, ..., 5=Vie, 6=Sáb)
    const currentDay = now.getUTCDay()
    const daysToFriday = currentDay === 0 ? -2 : currentDay === 6 ? -1 : currentDay === 5 ? 0 : 5 - currentDay
    const weekendStartUtc = todayStartUtc + daysToFriday * 24 * 60 * 60 * 1000
    const weekendEndUtc = weekendStartUtc + 3 * 24 * 60 * 60 * 1000 // Abarca viernes, sábado y domingo noche

    // Próximos 7 días
    const weekEndUtc = todayStartUtc + 7 * 24 * 60 * 60 * 1000

    const result: MapVenue[] = []

    for (const venue of initialVenues) {
      // 1.1 Filtro por Zona geográfica del local
      if (activeZone) {
        const vZone = (venue.zone || '').toLowerCase()
        if (!vZone.includes(activeZone) && !activeZone.includes(vZone)) {
          const zoneInfo = KNOWN_ZONES[activeZone]
          if (zoneInfo && venue.lat && venue.lon) {
            const dist = haversineKm(
              { lat: zoneInfo.center[1], lon: zoneInfo.center[0] },
              { lat: venue.lat, lon: venue.lon }
            )
            if (dist > 75) continue
          } else {
            continue
          }
        }
      }

      // 1.2 Filtrar las fiestas de este local según fechas, géneros y búsqueda
      const matchingEvents = venue.events.filter((ev) => {
        // Filtro por Fecha
        const eventTime = new Date(ev.start_at).getTime()
        if (dateFilter === 'today') {
          if (eventTime < todayStartUtc || eventTime >= tomorrowStartUtc) return false
        } else if (dateFilter === 'tomorrow') {
          if (eventTime < tomorrowStartUtc || eventTime >= dayAfterTomorrowUtc) return false
        } else if (dateFilter === 'weekend') {
          if (eventTime < weekendStartUtc || eventTime >= weekendEndUtc) return false
        } else if (dateFilter === 'week') {
          if (eventTime < todayStartUtc || eventTime >= weekEndUtc) return false
        }

        // Filtro por Género
        if (selectedGenre !== 'all') {
          if (!ev.genres || !ev.genres.includes(selectedGenre)) return false
        }

        // Búsqueda por texto (nombre de fiesta o nombre de local)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim()
          const matchName = ev.name.toLowerCase().includes(q)
          const matchClub = (venue.name || '').toLowerCase().includes(q)
          const matchGenres = (ev.genres || []).some((g) => g.toLowerCase().includes(q))
          if (!matchName && !matchClub && !matchGenres) return false
        }

        return true
      })

      // Mostrar locales que tengan al menos 1 fiesta disponible con los filtros activos
      if (matchingEvents.length > 0) {
        result.push({
          ...venue,
          events: matchingEvents,
        })
      }
    }

    return result.sort((a, b) => b.events.length - a.events.length)
  }, [initialVenues, activeZone, dateFilter, selectedGenre, searchQuery])

  // Total de fiestas combinadas en la ciudad
  const totalEventsInZone = useMemo(() => {
    return filteredVenues.reduce((acc, v) => acc + v.events.length, 0)
  }, [filteredVenues])

  // Local actualmente seleccionado
  const selectedVenue = useMemo(() => {
    if (!selectedVenueId) return null
    return filteredVenues.find((v) => v.id === selectedVenueId) || null
  }, [filteredVenues, selectedVenueId])

  // Conteo de locales por ciudad para las pestañas superiores
  const zoneCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const key of Object.keys(KNOWN_ZONES)) {
      const zoneInfo = KNOWN_ZONES[key]
      const count = initialVenues.filter((v) => {
        const vZone = (v.zone || '').toLowerCase()
        if (vZone.includes(key) || key.includes(vZone)) return true
        if (zoneInfo && v.lat && v.lon) {
          return haversineKm({ lat: zoneInfo.center[1], lon: zoneInfo.center[0] }, { lat: v.lat, lon: v.lon }) <= 75
        }
        return false
      }).filter((v) => v.events.length > 0).length
      counts[key] = count
    }
    return counts
  }, [initialVenues])

  // Geolocalización
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización.')
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false)
        const userLat = pos.coords.latitude
        const userLon = pos.coords.longitude

        let closestZoneKey = 'mallorca'
        let minDistance = Infinity

        for (const [key, zoneInfo] of Object.entries(KNOWN_ZONES)) {
          const dist = haversineKm(
            { lat: userLat, lon: userLon },
            { lat: zoneInfo.center[1], lon: zoneInfo.center[0] }
          )
          if (dist < minDistance) {
            minDistance = dist
            closestZoneKey = key
          }
        }

        setActiveZone(closestZoneKey)
        setSelectedVenueId(null)
      },
      () => {
        setIsLocating(false)
        alert('No pudimos obtener tu ubicación actual.')
      }
    )
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* 1. SECCIÓN SUPERIOR: FILTROS LIMPIOS E INTUITIVOS */}
      <div className="flex flex-col gap-3 bg-[#0B0F14]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 sm:p-4 shadow-2xl">
        {/* Fila 1: Selector de Ciudades + Selector de Estilo de Mapa */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Selector de Ciudad */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
            {Object.entries(KNOWN_ZONES).map(([key, zone]) => {
              const isActive = activeZone === key
              const count = zoneCounts[key] || 0
              return (
                <button
                  key={key}
                  onClick={() => {
                    setActiveZone(key)
                    setSelectedVenueId(null)
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold tracking-tight transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap border ${
                    isActive
                      ? 'bg-[#d8af3a] text-black border-[#d8af3a] shadow-[0_0_16px_rgba(216,175,58,0.5)] scale-105'
                      : 'bg-white/5 text-white/70 border-white/10 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>{zone.name}</span>
                  {count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                        isActive ? 'bg-black/20 text-black' : 'bg-white/10 text-white/60'
                      }`}
                    >
                      {count} {count === 1 ? 'local' : 'locales'}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Fila 2: Chips de Fechas, Género y Buscador */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-white/5">
          {/* Chips de Fecha */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                dateFilter === 'all'
                  ? 'bg-white text-black border-white shadow-md'
                  : 'bg-white/5 text-white/70 border-white/10 hover:text-white'
              }`}
            >
              {t('map.filter_all')}
            </button>
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                dateFilter === 'today'
                  ? 'bg-red-500 text-white border-red-500 shadow-[0_0_14px_rgba(239,68,68,0.5)]'
                  : 'bg-white/5 text-white/70 border-white/10 hover:text-white'
              }`}
            >
              🔥 {t('map.filter_today')}
            </button>
            <button
              onClick={() => setDateFilter('tomorrow')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                dateFilter === 'tomorrow'
                  ? 'bg-[#00f0ff] text-black border-[#00f0ff] shadow-[0_0_14px_rgba(0,240,255,0.4)]'
                  : 'bg-white/5 text-white/70 border-white/10 hover:text-white'
              }`}
            >
              {t('map.filter_tomorrow')}
            </button>
            <button
              onClick={() => setDateFilter('weekend')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                dateFilter === 'weekend'
                  ? 'bg-[#ff00c8] text-white border-[#ff00c8] shadow-[0_0_14px_rgba(255,0,200,0.4)]'
                  : 'bg-white/5 text-white/70 border-white/10 hover:text-white'
              }`}
            >
              🎉 {t('map.filter_weekend')}
            </button>
            <button
              onClick={() => setDateFilter('week')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                dateFilter === 'week'
                  ? 'bg-white/20 text-white border-white/40'
                  : 'bg-white/5 text-white/70 border-white/10 hover:text-white'
              }`}
            >
              {t('map.filter_week')}
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Géneros */}
            {availableGenres.length > 0 && (
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-white/80 focus:outline-none focus:border-[#d8af3a]"
              >
                <option value="all" className="bg-[#0B0F14] text-white">
                  {t('map.all_genres')}
                </option>
                {availableGenres.map((g) => (
                  <option key={g} value={g} className="bg-[#0B0F14] text-white">
                    {g}
                  </option>
                ))}
              </select>
            )}

            {/* Búsqueda */}
            <div className="relative min-w-[140px] max-w-[200px]">
              <input
                type="text"
                placeholder={t('filters.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 text-xs rounded-full bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#00f0ff]"
              />
              <span className="absolute left-2.5 top-1.5 text-white/40 text-xs">🔍</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SECCIÓN INFERIOR: MAPA 3D A PANTALLA CASI COMPLETA */}
      <div className="relative w-full h-[76vh] md:h-[82vh] rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        {/* Renderizado de ÚNICAMENTE los locales en el Mapa 3D */}
        <EventMap3D
          venues={filteredVenues}
          selectedVenueId={selectedVenueId}
          onSelectVenue={(id) => setSelectedVenueId(id)}
          activeZoneKey={activeZone}
          is3D={is3D}
          onToggle3D={() => setIs3D((prev) => !prev)}
          onLocateMe={handleLocateMe}
          isLocating={isLocating}
          t={t}
        />

        {/* Contador flotante de locales en la parte superior izquierda del mapa */}
        <div className="absolute top-4 left-4 z-[500] flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-full bg-[#0B0F14]/90 backdrop-blur-md border border-white/15 shadow-xl flex items-center gap-2 text-xs font-bold text-white">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#d8af3a] animate-pulse" />
            <span>
              {filteredVenues.length} {filteredVenues.length === 1 ? 'discoteca' : 'discotecas'} ({totalEventsInZone} {totalEventsInZone === 1 ? 'fiesta' : 'fiestas'})
            </span>
          </div>

          <button
            onClick={() => setShowAllDrawer((prev) => !prev)}
            className="px-3 py-1.5 rounded-full bg-[#0B0F14]/90 backdrop-blur-md border border-white/15 shadow-xl text-xs font-bold text-white/80 hover:text-white hover:border-[#d8af3a] transition-all flex items-center gap-1.5"
          >
            <span>📋</span>
            <span>{showAllDrawer ? 'Ocultar lista' : 'Ver lista'}</span>
          </button>
        </div>

        {/* 3. LISTADO DE EVENTOS DEL LOCAL SELECCIONADO (AL PINCHAR UN LOCAL) */}
        {selectedVenue && (
          <VenueEventsDrawer
            venue={selectedVenue}
            onClose={() => setSelectedVenueId(null)}
            t={t}
          />
        )}

        {/* 4. DRAWER GENERAL DE TODOS LOS LOCALES Y SUS EVENTOS (SI PULSA "VER LISTA") */}
        {showAllDrawer && (
          <div className="fixed inset-0 md:absolute md:inset-y-0 md:left-0 md:right-auto w-full sm:w-[420px] z-[1000] bg-[#0B0F14] border-r border-white/10 p-4 flex flex-col gap-3 overflow-hidden shadow-[0_16px_50px_rgba(0,0,0,0.95)] animate-in slide-in-from-left duration-300 isolate">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#d8af3a]">
                Discotecas y Fiestas ({filteredVenues.length})
              </span>
              <button
                onClick={() => setShowAllDrawer(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1 overscroll-contain">
              {filteredVenues.map((venue) => (
                <div
                  key={venue.id}
                  onClick={() => {
                    setSelectedVenueId(venue.id)
                    setShowAllDrawer(false)
                  }}
                  className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-[#d8af3a]/40 transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">{venue.name}</h4>
                    {venue.address ? (
                      <p className="text-xs text-white/50 truncate mt-0.5">{venue.address}</p>
                    ) : null}
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-[#d8af3a]/20 text-[#d8af3a] border border-[#d8af3a]/30 shrink-0">
                    {venue.events.length} {venue.events.length === 1 ? 'fiesta' : 'fiestas'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
