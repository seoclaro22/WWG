import Link from 'next/link'
import { SafeImage } from '@/components/SafeImage'
import { fetchDj, fetchDjEvents, fetchSimilarDjs } from '@/lib/db'
import { notFound } from 'next/navigation'
import { FavoriteButton } from '@/components/FavoriteButton'
import { LDate } from '@/components/LDate'
import { LocalText } from '@/components/LocalText'
import { T } from '@/components/T'
import { ShareSheet } from '@/components/ShareSheet'
import { ClubDescriptionExpand } from '@/components/ClubDescriptionExpand'
import { Breadcrumbs } from '@/components/Breadcrumbs'

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
  const dj: any = await fetchDj(params.id)
  if (!dj) return { title: 'DJ no encontrado' }
  const images: string[] = Array.isArray(dj.images) ? dj.images : []
  const genres = Array.isArray(dj.genres) && dj.genres.length ? dj.genres.slice(0, 3).join(', ') : ''
  const description = (dj.short_bio || dj.bio || '').slice(0, 155) || `${dj.name}${genres ? ` (${genres})` : ''}: proximas sesiones, musica y perfil en Where We Go.`
  return {
    title: `${dj.name}${genres ? ` — DJ de ${genres}` : ' — DJ'}`,
    description,
    openGraph: {
      title: dj.name,
      description,
      type: 'profile',
      url: `/dj/${dj.id}`,
      images: images.length ? [{ url: images[0] }] : undefined,
    },
    twitter: { card: 'summary_large_image' },
    alternates: { canonical: `/dj/${dj.id}` },
  }
}

export default async function DjProfile({ params }: { params: { id: string } }) {
  const [dj, events] = await Promise.all([fetchDj(params.id), fetchDjEvents(params.id, 10)])
  if (!dj) return notFound()
  const similar = await fetchSimilarDjs(params.id, (dj as any).genres || [], 1)
  const images: string[] = Array.isArray((dj as any).images) ? (dj as any).images : []
  const heroImg = images[0] || null
  const spotifyEmbed = getSpotifyEmbed((dj as any).spotify_embed)
  const bio: string = (dj as any).bio || ''
  const bioI18n = (dj as any).bio_i18n || null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: (dj as any).name,
    ...(bio ? { description: bio.slice(0, 500) } : {}),
    ...(heroImg ? { image: [heroImg] } : {}),
    jobTitle: 'DJ',
    url: `https://wherewego.site/dj/${(dj as any).id}`,
  }

  return (
    <div className="relative -mx-4 md:-mx-6 lg:-mx-10 min-h-[100vh] rounded-[28px] overflow-hidden bg-[#07060a]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      {/* ── Fondo difuminado con la foto del DJ ─────────────────── */}
      {heroImg && (
        <div className="absolute inset-0 pointer-events-none">
          <SafeImage
            src={heroImg}
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
        {heroImg ? (
          <SafeImage src={heroImg} alt={(dj as any).name} fill priority sizes="100vw" className="object-cover object-top" />
        ) : (
          <div className="w-full h-full bg-white/5" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07060a] via-[#07060a]/30 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#07060a]/50 to-transparent" />

        {/* Favorite */}
        <div className="absolute top-4 right-4 z-20">
          <FavoriteButton eventId={params.id} targetType="dj" useLocalCache />
        </div>

        {/* Nombre sobre el hero */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-5 z-10">
          <h1 className="text-3xl font-bold text-white drop-shadow-lg">
            <LocalText value={(dj as any).name} i18n={(dj as any).name_i18n || undefined} />
          </h1>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className="relative z-10 px-4 md:px-6 lg:px-10 pb-10 space-y-5">

        <Breadcrumbs items={[
          { name: 'Inicio', href: '/' },
          { name: 'Descubrir', href: '/discover?tab=events' },
          { name: 'DJs', href: '/discover?tab=djs' },
          { name: (dj as any).name },
        ]} />

        {/* Genres */}
        {Array.isArray((dj as any).genres) && (dj as any).genres.length > 0 && (
          <div className="flex gap-2 flex-wrap pt-1">
            {(dj as any).genres.map((g: string) => (
              <span
                key={g}
                className="text-xs px-3 py-1 rounded-full border border-[#d8af3a]/40 text-[#d8af3a]/90 bg-[#d8af3a]/8 font-medium"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Bio */}
        {bio && (
          <ClubDescriptionExpand text={bio} i18n={bioI18n} />
        )}

        {/* Divider */}
        <div className="border-t border-white/8" />

        {/* Spotify */}
        {spotifyEmbed && (
          <div>
            <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-2">Spotify</p>
            <div className="rounded-2xl border border-white/10 overflow-hidden">
              <iframe
                src={spotifyEmbed.src}
                title="Spotify player"
                width="100%"
                height={spotifyEmbed.height}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="block w-full"
              />
            </div>
          </div>
        )}

        {/* Divider */}
        {spotifyEmbed && <div className="border-t border-white/8" />}

        {/* Upcoming events */}
        <div>
          <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-3"><T k="dj.upcoming" /></p>
          {events.length === 0 ? (
            <p className="text-sm text-white/40"><T k="dj.no_upcoming" /></p>
          ) : (
            <div className="space-y-2">
              {events.map((e: any) => {
                const evImgs: string[] = Array.isArray(e.images) ? e.images : []
                const evImg = evImgs[0] || null
                return (
                  <Link
                    key={e.id}
                    href={`/event/${e.id}`}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/8 hover:bg-white/8 hover:border-[#d8af3a]/30 transition-all group"
                  >
                    {evImg ? (
                      <SafeImage src={evImg} alt={e.name} width={56} height={56} sizes="56px" className="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-white/8 border border-white/10 shrink-0 flex items-center justify-center text-white/20 text-xl">♪</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white leading-tight truncate group-hover:text-[#d8af3a] transition-colors">{e.name}</p>
                      <p className="text-xs text-white/50 mt-0.5">
                        <LDate value={e.start_at} timeZone="UTC" options={{ weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }} />
                        {e.club_name && ` · ${e.club_name}`}
                      </p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white/30 group-hover:text-[#d8af3a] shrink-0 transition-colors">
                      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Similar DJs */}
        {similar && similar.length > 0 && (
          <>
            <div className="border-t border-white/8" />
            <div>
              <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-3"><T k="dj.similar" /></p>
              <Link
                href={`/dj/${(similar[0] as any).id}`}
                className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/8 hover:bg-white/8 hover:border-[#d8af3a]/30 transition-all group"
              >
                {(Array.isArray((similar[0] as any).images) && (similar[0] as any).images[0]) ? (
                  <SafeImage src={(similar[0] as any).images[0]} alt={(similar[0] as any).name} width={56} height={56} sizes="56px" className="w-14 h-14 rounded-full object-cover object-top border border-white/10 shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-white/8 border border-white/10 shrink-0" />
                )}
                <p className="flex-1 font-medium text-white group-hover:text-[#d8af3a] transition-colors">{(similar[0] as any).name}</p>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white/30 group-hover:text-[#d8af3a] shrink-0 transition-colors">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
          </>
        )}

        {/* Share */}
        <ShareSheet
          title={(dj as any).name}
          i18n={(dj as any).name_i18n || undefined}
          buttonClassName="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-medium text-sm hover:bg-white/10 hover:border-[#d8af3a]/40 hover:text-[#d8af3a] transition-all"
        />
      </div>
    </div>
  )
}

export const revalidate = 60
