import { notFound } from 'next/navigation'
import { Link } from '@/lib/navigation'
import { countUpcomingEvents, fetchZonesMap } from '@/lib/db'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { NearMeLocator } from '@/components/NearMeLocator'
import { buildAlternatesFor, localizedUrl, ogImage } from '@/lib/seo'
import { homeCrumb, nearFaq, nearFaqHeading, nearGuide, nearGuideHeadings, nearMeta, nearSlug, whenMeta, whenSlug } from '@/lib/seo-pages'

// Cuerpo compartido de la pagina "cerca de mi". Vive aqui y no en app/ porque
// cada idioma tiene su propia carpeta de ruta (el slug es la keyword), y todas
// renderizan esto mismo.
//
// El contenido que importa (ciudades, numero de eventos, enlaces) se renderiza
// en servidor. La geolocalizacion es un atajo encima, no el contenido: una
// pagina que solo funcione con JavaScript y permiso de ubicacion no la puede
// leer ni Google ni quien deniegue el permiso.

export function nearMetadata(locale: string) {
  const { title, description, eyebrow, h1 } = nearMeta(locale)
  const path = `/${nearSlug(locale)}`
  const images = ogImage({ eyebrow, title: h1, subtitle: description })
  return {
    title,
    description,
    alternates: buildAlternatesFor((l) => `/${nearSlug(l)}`, locale),
    openGraph: { title, description, type: 'website', url: path, images },
    twitter: { card: 'summary_large_image', images },
  }
}

export async function NearMePage({ locale, expected }: { locale: string; expected: string }) {
  // Cada carpeta pertenece a un idioma. /en/salir-de-fiesta-cerca-de-mi no es
  // una traduccion valida, es un duplicado, y se responde 404.
  if (locale !== expected) notFound()

  const zonesMap = await fetchZonesMap()
  const zones = Array.from(zonesMap.entries()).map(([slug, name]) => ({ slug, name }))
  const counts = await Promise.all(zones.map((z) => countUpcomingEvents({ zone: z.name })))
  const withCounts = zones
    .map((z, i) => ({ ...z, count: counts[i] }))
    .filter((z) => z.count > 0)
    .sort((a, b) => b.count - a.count)

  const copy = nearMeta(locale)
  const todaySlug = whenSlug('today', locale)
  const guide = nearGuide(locale)
  const guideH = nearGuideHeadings(locale)
  const faq = nearFaq(locale)

  // ItemList: mismo motivo que EventListJsonLd en /[zona] — sin esto el
  // listado de ciudades es una pila de <li>, nada que le diga a Google (o a
  // un asistente) que esto es un directorio de ciudades con agenda.
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: copy.h1,
    itemListElement: withCounts.map((z, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: z.name,
      url: localizedUrl(`/${z.slug}`, locale),
    })),
  }

  return (
    <div className="relative -mx-4 md:-mx-6 lg:-mx-10 px-4 md:px-6 lg:px-10 py-8 md:py-10 min-h-[100vh] rounded-[28px] border border-[#d8af3a]/10 bg-[#07060a]">
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-base opacity-50" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-aurora opacity-40" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-vignette" />

      <div className="relative z-10 space-y-6">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd).replace(/</g, '\\u003c') }} />

        <Breadcrumbs locale={locale} items={[
          { name: homeCrumb(locale), href: '/' },
          { name: copy.eyebrow },
        ]} />

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70 mb-1">{copy.eyebrow}</p>
          <h1 className="text-3xl font-bold text-white">{copy.h1}</h1>
          <p className="text-sm text-white/60 mt-2 max-w-xl">{copy.intro}</p>
        </div>

        <NearMeLocator
          zones={zones}
          todaySlug={todaySlug}
          labels={{ cta: copy.cta, locating: copy.locating, denied: copy.denied, noMatch: copy.noMatch }}
        />

        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70">{copy.cities}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {withCounts.map((z) => (
              <li key={z.slug} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <Link href={`/${z.slug}`} className="text-base font-semibold text-white hover:text-[#d8af3a] transition-colors" prefetch={false}>
                  {z.name}
                </Link>
                <p className="text-xs text-white/40 mt-0.5">{z.count} {z.count === 1 ? copy.eventsOne : copy.events}</p>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  <Link href={`/${z.slug}/${todaySlug}`} className="text-xs px-2.5 py-1 rounded-full border border-[#d8af3a]/30 text-[#d8af3a] hover:bg-[#d8af3a]/10 transition-colors" prefetch={false}>
                    {whenMeta('today', z.name, locale).eyebrow}
                  </Link>
                  <Link href={`/${z.slug}/${whenSlug('weekend', locale)}`} className="text-xs px-2.5 py-1 rounded-full border border-white/15 text-white/60 hover:text-white transition-colors" prefetch={false}>
                    {whenMeta('weekend', z.name, locale).eyebrow}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Guia evergreen: sostiene la pagina como recurso de verdad, no solo
            un localizador con un listado, y le da a Google/IA algo que citar
            fuera de la agenda del dia. */}
        <div className="space-y-3 pt-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70">{guideH.comoFunciona}</h2>
          <p className="text-sm text-white/70 leading-relaxed max-w-2xl">{guide.comoFunciona}</p>
        </div>

        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70">{guideH.porQueUsar}</h2>
          <p className="text-sm text-white/70 leading-relaxed max-w-2xl">{guide.porQueUsar}</p>
        </div>

        <div className="space-y-3 pt-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70">{nearFaqHeading(locale)}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {faq.map((f) => (
              <div key={f.q} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-medium text-white">{f.q}</h3>
                <p className="text-sm text-white/60 mt-1.5 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
