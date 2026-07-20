import { notFound } from 'next/navigation'
import { fetchEvents, fetchClubsPublic, resolveZoneSlug, fetchZonesMap } from '@/lib/db'
import { EventCard } from '@/components/EventCard'
import { ClubCard } from '@/components/ClubCard'
import { Breadcrumbs } from '@/components/Breadcrumbs'

export async function generateStaticParams() {
  const map = await fetchZonesMap()
  return Array.from(map.keys()).map(zone => ({ zone }))
}

export async function generateMetadata({ params }: { params: { zone: string } }) {
  const zoneName = await resolveZoneSlug(params.zone)
  if (!zoneName) return { title: 'Zona no encontrada' }
  const title = `Discotecas y eventos en ${zoneName}`
  const description = `Descubre las mejores discotecas, fiestas y DJs en ${zoneName}. Agenda de eventos nocturnos actualizada a diario con Where We Go.`
  return {
    title,
    description,
    alternates: { canonical: `/${params.zone}` },
    openGraph: { title, description, type: 'website', url: `/${params.zone}` },
    twitter: { card: 'summary_large_image' },
  }
}

export default async function ZonePage({ params }: { params: { zone: string } }) {
  const zoneName = await resolveZoneSlug(params.zone)
  if (!zoneName) return notFound()

  const [events, clubs] = await Promise.all([
    fetchEvents({ zone: zoneName, limit: 30, sponsoredFirst: true }),
    fetchClubsPublic({ zone: zoneName, limit: 20 }),
  ])

  return (
    <div className="relative -mx-4 md:-mx-6 lg:-mx-10 px-4 md:px-6 lg:px-10 py-8 md:py-10 min-h-[100vh] rounded-[28px] border border-[#d8af3a]/10 bg-[#07060a]">
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-base opacity-50" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-aurora opacity-40" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-vignette" />

      <div className="relative z-10 space-y-6">
        <Breadcrumbs items={[
          { name: 'Inicio', href: '/' },
          { name: zoneName },
        ]} />

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70 mb-1">Zona</p>
          <h1 className="text-3xl font-bold text-white">Discotecas y eventos en {zoneName}</h1>
          <p className="text-sm text-white/60 mt-2 max-w-xl">
            La agenda nocturna de {zoneName}: discotecas, fiestas y DJs actualizados a diario. Encuentra tu plan y reserva entradas con Where We Go.
          </p>
        </div>

        {clubs.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70">Discotecas en {zoneName}</p>
            <div className="grid gap-3">
              {clubs.map((c: any) => {
                const images: string[] = Array.isArray(c.images) ? c.images : []
                const image = images[0] || (c.logo_url || null)
                return <ClubCard key={c.id} club={{ id: c.id, name: c.name, address: c.address, zone: c.zone, image }} />
              })}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70">Proximos eventos en {zoneName}</p>
          <div className="grid gap-3">
            {events.map((e: any) => {
              const imgs: string[] = Array.isArray(e.images) ? e.images : []
              return (
                <EventCard
                  key={e.id}
                  event={{
                    id: e.id,
                    title: e.name,
                    title_i18n: e.name_i18n || undefined,
                    date: new Date(e.start_at).toLocaleString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
                    club: e.club_name || '-',
                    image: imgs[0],
                    sponsored: e.sponsored || false,
                  }}
                />
              )
            })}
            {events.length === 0 && <div className="text-sm text-white/50 py-6 text-center">No hay eventos programados en {zoneName} ahora mismo.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

export const revalidate = 3600
