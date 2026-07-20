import Link from 'next/link'
import { fetchEvents } from '@/lib/db'
import { EventCard } from '@/components/EventCard'

export async function generateMetadata({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name)
  const title = `Eventos de ${name} en Mallorca`
  const description = `Descubre los proximos eventos de ${name} en Mallorca: discotecas, DJs y fiestas de musica ${name}. Agenda actualizada a diario con Where We Go.`
  return {
    title,
    description,
    alternates: { canonical: `/genre/${encodeURIComponent(name)}` },
    openGraph: { title, description, type: 'website', url: `/genre/${encodeURIComponent(name)}` },
    twitter: { card: 'summary_large_image' },
  }
}

export default async function GenrePage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name)
  const events = await fetchEvents({ genre: name, limit: 30 })

  return (
    <div className="relative -mx-4 md:-mx-6 lg:-mx-10 px-4 md:px-6 lg:px-10 py-8 md:py-10 min-h-[100vh] rounded-[28px] border border-[#d8af3a]/10 bg-[#07060a]">
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-base opacity-50" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-aurora opacity-40" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-vignette" />

      <div className="relative z-10 space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70 mb-1">Genero musical</p>
          <h1 className="text-3xl font-bold text-white">Eventos de {name}</h1>
          <p className="text-sm text-white/60 mt-2 max-w-xl">
            Las proximas fiestas y sesiones de {name} en Mallorca: discotecas, DJs y line-ups actualizados a diario.
          </p>
        </div>

        <div className="grid gap-3">
          {events.map(e => {
            const imgs: string[] = Array.isArray((e as any).images) ? (e as any).images : []
            return (
              <EventCard
                key={e.id}
                event={{
                  id: e.id,
                  title: e.name,
                  title_i18n: (e as any).name_i18n || undefined,
                  date: new Date(e.start_at).toLocaleString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
                  club: e.club_name || '-',
                  image: imgs[0],
                  sponsored: (e as any).sponsored || false,
                }}
              />
            )
          })}
          {events.length === 0 && (
            <div className="text-sm text-white/50 py-8 text-center">
              No hay eventos de {name} programados ahora mismo.{' '}
              <Link href="/discover" className="text-[#d8af3a] hover:text-[#e8c85a] underline">Ver toda la agenda</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const revalidate = 60
