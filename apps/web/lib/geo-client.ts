export type Coords = { lat: number; lon: number }

// Geocodificacion directa: de texto libre a coordenadas.
//
// Hace falta para elegir la zona de reemplazo cuando el usuario busca un sitio
// sin agenda. La jerarquia administrativa no sirve para esto: Nominatim
// devuelve "Serra de Tramuntana, Illes Balears" para Soller, sin mencionar
// Mallorca, asi que la unica forma fiable de saber que Soller cae en Mallorca
// y no en Valencia es comparar distancias.
//
// Va contra /api/geocode y no contra Nominatim directamente para que la
// consulta se cachee una vez para todos los visitantes y salga con el
// User-Agent que exige su politica de uso.
//
// Devuelve varios candidatos porque los toponimos se repiten: "Deia" existe en
// Mallorca y en Rumania, y Nominatim pone Rumania primero. Solo comparando
// cada candidato con las zonas que tienen agenda se acierta.
export async function geocodeCandidates(query: string): Promise<Coords[]> {
  const q = query.trim()
  if (!q) return []
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json?.candidates) ? json.candidates : []
  } catch {
    return []
  }
}

// Distancia en kilometros sobre la esfera. Precision de sobra para ordenar
// zonas por cercania.
export function haversineKm(a: Coords, b: Coords): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

// Resolucion de la ciudad del usuario a partir de sus coordenadas.
//
// Estaba dentro de LandingPage; se extrae para que tambien lo use la pagina
// "cerca de mi" sin duplicar la llamada ni las claves de respuesta de Nominatim.
export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
    if (!res.ok) return null
    const json = await res.json()
    const city = json?.address?.city || json?.address?.town || json?.address?.village || json?.address?.county
    const state = json?.address?.state || ''
    const country = json?.address?.country || ''
    const parts = [city, state, country].filter(Boolean)
    return parts[0] ? parts.slice(0, 2).join(', ') : null
  } catch {
    return null
  }
}
