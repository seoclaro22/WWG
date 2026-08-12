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
