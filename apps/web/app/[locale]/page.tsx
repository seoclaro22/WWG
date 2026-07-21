import { setRequestLocale } from 'next-intl/server'
import { LandingPage } from '@/components/LandingPage'
import { buildAlternates, homeMeta, localizedUrl } from '@/lib/seo'

// La portada es un componente de servidor solo para poder declarar su
// metadata por idioma; toda la interaccion vive en <LandingPage /> (cliente).
export function generateMetadata({ params }: { params: { locale: string } }) {
  const { title, description } = homeMeta(params.locale)
  const url = localizedUrl('/', params.locale)
  return {
    title,
    description,
    alternates: buildAlternates('/', params.locale),
    openGraph: {
      title,
      description,
      url,
      siteName: 'Where We Go',
      type: 'website',
      locale: params.locale,
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default function Home({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale)
  const { description } = homeMeta(locale)

  // WebSite + Organization: consolida el nombre de marca y el logo de cara a
  // como Google presenta el sitio en resultados.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': 'https://wherewego.site/#website',
        url: 'https://wherewego.site',
        name: 'Where We Go',
        alternateName: 'WWG',
        description,
        inLanguage: locale,
        publisher: { '@id': 'https://wherewego.site/#organization' },
      },
      {
        '@type': 'Organization',
        '@id': 'https://wherewego.site/#organization',
        name: 'Where We Go',
        url: 'https://wherewego.site',
        logo: {
          '@type': 'ImageObject',
          url: 'https://wherewego.site/icon.svg',
        },
        areaServed: [
          { '@type': 'Place', name: 'Mallorca' },
          { '@type': 'Place', name: 'Amsterdam' },
        ],
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <LandingPage />
    </>
  )
}
