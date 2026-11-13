// La "noche" de un evento.
//
// Las fechas de la base son la hora de pared de Espana guardada tal cual con
// etiqueta UTC (las 23:00 de Madrid se guardan como 23:00Z), y el extractor
// resta un dia a todo lo que empieza de madrugada (00:00-07:59): la fiesta que
// arranca el sabado a las 00:30 se guarda como "viernes 00:30", porque para
// quien sale es la noche del viernes. El end_at se desplaza con ella.
//
// De ahi salen las dos reglas de este archivo, que usan todos los listados:
//  - un evento sigue vivo hasta su final REAL (end_at + 24h si es de madrugada)
//  - "hoy" no cambia a medianoche: hasta las 06:00 sigue siendo la noche anterior

const TZ = 'Europe/Madrid'
export const DAY_MS = 24 * 60 * 60 * 1000
// Mismo corte que el extractor (dashboard.html: localHour < 8).
const SHIFTED_BEFORE_HOUR = 8
// Hora a la que "hoy" pasa a ser el dia siguiente.
const NIGHT_ENDS_HOUR = 6
// Si un evento no trae end_at se le supone esta duracion.
const DEFAULT_DURATION_MS = 6 * 60 * 60 * 1000

// Hora de pared de Espana expresada en la misma escala que start_at/end_at.
export function wallNowMs(now: Date = new Date()): number {
  const p: Record<string, number> = {}
  for (const part of new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(now)) {
    if (part.type !== 'literal') p[part.type] = Number(part.value)
  }
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
}

export function realEndMs(startAt: string, endAt?: string | null): number {
  const start = new Date(startAt).getTime()
  const end = endAt ? new Date(endAt).getTime() : start + DEFAULT_DURATION_MS
  return new Date(startAt).getUTCHours() < SHIFTED_BEFORE_HOUR ? end + DAY_MS : end
}

export function isStillOn(startAt: string, endAt?: string | null, wallMs: number = wallNowMs()): boolean {
  return realEndMs(startAt, endAt) >= wallMs
}

// 00:00 del dia al que pertenece la noche en curso.
export function nightDayStartMs(wallMs: number = wallNowMs()): number {
  const d = new Date(wallMs)
  const base = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  return d.getUTCHours() < NIGHT_ENDS_HOUR ? base - DAY_MS : base
}

export type NightKey = 'today' | 'tomorrow' | 'weekend' | 'week'

// Ventana [fromMs, toMs) sobre start_at. Como los eventos de madrugada ya
// estan guardados en el dia de su noche, basta con dias naturales enteros.
export function nightRange(key: NightKey, wallMs: number = wallNowMs()): { fromMs: number; toMs: number } {
  const today = nightDayStartMs(wallMs)
  switch (key) {
    case 'today': return { fromMs: today, toMs: today + DAY_MS }
    case 'tomorrow': return { fromMs: today + DAY_MS, toMs: today + 2 * DAY_MS }
    case 'week': return { fromMs: today, toMs: today + 7 * DAY_MS }
    case 'weekend': {
      // Viernes a domingo. En sabado o domingo es el fin de semana en curso.
      const day = new Date(today).getUTCDay() // 0 domingo ... 5 viernes, 6 sabado
      const toFriday = day === 0 ? -2 : 5 - day
      const friday = today + toFriday * DAY_MS
      return { fromMs: Math.max(friday, today), toMs: friday + 3 * DAY_MS }
    }
  }
}

// Lo mismo en ISO para las consultas (gte from, lte to).
export function nightRangeIso(key: NightKey, wallMs: number = wallNowMs()): { from: string; to: string } {
  const { fromMs, toMs } = nightRange(key, wallMs)
  return { from: new Date(fromMs).toISOString(), to: new Date(toMs - 1000).toISOString() }
}
