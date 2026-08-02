import { NextRequest, NextResponse } from 'next/server'
import { suggestCitiesServer } from '@/lib/geo-server'

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
  const q = req.nextUrl.searchParams.get('q')?.trim()
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
