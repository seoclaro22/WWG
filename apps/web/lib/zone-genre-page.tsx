// Implementacion compartida de /[zona]/genre/[name] y /[zona]/genero/[name].
//
// El genero vive en dos carpetas de ruta, una por segmento traducido (ver
// GENRE_SEGMENT en hrefs.ts: "genero" para castellano, "genre" para ingles y
// aleman). Cada page.tsx es una envoltura fina que llama a estas funciones
// pasando su propio segmento esperado, asi la logica de resolucion, redirect
// y el JSX se escriben una sola vez.
import { notFound, permanentRedirect } from 'next/navigation'
import { Link, localizedPath } from '@/lib/navigation'
import { fetchClubsPublic, fetchEvents, fetchZoneGenreCounts, fetchZonesMap, genreExists, resolveGenreSlug, resolveZoneSlug } from '@/lib/db'
import { clubPath, genrePath, genreSegment, genreSlug, zoneGenrePath } from '@/lib/hrefs'
import { EventCard } from '@/components/EventCard'
import { ClubCard } from '@/components/ClubCard'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { routing } from '@/i18n/routing'
import { buildAlternates, ogImage } from '@/lib/seo'
import { dictionaries } from '@/lib/dictionaries'
import { genreZoneGuide, genreZoneGuideHeadings, MIN_EVENTS_TO_INDEX, formatEventDate, zoneGenreMeta } from '@/lib/seo-pages'
import { EventListJsonLd } from '@/components/EventListJsonLd'

type Params = { locale: string; zone: string; name: string }

export async function zoneGenreStaticParams(expectedSegment: string) {
  const zones = Array.from((await fetchZonesMap()).keys())
  const perZone = await Promise.all(zones.map(async (zone) => {
    const zoneName = await resolveZoneSlug(zone)
    if (!zoneName) return []
    const counts = await fetchZoneGenreCounts(zoneName)
    // Solo se prerenderiza el cruce que ya tiene agenda: el resto se resuelve
    // bajo demanda y sale noindex.
    return Array.from(counts.entries())
      .filter(([, n]) => n >= MIN_EVENTS_TO_INDEX)
      .map(([genre]) => ({ zone, name: genreSlug(genre) }))
  }))
  // Solo el idioma cuyo segmento es este: el otro folder cubre el resto de
  // idiomas, y una peticion al segmento que no le toca a un idioma se
  // resuelve en tiempo real con un redirect, no necesita prerender.
  return routing.locales
    .filter((locale) => genreSegment(locale) === expectedSegment)
    .flatMap((locale) => perZone.flat().map((p) => ({ locale, ...p })))
}

// Se acepta el nombre codificado que se publicaba antes de tener slug
// (/genre/Global%20Hits) y tambien el segmento que no le toca al idioma de
// la URL (/en/mallorca/genero/x): en ambos casos la respuesta es un 308 a la
// forma canonica, nunca un 404, porque el contenido es el mismo.
async function resolveGenre(param: string, locale: string, expectedSegment: string) {
  const wrongSegment = genreSegment(locale) !== expectedSegment
  const bySlug = await resolveGenreSlug(param)
  if (bySlug) return { name: bySlug, redirect: wrongSegment }
  let legacy: string
  try {
    legacy = decodeURIComponent(param)
  } catch {
    return null
  }
  // Mismo motivo que la zona: sin esto el cruce zona x cualquier cadena
  // devolvia un 200, y aqui se multiplica por el numero de zonas.
  if (await genreExists(legacy)) return { name: legacy, redirect: true }
  return null
}

export async function zoneGenreMetadata(params: Params, expectedSegment: string) {
  const zoneName = await resolveZoneSlug(params.zone)
  // Ver nota en /[zona]: con streaming el notFound() del componente llega
  // tarde para fijar el 404.
  if (!zoneName) notFound()

  const resolved = await resolveGenre(params.name, params.locale, expectedSegment)
  if (!resolved) notFound()
  const genre = resolved.name

  const { title, description, eyebrow } = zoneGenreMeta(genre, zoneName, params.locale)
  const path = zoneGenrePath(params.zone, genre, params.locale)
  const count = (await fetchEvents({ zone: zoneName, genre, limit: MIN_EVENTS_TO_INDEX })).length
  const images = ogImage({ eyebrow, title: `${genre} · ${zoneName}`, subtitle: description })

  return {
    title,
    description,
    alternates: buildAlternates(path, params.locale),
    openGraph: { title, description, type: 'website', url: path, images },
    twitter: { card: 'summary_large_image', images },
    ...(count < MIN_EVENTS_TO_INDEX ? { robots: { index: false, follow: true } } : {}),
  }
}

export async function renderZoneGenrePage(params: Params, expectedSegment: string) {
  const zoneName = await resolveZoneSlug(params.zone)
  if (!zoneName) return notFound()

  const resolved = await resolveGenre(params.name, params.locale, expectedSegment)
  if (!resolved) return notFound()
  const genre = resolved.name
  if (resolved.redirect) permanentRedirect(localizedPath(zoneGenrePath(params.zone, genre, params.locale), params.locale))

  const { title, eyebrow, intro, empty } = zoneGenreMeta(genre, zoneName, params.locale)
  const guide = genreZoneGuide(zoneName, genre, params.locale)
  const guideH = genreZoneGuideHeadings(params.locale)
  const [events, clubs] = await Promise.all([
    fetchEvents({ zone: zoneName, genre, limit: 40, sponsoredFirst: true }),
    fetchClubsPublic({ zone: zoneName, genre, limit: 8 }),
  ])

  const dict = dictionaries[params.locale] || dictionaries[routing.defaultLocale]

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
          { name: genre },
        ]} />

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70 mb-1">{eyebrow}</p>
          <h1 className="text-3xl font-bold text-white">{title}</h1>
          <p className="text-sm text-white/60 mt-2 max-w-xl">{intro}</p>
        </div>

        {/* Guia evergreen: texto fijo e investigado, no depende de la agenda.
            Ver la nota de genreZoneGuide en seo-pages.ts. Solo existe para el
            cruce zona x genero que se ha investigado de verdad. */}
        {guide && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70">{guideH.escena(genre, zoneName)}</h2>
            <p className="text-sm text-white/70 leading-relaxed max-w-2xl">{guide.intro}</p>
          </div>
        )}

        {clubs.length > 0 && (
          <div className="grid gap-3">
            {clubs.map((c: any) => {
              const images: string[] = Array.isArray(c.images) ? c.images : []
              return <ClubCard key={c.id} club={{ id: c.id, slug: c.slug, name: c.name, address: c.address, zone: c.zone, image: images[0] || c.logo_url || null, verified: c.verified }} />
            })}
          </div>
        )}

        <div className="grid gap-3">
          {events.map((e: any) => {
            const imgs: string[] = Array.isArray(e.images) ? e.images : []
            return (
              <EventCard
                key={e.id}
                event={{
                  id: e.id,
                  slug: e.slug,
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
            <p className="text-sm text-white/50 min-h-[45vh] flex items-center justify-center text-center">{empty}</p>
          )}
        </div>

        {guide && guide.salas.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70">{guideH.salas(genre, zoneName)}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {guide.salas.map((s) => (
                <Link
                  key={s.slug}
                  href={clubPath({ id: s.slug, slug: s.slug })}
                  className="block rounded-2xl border border-white/10 bg-white/5 p-4 hover:border-[#d8af3a]/30 transition-colors"
                  prefetch={false}
                >
                  <h3 className="text-sm font-medium text-white">{s.titulo}</h3>
                  <p className="text-sm text-white/60 mt-1.5 leading-relaxed">{s.texto}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {guide && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70">{guideH.temporada(genre, zoneName)}</h2>
            <p className="text-sm text-white/70 leading-relaxed max-w-2xl">{guide.temporada}</p>
          </div>
        )}

        {guide && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70">{guideH.precio(genre, zoneName)}</h2>
            <p className="text-sm text-white/70 leading-relaxed max-w-2xl">{guide.precio}</p>
          </div>
        )}

        {guide && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70">{guideH.consejos(genre, zoneName)}</h2>
            <p className="text-sm text-white/70 leading-relaxed max-w-2xl">{guide.consejos}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
          <Link href={genrePath(genre, params.locale)} className="text-xs px-3 py-1.5 rounded-full border border-[#d8af3a]/30 text-[#d8af3a] hover:bg-[#d8af3a]/10 transition-colors" prefetch={false}>
            {genre}
          </Link>
          <Link href={`/${params.zone}`} className="text-xs px-3 py-1.5 rounded-full border border-white/15 text-white/60 hover:text-white transition-colors" prefetch={false}>
            {zoneName}
          </Link>
        </div>
      </div>
    </div>
  )
}
