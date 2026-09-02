import { Link } from '@/lib/navigation'
import { T } from '@/components/T'
import { buildAlternates } from '@/lib/seo'

// Pagina de gracias del formulario de contacto. Antes el envio con exito se
// quedaba en /contact?ok=1 con un aviso encima del propio formulario: mismo
// mensaje para "escribo por primera vez" que para "acabo de enviar", y sin
// URL propia que confirmar en Analytics como conversion.
export function generateMetadata({ params }: { params: { locale: string } }) {
  return {
    alternates: buildAlternates('/thanks', params.locale),
    robots: { index: false, follow: true },
  }
}

export default function ThanksPage() {
  return (
    <div className="relative -mx-4 md:-mx-6 lg:-mx-10 min-h-[100vh] rounded-[28px] bg-[#07060a] overflow-hidden">
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-base opacity-50" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-vignette" />

      <div className="relative z-10 px-4 md:px-6 lg:px-10 py-10 space-y-6 max-w-lg mx-auto text-center flex flex-col items-center justify-center min-h-[70vh]">
        <div className="w-14 h-14 rounded-full bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight"><T k="thanks.title" /></h1>
        <p className="text-white/60 text-base leading-relaxed"><T k="thanks.body" /></p>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-2xl bg-[#d8af3a] text-black font-bold text-sm shadow-[0_0_20px_rgba(216,175,58,0.35)] hover:bg-[#e8c85a] hover:shadow-[0_0_28px_rgba(216,175,58,0.5)] transition-all"
        >
          <T k="thanks.cta" />
        </Link>
      </div>
    </div>
  )
}
