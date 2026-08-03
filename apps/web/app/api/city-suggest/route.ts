import { NextRequest, NextResponse } from 'next/server'
import { sanitizeGeoQuery, suggestCitiesServer } from '@/lib/geo-server'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

// Autocompletado de ciudad para el buscador de la portada.
//
// Separado de /api/geocode porque son cosas distintas: aquel resuelve un nombre
// completo con Nominatim, este completa lo que el usuario lleva escrito con
// Photon. Nominatim no busca por prefijo y devolvia sitios sin relacion.
//
// Pasa por el servidor para que la misma consulta se resuelva una sola vez
// para todos los visitantes: escribir una ciudad son varias pulsaciones y
// muchos usuarios escriben las mismas ciudades.
export async function GET(req: NextRequest) {
  // 60/min: se llama por cada pulsacion mientras se escribe, mas que geocode.
  if (!rateLimit(`city-suggest:${clientIp(req)}`, 60)) {
    return NextResponse.json({ error: 'too many requests' }, { status: 429 })
  }

  // Mismo saneado que /api/geocode y por el mismo motivo: sin limitar la
  // entrada esta ruta publica sirve de proxy para abusar de Photon.
  const q = sanitizeGeoQuery(req.nextUrl.searchParams.get('q'))
  if (!q) return NextResponse.json({ error: 'missing q' }, { status: 400 })

  const cities = await suggestCitiesServer(q)

  return NextResponse.json(
    { cities },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    },
  )
}
