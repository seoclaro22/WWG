// Horario de apertura de un local, de la columna clubs.open_hours a
// schema.org/OpeningHoursSpecification.
//
// El campo es un JSON libre que rellena el dueño de la ficha desde su perfil,
// asi que aqui no se asume nada: lo que no encaje en el formato documentado se
// descarta en silencio. Un horario mal interpretado sale publicado en Google y
// manda a alguien a un local cerrado, que es peor que no declarar horario.
//
// Formato admitido, dia -> franja o franjas:
//   { "vie": "23:30-06:00", "sab": ["18:00-21:00", "23:30-06:00"] }
//
// Se aceptan las abreviaturas y los nombres completos en castellano, ingles y
// aleman. Las horas van en formato 24h HH:MM; una franja que cruza medianoche
// se declara tal cual, que es como lo espera schema.org.

const DIAS: Record<string, string> = {}
const registrar = (dia: string, ...alias: string[]) => {
  for (const a of alias) DIAS[a] = dia
}

registrar('Monday', 'lun', 'lunes', 'mon', 'monday', 'mo', 'montag')
registrar('Tuesday', 'mar', 'martes', 'tue', 'tuesday', 'di', 'dienstag')
registrar('Wednesday', 'mie', 'mié', 'miercoles', 'miércoles', 'wed', 'wednesday', 'mi', 'mittwoch')
registrar('Thursday', 'jue', 'jueves', 'thu', 'thursday', 'do', 'donnerstag')
registrar('Friday', 'vie', 'viernes', 'fri', 'friday', 'fr', 'freitag')
registrar('Saturday', 'sab', 'sáb', 'sabado', 'sábado', 'sat', 'saturday', 'sa', 'samstag')
registrar('Sunday', 'dom', 'domingo', 'sun', 'sunday', 'so', 'sonntag')

const FRANJA = /^([01]?\d|2[0-3]):([0-5]\d)\s*[-–a]\s*([01]?\d|2[0-3]):([0-5]\d)$/

function normalizarHora(h: string, m: string) {
  return `${h.padStart(2, '0')}:${m}`
}

export type Franja = { dia: string; abre: string; cierra: string }

// Pares dia/franja validos, en orden de la semana. Devuelve [] si el campo no
// existe, no es un objeto, o ninguna entrada encaja.
export function parseOpenHours(raw: unknown): Franja[] {
  let valor = raw
  if (typeof valor === 'string') {
    try { valor = JSON.parse(valor) } catch { return [] }
  }
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return []

  const out: Franja[] = []
  for (const [clave, contenido] of Object.entries(valor as Record<string, unknown>)) {
    const dia = DIAS[clave.trim().toLowerCase().replace(/\.$/, '')]
    if (!dia) continue
    const franjas = Array.isArray(contenido) ? contenido : [contenido]
    for (const f of franjas) {
      if (typeof f !== 'string') continue
      const m = f.trim().match(FRANJA)
      if (!m) continue
      out.push({ dia, abre: normalizarHora(m[1], m[2]), cierra: normalizarHora(m[3], m[4]) })
    }
  }

  const orden = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  return out.sort((a, b) => orden.indexOf(a.dia) - orden.indexOf(b.dia))
}

// El bloque tal cual lo espera schema.org. undefined cuando no hay nada valido,
// para poder repartirlo con spread sin dejar la clave vacia en el JSON-LD.
export function openingHoursSpecification(raw: unknown) {
  const franjas = parseOpenHours(raw)
  if (!franjas.length) return undefined
  return franjas.map((f) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: `https://schema.org/${f.dia}`,
    opens: f.abre,
    closes: f.cierra,
  }))
}
