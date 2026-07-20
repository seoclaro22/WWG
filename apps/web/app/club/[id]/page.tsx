import Link from 'next/link'
import { SafeImage } from '@/components/SafeImage'
import { fetchClub, fetchClubEvents } from '@/lib/db'
import { notFound } from 'next/navigation'
import { FavoriteButton } from '@/components/FavoriteButton'
import { LocalText } from '@/components/LocalText'
import { T } from '@/components/T'
import { ShareSheet } from '@/components/ShareSheet'
import { ClubDescriptionExpand } from '@/components/ClubDescriptionExpand'
import { Breadcrumbs } from '@/components/Breadcrumbs'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const club: any = await fetchClub(params.id)
  if (!club) return { title: 'Club no encontrado' }
  const images: string[] = Array.isArray(club.images) ? club.images : []
  const description = (club.description || '').slice(0, 155) || `${club.name}: eventos, fotos y como llegar. Descubre la mejor fiesta en ${club.zone || 'Mallorca'} con Where We Go.`
  return {
    title: `${club.name} — discoteca en ${club.zone || 'Mallorca'}`,
    description,
    openGraph: {
      title: club.name,
      description,
      type: 'website',
      url: `/club/${club.id}`,
      images: images.length ? [{ url: images[0] }] : (club.logo_url ? [{ url: club.logo_url }] : undefined),
    },
    twitter: { card: 'summary_large_image' },
    alternates: { canonical: `/club/${club.id}` },
  }
}

export default async function ClubProfile({ params }: { params: { id: string } }) {
  const [club, events] = await Promise.all([fetchClub(params.id) as Promise<any>, fetchClubEvents(params.id, 10)])
  if (!club) return notFound()

  let images: string[] = []
  if (Array.isArray(club.images)) {
    images = club.images as string[]
  } else if (typeof club.images === 'string') {
    try {
      const parsed = JSON.parse(club.images)
      if (Array.isArray(parsed)) images = parsed
      else if (typeof parsed === 'string') images = [parsed]
    } catch {
      if (club.images) images = [String(club.images)]
    }
  }

  const logo: string | null = club.logo_url || null
  const links = (club.links || {}) as Record<string, string>
  const mapUrl = club.address
    ? `https://maps.google.com?q=${encodeURIComponent(club.address)}`
    : `https://maps.google.com?q=${encodeURIComponent(club.name)}`

  const heroImg = images[0] || logo
  const galleryImgs = images.length > 1 ? images.slice(1) : []

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NightClub',
    name: club.name,
    ...(club.description ? { description: String(club.description).slice(0, 500) } : {}),
    ...(heroImg ? { image: [heroImg] } : {}),
    address: { '@type': 'PostalAddress', streetAddress: club.address || undefined, addressLocality: club.zone || 'Mallorca', addressCountry: 'ES' },
    ...(links?.instagram || links?.facebook || links?.web ? {
      sameAs: [links.instagram, links.facebook, links.web].filter(Boolean),
    } : {}),
    url: `https://wherewego.site/club/${club.id}`,
  }

  return (
    <div className="relative -mx-4 md:-mx-6 lg:-mx-10 min-h-[100vh] rounded-[28px] overflow-hidden bg-[#07060a]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="relative w-full aspect-[4/5] sm:aspect-[16/9] max-h-[70vh]">
        {heroImg ? (
          <SafeImage src={heroImg} alt={club.name} fill priority sizes="100vw" className="object-cover" />
        ) : (
          <div className="w-full h-full bg-white/5" />
        )}
        {/* Gradient overlay bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07060a] via-[#07060a]/40 to-transparent" />
        {/* Gradient overlay top (para que se lean los botones) */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#07060a]/60 to-transparent" />

        {/* Favorite top-right */}
        <div className="absolute top-4 right-4 z-20">
          <FavoriteButton eventId={club.id} targetType="club" useLocalCache />
        </div>

        {/* Club name over hero */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-5 z-10">
          <div className="flex items-end gap-3">
            {logo && (
              <SafeImage
                src={logo}
                alt="logo"
                width={56}
                height={56}
                sizes="56px"
                className="w-14 h-14 rounded-2xl border-2 border-white/20 object-cover shadow-lg shrink-0 mb-0.5"
              />
            )}
            <div className="min-w-0">
              <h1 className="text-3xl font-bold leading-tight text-white drop-shadow-lg">
                {club.name}
              </h1>
              {club.zone && (
                <p className="text-sm text-white/60 mt-0.5">{club.zone}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className="px-4 md:px-6 lg:px-10 pb-10 space-y-5 relative z-10">

        <Breadcrumbs items={[
          { name: 'Inicio', href: '/' },
          { name: 'Discotecas', href: '/clubs' },
          { name: club.name },
        ]} />

        {/* Quick actions */}
        <div className="flex gap-2 pt-1 flex-wrap">
          <a
            href={mapUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#d8af3a] text-black text-sm font-semibold shadow-[0_0_18px_rgba(216,175,58,0.35)] hover:bg-[#e8c85a] transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1a4.5 4.5 0 0 1 4.5 4.5c0 3.15-4.5 8.5-4.5 8.5S3 8.65 3 5.5A4.5 4.5 0 0 1 7.5 1zm0 2.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" fill="currentColor" />
            </svg>
            <T k="action.directions" />
          </a>
          {links?.instagram && (
            <a
              href={links.instagram}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/8 border border-white/10 text-white/80 text-sm font-medium hover:bg-white/12 hover:text-white transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              Instagram
            </a>
          )}
          {links?.web && (
            <a
              href={links.web}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/8 border border-white/10 text-white/80 text-sm font-medium hover:bg-white/12 hover:text-white transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              Web
            </a>
          )}
          {links?.facebook && (
            <a
              href={links.facebook}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/8 border border-white/10 text-white/80 text-sm font-medium hover:bg-white/12 hover:text-white transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </a>
          )}
        </div>

        {/* Genres */}
        {Array.isArray(club.genres) && club.genres.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {club.genres.map((g: string) => (
              <span
                key={g}
                className="text-xs px-3 py-1 rounded-full border border-[#d8af3a]/40 text-[#d8af3a]/90 bg-[#d8af3a]/8 font-medium"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        {(club.description || club.description_i18n) && (
          <div>
            <ClubDescriptionExpand
              text={club.description || ''}
              i18n={club.description_i18n || null}
            />
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-white/8" />

        {/* Address */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5 w-8 h-8 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1a4.5 4.5 0 0 1 4.5 4.5c0 3.15-4.5 8.5-4.5 8.5S3 8.65 3 5.5A4.5 4.5 0 0 1 7.5 1zm0 2.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" fill="rgba(255,255,255,0.5)" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-0.5"><T k="club.address" /></p>
            <p className="text-sm text-white/80 leading-snug">{club.address || 'Mallorca'}</p>
          </div>
        </div>

        {/* Gallery */}
        {galleryImgs.length > 0 && (
          <div>
            <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-2"><T k="club.photos" /></p>
            <div className="grid grid-cols-2 gap-2">
              {galleryImgs.slice(0, 6).map((src, i) => (
                <div
                  key={i}
                  className={`relative w-full overflow-hidden rounded-xl border border-white/10 ${i === 0 && galleryImgs.length % 2 !== 0 ? 'col-span-2 aspect-[2/1]' : 'aspect-square'}`}
                >
                  <SafeImage src={src} alt={`foto-${i + 2}`} fill sizes="(max-width: 640px) 50vw, 300px" className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-white/8" />

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
                        {new Date(e.start_at).toLocaleString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
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

        {/* Share */}
        <ShareSheet
          title={club.name}
          i18n={club.name_i18n || undefined}
          buttonClassName="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-medium text-sm hover:bg-white/10 hover:border-[#d8af3a]/40 hover:text-[#d8af3a] transition-all"
        />
      </div>
    </div>
  )
}

export const revalidate = 60
