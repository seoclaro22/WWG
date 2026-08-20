import { notFound, permanentRedirect } from 'next/navigation'
import { Link, localizedPath } from '@/lib/navigation'
import { fetchEvents, fetchGenreZoneCounts, genreExists, resolveGenreSlug } from '@/lib/db'
import { genrePath, zoneGenrePath } from '@/lib/hrefs'
import { EventCard } from '@/components/EventCard'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { buildAlternates, genreMeta, ogImage } from '@/lib/seo'
import { MIN_EVENTS_TO_INDEX, genreZonesHeading, homeCrumb, formatEventDate, vacios, zoneGenreMeta } from '@/lib/seo-pages'
import { EventListJsonLd } from '@/components/EventListJsonLd'

// El segmento de la URL es el slug del genero. Se sigue aceptando el nombre
// codificado que publicabamos antes (/genre/Global%20Hits), porque esas URLs
// estan indexadas: se resuelven igual y el componente responde un 308 al slug
// para trasladar la autoridad sin dejar dos URLs con el mismo contenido.
async function resolveGenre(param: string) {
  const bySlug = await resolveGenreSlug(param)
  if (bySlug) return { name: bySlug, legacy: false }
  let legacy: string
  try {
    legacy = decodeURIComponent(param)
  } catch {
    return null
  }
  if (await genreExists(legacy)) return { name: legacy, legacy: true }
  return null
}

export async function generateMetadata({ params }: { params: { locale: string; name: string } }) {
  // Ver nota en /[zona]: con streaming el notFound() del componente llega
  // tarde para fijar el 404.
  const resolved = await resolveGenre(params.name)
  if (!resolved) notFound()
  const name = resolved.name

  const { title, description, eyebrow } = genreMeta(name, params.locale)
  // Mismo umbral que los cruces zona x genero: un genero sin agenda es una
  // pagina vacia, y ofrecerla a Google solo resta calidad al dominio.
  const count = (await fetchEvents({ genre: name, limit: MIN_EVENTS_TO_INDEX })).length
  const images = ogImage({ eyebrow, title: name, subtitle: description })
  return {
    title,
    description,
    alternates: buildAlternates(genrePath(name), params.locale),
    openGraph: { title, description, type: 'website', url: genrePath(name), images },
    twitter: { card: 'summary_large_image', images },
    ...(count < MIN_EVENTS_TO_INDEX ? { robots: { index: false, follow: true } } : {}),
  }
}

export default async function GenrePage({ params }: { params: { locale: string; name: string } }) {
  const resolved = await resolveGenre(params.name)
  if (!resolved) return notFound()
  const name = resolved.name
  if (resolved.legacy) permanentRedirect(localizedPath(genrePath(name), params.locale))

  const { title, eyebrow, intro, heading } = genreMeta(name, params.locale)
  const [events, zonas] = await Promise.all([
    fetchEvents({ genre: name, limit: 30 }),
    fetchGenreZoneCounts(name),
  ])
  const vacio = vacios(params.locale)
  // Mismo umbral que el resto del sitio: no se enlaza un cruce zona x genero
  // que se serviria noindex al otro lado.
  const zonasConAgenda = zonas.filter((z) => z.count >= MIN_EVENTS_TO_INDEX)

  return (
    <div className="relative -mx-4 md:-mx-6 lg:-mx-10 px-4 md:px-6 lg:px-10 py-8 md:py-10 min-h-[100vh] rounded-[28px] border border-[#d8af3a]/10 bg-[#07060a]">
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-base opacity-50" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-aurora opacity-40" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-vignette" />

      <div className="relative z-10 space-y-5">
        <EventListJsonLd events={events} locale={params.locale} name={title} />
        <Breadcrumbs locale={params.locale} items={[
          { name: homeCrumb(params.locale), href: '/' },
          { name: `${eyebrow}: ${name}` },
        ]} />

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70 mb-1">{eyebrow}</p>
          <h1 className="text-3xl font-bold text-white">{title}</h1>
          <p className="text-sm text-white/60 mt-2 max-w-xl">{intro}</p>
        </div>

        {/* Sin este h2 la pagina era un h1 y una lista suelta: ningun encabezado
            que le dijera a Google de que va el bloque principal. */}
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70">{heading}</h2>

        <div className="grid gap-3">
          {events.map(e => {
            const imgs: string[] = Array.isArray((e as any).images) ? (e as any).images : []
            return (
              <EventCard
                key={e.id}
                event={{
                  id: e.id,
                  slug: (e as any).slug,
                  title: e.name,
                  title_i18n: (e as any).name_i18n || undefined,
                  date: formatEventDate(e.start_at, params.locale),
                  club: e.club_name || '-',
                  image: imgs[0],
                  sponsored: (e as any).sponsored || false,
                }}
              />
            )
          })}
          {events.length === 0 && (
            // El contenedor mide 100vh, asi que con la lista vacia el mensaje
            // quedaba pegado arriba y debajo habia media pantalla en negro.
            // Centrado ocupa ese hueco y se lee como un estado vacio, no como
            // una pagina a medio cargar.
            <div className="text-sm text-white/50 min-h-[45vh] flex items-center justify-center text-center">
              {vacio.genero(name)}{' '}
              <Link href="/discover" className="text-[#d8af3a] hover:text-[#e8c85a] underline">{vacio.verAgenda}</Link>
            </div>
          )}
        </div>

        {/* Sin este bloque la pagina de genero global no enlazaba a ninguna de
            sus paginas hijas: era el unico punto del sitio con enlazado
            interno solo de entrada, nunca de salida. */}
        {zonasConAgenda.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-white/10">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70">{genreZonesHeading(params.locale)}</h2>
            <div className="flex flex-wrap gap-2">
              {zonasConAgenda.map((z) => (
                <Link
                  key={z.slug}
                  href={zoneGenrePath(z.slug, name)}
                  className="text-xs px-3 py-1.5 rounded-full border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-colors"
                  prefetch={false}
                >
                  {zoneGenreMeta(name, z.name, params.locale).eyebrow}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export const revalidate = 60
