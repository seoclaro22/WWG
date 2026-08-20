// Un solo sitio donde se decide el trozo variable de /club/x, /dj/x y /event/x.
//
// Se prefiere el slug, pero se cae al id cuando falta. Ese respaldo importa:
// el slug lo pone un trigger al insertar, y si ese trigger fallara o alguien
// metiera una fila a mano, la ficha seguiria siendo accesible por UUID en vez
// de dar 404. Las rutas aceptan las dos formas.
type ConSlug = { id: string; slug?: string | null }

export function clubPath(c: ConSlug) {
  return `/club/${c.slug || c.id}`
}

export function djPath(d: ConSlug) {
  return `/dj/${d.slug || d.id}`
}

export function eventPath(e: ConSlug) {
  return `/event/${e.slug || e.id}`
}

// Los generos no viven en una tabla con slug propio: son cadenas dentro del
// array `genres` de eventos y DJs, y la URL se construia con
// encodeURIComponent del nombre. Eso publicaba URLs como
// /mallorca/genre/Global%20Hits, con el %20 dentro del slug.
//
// El slug se calcula del nombre en vez de leerse de la base de datos para que
// enlazar no cueste una consulta: la resolucion inversa (slug -> nombre) si
// necesita el mapa, y esta en db.ts.
//
// Mismo algoritmo que slugifyZone: se repite aqui porque este modulo lo
// importan componentes de cliente y db.ts arrastra el cliente de servidor de
// Supabase.
export function genreSlug(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// El segmento de la URL tambien se traduce, como "hoy"/"today"/"heute": un
// sitio en castellano con una palabra en ingles en la URL ("genre") no
// encaja con como busca ese idioma, y para en/de es justo la palabra que se
// espera. Alemán toma prestada la misma palabra que ingles (uso habitual).
const GENRE_SEGMENT: Record<string, string> = { es: 'genero', en: 'genre', de: 'genre' }

export function genreSegment(locale: string) {
  return GENRE_SEGMENT[locale] || GENRE_SEGMENT.es
}

export function genrePath(name: string, locale: string) {
  return `/${genreSegment(locale)}/${genreSlug(name)}`
}

export function zoneGenrePath(zoneSlug: string, name: string, locale: string) {
  return `/${zoneSlug}/${genreSegment(locale)}/${genreSlug(name)}`
}
