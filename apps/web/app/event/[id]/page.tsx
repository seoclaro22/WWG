import Link from 'next/link'
import { fetchEvent, fetchEventLineup, fetchClubEvents } from '@/lib/db'
import { notFound } from 'next/navigation'
import { FavoriteButton } from '@/components/FavoriteButton'
import { ReserveButton } from '@/components/ReserveButton'
import { T } from '@/components/T'
import { LDate } from '@/components/LDate'
import { LocalText } from '@/components/LocalText'

function getSpotifyEmbed(input?: string | null) {
  const raw = (input || '').trim()
  if (!raw) return null
  const iframeMatch = raw.match(/src=["']([^"']+)["']/i)
  const heightMatch = raw.match(/height=["']?(\d{2,4})["']?/i)
  const url = iframeMatch ? iframeMatch[1] : raw
  try {
    const u = new URL(url)
    if (!u.hostname.endsWith('spotify.com')) return null
    let src = u.toString()
    if (!u.pathname.startsWith('/embed/')) {
      const parts = u.pathname.split('/').filter(Boolean)
      if (parts.length >= 2) {
        src = `https://open.spotify.com/embed/${parts[0]}/${parts[1]}`
      }
    }
    const path = new URL(src).pathname
    const isCompact = /\/embed\/(track|episode)\//.test(path)
    const height = heightMatch ? Number(heightMatch[1]) : (isCompact ? 152 : 352)
    return { src, height }
  } catch {}
  return null
}

export default async function EventDetail({ params }: { params: { id: string } }) {
  const { id } = params
  const e = await fetchEvent(id)
  if (!e) return notFound()
  const lineup = await fetchEventLineup(id)
  const clubId = (e as any).club_id as string | null
  const moreFromClub = clubId ? await fetchClubEvents(clubId, 5) : []
  const imgs: string[] = Array.isArray((e as any).images) ? (e as any).images : []
  const cover = imgs.length ? imgs[0] : null
  return (
    <div className="relative -mx-4 md:-mx-6 lg:-mx-10 px-4 md:px-6 lg:px-10 py-8 md:py-10 min-h-[100vh] rounded-[28px] border border-white/5 bg-[radial-gradient(circle_at_20%_20%,rgba(88,57,176,0.35),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(91,12,245,0.3),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(255,76,181,0.28),transparent_28%),#070a14]">
      <div className="absolute inset-0 pointer-events-none rounded-[28px] mix-blend-screen opacity-70 landing-aurora" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] mix-blend-screen opacity-60" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(44,191,255,0.12), rgba(7,10,20,0.1) 35%, transparent 50%)' }} />
      <div className="relative z-10 space-y-4">
      {cover ? (
        <img src={cover} alt={e.name} className="w-full aspect-[3/4] object-cover rounded-xl border border-white/10" />
      ) : (
        <div className="aspect-[3/4] w-full rounded-xl bg-white/5" />
      )}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold"><LocalText value={(e as any).name} i18n={(e as any).name_i18n} /></h1>
        <FavoriteButton eventId={(e as any).id} useLocalCache />
      </div>
      <div className="muted">
        <LDate value={e.start_at} options={{ weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' }} /> ·{' '}
        {clubId ? <Link className="underline hover:text-gold" href={`/club/${clubId}`}>{e.club_name || '-'}</Link> : (e.club_name || '-')}
      </div>
      {(e as any).genres && (e as any).genres.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {(e as any).genres.map((g: string, i: number) => (
            <Link key={i} href={`/genre/${encodeURIComponent(g)}`} className="text-xs px-2 py-1 rounded bg-white/10 border border-white/10 hover:text-gold">{g}</Link>
          ))}
        </div>
      )}
      <div className="space-y-2">
        <details className="card p-4"><summary className="font-medium"><T k="event.description" /></summary><p className="mt-2 text-sm text-white/80"><LocalText value={(e as any).description} i18n={(e as any).description_i18n} /></p></details>
        <div className="card p-4">
          <div className="font-medium"><T k="event.lineup" /></div>
          <div className="mt-3 space-y-3">
            {lineup.length ? lineup.map(d => {
              const embed = getSpotifyEmbed((d as any).spotify_embed)
              return (
                <div key={d.id} className="space-y-2">
                  <Link href={`/dj/${d.id}`} className="underline hover:text-gold">
                    <LocalText value={d.name} i18n={(d as any).name_i18n || undefined} />
                  </Link>
                  {embed && (
                    <div className="rounded-xl border border-white/10 overflow-hidden bg-black/30">
                      <iframe
                        src={embed.src}
                        title="Spotify player"
                        width="100%"
                        height={embed.height}
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        className="block w-full"
                      />
                    </div>
                  )}
                </div>
              )
            }) : <div className="text-sm text-white/60">-</div>}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(e as any).url_referral ? (
          <ReserveButton eventId={(e as any).id} source="details"><T k="action.reserve_tickets" /></ReserveButton>
        ) : (
          <span className="btn btn-secondary opacity-60 cursor-not-allowed"><T k="event.no_reservations" /></span>
        )}
        <Link className="btn btn-secondary" href={`https://maps.google.com?q=${encodeURIComponent((e as any).club_name || 'Mallorca')}`} target="_blank"><T k="action.directions" /></Link>
      </div>
      {moreFromClub.length > 0 && (
        <div className="card p-4 space-y-2">
          <div className="font-medium">Mas en {e.club_name}</div>
          {moreFromClub.map(ev => (
            <Link key={ev.id} href={`/event/${ev.id}`} className="flex items-center justify-between text-sm hover:text-gold">
              <span>{ev.name}</span>
              <span className="text-white/60"><LDate value={(ev as any).start_at} options={{ day: '2-digit', month: 'short' }} /></span>
            </Link>
          ))}
        </div>
      )}
      <div className="text-xs text-white/50">ID: {id}</div>
      </div>
    </div>
  )
}

export const revalidate = 0
export const dynamic = 'force-dynamic'

