"use client"
import type { Coords } from '@/lib/geo-client'

// Coordenadas de las zonas con agenda, para ordenarlas por cercania a lo que
// escribe el usuario. No estan en la base de datos (clubs guarda direccion
// pero no lat/lon), asi que las resuelve /api/zone-coords, que geocodifica una
// vez cada 24h para todo el mundo. Aqui solo se memoriza la respuesta para no
// repetir la peticion durante la misma visita.
let inflight: Promise<Map<string, Coords>> | null = null

export function zoneCoords(): Promise<Map<string, Coords>> {
  if (!inflight) {
    inflight = fetch('/api/zone-coords')
      .then((r) => (r.ok ? r.json() : { coords: {} }))
      .then((j) => new Map(Object.entries((j?.coords || {}) as Record<string, Coords>)))
      .catch(() => {
        // Un fallo puntual no debe dejar la pagina sin poder reintentar.
        inflight = null
        return new Map<string, Coords>()
      })
  }
  return inflight
}
