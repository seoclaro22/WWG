"use client"
import React from 'react'

interface Map3DControlsProps {
  is3D: boolean
  onToggle3D: () => void
  onResetNorth: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onLocateMe: () => void
  isLocating?: boolean
  t: (key: string) => string
}

export function Map3DControls({
  is3D,
  onToggle3D,
  onResetNorth,
  onZoomIn,
  onZoomOut,
  onLocateMe,
  isLocating,
  t,
}: Map3DControlsProps) {
  return (
    <div className="absolute right-4 top-24 z-10 flex flex-col gap-2 pointer-events-auto">
      {/* Botón Alternar 3D / 2D */}
      <button
        onClick={onToggle3D}
        title={is3D ? t('map.view_2d') : t('map.view_3d')}
        aria-label="Toggle 3D View"
        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-xs tracking-wider border backdrop-blur-md transition-all shadow-lg active:scale-95 ${
          is3D
            ? 'bg-[#d8af3a] text-black border-[#d8af3a] shadow-[0_0_18px_rgba(216,175,58,0.5)]'
            : 'bg-[#0B0F14]/80 text-white/90 border-white/20 hover:border-white/40 hover:bg-[#0B0F14]'
        }`}
      >
        {is3D ? '3D' : '2D'}
      </button>

      {/* Botón Geolocalización / Cerca de mí */}
      <button
        onClick={onLocateMe}
        disabled={isLocating}
        title={t('map.locate_me')}
        aria-label="Locate near me"
        className="w-11 h-11 rounded-2xl flex items-center justify-center bg-[#0B0F14]/80 text-white/80 border border-white/15 backdrop-blur-md hover:text-[#00f0ff] hover:border-[#00f0ff]/50 hover:bg-[#0B0F14] transition-all shadow-lg active:scale-95 disabled:opacity-50"
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

      {/* Controles de Zoom */}
      <div className="flex flex-col rounded-2xl overflow-hidden border border-white/15 backdrop-blur-md bg-[#0B0F14]/80 shadow-lg">
        <button
          onClick={onZoomIn}
          title="Zoom +"
          aria-label="Zoom in"
          className="w-11 h-10 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-all border-b border-white/10 active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button
          onClick={onZoomOut}
          title="Zoom -"
          aria-label="Zoom out"
          className="w-11 h-10 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-all active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
          </svg>
        </button>
      </div>
    </div>
  )
}
