import { localizedUrl } from '@/lib/seo'

// ItemList de MusicEvent para las paginas de listado (zona, temporal, genero).
//
// Las fichas de evento ya emiten su MusicEvent individual, pero los listados
// no declaraban nada: para un buscador eran una pared de enlaces. Con esto la
// pagina dice explicitamente que contiene una lista ordenada de eventos, con
// que fecha y en que sala, que es lo que permite que la entiendan tanto Google
// como los modelos que hoy citan resultados.
//
// Se declara solo lo que se puede afirmar con los datos que hay. Un evento sin
// club conocido no inventa lugar: se omite el campo.
export function EventListJsonLd({
  events,
  locale,
  name,
}: {
  events: any[]
  locale: string
  name: string
}) {
  if (events.length === 0) return null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: events.length,
    itemListElement: events.map((e, i) => {
      const images: string[] = Array.isArray(e.images) ? e.images : []
      const event: Record<string, unknown> = {
        '@type': 'MusicEvent',
        name: e.name,
        url: localizedUrl(`/event/${e.id}`, locale),
        startDate: e.start_at,
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      }
      if (e.end_at) event.endDate = e.end_at
      if (images[0]) event.image = images[0]
      if (e.club_name) {
        event.location = {
          '@type': 'MusicVenue',
          name: e.club_name,
          ...(e.zone ? { address: { '@type': 'PostalAddress', addressLocality: e.zone } } : {}),
        }
      }
      return { '@type': 'ListItem', position: i + 1, item: event }
    }),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
    />
  )
}
