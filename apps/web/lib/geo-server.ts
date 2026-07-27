import type { Coords } from '@/lib/geo-client'

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
      `https://nominatim.openstreetmap.org/search?format=json&limit=${MAX_CANDIDATES}&q=${encodeURIComponent(q)}`,
      {
        headers: { 'User-Agent': NOMINATIM_UA },
        next: { revalidate: GEOCODE_TTL_SECONDS },
      },
    )
    if (!res.ok) return []
    const json = await res.json()
    if (!Array.isArray(json)) return []
    return json
      .map((hit: any) => ({ lat: Number(hit.lat), lon: Number(hit.lon) }))
      .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lon))
  } catch {
    return []
  }
}

export async function geocodePlaceServer(query: string): Promise<Coords | null> {
  const [first] = await geocodeCandidatesServer(query)
  return first ?? null
}
