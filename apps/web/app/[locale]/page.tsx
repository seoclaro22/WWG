import { setRequestLocale } from 'next-intl/server'
import { LandingPage } from '@/components/LandingPage'
import { buildAlternates, homeMeta, localizedUrl } from '@/lib/seo'
import { countUpcomingEvents, fetchClubsPublic, fetchEvents, fetchZonesMap } from '@/lib/db'

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

export default async function Home({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale)
  const { description } = homeMeta(locale)

  // La portada es la pagina con mas autoridad del sitio y no enlazaba ni una
  // sola ciudad, ficha o pagina temporal: todo el peso se quedaba en si misma.
  // Se pasan las zonas reales a LandingPage para que renderice un enlace por
  // ciudad, real y en el HTML inicial, no solo alcanzable escribiendo en el buscador.
  const [zonesMap, eventCount, clubs, nextEvents] = await Promise.all([
    fetchZonesMap(),
    countUpcomingEvents(),
    fetchClubsPublic({ limit: 1000 }),
    // Los tres eventos mas proximos, patrocinados primero. Es el unico sitio
    // desde el que la portada enlaza fichas concretas: hasta ahora los 120
    // eventos solo colgaban de /discover.
    fetchEvents({ limit: 3, sponsoredFirst: true }),
  ])
  const cities = Array.from(zonesMap.entries()).map(([slug, name]) => ({ slug, name }))
  // Cifras reales de la agenda, no rotulos fijos: si un dia no hay eventos
  // publicados la franja se oculta sola en vez de anunciar un catalogo vacio.
  const stats = { events: eventCount, clubs: clubs.length, cities: cities.length }

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
        // Declara el buscador del sitio: es lo que habilita la caja de
        // busqueda propia bajo el resultado de marca en Google.
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${localizedUrl('/discover', locale)}?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
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
        // Sin areaServed a proposito: la cobertura crece con cada ciudad nueva
        // y son las paginas de zona las que declaran el ambito geografico.
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <LandingPage
        cities={cities}
        locale={locale}
        stats={stats}
        events={nextEvents.map((e) => ({
          id: e.id,
          name: e.name,
          start_at: e.start_at,
          club_name: e.club_name,
          image: Array.isArray(e.images) ? e.images[0] ?? null : null,
        }))}
      />
    </>
  )
}
