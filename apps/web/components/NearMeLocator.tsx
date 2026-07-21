"use client"

import { useState } from 'react'
import { useRouter } from '@/lib/navigation'
import { reverseGeocode } from '@/lib/geo-client'
import { normalizeZoneKey } from '@/lib/zones-client'

// Boton de ubicacion de la pagina "cerca de mi".
//
// La proximidad es a nivel de ciudad, no de sala: no hay coordenadas de clubs
// en la base de datos, asi que se resuelve la ciudad del usuario y se le lleva
// a su agenda de hoy. Es lo que responde a la consulta de verdad; ordenar salas
// por distancia exigiria lat/lng por club.
//
// Todo el contenido util de la pagina esta ya renderizado en servidor: esto
// solo es un atajo. Si el usuario deniega el permiso, la lista de ciudades
// sigue ahi.
export function NearMeLocator({
  zones,
  labels,
  todaySlug,
}: {
  zones: { slug: string; name: string }[]
  labels: { cta: string; locating: string; denied: string; noMatch: string }
  todaySlug: string
}) {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'locating' | 'error'>('idle')
  const [message, setMessage] = useState('')

  function locate() {
    if (status === 'locating') return
    if (!navigator.geolocation) {
      setStatus('error')
      setMessage(labels.denied)
      return
    }
    setStatus('locating')
    setMessage(labels.locating)

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const city = await reverseGeocode(pos.coords.latitude, pos.coords.longitude)
      const key = city ? normalizeZoneKey(city.split(',')[0]) : ''
      const match = zones.find((z) => normalizeZoneKey(z.name) === key)
      if (match) {
        router.push(`/${match.slug}/${todaySlug}`)
        return
      }
      setStatus('error')
      setMessage(labels.noMatch.replace('{city}', city || '?'))
    }, () => {
      setStatus('error')
      setMessage(labels.denied)
    }, { enableHighAccuracy: false, timeout: 8000 })
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={locate}
        disabled={status === 'locating'}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#d8af3a]/40 bg-[#d8af3a]/10 text-[#d8af3a] text-sm font-medium hover:bg-[#d8af3a]/20 transition-colors disabled:opacity-60"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 22s8-6.5 8-12a8 8 0 1 0-16 0c0 5.5 8 12 8 12Z" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
        </svg>
        {status === 'locating' ? labels.locating : labels.cta}
      </button>
      {message && status === 'error' && (
        <p role="status" className="text-xs text-white/50">{message}</p>
      )}
    </div>
  )
}
