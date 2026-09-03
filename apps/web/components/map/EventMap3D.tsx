"use client"
import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { MapVenue } from '@/lib/map-data'
import { KNOWN_ZONES } from '@/lib/map-data'

interface EventMap3DProps {
  venues: MapVenue[]
  selectedVenueId: string | null
  onSelectVenue: (venueId: string) => void
  activeZoneKey: string
  is3D: boolean
  onToggle3D: () => void
  onLocateMe: () => void
  isLocating?: boolean
  t: (key: string) => string
}

export function EventMap3D({
  venues,
  selectedVenueId,
  onSelectVenue,
  activeZoneKey,
  is3D,
  onToggle3D,
  onLocateMe,
  isLocating,
  t,
}: EventMap3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const tileLayerGroupRef = useRef<L.LayerGroup | null>(null)
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null)
  const [mapReady, setMapReady] = useState(false)

  const initialZone = KNOWN_ZONES[activeZoneKey] || KNOWN_ZONES.mallorca

  // 1. Inicializar Leaflet Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [initialZone.center[1], initialZone.center[0]],
      zoom: initialZone.zoom,
      zoomControl: false,
      attributionControl: false,
    })

    const tileGroup = L.layerGroup().addTo(map)
    const markersGroup = L.layerGroup().addTo(map)

    tileLayerGroupRef.current = tileGroup
    markersLayerGroupRef.current = markersGroup
    mapRef.current = map

    setMapReady(true)

    setTimeout(() => {
      map.invalidateSize()
    }, 150)

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize()
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [])

  // 2. Capas Cartográficas Reales (3D Satélite HD / 2D Noche)
  useEffect(() => {
    if (!tileLayerGroupRef.current || !mapRef.current) return

    tileLayerGroupRef.current.clearLayers()

    if (is3D) {
      // 🛰️ Satélite Real HD (ESRI World Imagery + Referencias de carreteras)
      const satLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19 }
      )
      const labelsLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19 }
      )
      tileLayerGroupRef.current.addLayer(satLayer)
      tileLayerGroupRef.current.addLayer(labelsLayer)
    } else {
      // 🌃 Modo Noche Oficial (ESRI World Dark Gray Base + Labels)
      const darkBase = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19 }
      )
      const darkLabels = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19 }
      )
      tileLayerGroupRef.current.addLayer(darkBase)
      tileLayerGroupRef.current.addLayer(darkLabels)
    }
  }, [is3D, mapReady])

  // 3. Volar a la ciudad cuando cambia la zona activa
  useEffect(() => {
    if (!mapRef.current) return
    const zone = KNOWN_ZONES[activeZoneKey] || KNOWN_ZONES.mallorca
    mapRef.current.flyTo([zone.center[1], zone.center[0]], zone.zoom, {
      animate: true,
      duration: 1.2,
    })
  }, [activeZoneKey])

  // 4. Centrar el local seleccionado
  useEffect(() => {
    if (!mapRef.current || !selectedVenueId) return
    const venue = venues.find((v) => v.id === selectedVenueId)
    if (venue && typeof venue.lat === 'number' && typeof venue.lon === 'number') {
      const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768
      // En desktop el panel lateral de 460px está a la derecha, desplazamos levemente la cámara para que el pin quede perfectamente centrado en el área visible
      const targetLon = isDesktop ? venue.lon + 0.004 : venue.lon
      mapRef.current.flyTo([venue.lat, targetLon], 16, {
        animate: true,
        duration: 0.8,
      })
    }
  }, [selectedVenueId, venues])

  // 5. Renderizar ÚNICAMENTE los Pines de Locales / Discotecas
  useEffect(() => {
    if (!markersLayerGroupRef.current || !mapRef.current) return

    markersLayerGroupRef.current.clearLayers()

    const now = new Date()

    venues.forEach((venue) => {
      const isSelected = venue.id === selectedVenueId

      const hasToday = venue.events.some((e) => {
        const d = new Date(e.start_at)
        return (
          d.getDate() === now.getDate() &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        )
      })

      const html = `
        <div class="cursor-pointer transform -translate-x-1/2 -translate-y-full transition-transform duration-200 hover:scale-115">
          <div class="relative flex flex-col items-center select-none pointer-events-auto">
            <!-- Etiqueta del Local con Contador de Fiestas -->
            <div class="mb-1 px-3 py-1 rounded-full text-[11px] font-black tracking-tight backdrop-blur-md border shadow-2xl flex items-center gap-1.5 whitespace-nowrap ${
              isSelected
                ? 'bg-[#d8af3a] text-black border-[#d8af3a] scale-110 shadow-[0_0_20px_rgba(216,175,58,0.9)]'
                : hasToday
                ? 'bg-[#0B0F14]/95 text-[#00f0ff] border-[#00f0ff]/80 shadow-[0_0_14px_rgba(0,240,255,0.5)]'
                : 'bg-[#0B0F14]/95 text-white border-white/30 hover:border-white/60'
            }">
              <span>${hasToday ? '🔥 ' : '📍 '}${venue.name}</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                isSelected
                  ? 'bg-black text-[#d8af3a]'
                  : hasToday
                  ? 'bg-[#00f0ff] text-black'
                  : 'bg-white/20 text-white'
              }">
                ${venue.events.length}
              </span>
            </div>

            <!-- Cabeza Pin Neón -->
            <div class="w-8 h-8 rounded-full flex items-center justify-center border-2 shadow-2xl transition-all ${
              isSelected
                ? 'bg-[#d8af3a] border-white text-black scale-110 shadow-[0_0_20px_#d8af3a]'
                : hasToday
                ? 'bg-[#040810] border-[#00f0ff] text-[#00f0ff] shadow-[0_0_14px_#00f0ff]'
                : 'bg-[#0f0a14] border-[#ff00c8] text-[#ff00c8] shadow-[0_0_10px_#ff00c8]'
            }">
              <span class="text-xs font-black">${hasToday ? '🔥' : '✦'}</span>
            </div>

            <!-- Punta Pin -->
            <div class="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[7px] -mt-[1px] ${
              isSelected
                ? 'border-t-[#d8af3a]'
                : hasToday
                ? 'border-t-[#00f0ff]'
                : 'border-t-[#ff00c8]'
            }"></div>
          </div>
        </div>
      `

      const icon = L.divIcon({
        className: 'custom-venue-pin',
        html,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      })

      const marker = L.marker([venue.lat, venue.lon], { icon })
      marker.on('click', () => {
        onSelectVenue(venue.id)
      })

      markersLayerGroupRef.current?.addLayer(marker)
    })
  }, [venues, selectedVenueId, onSelectVenue])

  // Métodos de control directos del mapa
  const handleZoomIn = () => {
    mapRef.current?.zoomIn(1)
  }

  const handleZoomOut = () => {
    mapRef.current?.zoomOut(1)
  }

  const handleResetNorth = () => {
    const zone = KNOWN_ZONES[activeZoneKey] || KNOWN_ZONES.mallorca
    mapRef.current?.flyTo([zone.center[1], zone.center[0]], zone.zoom, { animate: true, duration: 0.8 })
  }

  return (
    <div className="relative w-full h-full min-h-[550px] overflow-hidden rounded-3xl border border-white/10 shadow-2xl bg-[#070a0e]">
      {/* Lienzo del Mapa que llena perfectamente el 100% sin cortes ni diagonales */}
      <div ref={containerRef} className="w-full h-full absolute inset-0" />

      {/* Controles Flotantes 3D / Zoom / Geolocalización directamente vinculados al mapa */}
      <div className="absolute right-4 top-4 z-[400] flex flex-col gap-2 pointer-events-auto">
        {/* Botón Alternar Satélite / Mapa */}
        <button
          onClick={onToggle3D}
          title={is3D ? 'Cambiar a vista Mapa' : 'Cambiar a vista Satélite'}
          aria-label="Toggle Satellite / Map View"
          className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-xs tracking-wider border backdrop-blur-md transition-all shadow-xl active:scale-90 ${
            is3D
              ? 'bg-[#d8af3a] text-black border-[#d8af3a] shadow-[0_0_18px_rgba(216,175,58,0.6)]'
              : 'bg-[#0B0F14]/90 text-white/90 border-white/20 hover:border-white/40 hover:bg-[#0B0F14]'
          }`}
        >
          {is3D ? 'MAP' : 'SAT'}
        </button>

        {/* Botón Resetear Vista / Centrar */}
        <button
          onClick={handleResetNorth}
          title={t('map.reset_north')}
          aria-label="Reset View"
          className="w-11 h-11 rounded-2xl flex items-center justify-center bg-[#0B0F14]/90 text-white/80 border border-white/15 backdrop-blur-md hover:text-[#00f0ff] hover:border-[#00f0ff]/50 hover:bg-[#0B0F14] transition-all shadow-xl active:scale-90"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 19V5m0 0l-4 4m4-4l4 4" />
          </svg>
        </button>

        {/* Botón Geolocalización */}
        <button
          onClick={onLocateMe}
          disabled={isLocating}
          title={t('map.locate_me')}
          aria-label="Locate near me"
          className="w-11 h-11 rounded-2xl flex items-center justify-center bg-[#0B0F14]/90 text-white/80 border border-white/15 backdrop-blur-md hover:text-[#00f0ff] hover:border-[#00f0ff]/50 hover:bg-[#0B0F14] transition-all shadow-xl active:scale-90 disabled:opacity-50"
        >
          {isLocating ? (
            <svg className="w-5 h-5 animate-spin text-[#00f0ff]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>

        {/* Controles de Zoom Directos (+ / -) */}
        <div className="flex flex-col rounded-2xl overflow-hidden border border-white/15 backdrop-blur-md bg-[#0B0F14]/90 shadow-xl">
          <button
            onClick={handleZoomIn}
            title="Zoom +"
            aria-label="Zoom in"
            className="w-11 h-10 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-all border-b border-white/10 active:scale-90 active:bg-white/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.8} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom -"
            aria-label="Zoom out"
            className="w-11 h-10 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-all active:scale-90 active:bg-white/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.8} d="M20 12H4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
