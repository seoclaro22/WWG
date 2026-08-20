// Las imagenes de nuestro storage se sirven ya redimensionadas, sin pasar por
// ningun optimizador en tiempo de peticion.
//
// Historia: primero se uso el optimizador de Vercel (tope de 5000
// transformaciones al mes, al agotarse devuelve 402 y las imagenes salen rotas
// a medias). Se cambio a /render/image/ de Supabase creyendo que no tenia
// tope, pero si lo tiene y es mucho mas bajo: el plan Pro incluye 100
// "imagenes origen" distintas por ciclo de facturacion, contadas por imagen
// unica y no por transformacion. Un directorio con cientos de fichas lo supera
// siempre, y al superarlo el proyecto entra en modo solo lectura.
//
// Solucion: los tamanos se generan una vez al subir (components/UploadImage.tsx)
// y se guardan como objetos independientes. Aqui solo se elige cual pedir, asi
// que el contador de transformaciones se queda en cero.
//
// La URL guardada en la base de datos declara que variantes existen:
//
//   .../object/public/media/events/1737-flyer.webp?v=256,640
//
// que significa que ademas del fichero base hay un _256.webp y un _640.webp al
// lado. Sin ese ?v= la imagen es antigua (subida antes de este cambio) y se
// sirve tal cual: pesa mas, pero nunca se rompe. Eso permite migrar las
// imagenes viejas poco a poco en vez de con un corte seco.
const SUPABASE_OBJECT = '/storage/v1/object/public/'

export default function imageLoader({
  src,
  width,
}: {
  src: string
  width: number
  quality?: number
}): string {
  // Cualquier cosa que no salga de nuestro storage se sirve tal cual. Los CDN
  // ajenos (fourvenues, imagedelivery) ya llegan aqui con unoptimized desde
  // SafeImage, asi que en la practica esto solo cubre rutas locales.
  if (!src.includes(SUPABASE_OBJECT)) return src

  const declared = /[?&]v=([\d,]+)/.exec(src)
  // Imagen sin variantes generadas: se devuelve intacta, incluida su query.
  if (!declared) return src

  const q = src.indexOf('?')
  const base = q === -1 ? src : src.slice(0, q)

  const widths = declared[1]
    .split(',')
    .map((n) => parseInt(n, 10))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b)

  // La mas pequena que cubra el ancho pedido. Si ninguna llega, el fichero
  // base ya es el mayor que se genero.
  const pick = widths.find((w) => w >= width)
  if (pick === undefined) return base

  const dot = base.lastIndexOf('.')
  return dot === -1
    ? `${base}_${pick}`
    : `${base.slice(0, dot)}_${pick}${base.slice(dot)}`
}
