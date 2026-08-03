import type { Coords } from '@/lib/geo-client'

// La provincia/estado que devuelven Nominatim y Photon basta para saber si un
// sitio esta en una isla: "Illes Balears"/"Islas Baleares"/"Balearic Islands"
// y "Canarias"/"Canary Islands" son las unicas regiones insulares relevantes
// para el area donde opera la web. No hace falta una lista de ciudades: el
// dato ya viene resuelto por el geocodificador para cualquier sitio, presente
// o futuro, dentro de esas dos regiones.
function isIslandState(state: string | null | undefined): boolean {
  if (!state) return false
  const s = state.toLowerCase()
  return s.includes('balear') || s.includes('canar')
}

// Saneado de la consulta antes de reenviarla a Nominatim o Photon.
//
// Sin esto las rutas son un proxy abierto: cualquiera puede iterar cadenas
// aleatorias, que nunca aciertan en la cache de la CDN, y generar trafico
// ilimitado contra esos servicios con nuestro User-Agent, que nos identifica.
// El resultado seria que bloqueen el dominio.
//
// Un nombre de sitio no necesita mas de 80 caracteres ni simbolos raros: se
// permiten letras (con acentos), numeros, espacios y los separadores que
// aparecen en toponimos reales.
const MAX_QUERY_LENGTH = 80

export function sanitizeGeoQuery(raw: string | null | undefined): string | null {
  if (!raw) return null
  const q = raw
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}\s'.,\-\/]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (q.length < 2 || q.length > MAX_QUERY_LENGTH) return null
  return q
}

// Geocodificacion en el servidor.
//
// Se hace aqui y no en el navegador por dos motivos: la politica de Nominatim
// exige un User-Agent que identifique a la aplicacion (el navegador no deja
// fijarlo), y asi una misma busqueda se resuelve una vez para todos los
// usuarios en vez de una vez por visitante.
const NOMINATIM_UA = 'WhereWeGo/1.0 (https://wherewego.site)'

// Los sitios no se mueven: cachear una semana es conservador y deja el
// trafico contra Nominatim en practicamente nada.
const GEOCODE_TTL_SECONDS = 7 * 24 * 60 * 60

// Varios candidatos, no solo el primero: los nombres de pueblo se repiten por
// el mundo y el mas "importante" para Nominatim no suele ser el que busca el
// usuario. "Deia" devuelve primero un pueblo de Rumania, y el de Mallorca es
// el segundo. Quien llama desempata por cercania a las zonas con agenda.
const MAX_CANDIDATES = 5

export async function geocodeCandidatesServer(query: string): Promise<Coords[]> {
  const q = query.trim()
  if (!q) return []
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=${MAX_CANDIDATES}&q=${encodeURIComponent(q)}`,
      {
        headers: { 'User-Agent': NOMINATIM_UA },
        next: { revalidate: GEOCODE_TTL_SECONDS },
      },
    )
    if (!res.ok) return []
    const json = await res.json()
    if (!Array.isArray(json)) return []
    return json
      .map((hit: any) => ({
        lat: Number(hit.lat),
        lon: Number(hit.lon),
        island: isIslandState(hit.address?.state),
      }))
      .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lon))
  } catch {
    return []
  }
}

export async function geocodePlaceServer(query: string): Promise<Coords | null> {
  const [first] = await geocodeCandidatesServer(query)
  return first ?? null
}

// Sugerencias de ciudad mientras el usuario escribe.
//
// Aqui NO sirve Nominatim: no busca por prefijo, asi que "madri" no le lleva a
// Madrid sino a una aldea de India que se llama asi, y el calculo de cercania
// acaba proponiendo Amsterdam. Photon es del mismo ecosistema OSM pero esta
// hecho para autocompletar, y "madri" si devuelve Madrid.
//
// Se filtra a ciudades y pueblos para no sugerir calles ni comercios.
const PHOTON_URL = 'https://photon.komoot.io/api'
const SUGGEST_TTL_SECONDS = 24 * 60 * 60
const MAX_SUGGESTIONS = 5

export type CitySuggestion = Coords & { name: string; label: string }

export async function suggestCitiesServer(query: string): Promise<CitySuggestion[]> {
  const q = query.trim()
  if (!q) return []
  try {
    const url =
      `${PHOTON_URL}?q=${encodeURIComponent(q)}&limit=${MAX_SUGGESTIONS}` +
      `&osm_tag=place:city&osm_tag=place:town`
    const res = await fetch(url, { next: { revalidate: SUGGEST_TTL_SECONDS } })
    if (!res.ok) return []
    const json = await res.json()
    const features = Array.isArray(json?.features) ? json.features : []
    return features
      .map((f: any) => {
        const p = f?.properties || {}
        const [lon, lat] = f?.geometry?.coordinates || []
        // El pais desambigua para el usuario: hay un Madrid en Iowa y otro en
        // Colombia, y sin el la lista se ve como el mismo nombre repetido.
        const label = [p.name, p.country].filter(Boolean).join(', ')
        return { name: String(p.name || ''), label, lat: Number(lat), lon: Number(lon), island: isIslandState(p.state) }
      })
      .filter((c: CitySuggestion) => c.name && Number.isFinite(c.lat) && Number.isFinite(c.lon))
  } catch {
    return []
  }
}
