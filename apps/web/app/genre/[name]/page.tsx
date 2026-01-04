import { fetchEvents } from '@/lib/db'
import { EventCard } from '@/components/EventCard'

export default async function GenrePage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name)
  const events = await fetchEvents({ genre: name, limit: 30 })
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{name}</h1>
      <div className="grid gap-3">
        {events.map(e => (
          <EventCard key={e.id} event={{
            id: e.id,
            title: e.name,
            date: new Date(e.start_at).toLocaleString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
            club: e.club_name || '-',
          }} />
        ))}
        {events.length === 0 && <div className="muted">Sin resultados</div>}
      </div>
    </div>
  )
}
