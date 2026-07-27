// Clave normalizada de zona: sin acentos, sin puntuacion y en minusculas, para
// comparar "Castellon", "castellon" y "CASTELLON" como la misma cosa.
//
// Vive fuera de zones-client.ts porque ese modulo es "use client" y el servidor
// tambien necesita normalizar (rutas de api).
export function normalizeZoneKey(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
