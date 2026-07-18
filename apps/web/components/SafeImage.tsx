import Image, { ImageProps } from 'next/image'

// Solo pasamos por el optimizador de Next las imagenes de nuestro storage.
// CDNs externos (fourvenues, cloudflare imagedelivery, etc.) pueden bloquear
// el fetch del optimizador y romper la imagen: esas se sirven directas.
const OPTIMIZED_HOSTS = ['.supabase.co', '.supabase.in']

export function SafeImage(props: ImageProps) {
  const src = typeof props.src === 'string' ? props.src : ''
  const unoptimized = !OPTIMIZED_HOSTS.some(h => src.includes(h))
  return <Image {...props} unoptimized={unoptimized} />
}
