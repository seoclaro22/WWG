"use client"

// Splash de carga entre rutas.
//
// Vive en components/ y no como un unico app/[locale]/loading.tsx porque un
// loading.tsx abre un limite de Suspense: Next envia la cabecera de respuesta
// antes de renderizar la pagina, y a partir de ahi notFound() ya no puede
// fijar el 404, con lo que toda URL invalida devolvia 200 (soft 404).
//
// Por eso solo se monta en las rutas que no pueden fallar por slug. Las que
// resuelven un identificador (zona, club, DJ, evento) se quedan sin splash a
// proposito, para conservar el 404 real.
export default function RouteSplash() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0F14]">
      <div className="text-center">
        <div className="text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text wwg-gold-sheen">
          WWG
        </div>
        <div className="mt-2 text-xs md:text-sm tracking-[0.35em] text-white/70 wwg-neon">
          WHERE WE GO
        </div>
      </div>
    </div>
  )
}
