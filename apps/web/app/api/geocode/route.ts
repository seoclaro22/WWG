import { NextRequest, NextResponse } from 'next/server'
import { geocodeCandidatesServer, sanitizeGeoQuery } from '@/lib/geo-server'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

// Convierte lo que escribe el usuario en coordenadas. Lo usa el buscador de la
// portada para saber que ciudad con agenda le queda mas cerca cuando no hay
// eventos en lo que ha pedido.
//
// Pasa por el servidor para cumplir la politica de Nominatim (User-Agent
// identificable) y para que la misma consulta se resuelva una sola vez:
// "soller" la buscan muchos visitantes, Nominatim la ve una vez por semana.
export async function GET(req: NextRequest) {
  // 30/min por IP: de sobra para una persona escribiendo, no para un bucle.
  // Es defensa en memoria, no un limite global (ver lib/rate-limit.ts).
  if (!rateLimit(`geocode:${clientIp(req)}`, 30)) {
    return NextResponse.json({ error: 'too many requests' }, { status: 429 })
  }

  // Se sanea antes de salir a Nominatim: la ruta es publica y sin este limite
  // sirve de proxy para machacar un servicio ajeno en nuestro nombre.
  const q = sanitizeGeoQuery(req.nextUrl.searchParams.get('q'))
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
