"use client"
import React from 'react'
import { Link } from '@/lib/navigation'
import type { MapVenue, MapEventItem } from '@/lib/map-data'

interface VenueEventsDrawerProps {
  venue: MapVenue
  onClose: () => void
  onSelectEvent?: (eventId: string) => void
  t: (key: string) => string
}

function formatDate(iso: string): { label: string; isToday: boolean } {
  const date = new Date(iso)
  const now = new Date()

  // Mismo criterio que /descubrir: rango real de hoy en hora local, no
  // comparacion de campos UTC (que marcaba como "Hoy" fiestas de manana
  // que caian en el mismo dia UTC por la diferencia horaria).
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  const isToday = date.getTime() >= startOfToday.getTime() && date.getTime() <= endOfToday.getTime()

  const hours = date.getUTCHours().toString().padStart(2, '0')
  const mins = date.getUTCMinutes().toString().padStart(2, '0')
  const timeStr = `${hours}:${mins}`

  if (isToday) {
    return { label: `Hoy · ${timeStr}`, isToday: true }
  }

  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const dayName = days[date.getUTCDay()]
  const dayNum = date.getUTCDate().toString().padStart(2, '0')
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const monthName = monthNames[date.getUTCMonth()]

  return { label: `${dayName} ${dayNum} ${monthName} · ${timeStr}`, isToday: false }
}

export function VenueEventsDrawer({ venue, onClose, onSelectEvent, t }: VenueEventsDrawerProps) {
  const directionsUrl =
    venue.lat && venue.lon
      ? `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lon}`
      : venue.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name + ' ' + venue.address)}`
      : '#'

  return (
    <div className="fixed inset-0 md:absolute md:inset-auto md:top-3 md:bottom-3 md:left-auto md:right-3 md:w-[460px] z-[1000] flex flex-col md:max-h-none rounded-none md:rounded-3xl bg-[#0B0F14] border-0 md:border md:border-white/15 shadow-[0_16px_50px_rgba(0,0,0,0.95)] overflow-hidden animate-in slide-in-from-bottom md:slide-in-from-right duration-300 isolate">
      {/* 1. CABECERA DEL LOCAL */}
      <div className="p-4 sm:p-5 border-b border-white/10 bg-gradient-to-b from-[#151c28]/80 to-transparent shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#00F0FF] text-base">📍</span>
              <h2 className="text-lg sm:text-xl font-black text-[#d8af3a] truncate tracking-tight">
                {venue.name}
              </h2>
            </div>

            {venue.address ? (
              <p className="text-xs text-white/60 truncate font-medium">
                {venue.address}
              </p>
            ) : null}

            <div className="flex items-center gap-2 mt-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#d8af3a]/20 text-[#d8af3a] border border-[#d8af3a]/30">
                {venue.events.length} {venue.events.length === 1 ? 'fiesta disponible' : 'fiestas disponibles'}
              </span>
              {venue.zone ? (
                <span className="text-xs text-white/40">· {venue.zone}</span>
              ) : null}
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all shrink-0 active:scale-90"
          >
            ✕
          </button>
        </div>

        {/* Botón de cómo llegar */}
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-1.5 px-3 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition-colors flex items-center justify-center gap-1.5"
          >
            <span>🧭</span>
            <span>{t('map.how_to_get')} en Google Maps</span>
          </a>
        </div>
      </div>

      {/* 2. LISTA DE EVENTOS EN ESTE LOCAL */}
      <div className="p-3 sm:p-4 overflow-y-auto flex-1 flex flex-col gap-3 overscroll-contain">
        {venue.events.map((ev) => {
          const { label: dateLabel, isToday } = formatDate(ev.start_at)
          const imgUrl =
            Array.isArray(ev.images) && ev.images.length > 0
              ? typeof ev.images[0] === 'string'
                ? ev.images[0]
                : ev.images[0]?.url
              : typeof ev.images === 'string'
              ? ev.images
              : null

          return (
            <div
              key={ev.id}
              onClick={() => onSelectEvent?.(ev.id)}
              className="group relative flex gap-3 p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-[#d8af3a]/40 transition-all cursor-pointer"
            >
              {/* Miniatura / Flyer */}
              <div className="relative w-20 h-24 sm:w-24 sm:h-28 rounded-xl overflow-hidden shrink-0 bg-[#0B0F14] border border-white/10">
                {imgUrl ? (
                  <img
                    src={imgUrl}
                    alt={ev.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-950/40 to-cyan-950/40">
                    <span className="text-2xl opacity-40">🎧</span>
                  </div>
                )}
                {isToday && (
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-red-500 text-white animate-pulse">
                    HOY
                  </span>
                )}
              </div>

              {/* Contenido del Evento */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`text-[11px] font-bold ${
                        isToday ? 'text-red-400 font-extrabold' : 'text-[#00F0FF]'
                      }`}
                    >
                      {dateLabel}
                    </span>

                    {ev.price_min !== null && ev.price_min !== undefined ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#d8af3a]/90 text-black shrink-0">
                        {ev.price_min === 0 ? 'Gratis' : `${ev.price_min}€`}
                      </span>
                    ) : null}
                  </div>

                  <h3 className="font-extrabold text-sm text-white line-clamp-2 group-hover:text-[#d8af3a] transition-colors">
                    {ev.name}
                  </h3>

                  {ev.genres && ev.genres.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {ev.genres.slice(0, 2).map((g) => (
                        <span
                          key={g}
                          className="px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-white/5 text-white/60"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Botón Comprar / Ver */}
                <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-end">
                  <Link
                    href={`/event/${ev.id}`}
                    onClick={(e) => e.stopPropagation()}
                    prefetch={false}
                    className="w-full text-center px-3 py-1.5 rounded-xl text-xs font-black bg-[#d8af3a] hover:bg-[#e6c148] text-black transition-all shadow-[0_0_12px_rgba(216,175,58,0.3)]"
                  >
                    {t('map.buy_tickets')}
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
