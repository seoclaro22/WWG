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

export default async function DiscoverPage({ searchParams }: { searchParams: { q?: string; date?: string; genre?: string; zone?: string; tab?: string } }) {
  const tab = (searchParams?.tab || 'events') as 'events' | 'clubs' | 'djs'
  const zone = searchParams?.zone
  const { from, to } = rangeFromDateParam(searchParams?.date)
  const [events, clubs, djs] = await Promise.all([
    tab === 'events' ? fetchEvents({ q: searchParams?.q ?? undefined, from, to, genre: searchParams?.genre ?? undefined, zone: zone ?? undefined, limit: 50 }) : Promise.resolve([] as any[]),
    tab === 'clubs' ? fetchClubsPublic({ q: searchParams?.q ?? undefined, zone: zone ?? undefined, genre: searchParams?.genre ?? undefined, limit: 50 }) : Promise.resolve([] as any[]),
    tab === 'djs' ? fetchDjsPublic({ q: searchParams?.q ?? undefined, genre: searchParams?.genre ?? undefined, limit: 50 }) : Promise.resolve([] as any[]),
  ])
  return (
    <div className="relative -mx-4 md:-mx-6 lg:-mx-10 px-4 md:px-6 lg:px-10 py-8 md:py-10 min-h-[100vh] rounded-[28px] border border-white/5 bg-[radial-gradient(circle_at_20%_20%,rgba(88,57,176,0.35),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(91,12,245,0.3),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(255,76,181,0.28),transparent_28%),#070a14]">
      <div className="absolute inset-0 pointer-events-none rounded-[28px] mix-blend-screen opacity-70 landing-aurora" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] mix-blend-screen opacity-60" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(44,191,255,0.12), rgba(7,10,20,0.1) 35%, transparent 50%)' }} />
      <div className="relative z-10 space-y-4">
        <h1 className="text-2xl font-semibold"><T k="discover.title" /></h1>
        <div className="flex items-center gap-2">
          <a href={`/discover?tab=events${zone ? `&zone=${encodeURIComponent(zone)}` : ''}`} className={`px-3 py-1 rounded-xl border border-white/10 ${tab === 'events' ? 'bg-white/10' : ''}`}><T k="tabs.events" /></a>
          <a href={`/discover?tab=clubs${zone ? `&zone=${encodeURIComponent(zone)}` : ''}`} className={`px-3 py-1 rounded-xl border border-white/10 ${tab === 'clubs' ? 'bg-white/10' : ''}`}><T k="tabs.clubs" /></a>
          <a href={`/discover?tab=djs${zone ? `&zone=${encodeURIComponent(zone)}` : ''}`} className={`px-3 py-1 rounded-xl border border-white/10 ${tab === 'djs' ? 'bg-white/10' : ''}`}><T k="tabs.djs" /></a>
        </div>
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
