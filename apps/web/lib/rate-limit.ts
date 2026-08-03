// Limite de peticiones en memoria, por IP y por ruta.
//
// Es defensa best-effort, no una barrera solida: en Vercel cada instancia de
// funcion serverless tiene su propia memoria, asi que con varias instancias
// corriendo a la vez (mas trafico, o varias regiones) el limite real es N
// veces el aqui configurado, no N en total. Sirve para frenar un script que
// itera en bucle desde una sola maquina, no para pararlo del todo.
//
// Para un limite fiable de verdad hace falta un almacen compartido (Vercel
// Firewall, que se activa desde el dashboard sin tocar codigo, o Upstash
// Redis). Se deja anotado en next.config.mjs y en el informe de seguridad;
// no se activa aqui porque requiere una cuenta/servicio que no se puede crear
// sin que el usuario lo decida.
const WINDOW_MS = 60_000

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

// Limpieza perezosa: se poda el mapa cada vez que crece demasiado, en vez de
// con un timer aparte que complicaria el ciclo de vida en serverless.
function prune(now: number) {
  if (buckets.size < 5000) return
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key)
  }
}

export function rateLimit(key: string, limit: number, windowMs = WINDOW_MS): boolean {
  const now = Date.now()
  prune(now)
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (bucket.count >= limit) return false
  bucket.count++
  return true
}

// Vercel expone la IP real del visitante en x-forwarded-for (primer valor de
// la lista); NextRequest.ip no esta disponible en runtime nodejs.
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}
