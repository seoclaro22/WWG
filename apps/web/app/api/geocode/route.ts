import { NextRequest, NextResponse } from 'next/server'
import { geocodeCandidatesServer } from '@/lib/geo-server'

export const runtime = 'nodejs'

// Convierte lo que escribe el usuario en coordenadas. Lo usa el buscador de la
// portada para saber que ciudad con agenda le queda mas cerca cuando no hay
// eventos en lo que ha pedido.
//
// Pasa por el servidor para cumplir la politica de Nominatim (User-Agent
// identificable) y para que la misma consulta se resuelva una sola vez:
// "soller" la buscan muchos visitantes, Nominatim la ve una vez por semana.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ error: 'missing q' }, { status: 400 })

  // Se devuelven todos los candidatos: el desempate por cercania lo hace quien
  // consulta, que es el unico que sabe donde hay agenda.
  const candidates = await geocodeCandidatesServer(q)

  return NextResponse.json(
    { candidates },
    {
      headers: {
        // Cache de CDN: una semana, y mientras se revalida se sigue sirviendo
        // el valor viejo para no bloquear la busqueda.
        'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=86400',
      },
    },
  )
}
