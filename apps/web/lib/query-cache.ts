import { cache } from 'react'
import { unstable_cache } from 'next/cache'

// Cacheo de las lecturas a Supabase en dos capas.
//
// El motivo es el consumo de CPU en Vercel: una sola pagina de zona resolvia
// la misma consulta varias veces (generateMetadata y el componente llaman los
// dos a resolveZoneSlug; fetchZoneFacts y fetchZoneGenreCounts piden
// exactamente los mismos eventos), y /discover, que es force-dynamic, repetia
// el listado entero en cada visita, bots incluidos.
//
//  1. cache() de React deduplica dentro de un mismo render: la segunda llamada
//     identica reutiliza la promesa de la primera y no vuelve a salir a la red.
//  2. unstable_cache guarda el resultado en el Data Cache entre peticiones,
//     con el mismo TTL que el revalidate de las paginas.
//
// La clave la construye stableStringify y no el objeto de parametros tal cual:
// cache() compara los argumentos por identidad, asi que dos objetos literales
// iguales pero distintos (el caso de fetchZoneFacts/fetchZoneGenreCounts) no se
// deduplicarian nunca.
export const DEFAULT_TTL = 60

// JSON con las claves ordenadas y sin undefined: {zone:'Ibiza',limit:500} y
// {limit:500,zone:'Ibiza'} tienen que dar la misma cadena.
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`
}

/**
 * Envuelve una lectura en las dos capas de cache.
 *
 * `load` debe LANZAR si la consulta falla, nunca devolver un valor vacio: un
 * fallo de Supabase que se resolviera como [] se quedaria cacheado y la web se
 * veria vacia durante todo el TTL aunque la base ya hubiera vuelto. Next no
 * guarda las promesas rechazadas, asi que lanzando se reintenta a la siguiente
 * peticion. Quien llama decide que devolver en ese caso.
 */
export function cachedRead<P, R>(
  name: string,
  load: (params: P) => Promise<R>,
  ttl: number = DEFAULT_TTL,
): (params: P) => Promise<R> {
  const fromDataCache = unstable_cache(
    async (key: string) => load(JSON.parse(key) as P),
    [name],
    { revalidate: ttl, tags: [name] },
  )
  const deduped = cache((key: string) => fromDataCache(key))
  return (params: P) => deduped(stableStringify(params))
}

/**
 * Solo la deduplicacion por render, sin Data Cache. Para lo que no es
 * serializable (Map, Set) o no debe congelarse entre peticiones.
 */
export function dedupedRead<P, R>(load: (params: P) => Promise<R>): (params: P) => Promise<R> {
  const deduped = cache((key: string) => load(JSON.parse(key) as P))
  return (params: P) => deduped(stableStringify(params))
}
