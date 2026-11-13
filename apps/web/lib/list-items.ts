import { formatEventDate } from '@/lib/seo-pages'
import { nightDayStartMs, nightRangeIso } from '@/lib/event-night'

// Forma de las tarjetas de los listados largos.
//
// Vive aparte porque ahora hay dos sitios que la producen: el render del
// servidor, que pinta la primera tanda, y /api/list, que sirve las siguientes
// cuando el visitante pulsa "Cargar mas". Las dos tienen que devolver
// exactamente los mismos campos o la lista cambiaria de aspecto a mitad.
//
// Se recorta aqui y no en el cliente para no mandar por la red el evento
// entero (descripcion incluida) cuando la tarjeta usa seis campos.

export type EventItem = {
  id: string
  slug?: string | null
  title: string
  title_i18n?: Record<string, string>
  date: string
  club: string
  image?: string
  sponsored: boolean
}

export type ClubItem = {
  id: string
  slug?: string | null
  name: string
  address?: string | null
  zone?: string | null
  image?: string | null
  verified?: boolean | null
  description?: string | null
  description_i18n?: Record<string, string> | null
}

export type DjItem = {
  id: string
  slug?: string | null
  name: string
  name_i18n?: Record<string, string> | null
  short_bio?: string | null
  short_bio_i18n?: Record<string, string> | null
  bio?: string | null
  bio_i18n?: Record<string, string> | null
  genres?: string[] | null
  image?: string | null
  verified?: boolean | null
}

export function toEventItem(e: any, locale: string): EventItem {
  const imgs: string[] = Array.isArray(e.images) ? e.images : []
  return {
    id: e.id,
    slug: e.slug,
    title: e.name,
    title_i18n: e.name_i18n || undefined,
    // La fecha se formatea en servidor: hacerlo en el cliente obligaria a
    // mandar el locale y el formateador a cada tarjeta.
    date: formatEventDate(e.start_at, locale),
    club: e.club_name || '-',
    image: imgs.length ? imgs[0] : undefined,
    sponsored: e.sponsored || false,
  }
}

export function toClubItem(c: any): ClubItem {
  const imgs: string[] = Array.isArray(c.images) ? c.images : []
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    address: c.address,
    zone: c.zone,
    image: imgs[0] || c.logo_url || null,
    verified: c.verified,
    description: c.description || null,
    description_i18n: c.description_i18n || null,
  }
}

export function toDjItem(dj: any): DjItem {
  const imgs: string[] = Array.isArray(dj.images) ? dj.images : []
  return {
    id: dj.id,
    slug: dj.slug,
    name: dj.name,
    name_i18n: dj.name_i18n,
    short_bio: dj.short_bio,
    short_bio_i18n: dj.short_bio_i18n,
    bio: dj.bio,
    bio_i18n: dj.bio_i18n,
    genres: dj.genres,
    image: imgs[0] || null,
    verified: dj.verified,
  }
}

// Cuantas tarjetas pinta el servidor antes del boton. /discover llegaba a
// renderizar las 439 de golpe: 2,47 MB de HTML por visita, y eso multiplicado
// por tres idiomas. Casi nadie baja mas de una pantalla o dos.
export const PAGE_SIZE = 48

// Tope de la consulta al catalogo, identico en la pagina y en /api/list.
//
// Tiene que ser el mismo numero en los dos sitios y no "lo que necesite esta
// tanda": el limite forma parte de la clave de cache (lib/query-cache.ts), asi
// que pedir 48, luego 96, luego 144 abriria una entrada nueva por tanda y cada
// una bajaria la lista entera de Supabase otra vez. Con un tope fijo hay una
// sola entrada por combinacion de filtros y cada tanda es un corte de esa
// misma lista ya cacheada.
export const CATALOG_LIMIT = { events: 600, clubs: 300, djs: 900 } as const

// Ventana temporal a partir del chip de fecha (hoy, manana, finde...).
// La usan la pagina y /api/list, y tienen que coincidir: si el boton
// "Cargar mas" calculase otro rango, la segunda tanda traeria eventos que no
// encajan con los de arriba.
export function rangeFromDateParam(dateParam?: string) {
  if (!dateParam) return {}
  // "Hoy" es la noche en curso, no el dia del reloj: a las 02:00 del sabado
  // sigue siendo viernes. Toda esa cuenta vive en lib/event-night.ts.
  if (dateParam === 'today' || dateParam === 'tomorrow' || dateParam === 'weekend' || dateParam === 'week') {
    return nightRangeIso(dateParam)
  }
  const startOfDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const endOfDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59))
  let from: Date | undefined
  let to: Date | undefined
  if (dateParam === 'month') {
    const today = new Date(nightDayStartMs())
    from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
    to = endOfDay(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)))
  } else {
    const parsed = new Date(dateParam)
    if (!isNaN(parsed.getTime())) { from = startOfDay(parsed); to = endOfDay(parsed) }
  }
  const fmt = (d?: Date) => (d ? d.toISOString() : undefined)
  return { from: fmt(from), to: fmt(to) }
}
