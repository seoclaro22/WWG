import { NextResponse } from 'next/server'
import { fetchZonesMap } from '@/lib/db'
import { geocodePlaceServer } from '@/lib/geo-server'
import { normalizeZoneKey } from '@/lib/zone-key'
import type { Coords } from '@/lib/geo-client'

export const runtime = 'nodejs'

// La respuesta se regenera una vez al dia: las coordenadas de una ciudad no
// cambian, solo aparecen ciudades nuevas.
export const revalidate = 86400

// Coordenadas de todas las zonas con agenda, indexadas por clave normalizada.
//
// Antes esto lo hacia cada navegador, geocodificando zona por zona en serie
// para respetar el limite de Nominatim: con 4 ciudades ya eran 4 segundos la
// primera vez, y crece con cada ciudad nueva. Resuelto aqui, se calcula una
// vez cada 24h y todos los visitantes lo reciben en una sola peticion.
export async function GET() {
  const zones = await fetchZonesMap()

  // En serie: la politica de Nominatim pide como mucho una consulta por
  // segundo. La espera solo se aplica cuando la llamada ha salido de verdad a
  // la red; si vino de la cache de fetch responde en milisegundos y esperar
  // solo serviria para que la ruta tardase segundos sin motivo.
  const coords: Record<string, Coords> = {}
  const names = Array.from(zones.values())
  for (let i = 0; i < names.length; i++) {
    const name = names[i]
    const key = normalizeZoneKey(name)
    if (!key || coords[key]) continue
    const startedAt = Date.now()
    const c = await geocodePlaceServer(name)
    if (c) coords[key] = c
    const wasNetwork = Date.now() - startedAt > 250
    if (wasNetwork && i < names.length - 1) await new Promise((r) => setTimeout(r, 1100))
  }

  return NextResponse.json(
    { coords },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    },
  )
}
