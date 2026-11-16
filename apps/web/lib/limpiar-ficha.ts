// Limpieza de los textos de ficha (bio de DJ, descripcion de club) antes de
// pintarlos o mandarlos a meta y JSON-LD.
//
// Muchos de esos textos se generaron con un asistente y llegaron a la base de
// datos con su andamiaje: cabeceras con emoji ("📋 PERFIL DEL ARTISTA"),
// negritas markdown, lineas de relleno ("Nombre real: (No divulgado
// publicamente)") y restos de la respuesta del asistente ("Instagram +1",
// "Biografia (5-7 lineas):", "no lo publicare sin una fuente fiable"). Eso es
// justo la huella de contenido automatico que Google penaliza, y al lector no
// le dice nada. Aqui solo se quita forma y relleno; el texto con contenido
// real se queda tal cual. El dato original en la base de datos no se toca.

const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{FFFD}]/gu

// Valor de relleno: la linea entera sobra si su valor es uno de estos.
const RELLENO = /(no divulgad|no disponible|no verificad|desconocid|no public|sin datos|sin confirmar|^n\/?d\.?$|^-+$)/i

// Cabeceras de plantilla que no aportan nada al lector.
const CABECERA = /^(perfil del artista|ficha del club|biograf[ií]a|trayectoria)\b[^:]*:?$/i

// Etiquetas que repiten el H1 de la ficha.
const ETIQUETA_NOMBRE = /^nombre( art[ií]stico)?\s*:/i

// Restos de citas del asistente: "Instagram +1", "YouTube +3", " +2" al final.
const SOLO_RED = /^(instagram|youtube|facebook|tiktok|soundcloud|spotify|resident advisor|web)(\s*\+\d+)?$/i
const CITA_FINAL = /(\s+\+\d+)+\s*$/

// Frases del asistente hablando de si mismo, entre parentesis.
const META_ASISTENTE = /\s*\([^)]*(publicar[eé]|fuente fiable|no he podido|no encontr)[^)]*\)/gi

function limpiarLinea(linea: string): string | null {
  let l = linea.replace(EMOJI, '').replace(/\*\*|__/g, '').replace(META_ASISTENTE, '')
  l = l.replace(/^\s*[•\-*·]\s*/, '').replace(CITA_FINAL, '').trim()
  if (!l) return ''
  if (CABECERA.test(l) || SOLO_RED.test(l) || ETIQUETA_NOMBRE.test(l)) return null
  const dosPuntos = l.indexOf(':')
  if (dosPuntos > 0 && dosPuntos < 40) {
    const valor = l.slice(dosPuntos + 1).replace(/[()]/g, '').trim()
    if (!valor || RELLENO.test(valor)) return null
  }
  return l
}

export function limpiarFicha(texto: string | null | undefined): string {
  if (!texto) return ''
  const lineas: string[] = []
  for (const bruta of String(texto).split(/\r?\n/)) {
    const l = limpiarLinea(bruta)
    if (l === null) continue
    lineas.push(l)
  }
  return lineas.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

// Version por idioma, para limpiar en el servidor antes de pasar el texto a un
// componente cliente: si no, el texto en bruto viaja igual en el payload RSC.
export function limpiarI18n(i18n: Record<string, string> | null | undefined) {
  if (!i18n) return null
  return Object.fromEntries(Object.entries(i18n).map(([k, v]) => [k, limpiarFicha(v)]))
}

// Para meta description: el primer parrafo narrativo, saltando las lineas
// "Etiqueta: valor" de la ficha. Si no hay ninguno, el texto limpio entero.
export function resumenFicha(texto: string | null | undefined): string {
  const limpio = limpiarFicha(texto)
  const parrafo = limpio
    .split('\n')
    .find((l) => l.length >= 80 && !/^[^:]{1,40}:\s/.test(l))
  return parrafo || limpio.replace(/\n+/g, ' ')
}
