import { notFound } from 'next/navigation'
import { Link } from '@/lib/navigation'
import { fetchClubsPublic, fetchEvents, fetchZoneGenreCounts, fetchZonesMap, resolveZoneSlug } from '@/lib/db'
import { EventCard } from '@/components/EventCard'
import { ClubCard } from '@/components/ClubCard'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { routing } from '@/i18n/routing'
import { buildAlternates } from '@/lib/seo'
import { dictionaries } from '@/lib/dictionaries'
import { MIN_EVENTS_TO_INDEX, formatEventDate, zoneGenreMeta } from '@/lib/seo-pages'
import { EventListJsonLd } from '@/components/EventListJsonLd'

export const revalidate = 300

export async function generateStaticParams() {
  const zones = Array.from((await fetchZonesMap()).keys())
  const perZone = await Promise.all(zones.map(async (zone) => {
    const zoneName = await resolveZoneSlug(zone)
    if (!zoneName) return []
    const counts = await fetchZoneGenreCounts(zoneName)
    // Solo se prerenderiza el cruce que ya tiene agenda: el resto se resuelve
    // bajo demanda y sale noindex.
    return Array.from(counts.entries())
      .filter(([, n]) => n >= MIN_EVENTS_TO_INDEX)
      .map(([genre]) => ({ zone, name: encodeURIComponent(genre) }))
  }))
  return routing.locales.flatMap((locale) => perZone.flat().map((p) => ({ locale, ...p })))
}

export async function generateMetadata({ params }: { params: { locale: string; zone: string; name: string } }) {
  const zoneName = await resolveZoneSlug(params.zone)
  // Ver nota en /[zona]: con streaming el notFound() del componente llega
  // tarde para fijar el 404.
  if (!zoneName) notFound()

  const genre = decodeURIComponent(params.name)
  const { title, description } = zoneGenreMeta(genre, zoneName, params.locale)
  const path = `/${params.zone}/genre/${params.name}`
  const count = (await fetchEvents({ zone: zoneName, genre, limit: MIN_EVENTS_TO_INDEX })).length

  return {
    title,
    description,
    alternates: buildAlternates(path, params.locale),
    openGraph: { title, description, type: 'website', url: path },
    twitter: { card: 'summary_large_image' },
    ...(count < MIN_EVENTS_TO_INDEX ? { robots: { index: false, follow: true } } : {}),
  }
}

export default async function ZoneGenrePage({ params }: { params: { locale: string; zone: string; name: string } }) {
  const zoneName = await resolveZoneSlug(params.zone)
  if (!zoneName) return notFound()

  const genre = decodeURIComponent(params.name)
  const { title, eyebrow, intro, empty } = zoneGenreMeta(genre, zoneName, params.locale)
  const [events, clubs] = await Promise.all([
    fetchEvents({ zone: zoneName, genre, limit: 40, sponsoredFirst: true }),
    fetchClubsPublic({ zone: zoneName, genre, limit: 8 }),
  ])

  const dict = dictionaries[params.locale] || dictionaries[routing.defaultLocale]

  return (
    <div className="relative -mx-4 md:-mx-6 lg:-mx-10 px-4 md:px-6 lg:px-10 py-8 md:py-10 min-h-[100vh] rounded-[28px] border border-[#d8af3a]/10 bg-[#07060a]">
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-base opacity-50" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-aurora opacity-40" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-vignette" />

      <div className="relative z-10 space-y-5">
        <EventListJsonLd events={events} locale={params.locale} name={title} />
        <Breadcrumbs locale={params.locale} items={[
          { name: dict['nav.home'] || 'Inicio', href: '/' },
          { name: zoneName, href: `/${params.zone}` },
          { name: genre },
        ]} />

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70 mb-1">{eyebrow}</p>
          <h1 className="text-3xl font-bold text-white">{title}</h1>
          <p className="text-sm text-white/60 mt-2 max-w-xl">{intro}</p>
        </div>

        {clubs.length > 0 && (
          <div className="grid gap-3">
            {clubs.map((c: any) => {
              const images: string[] = Array.isArray(c.images) ? c.images : []
              return <ClubCard key={c.id} club={{ id: c.id, name: c.name, address: c.address, zone: c.zone, image: images[0] || c.logo_url || null }} />
            })}
          </div>
        )}

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
                  date: formatEventDate(e.start_at, params.locale),
                  club: e.club_name || '-',
                  image: imgs[0],
                  sponsored: e.sponsored || false,
                }}
              />
            )
          })}
          {events.length === 0 && (
            <p className="text-sm text-white/50 py-8 text-center">{empty}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
          <Link href={`/genre/${params.name}`} className="text-xs px-3 py-1.5 rounded-full border border-[#d8af3a]/30 text-[#d8af3a] hover:bg-[#d8af3a]/10 transition-colors" prefetch={false}>
            {genre}
          </Link>
          <Link href={`/${params.zone}`} className="text-xs px-3 py-1.5 rounded-full border border-white/15 text-white/60 hover:text-white transition-colors" prefetch={false}>
            {zoneName}
          </Link>
        </div>
      </div>
    </div>
  )
}
