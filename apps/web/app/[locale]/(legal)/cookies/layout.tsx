import { buildAlternates, legalMeta } from '@/lib/seo'

// Mismo motivo que en /privacy: la pagina es "use client" y no puede exportar
// metadata, asi que titulo, descripcion, canonical y hreflang vienen de aqui.
export function generateMetadata({ params }: { params: { locale: string } }) {
  const { title, description } = legalMeta('cookies', params.locale)
  return {
    title,
    description,
    alternates: buildAlternates('/cookies', params.locale),
  }
}

export default function CookiesLayout({ children }: { children: React.ReactNode }) {
  return children
}
