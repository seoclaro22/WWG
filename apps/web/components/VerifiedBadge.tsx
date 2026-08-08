// Insignia de perfil verificado. Sale en la ficha, en listados y en resultados,
// siempre pegada al nombre: si aparece suelta no se sabe que esta verificando.
//
// El color es el oro de marca, que en esta interfaz ya significa "esto importa".
// No se usa verde de estado: verde aqui competiria con la semantica de
// disponible/agotado que llevan las entradas.

export function VerifiedBadge({ size = 'md', label = true }: { size?: 'sm' | 'md'; label?: boolean }) {
  const sm = size === 'sm'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-[#d8af3a]/40 bg-[#d8af3a]/12 text-[#d8af3a] font-semibold align-middle ${
        sm ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
      }`}
      title="Perfil verificado por Where We Go"
    >
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
        className={sm ? 'w-2.5 h-2.5' : 'w-3 h-3'}
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.86-9.65a.75.75 0 10-1.22-.87l-3.24 4.53-1.63-1.63a.75.75 0 10-1.06 1.06l2.25 2.25a.75.75 0 001.14-.1l3.76-5.24z"
          clipRule="evenodd"
        />
      </svg>
      {/* El texto no es decorativo: un icono solo no comunica "verificado" a
          quien no conozca la convencion, y ademas queda como unica pista de
          color. En espacios estrechos se puede ocultar con label={false}. */}
      {label && <span>Verificado</span>}
    </span>
  )
}
