import { notFound } from 'next/navigation'
import { Link } from '@/lib/navigation'
import { fetchEvents, fetchZonesMap, resolveZoneSlug } from '@/lib/db'
import { EventCard } from '@/components/EventCard'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { routing } from '@/i18n/routing'
import { buildAlternatesFor } from '@/lib/seo'
import { dictionaries } from '@/lib/dictionaries'
import {
  MIN_EVENTS_TO_INDEX, WHEN_KEYS, formatEventDate, resolveWhenSlug, whenMeta, whenRange, whenSlug,
} from '@/lib/seo-pages'
import { EventListJsonLd } from '@/components/EventListJsonLd'

export const revalidate = 300

export async function generateStaticParams() {
  const zones = Array.from((await fetchZonesMap()).keys())
  return routing.locales.flatMap((locale) =>
    zones.flatMap((zone) => WHEN_KEYS.map((key) => ({ locale, zone, when: whenSlug(key, locale) })))
  )
}

export async function generateMetadata({ params }: { params: { locale: string; zone: string; when: string } }) {
  const key = resolveWhenSlug(params.when, params.locale)
  const zoneName = key ? await resolveZoneSlug(params.zone) : null
  // Con loading.tsx la respuesta va en streaming: si esperamos al componente,
  // la cabecera 200 ya se envio y el notFound() acaba siendo un soft 404.
  if (!key || !zoneName) notFound()

  const { title, description } = whenMeta(key, zoneName, params.locale)
  const path = `/${params.zone}/${params.when}`
  const { from, to } = whenRange(key)
  const count = (await fetchEvents({ zone: zoneName, from, to, limit: MIN_EVENTS_TO_INDEX })).length

  return {
    title,
    description,
    alternates: buildAlternatesFor((l) => `/${params.zone}/${whenSlug(key, l)}`, params.locale),
    openGraph: { title, description, type: 'website', url: path },
    twitter: { card: 'summary_large_image' },
    // Sin inventario suficiente la pagina no aporta nada a quien llega desde
    // Google, asi que se sirve pero no se indexa.
    ...(count < MIN_EVENTS_TO_INDEX ? { robots: { index: false, follow: true } } : {}),
  }
}

export default async function WhenPage({ params }: { params: { locale: string; zone: string; when: string } }) {
  const key = resolveWhenSlug(params.when, params.locale)
  if (!key) return notFound()
  const zoneName = await resolveZoneSlug(params.zone)
  if (!zoneName) return notFound()

  const { title, eyebrow, intro, empty } = whenMeta(key, zoneName, params.locale)
  const { from, to } = whenRange(key)
  const events = await fetchEvents({ zone: zoneName, from, to, limit: 60, sponsoredFirst: true })

  const dict = dictionaries[params.locale] || dictionaries[routing.defaultLocale]
  const other = WHEN_KEYS.filter((k) => k !== key)

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
          { name: eyebrow },
        ]} />

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70 mb-1">{eyebrow}</p>
          <h1 className="text-3xl font-bold text-white">{title}</h1>
          <p className="text-sm text-white/60 mt-2 max-w-xl">{intro}</p>
        </div>

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
          {other.map((k) => (
            <Link
              key={k}
              href={`/${params.zone}/${whenSlug(k, params.locale)}`}
              className="text-xs px-3 py-1.5 rounded-full border border-[#d8af3a]/30 text-[#d8af3a] hover:bg-[#d8af3a]/10 transition-colors"
              prefetch={false}
            >
              {whenMeta(k, zoneName, params.locale).eyebrow}
            </Link>
          ))}
          <Link
            href={`/${params.zone}`}
            className="text-xs px-3 py-1.5 rounded-full border border-white/15 text-white/60 hover:text-white transition-colors"
            prefetch={false}
          >
            {zoneName}
          </Link>
        </div>
      </div>
    </div>
  )
}
