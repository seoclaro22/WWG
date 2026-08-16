import type { ResumenFicha } from '@/lib/seo-pages'

// Frase de respuesta de las fichas de club, DJ y evento.
//
// Existe para que la pagina tenga una frase que se pueda citar entera: los
// datos ya estaban en la ficha, pero repartidos entre el hero, los chips y la
// agenda, asi que ni un asistente ni un fragmento de Google podian sacar de
// aqui una respuesta completa.
//
// Sin caja ni tabla: la direccion, los estilos y la agenda ya se ven mas
// abajo en la propia ficha, asi que repetirlos aqui en una tarjeta aparte
// solo añadia un bloque de datos donde el usuario esperaba seguir leyendo.
// Se muestra como una linea de apoyo, igual de discreta que un pie de foto.
export function AnswerBlock({ resumen }: { resumen: ResumenFicha }) {
  return (
    <p className="text-sm text-white/55 leading-relaxed">{resumen}</p>
  )
}
