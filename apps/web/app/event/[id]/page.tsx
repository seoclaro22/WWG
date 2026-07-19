import Link from 'next/link'
import { SafeImage } from '@/components/SafeImage'
import { fetchEvent, fetchEventLineup, fetchClubEvents } from '@/lib/db'
import { notFound } from 'next/navigation'
import { FavoriteButton } from '@/components/FavoriteButton'
import { ReserveButton } from '@/components/ReserveButton'
import { T } from '@/components/T'
import { LDate } from '@/components/LDate'
import { LocalText } from '@/components/LocalText'
import { ShareSheet } from '@/components/ShareSheet'
import { ClubDescriptionExpand } from '@/components/ClubDescriptionExpand'

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

export async function generateMetadata({ params }: { params: { id: string } }) {
  const e: any = await fetchEvent(params.id)
  if (!e) return { title: 'Evento no encontrado' }
  const date = new Date(e.start_at).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
  const imgs: string[] = Array.isArray(e.images) ? e.images : []
  const description = (e.description || '').slice(0, 155) || `${e.name} en ${e.club_name || 'Mallorca'}, ${date}. Reserva tus entradas en Where We Go.`
  return {
    title: `${e.name} — ${e.club_name || 'Mallorca'}`,
    description,
    openGraph: {
      title: `${e.name} · ${date}`,
      description,
      type: 'website',
      url: `/event/${e.id}`,
      images: imgs.length ? [{ url: imgs[0] }] : undefined,
    },
    twitter: { card: 'summary_large_image' },
    alternates: { canonical: `/event/${e.id}` },
  }
}

export default async function EventDetail({ params }: { params: { id: string } }) {
  const { id } = params
  const [e, lineup] = await Promise.all([fetchEvent(id), fetchEventLineup(id)])
  if (!e) return notFound()
  const clubId = (e as any).club_id as string | null
  const moreFromClub = clubId ? await fetchClubEvents(clubId, 5) : []
  const imgs: string[] = Array.isArray((e as any).images) ? (e as any).images : []
  const cover = imgs.length ? imgs[0] : null
  const description: string = (e as any).description || ''
  const descriptionI18n = (e as any).description_i18n || null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicEvent',
    name: (e as any).name,
    startDate: (e as any).start_at,
    ...((e as any).end_at ? { endDate: (e as any).end_at } : {}),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    ...(description ? { description: description.slice(0, 500) } : {}),
    ...(cover ? { image: [cover] } : {}),
    location: {
      '@type': 'Place',
      name: (e as any).club_name || 'Mallorca',
      address: { '@type': 'PostalAddress', addressLocality: (e as any).zone || 'Mallorca', addressCountry: 'ES' },
    },
    ...(lineup.length ? {
      performer: lineup.map((d: any) => ({ '@type': 'MusicGroup', name: d.name })),
    } : {}),
    ...((e as any).url_referral ? {
      offers: {
        '@type': 'Offer',
        url: `https://www.wherewego.site/event/${id}`,
        availability: 'https://schema.org/InStock',
        ...((e as any).price_min != null ? { price: (e as any).price_min, priceCurrency: 'EUR' } : {}),
      },
    } : {}),
    organizer: { '@type': 'Organization', name: 'Where We Go', url: 'https://www.wherewego.site' },
  }

  return (
    <div className="relative -mx-4 md:-mx-6 lg:-mx-10 min-h-[100vh] rounded-[28px] overflow-hidden bg-[#07060a]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      {/* ── Fondo difuminado con la imagen del evento ────────────── */}
      {cover && (
        <div className="absolute inset-0 pointer-events-none">
          <SafeImage
            src={cover}
            alt=""
            aria-hidden
            fill
            sizes="100vw"
            quality={20}
            className="object-cover object-top scale-110"
            style={{ filter: 'blur(60px) brightness(0.25) saturate(1.4)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#07060a]/30 via-[#07060a]/60 to-[#07060a]" />
        </div>
      )}

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="relative w-full aspect-[3/4] sm:aspect-[4/5] max-h-[80vh]">
        {cover ? (
          <SafeImage src={cover} alt={(e as any).name} fill priority sizes="100vw" className="object-cover object-top" />
        ) : (
          <div className="w-full h-full bg-white/5" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07060a] via-[#07060a]/30 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#07060a]/50 to-transparent" />

        {/* Favorite */}
        <div className="absolute top-4 right-4 z-20">
          <FavoriteButton eventId={(e as any).id} useLocalCache />
        </div>

        {/* Nombre y fecha sobre el hero */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-5 z-10 space-y-1">
          <h1 className="text-3xl font-bold text-white drop-shadow-lg">
            <LocalText value={(e as any).name} i18n={(e as any).name_i18n} />
          </h1>
          <p className="text-sm text-white/70 drop-shadow">
            <LDate value={e.start_at} timeZone="UTC" options={{ weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' }} />
            {' · '}
            {clubId ? (
              <Link className="text-[#d8af3a] hover:text-[#e8c85a] font-medium transition-colors" href={`/club/${clubId}`}>{e.club_name || '-'}</Link>
            ) : (e.club_name || '-')}
          </p>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className="relative z-10 px-4 md:px-6 lg:px-10 pb-10 space-y-5">

        {/* Genres */}
        {(e as any).genres && (e as any).genres.length > 0 && (
          <div className="flex gap-2 flex-wrap pt-1">
            {(e as any).genres.map((g: string, i: number) => (
              <Link
                key={i}
                href={`/genre/${encodeURIComponent(g)}`}
                className="text-xs px-3 py-1 rounded-full border border-[#d8af3a]/40 text-[#d8af3a]/90 bg-[#d8af3a]/8 font-medium hover:bg-[#d8af3a]/15 transition-colors"
              >
                {g}
              </Link>
            ))}
          </div>
        )}

        {/* Descripcion */}
        {description && (
          <ClubDescriptionExpand text={description} i18n={descriptionI18n} />
        )}

        {/* Divider */}
        <div className="border-t border-white/8" />

        {/* Line-up */}
        <div>
          <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-3"><T k="event.lineup" /></p>
          {lineup.length === 0 ? (
            <p className="text-sm text-white/40">-</p>
          ) : (
            <div className="space-y-3">
              {lineup.map(d => {
                const embed = getSpotifyEmbed((d as any).spotify_embed)
                const djImgs: string[] = Array.isArray((d as any).images) ? (d as any).images : []
                const djImg = djImgs[0] || null
                return (
                  <div key={d.id} className="space-y-2">
                    <Link
                      href={`/dj/${d.id}`}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/8 hover:bg-white/8 hover:border-[#d8af3a]/30 transition-all group"
                    >
                      {djImg ? (
                        <SafeImage src={djImg} alt={(d as any).name} width={56} height={56} sizes="56px" className="w-14 h-14 rounded-full object-cover object-top border border-white/10 shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-white/8 border border-white/10 shrink-0 flex items-center justify-center text-white/20 text-xl">♪</div>
                      )}
                      <p className="flex-1 font-medium text-white group-hover:text-[#d8af3a] transition-colors">
                        <LocalText value={d.name} i18n={(d as any).name_i18n || undefined} />
                      </p>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white/30 group-hover:text-[#d8af3a] shrink-0 transition-colors">
                        <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </Link>
                    {embed && (
                      <div className="rounded-2xl border border-white/10 overflow-hidden bg-black/30">
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
              })}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-white/8" />

        {/* Acciones */}
        <div className="grid grid-cols-2 gap-3">
          {(e as any).url_referral ? (
            <ReserveButton
              eventId={(e as any).id}
              source="details"
              className="w-full py-3 rounded-2xl bg-[#d8af3a] text-black font-bold text-sm shadow-[0_0_20px_rgba(216,175,58,0.35)] hover:bg-[#e8c85a] hover:shadow-[0_0_28px_rgba(216,175,58,0.5)] transition-all"
            >
              <T k="action.reserve_tickets" />
            </ReserveButton>
          ) : (
            <span className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 text-sm text-center cursor-not-allowed"><T k="event.no_reservations" /></span>
          )}
          <Link
            className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-medium text-sm text-center hover:bg-white/10 hover:border-[#d8af3a]/40 hover:text-[#d8af3a] transition-all"
            href={`https://maps.google.com?q=${encodeURIComponent((e as any).club_name || 'Mallorca')}`}
            target="_blank"
          >
            <T k="action.directions" />
          </Link>
        </div>

        {/* Share */}
        <ShareSheet
          title={(e as any).name}
          i18n={(e as any).name_i18n || undefined}
          buttonClassName="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-medium text-sm hover:bg-white/10 hover:border-[#d8af3a]/40 hover:text-[#d8af3a] transition-all"
        />

        {/* Mas del club */}
        {moreFromClub.length > 0 && (
          <>
            <div className="border-t border-white/8" />
            <div>
              <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-3">Mas en {e.club_name}</p>
              <div className="space-y-2">
                {moreFromClub.map(ev => {
                  const evImgs: string[] = Array.isArray((ev as any).images) ? (ev as any).images : []
                  const evImg = evImgs[0] || null
                  return (
                    <Link
                      key={ev.id}
                      href={`/event/${ev.id}`}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/8 hover:bg-white/8 hover:border-[#d8af3a]/30 transition-all group"
                    >
                      {evImg ? (
                        <SafeImage src={evImg} alt={ev.name} width={56} height={56} sizes="56px" className="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-white/8 border border-white/10 shrink-0 flex items-center justify-center text-white/20 text-xl">♪</div>
                      )}
                      <p className="flex-1 min-w-0 text-sm font-medium text-white truncate group-hover:text-[#d8af3a] transition-colors">{ev.name}</p>
                      <span className="text-xs text-white/50 shrink-0"><LDate value={(ev as any).start_at} timeZone="UTC" options={{ day: '2-digit', month: 'short' }} /></span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </>
        )}

        <div className="text-xs text-white/30">ID: {id}</div>
      </div>
    </div>
  )
}

export const revalidate = 60
