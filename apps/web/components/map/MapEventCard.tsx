"use client"
import React from 'react'
import { Link } from '@/lib/navigation'
import type { MapEventItem } from '@/lib/map-data'

interface MapEventCardProps {
  event: MapEventItem
  isSelected?: boolean
  onSelect?: () => void
  t: (key: string) => string
}

function formatDateDisplay(iso: string): { label: string; isToday: boolean } {
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

export function MapEventCard({ event, isSelected, onSelect, t }: MapEventCardProps) {
  const { label: dateLabel, isToday } = formatDateDisplay(event.start_at)

  const imgUrl = Array.isArray(event.images) && event.images.length > 0
    ? (typeof event.images[0] === 'string' ? event.images[0] : event.images[0]?.url)
    : (typeof event.images === 'string' ? event.images : null)

  const directionsUrl = event.lat && event.lon
    ? `https://www.google.com/maps/dir/?api=1&destination=${event.lat},${event.lon}`
    : event.club_address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.club_name + ' ' + event.club_address)}`
    : '#'

  return (
    <div
      onClick={onSelect}
      className={`group relative flex flex-col sm:flex-row items-stretch rounded-2xl overflow-hidden backdrop-blur-2xl transition-all duration-300 cursor-pointer border shadow-2xl ${
        isSelected
          ? 'bg-[#0F141B]/95 border-[#d8af3a] shadow-[0_0_24px_rgba(216,175,58,0.35)] scale-[1.01]'
          : 'bg-[#0F141B]/90 border-white/15 hover:border-white/30 hover:bg-[#141b24]'
      }`}
    >
      {/* Miniatura / Flyer */}
      <div className="relative w-full sm:w-36 h-32 sm:h-auto shrink-0 overflow-hidden bg-gradient-to-br from-purple-950/40 via-[#0B0F14] to-cyan-950/40">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={event.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#0B0F14]">
            <span className="text-3xl opacity-40">🎧</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-transparent to-[#0F141B]/80" />

        {/* Badge "Esta noche" o Fecha sobre la imagen */}
        <div className="absolute top-2 left-2">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border ${
              isToday
                ? 'bg-red-500 text-white border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.6)] animate-pulse'
                : 'bg-black/70 text-white border-white/20'
            }`}
          >
            {isToday ? `🔥 ${t('map.tonight_badge')}` : dateLabel}
          </span>
        </div>
      </div>

      {/* Detalles del Evento */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2">
        <div>
          {/* Club & Zona */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 text-xs text-white/80 font-bold truncate">
              <span className="text-[#00F0FF]">📍</span>
              <span className="truncate text-[#d8af3a]">{event.club_name || 'Club'}</span>
              {event.zone ? <span className="text-white/40 font-normal">· {event.zone}</span> : null}
            </div>

            {event.price_min !== null && event.price_min !== undefined ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#d8af3a]/90 text-black shrink-0">
                {event.price_min === 0 ? 'Gratis' : `${event.price_min}€`}
              </span>
            ) : null}
          </div>

          {/* Nombre de la Fiesta */}
          <h3 className="font-extrabold text-sm text-white line-clamp-1 group-hover:text-[#d8af3a] transition-colors">
            {event.name}
          </h3>

          {/* Géneros */}
          {event.genres && event.genres.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {event.genres.slice(0, 2).map((g) => (
                <span
                  key={g}
                  className="px-2 py-0.5 rounded-md text-[9px] font-semibold bg-white/5 border border-white/10 text-white/70"
                >
                  {g}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {/* Acciones */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title={t('map.how_to_get')}
            className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-white/5 hover:bg-white/15 text-white/80 border border-white/10 transition-colors flex items-center gap-1 shrink-0"
          >
            <span>🧭</span>
            <span>{t('map.how_to_get')}</span>
          </a>

          <Link
            href={`/event/${event.id}`}
            onClick={(e) => e.stopPropagation()}
            prefetch={false}
            className="flex-1 text-center px-3 py-1.5 rounded-xl text-xs font-black bg-[#d8af3a] hover:bg-[#e4be4a] text-black transition-all shadow-[0_0_12px_rgba(216,175,58,0.3)] hover:shadow-[0_0_18px_rgba(216,175,58,0.5)]"
          >
            {t('map.buy_tickets')}
          </Link>
        </div>
      </div>
    </div>
  )
}
