import { NextRequest, NextResponse } from 'next/server'
import { fetchClubsPublic, fetchDjsPublic, fetchEvents } from '@/lib/db'
import { CATALOG_LIMIT, PAGE_SIZE, rangeFromDateParam, toClubItem, toDjItem, toEventItem } from '@/lib/list-items'

export const runtime = 'nodejs'

// Siguientes tandas de los listados largos, para el boton "Cargar mas".
//
// Lee con el mismo limit que la pagina inicial (CATALOG_LIMIT), asi que cae en
// la misma entrada del Data Cache: la lista se trae de Supabase una vez y cada
// tanda es un corte de ese mismo array en memoria, no una consulta nueva.
// Solo devuelve los campos que pinta la tarjeta, no el evento entero.
//
// Sin datos privados de por medio: es el mismo catalogo publico que ya sale en
// el HTML de /discover, solo que a trozos.
const MAX_OFFSET = 900

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const tab = sp.get('tab') || 'events'
  const locale = sp.get('locale') || 'es'
  const offset = Math.min(MAX_OFFSET, Math.max(0, Number(sp.get('offset') || 0) || 0))
  const limit = Math.max(1, Math.min(PAGE_SIZE, Number(sp.get('limit') || PAGE_SIZE) || PAGE_SIZE))
  const q = sp.get('q') || undefined
  const genre = sp.get('genre') || undefined
  const zone = sp.get('zone') || undefined
  const date = sp.get('date') || undefined
  const upTo = offset + limit

  if (tab === 'clubs') {
    const rows = await fetchClubsPublic({ q, zone, genre, limit: CATALOG_LIMIT.clubs })
    const slice = rows.slice(offset, upTo)
    return NextResponse.json({ items: slice.map(toClubItem), done: upTo >= rows.length })
  }

  if (tab === 'djs') {
    const rows = await fetchDjsPublic({ q, genre, limit: CATALOG_LIMIT.djs })
    const slice = rows.slice(offset, upTo)
    return NextResponse.json({ items: slice.map(toDjItem), done: upTo >= rows.length })
  }

  const { from, to } = rangeFromDateParam(date)
  const rows = await fetchEvents({
    q, from, to, genre, zone,
    limit: CATALOG_LIMIT.events,
    sponsoredFirst: true,
    grace: date === 'today' ? true : undefined,
  })
  const slice = rows.slice(offset, upTo)
  return NextResponse.json({
    items: slice.map((e) => toEventItem(e, locale)),
    done: upTo >= rows.length,
  })
}
