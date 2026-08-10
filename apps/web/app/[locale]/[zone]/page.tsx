import { notFound } from 'next/navigation'
import { Link } from '@/lib/navigation'
import { countUpcomingEvents, fetchEvents, fetchClubsPublic, fetchZoneFacts, fetchZoneGenreCounts, resolveZoneSlug, fetchZonesMap } from '@/lib/db'
import { EventCard } from '@/components/EventCard'
import { ClubCard } from '@/components/ClubCard'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { routing } from '@/i18n/routing'
import { buildAlternates, ogImage } from '@/lib/seo'
import { dictionaries } from '@/lib/dictionaries'
import {
  MIN_EVENTS_TO_INDEX, WHEN_KEYS, formatEventDate, relatedLinksLabels, whenMeta, whenSlug,
  zoneFaq, zoneFaqHeading, zoneMeta,
} from '@/lib/seo-pages'
import { EventListJsonLd } from '@/components/EventListJsonLd'

export async function generateStaticParams() {
  const map = await fetchZonesMap()
  const zones = Array.from(map.keys())
  return routing.locales.flatMap((locale) => zones.map((zone) => ({ locale, zone })))
}

export async function generateMetadata({ params }: { params: { locale: string; zone: string } }) {
  const zoneName = await resolveZoneSlug(params.zone)
  // El notFound() va aqui y no solo en el componente: con loading.tsx la
  // respuesta se envia en streaming, asi que para cuando renderiza la pagina
  // la cabecera 200 ya salio y el notFound() daria un soft 404. generateMetadata
  // se resuelve antes de abrir el stream, y ahi si se puede devolver 404.
  if (!zoneName) notFound()
  const { title, description, eyebrow } = zoneMeta(zoneName, params.locale)
  const images = ogImage({ eyebrow, title: zoneName, subtitle: description })
  // Mismo umbral que las paginas hijas. Una ciudad recien abierta, con uno o
  // dos eventos, era lo primero que Google veia de ese mercado.
  const count = await countUpcomingEvents({ zone: zoneName })
  return {
    title,
    description,
    ...(count < MIN_EVENTS_TO_INDEX ? { robots: { index: false, follow: true } } : {}),
    alternates: buildAlternates(`/${params.zone}`, params.locale),
    openGraph: { title, description, type: 'website', url: `/${params.zone}`, images },
    twitter: { card: 'summary_large_image', images },
  }
}

export default async function ZonePage({ params }: { params: { locale: string; zone: string } }) {
  const zoneName = await resolveZoneSlug(params.zone)
  if (!zoneName) return notFound()

  const [events, clubs, genreCounts, facts] = await Promise.all([
    fetchEvents({ zone: zoneName, limit: 30, sponsoredFirst: true }),
    fetchClubsPublic({ zone: zoneName, limit: 20 }),
    fetchZoneGenreCounts(zoneName),
    fetchZoneFacts(zoneName),
  ])
  const faq = zoneFaq(zoneName, params.locale, facts)

  const copy = zoneMeta(zoneName, params.locale)
  const labels = relatedLinksLabels(params.locale)
  const dict = dictionaries[params.locale] || dictionaries[routing.defaultLocale]

  // Solo se enlazan los generos con agenda real en esta zona: son exactamente
  // los mismos que se indexan, asi no mandamos ni al usuario ni a Google a
  // paginas vacias.
  const genres = Array.from(genreCounts.entries())
    .filter(([, n]) => n >= MIN_EVENTS_TO_INDEX)
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g)

  return (
    <div className="relative -mx-4 md:-mx-6 lg:-mx-10 px-4 md:px-6 lg:px-10 py-8 md:py-10 min-h-[100vh] rounded-[28px] border border-[#d8af3a]/10 bg-[#07060a]">
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-base opacity-50" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-aurora opacity-40" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-vignette" />

      <div className="relative z-10 space-y-6">
        <EventListJsonLd events={events} locale={params.locale} name={copy.title} />
        <Breadcrumbs locale={params.locale} items={[
          { name: dict['nav.home'] || 'Inicio', href: '/' },
          { name: zoneName },
        ]} />

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70 mb-1">{copy.eyebrow}</p>
          <h1 className="text-3xl font-bold text-white">{copy.title}</h1>
          <p className="text-sm text-white/60 mt-2 max-w-xl">{copy.intro}</p>
        </div>

        {/* Los rotulos de seccion eran <p> con pinta de titulo: se leian como
            encabezados pero no lo eran, asi que la unica jerarquia que veia
            Google en toda la pagina era el FAQ del final. */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70">{labels.heading}</h2>
          <div className="flex flex-wrap gap-2">
            {WHEN_KEYS.map((k) => (
              <Link
                key={k}
                href={`/${params.zone}/${whenSlug(k, params.locale)}`}
                className="text-xs px-3 py-1.5 rounded-full border border-[#d8af3a]/30 text-[#d8af3a] hover:bg-[#d8af3a]/10 transition-colors"
                prefetch={false}
              >
                {whenMeta(k, zoneName, params.locale).eyebrow}
              </Link>
            ))}
            {genres.map((g) => (
              <Link
                key={g}
                href={`/${params.zone}/genre/${encodeURIComponent(g)}`}
                className="text-xs px-3 py-1.5 rounded-full border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-colors"
                prefetch={false}
              >
                {g}
              </Link>
            ))}
          </div>
        </div>

        {clubs.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70">{copy.clubs}</h2>
            <div className="grid gap-3">
              {clubs.map((c: any) => {
                const images: string[] = Array.isArray(c.images) ? c.images : []
                const image = images[0] || (c.logo_url || null)
                return <ClubCard key={c.id} club={{ id: c.id, name: c.name, address: c.address, zone: c.zone, image, verified: c.verified }} />
              })}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70">{copy.events}</h2>
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
              <div className="text-sm text-white/50 py-6 text-center">{copy.empty}</div>
            )}
          </div>
        </div>

        {/* Lo unico de la pagina que no caduca con la agenda. Va al final
            porque quien ya sabe a donde va viene a por el listado; esto es
            para el que llega desde Google sin conocer la ciudad. */}
        {faq.length > 0 && (
          <div className="space-y-3 pt-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70">{zoneFaqHeading(params.locale)}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {faq.map((f) => (
                <div key={f.q} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <h3 className="text-sm font-medium text-white">{f.q}</h3>
                  <p className="text-sm text-white/60 mt-1.5 leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export const revalidate = 3600
