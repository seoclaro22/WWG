import { SafeImage } from '@/components/SafeImage'
import { Filters } from '@/components/Filters'
import { QuickDateChips } from '@/components/QuickDateChips'
import { EventCard } from '@/components/EventCard'
import { countClubs, countDjs, countUpcomingEvents, fetchClubsPublic, fetchDjsPublic, fetchEvents } from '@/lib/db'
import { T } from '@/components/T'
import { ClubCard } from '@/components/ClubCard'
import { DjCard2 } from '@/components/DjCard2'
import { buildAlternates, localePath, listMeta } from '@/lib/seo'
import { EventListJsonLd } from '@/components/EventListJsonLd'

// Los filtros (q, date, genre, zone, tab) son navegacion facetada: cada
// combinacion es una URL distinta con el mismo inventario reordenado. Sin
// control, Googlebot se dedica a rastrear miles de cruces en vez de las
// fichas y las paginas de zona, que son las que posicionan.
//
// El canonical ya apuntaba al /discover limpio, pero el canonical es una
// sugerencia y no evita el rastreo. El noindex,follow si: la variante
// filtrada no compite, y sus enlaces salientes se siguen rastreando.
export function generateMetadata({
  params,
  searchParams,
}: {
  params: { locale: string }
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const { title, description } = listMeta('discover', params.locale)
  const isFiltered = Object.values(searchParams || {}).some((v) => v != null && v !== '')

  return {
    title,
    description,
    alternates: buildAlternates('/discover', params.locale),
    openGraph: { title, description, type: 'website' },
    ...(isFiltered ? { robots: { index: false, follow: true } } : {}),
  }
}

function rangeFromDateParam(dateParam?: string) {
  if (!dateParam) return {}
  const now = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
  let from: Date | undefined
  let to: Date | undefined
  switch (dateParam) {
    case 'today':
      from = startOfDay(now); to = endOfDay(now); break
    case 'tomorrow': {
      const t = new Date(now); t.setDate(t.getDate() + 1); from = startOfDay(t); to = endOfDay(t); break
    }
    case 'weekend': {
      const t = new Date(now)
      const day = t.getDay()
      const diffToFri = (5 - day + 7) % 7
      const fri = new Date(t); fri.setDate(t.getDate() + diffToFri)
      const sun = new Date(fri); sun.setDate(fri.getDate() + 2)
      from = startOfDay(fri); to = endOfDay(sun); break
    }
    case 'week': {
      from = startOfDay(now); const toD = new Date(now); toD.setDate(now.getDate() + 7); to = endOfDay(toD); break
    }
    case 'month': {
      from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1))
      to = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0))
      break
    }
    default: {
      const parsed = new Date(dateParam)
      if (!isNaN(parsed.getTime())) { from = startOfDay(parsed); to = endOfDay(parsed) }
    }
  }
  const fmt = (d?: Date) => (d ? d.toISOString() : undefined)
  return { from: fmt(from), to: fmt(to) }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default async function DiscoverPage({ params, searchParams }: { params: { locale: string }; searchParams: { q?: string; date?: string; genre?: string; zone?: string; tab?: string } }) {
  const lp = (p: string) => localePath(p, params.locale)
  const tab = (searchParams?.tab || 'events') as 'events' | 'clubs' | 'djs'
  const zone = searchParams?.zone
  const { from, to } = rangeFromDateParam(searchParams?.date)
  const [events, clubs, djs, featuredClubs, featuredDjs, upcomingCount, clubsCount, djsCount] = await Promise.all([
    tab === 'events' ? fetchEvents({ q: searchParams?.q ?? undefined, from, to, genre: searchParams?.genre ?? undefined, zone: zone ?? undefined, limit: 600, sponsoredFirst: true }) : Promise.resolve([] as any[]),
    tab === 'clubs' ? fetchClubsPublic({ q: searchParams?.q ?? undefined, zone: zone ?? undefined, genre: searchParams?.genre ?? undefined, limit: 300 }) : Promise.resolve([] as any[]),
    tab === 'djs' ? fetchDjsPublic({ q: searchParams?.q ?? undefined, genre: searchParams?.genre ?? undefined, limit: 900 }) : Promise.resolve([] as any[]),
    fetchClubsPublic({ zone: zone ?? undefined, limit: 24 }),
    fetchDjsPublic({ limit: 24 }),
    countUpcomingEvents({ zone: zone ?? undefined }),
    // Se piden siempre, no solo en su pestana: el numero tiene que verse en
    // el pill aunque estes mirando otra pestana, igual que ya pasaba con el
    // de eventos.
    countClubs({ zone: zone ?? undefined }),
    countDjs(),
  ])
  const carouselClubs = shuffle(featuredClubs).slice(0, 8)
  const carouselDjs = shuffle(featuredDjs.filter((dj: any) => Array.isArray(dj.images) && dj.images[0])).slice(0, 8)
  // El ItemList solo en el /discover limpio: las variantes filtradas van con
  // noindex y el schema ahi es peso muerto.
  const isFiltered = Object.values(searchParams || {}).some((v) => v != null && v !== '')
  return (
    <div className="relative -mx-4 md:-mx-6 lg:-mx-10 px-4 md:px-6 lg:px-10 py-8 md:py-10 min-h-[100vh] rounded-[28px] border border-[#d8af3a]/10 bg-[#07060a]">
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-base opacity-50" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-aurora opacity-40" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-vignette" />
      <div className="relative z-10 space-y-5">
        {/* h1 desde listMeta: asi title y h1 quedan alineados por idioma y el
            keyword se edita en un solo sitio (lib/seo.ts). Cambia con la
            pestana para que las variantes noindex tampoco mientan. */}
        <h1 className="text-xl md:text-3xl font-bold text-white">
          {listMeta(tab === 'events' ? 'discover' : tab, params.locale).title}
        </h1>
        {tab === 'events' && !isFiltered && (
          <EventListJsonLd
            events={events}
            locale={params.locale}
            name={listMeta('discover', params.locale).title}
          />
        )}
        {/* Tabs con pill gold. El numero va en una insignia flotante sobre la
            esquina (estilo notificacion) y no en linea con el texto: metido
            en la propia frase, "Proximos eventos" ya no cabia en una linea y
            la pestana se estiraba mas alta que las otras dos. */}
        <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-1 w-fit">
          {([
            { key: 'events', label: <T k="tabs.events" />, count: upcomingCount },
            { key: 'clubs',  label: <T k="tabs.clubs" />,  count: clubsCount },
            { key: 'djs',    label: <T k="tabs.djs" />,    count: djsCount },
          ] as const).map(({ key, label, count }) => (
            <a
              key={key}
              href={lp(`/discover?tab=${key}${zone ? `&zone=${encodeURIComponent(zone)}` : ""}`)}
              className={`relative px-4 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                tab === key
                  ? 'bg-[#d8af3a] text-black shadow-[0_0_16px_rgba(216,175,58,0.4)]'
                  : 'text-white/60 hover:text-white/90'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`absolute -top-2 -right-2 min-w-[19px] h-[19px] px-1 flex items-center justify-center text-[10px] font-bold rounded-full border-2 border-[#07060a] leading-none ${
                  tab === key ? 'bg-black text-[#d8af3a] badge-pulse' : 'bg-[#d8af3a] text-black'
                }`}>{count}</span>
              )}
            </a>
          ))}
        </div>
        {/* Carousel: Clubs destacados */}
        {carouselClubs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70"><T k="discover.featured_clubs" /></p>
            <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-none" style={{ scrollbarWidth: 'none' }}>
              {carouselClubs.map((c: any) => {
                const img: string | undefined = Array.isArray(c.images) ? c.images[0] : (c.logo_url || undefined)
                return (
                  <a key={c.id} href={lp(`/club/${c.id}`)} className="snap-start shrink-0 flex flex-col items-center gap-1.5 w-[100px]">
                    <div className="w-[100px] h-[100px] rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                      {img
                        ? <SafeImage src={img} alt={c.name} width={100} height={100} sizes="100px" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-white/20 text-2xl">♣</div>
                      }
                    </div>
                    <span className="text-xs text-white/80 text-center leading-tight line-clamp-2 w-full">{c.name}</span>
                  </a>
                )
              })}
            </div>
          </div>
        )}
        {/* Carousel: DJs destacados */}
        {carouselDjs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70"><T k="discover.featured_djs" /></p>
            <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-none" style={{ scrollbarWidth: 'none' }}>
              {carouselDjs.map((dj: any) => {
                const img: string | undefined = Array.isArray(dj.images) ? dj.images[0] : undefined
                return (
                  <a key={dj.id} href={lp(`/dj/${dj.id}`)} className="snap-start shrink-0 flex flex-col items-center gap-1.5 w-[100px]">
                    <div className="w-[100px] h-[100px] rounded-full overflow-hidden bg-white/5 border border-white/10">
                      {img
                        ? <SafeImage src={img} alt={dj.name} width={100} height={100} sizes="100px" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-white/20 text-2xl">♪</div>
                      }
                    </div>
                    <span className="text-xs text-white/80 text-center leading-tight line-clamp-2 w-full">{dj.name}</span>
                  </a>
                )
              })}
            </div>
          </div>
        )}
        <Filters />
        {tab === 'events' && <QuickDateChips />}
        {tab === 'events' && (
          <div className="grid gap-3">
            {events.map((e: any) => {
              const imgs: string[] = Array.isArray(e.images) ? e.images : []
              const image = imgs.length ? imgs[0] : undefined
              return (
                <EventCard
                  key={e.id}
                  event={{
                    id: e.id,
                    title: e.name,
                    title_i18n: (e as any).name_i18n || undefined,
                    date: new Date(e.start_at).toLocaleString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
                    club: e.club_name || '-',
                    image,
                    sponsored: (e as any).sponsored || false,
                  }}
                />
              )
            })}
            {events.length === 0 && <div className="muted">No hay eventos para esta combinacion.</div>}
          </div>
        )}
        {tab === 'clubs' && (
          <div className="grid gap-3">
            {clubs.map((c: any) => {
              const imgs: string[] = Array.isArray(c.images) ? c.images : []
              const image = imgs[0] || (c.logo_url || null)
              return (
                <ClubCard key={c.id} club={{ id: c.id, name: c.name, address: c.address, zone: c.zone, image, verified: c.verified }} />
              )
            })}
            {clubs.length === 0 && <div className="muted">No hay clubs para esta zona.</div>}
          </div>
        )}
        {tab === 'djs' && (
          <div className="grid gap-3">
            {djs.map((dj: any) => {
              const imgs: string[] = Array.isArray(dj.images) ? dj.images : []
              const image = imgs[0] || null
              return (
                <DjCard2
                  key={dj.id}
                  dj={{
                    id: dj.id,
                    name: dj.name,
                    name_i18n: dj.name_i18n,
                    short_bio: dj.short_bio,
                    short_bio_i18n: dj.short_bio_i18n,
                    bio: dj.bio,
                    bio_i18n: dj.bio_i18n,
                    genres: dj.genres,
                    image,
                    verified: dj.verified,
                  }}
                />
              )
            })}
            {djs.length === 0 && <div className="muted">No hay DJs para esta busqueda.</div>}
          </div>
        )}
      </div>
    </div>
  )
}

export const revalidate = 0
export const dynamic = 'force-dynamic'
