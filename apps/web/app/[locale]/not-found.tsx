"use client"
import { Link } from '@/lib/navigation'
import { useI18n } from '@/lib/i18n'
import { noEncontrado } from '@/lib/seo-pages'

// Boundary de 404 de todo el arbol de idioma. Va dentro de [locale] y no en la
// raiz porque el <html>/<body> y la cabecera viven en [locale]/layout.tsx: la
// pagina de serie de Next se renderiza fuera de ese layout y por eso salia en
// negro y vacia.
//
// Es cliente para leer el idioma del contexto: not-found.tsx no recibe params.
export default function NotFound() {
  const { locale } = useI18n()
  const t = noEncontrado(locale)

  return (
    <div className="relative -mx-4 md:-mx-6 lg:-mx-10 px-4 md:px-6 lg:px-10 py-8 md:py-10 min-h-[70vh] rounded-[28px] border border-[#d8af3a]/10 bg-[#07060a]">
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-base opacity-50" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-aurora opacity-40" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-vignette" />

      <div className="relative z-10 min-h-[60vh] flex flex-col items-center justify-center text-center gap-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70">{t.code}</p>
        <h1 className="text-3xl font-bold text-white">{t.title}</h1>
        <p className="text-sm text-white/60 max-w-md">{t.text}</p>
        <div className="flex flex-wrap gap-2 justify-center mt-2">
          <Link href="/" className="btn btn-secondary text-sm px-4 py-2">{t.home}</Link>
          <Link href="/discover" className="btn btn-primary text-sm px-4 py-2">{t.discover}</Link>
        </div>
      </div>
    </div>
  )
}
