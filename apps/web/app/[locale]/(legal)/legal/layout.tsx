import { buildAlternates, legalMeta } from '@/lib/seo'

// La pagina es "use client" para poder servir el texto en los tres idiomas
// desde el propio componente, y eso impide exportar metadata desde ella. Este
// layout, que si es servidor, aporta titulo, descripcion, canonical y hreflang.
export function generateMetadata({ params }: { params: { locale: string } }) {
  const { title, description } = legalMeta('legal', params.locale)
  return {
    title,
    description,
    alternates: buildAlternates('/legal', params.locale),
  }
}

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return children
}
