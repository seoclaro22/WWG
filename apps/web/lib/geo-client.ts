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
