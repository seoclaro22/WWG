// Las imagenes de nuestro storage las redimensiona Supabase, no Vercel.
//
// El optimizador de Vercel tiene un tope de 5000 transformaciones al mes y,
// una vez agotado, devuelve 402 Payment Required en lugar de la imagen. En
// produccion eso se veia como imagenes rotas a medias: los tamanos ya
// cacheados seguian saliendo y los nuevos no, asi que en movil (que pide
// anchos distintos a los del escritorio) faltaban casi todas.
//
// Supabase transforma desde el mismo storage con /render/image/ en vez de
// /object/, sin tope de transformaciones. Verificado sobre una imagen real:
// 128px -> 8.6 KB, 256px -> 16 KB, 640px -> 26.7 KB, frente a 51.7 KB del
// original. No amplia por encima del tamano de origen ni falla al pedir
// anchos mayores, asi que no hace falta acotar el ancho.
const SUPABASE_OBJECT = '/storage/v1/object/public/'
const SUPABASE_RENDER = '/storage/v1/render/image/public/'

export default function imageLoader({
  src,
  width,
  quality,
}: {
  src: string
  width: number
  quality?: number
}): string {
  // Cualquier cosa que no salga de nuestro storage se sirve tal cual. Los CDN
  // ajenos (fourvenues, imagedelivery) ya llegan aqui con unoptimized desde
  // SafeImage, asi que en la practica esto solo cubre rutas locales.
  if (!src.includes(SUPABASE_OBJECT)) return src

  const url = src.replace(SUPABASE_OBJECT, SUPABASE_RENDER)
  const sep = url.includes('?') ? '&' : '?'
  // resize=contain es obligatorio, no un extra. Con solo width, Supabase
  // estrecha la imagen y le deja el alto original: una foto de 2560x1707
  // pedida a 400 sale 400x1707, deformada. Con contain sale 400x267, que es
  // la proporcion real. Verificado sobre imagenes cuadradas y apaisadas.
  return `${url}${sep}width=${width}&resize=contain&quality=${quality || 75}`
}
