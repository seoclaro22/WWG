import { Link, localizedPath } from '@/lib/navigation'
import { SafeImage } from '@/components/SafeImage'
import { fetchClub, fetchClubEvents } from '@/lib/db'
import { clubPath, eventPath } from '@/lib/hrefs'
import { notFound, permanentRedirect } from 'next/navigation'
import { FavoriteButton } from '@/components/FavoriteButton'
import { LocalText } from '@/components/LocalText'
import { T } from '@/components/T'
import { ShareSheet } from '@/components/ShareSheet'
import { ClubDescriptionExpand } from '@/components/ClubDescriptionExpand'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { buildAlternates } from '@/lib/seo'
import { homeCrumb, clubMetaDescription, formatShortDate, formatEventDate, secciones, alts, resumenClub, tituloClub, noEncontrado } from '@/lib/seo-pages'
import { AnswerBlock } from '@/components/AnswerBlock'
import { openingHoursSpecification } from '@/lib/opening-hours'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { ClaimProfileButton } from '@/components/ClaimProfileButton'

export async function generateMetadata({ params }: { params: { locale: string; id: string } }) {
  // En serie y no en paralelo: params.id puede ser el slug, y fetchClubEvents
  // filtra por club_id. Antes iban con Promise.all y desde /club/la-santa la
  // agenda salia vacia, que es justo lo que da valor a esta descripcion.
  const club = (await fetchClub(params.id)) as any
  // El titulo del 404 en el idioma de la URL: estaba en castellano fijo, asi
  // que /de/club/loquesea abria una pestaña titulada "Club no encontrado".
  if (!club) return { title: noEncontrado(params.locale).title }
  const proximos = await fetchClubEvents(club.id, 30)
  const ruta = clubPath(club)
  const images: string[] = Array.isArray(club.images) ? club.images : []
  // town es el pueblo/localidad exacta (ej. "Benicàssim"), mas especifico que
  // zone, que es el hub de ciudad (ej. "Castellón") y agrupa /castellon.
  // Sin town se cae a zone, y sin zone se omite en vez de inventar Mallorca.
  const lugar = club.town || club.zone || null
  const place = lugar ? ` en ${lugar}` : ''
  // La agenda por delante de la descripcion: es lo unico que este resultado
  // tiene y no tienen la web oficial, Maps ni el Instagram del local.
  const description = clubMetaDescription(
    {
      nombre: club.name,
      lugar,
      eventos: proximos.length,
      proxima: proximos[0] ? formatShortDate((proximos[0] as any).start_at, params.locale) : null,
    },
    params.locale,
    club.description || `${club.name}: eventos, fotos y como llegar. Descubre la mejor fiesta${place} con Where We Go.`,
  )
  return {
    title: tituloClub(club.name, lugar, params.locale),
    description,
    openGraph: {
      title: club.name,
      description,
      type: 'website',
      url: ruta,
      images: images.length ? [{ url: images[0] }] : (club.logo_url ? [{ url: club.logo_url }] : undefined),
    },
    twitter: { card: 'summary_large_image' },
    alternates: buildAlternates(ruta, params.locale),
  }
}

export default async function ClubProfile({ params }: { params: { locale: string; id: string } }) {
  const club = (await fetchClub(params.id)) as any
  if (!club) return notFound()

  // /club/<uuid> es la forma que Google lleva indexada desde julio. Se sigue
  // aceptando para siempre, pero se responde con un 308 al slug para que la
  // autoridad se traslade y no queden dos URLs con el mismo contenido.
  if (club.slug && params.id !== club.slug) {
    permanentRedirect(localizedPath(clubPath(club), params.locale))
  }

  // Por club.id y no por params.id: fetchClubEvents filtra por club_id.
  // 30 y no 10 porque el bloque de respuesta dice cuantas fiestas hay: con el
  // tope en 10 un club con 14 anunciadas afirmaba tener 10.
  const proximos = await fetchClubEvents(club.id, 30)
  const events = proximos.slice(0, 10)
  const sec = secciones(params.locale)
  const alt = alts(params.locale)

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

  const generos: string[] = Array.isArray(club.genres) ? club.genres : []
  const resumen = resumenClub({
    nombre: club.name,
    lugar: club.town || club.zone || null,
    direccion: club.address || null,
    eventos: proximos.length,
    proxima: proximos[0] ? formatShortDate((proximos[0] as any).start_at, params.locale) : null,
    generos,
  }, params.locale)

  const horario = openingHoursSpecification(club.open_hours)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NightClub',
    // Mismo @id que usan las fichas de evento al declarar su location: es lo
    // que le dice a Google que hablan del mismo local y no de dos entidades.
    '@id': `https://wherewego.site${clubPath(club)}#club`,
    name: club.name,
    ...(club.description ? { description: String(club.description).slice(0, 500) } : {}),
    ...(heroImg ? { image: [heroImg] } : {}),
    address: {
      '@type': 'PostalAddress',
      ...(club.address ? { streetAddress: club.address } : {}),
      // town es mas preciso que zone (hub de ciudad) cuando existe.
      ...(club.town || club.zone ? { addressLocality: club.town || club.zone } : {}),
    },
    // Solo cuando las dos existen. Unas coordenadas a medias o inventadas le
    // dicen a Google que el local esta donde no esta, que es peor que no
    // declarar nada. Los clubs sin geocodificar salen sin este bloque.
    ...(club.lat != null && club.lon != null ? {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: Number(club.lat),
        longitude: Number(club.lon),
      },
    } : {}),
    // Solo si el dueño de la ficha lo ha rellenado y encaja en el formato: ver
    // la nota de lib/opening-hours.ts. Un horario inventado manda a alguien a
    // un local cerrado y ademas lo publica Google.
    ...(horario ? { openingHoursSpecification: horario } : {}),
    ...(links?.instagram || links?.facebook || links?.web ? {
      sameAs: [links.instagram, links.facebook, links.web].filter(Boolean),
    } : {}),
    url: `https://wherewego.site${clubPath(club)}`,
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
                alt={alt.logo(club.name)}
                width={56}
                height={56}
                sizes="56px"
                className="w-14 h-14 rounded-2xl border-2 border-white/20 object-cover shadow-lg shrink-0 mb-0.5"
              />
            )}
            <div className="min-w-0">
              <h1 className="text-3xl font-bold leading-tight text-white drop-shadow-lg">
                {club.name}
                {club.verified && <> <VerifiedBadge /></>}
              </h1>
              {(club.town || club.zone) && (
                <p className="text-sm text-white/60 mt-0.5">{club.town || club.zone}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className="px-4 md:px-6 lg:px-10 pb-10 space-y-5 relative z-10">

        <Breadcrumbs locale={params.locale} items={[
          { name: homeCrumb(params.locale), href: '/' },
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

        {/* Respuesta corta: debajo de la descripcion del local, no antes.
            Delante de todo lo compactaba y repetia lo que el usuario acababa
            de leer en su propio idioma. */}
        <AnswerBlock resumen={resumen} />

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
            <h2 className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-0.5">{sec.clubDireccion(club.name)}</h2>
            <p className="text-sm text-white/80 leading-snug">{club.address || club.zone || '—'}</p>
          </div>
        </div>

        {/* Gallery */}
        {galleryImgs.length > 0 && (
          <div>
            <h2 className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-2">{sec.clubFotos(club.name)}</h2>
            <div className="grid grid-cols-2 gap-2">
              {galleryImgs.slice(0, 6).map((src, i) => (
                <div
                  key={i}
                  className={`relative w-full overflow-hidden rounded-xl border border-white/10 ${i === 0 && galleryImgs.length % 2 !== 0 ? 'col-span-2 aspect-[2/1]' : 'aspect-square'}`}
                >
                  <SafeImage src={src} alt={alt.foto(club.name, i + 2)} fill sizes="(max-width: 640px) 50vw, 300px" className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-white/8" />

        {/* Upcoming events */}
        <div>
          <h2 className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-3">{sec.clubAgenda(club.name)}</h2>
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
                    href={eventPath(e as any)}
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
                        {formatEventDate(e.start_at, params.locale)}
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

        {/* Reclamacion: solo mientras la ficha no tenga dueño. */}
        {!club.verified && (
          <ClaimProfileButton targetType="club" targetId={club.id} targetName={club.name} />
        )}
      </div>
    </div>
  )
}

export const revalidate = 60
