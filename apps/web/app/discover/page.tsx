import { Filters } from '@/components/Filters'
import { EventCard } from '@/components/EventCard'
import { fetchClubsPublic, fetchDjsPublic, fetchEvents } from '@/lib/db'
import { T } from '@/components/T'
import { ClubCard } from '@/components/ClubCard'
import { DjCard2 } from '@/components/DjCard2'

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

export default async function DiscoverPage({ searchParams }: { searchParams: { q?: string; date?: string; genre?: string; zone?: string; tab?: string } }) {
  const tab = (searchParams?.tab || 'events') as 'events' | 'clubs' | 'djs'
  const zone = searchParams?.zone
  const { from, to } = rangeFromDateParam(searchParams?.date)
  const [events, clubs, djs, featuredClubs, featuredDjs] = await Promise.all([
    tab === 'events' ? fetchEvents({ q: searchParams?.q ?? undefined, from, to, genre: searchParams?.genre ?? undefined, zone: zone ?? undefined, limit: 50, sponsoredFirst: true }) : Promise.resolve([] as any[]),
    tab === 'clubs' ? fetchClubsPublic({ q: searchParams?.q ?? undefined, zone: zone ?? undefined, genre: searchParams?.genre ?? undefined, limit: 50 }) : Promise.resolve([] as any[]),
    tab === 'djs' ? fetchDjsPublic({ q: searchParams?.q ?? undefined, genre: searchParams?.genre ?? undefined, limit: 50 }) : Promise.resolve([] as any[]),
    fetchClubsPublic({ zone: zone ?? undefined, limit: 24 }),
    fetchDjsPublic({ limit: 24 }),
  ])
  const carouselClubs = shuffle(featuredClubs).slice(0, 8)
  const carouselDjs = shuffle(featuredDjs).slice(0, 8)
  return (
    <div className="relative -mx-4 md:-mx-6 lg:-mx-10 px-4 md:px-6 lg:px-10 py-8 md:py-10 min-h-[100vh] rounded-[28px] border border-[#d8af3a]/10 bg-[#07060a]">
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-base opacity-50" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-aurora opacity-40" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-vignette" />
      <div className="relative z-10 space-y-5">
        {/* Tabs con pill gold */}
        <div className="flex items-center gap-1 bg-white/5 rounded-2xl p-1 w-fit">
          {([
            { key: 'events', label: <T k="tabs.events" /> },
            { key: 'clubs',  label: <T k="tabs.clubs" /> },
            { key: 'djs',    label: <T k="tabs.djs" /> },
          ] as const).map(({ key, label }) => (
            <a
              key={key}
              href={`/discover?tab=${key}${zone ? `&zone=${encodeURIComponent(zone)}` : ''}`}
              className={`relative px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                tab === key
                  ? 'bg-[#d8af3a] text-black shadow-[0_0_16px_rgba(216,175,58,0.4)]'
                  : 'text-white/60 hover:text-white/90'
              }`}
            >
              {label}
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
                  <a key={c.id} href={`/club/${c.id}`} className="snap-start shrink-0 flex flex-col items-center gap-1.5 w-[100px]">
                    <div className="w-[100px] h-[100px] rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                      {img
                        ? <img src={img} alt={c.name} className="w-full h-full object-cover" />
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
                  <a key={dj.id} href={`/dj/${dj.id}`} className="snap-start shrink-0 flex flex-col items-center gap-1.5 w-[100px]">
                    <div className="w-[100px] h-[100px] rounded-full overflow-hidden bg-white/5 border border-white/10">
                      {img
                        ? <img src={img} alt={dj.name} className="w-full h-full object-cover" />
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
                <ClubCard key={c.id} club={{ id: c.id, name: c.name, address: c.address, zone: c.zone, image }} />
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
