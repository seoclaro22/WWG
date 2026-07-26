import { fetchLineupsForEvents } from '@/lib/db'
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
// Los MusicEvent anidados aqui declaran los mismos campos que la ficha
// individual. Cuando solo llevaban nombre, fecha y sala, Search Console
// avisaba de performer, description, offers, organizer y eventStatus
// ausentes: para Google es un MusicEvent incompleto, aunque el completo
// exista en /event/<id>.
export async function EventListJsonLd({
  events,
  locale,
  name,
}: {
  events: any[]
  locale: string
  name: string
}) {
  if (events.length === 0) return null

  // Una sola consulta para los line-ups de toda la lista, no una por evento.
  const lineups = await fetchLineupsForEvents(events.map((e) => e.id))

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: events.length,
    itemListElement: events.map((e, i) => {
      const images: string[] = Array.isArray(e.images) ? e.images : []
      const url = localizedUrl(`/event/${e.id}`, locale)
      const event: Record<string, unknown> = {
        '@type': 'MusicEvent',
        name: e.name,
        url,
        startDate: e.start_at,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        // La oferta apunta a la ficha, que es donde el usuario continua.
        // El precio solo si lo sabemos: un 0 por defecto afirmaria que la
        // entrada es gratis.
        offers: {
          '@type': 'Offer',
          url,
          availability: 'https://schema.org/InStock',
          ...(e.price_min != null ? { price: e.price_min, priceCurrency: 'EUR' } : {}),
        },
        organizer: { '@type': 'Organization', name: 'Where We Go', url: 'https://wherewego.site' },
      }
      if (e.end_at) event.endDate = e.end_at
      if (images[0]) event.image = images[0]
      if (e.description) event.description = String(e.description).slice(0, 500)
      // Mismo @id y mismo tipo que declara la ficha del DJ: dos tipos
      // distintos sobre el mismo identificador se contradicen.
      const lineup = lineups.get(e.id)
      if (lineup?.length) {
        event.performer = lineup.map((d) => ({
          '@type': 'Person',
          '@id': `https://wherewego.site/dj/${d.id}#dj`,
          name: d.name,
          url: `https://wherewego.site/dj/${d.id}`,
        }))
      }
      // location es obligatorio en Event. Si no se conoce la sala se declara
      // al menos la ciudad, que es lo que si sabemos, igual que hace la ficha.
      if (e.club_name || e.zone) {
        event.location = {
          '@type': e.club_name ? 'MusicVenue' : 'Place',
          name: e.club_name || e.zone,
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
