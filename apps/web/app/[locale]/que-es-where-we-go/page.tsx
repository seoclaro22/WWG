import { Link } from '@/lib/navigation'
import { T } from '@/components/T'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { buildAlternates, localizedUrl } from '@/lib/seo'
import { homeCrumb } from '@/lib/seo-pages'
import { dictionaries } from '@/lib/dictionaries'
import { routing } from '@/i18n/routing'

export function generateMetadata({ params }: { params: { locale: string } }) {
  const dict = dictionaries[params.locale] || dictionaries[routing.defaultLocale]
  const title = dict['about.meta_title']
  const description = dict['about.meta_description']
  const url = localizedUrl('/que-es-where-we-go', params.locale)
  return {
    title,
    description,
    alternates: buildAlternates('/que-es-where-we-go', params.locale),
    openGraph: { title, description, url, siteName: 'Where We Go', type: 'website', locale: params.locale },
    twitter: { card: 'summary_large_image', title, description },
  }
}

const BENEFITS = [
  'agenda',
  'fichas',
  'favoritos',
  'geo',
  'entradas',
  'push',
  'verificado',
  'idiomas',
] as const

const HOW_STEPS = ['1', '2', '3'] as const
const FAQ = ['1', '2', '3', '4', '5'] as const

const BenefitIcon = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="shrink-0">
    <circle cx="8" cy="8" r="8" fill="rgba(216,175,58,0.15)" />
    <path d="M5 8l2 2 4-4" stroke="#d8af3a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export default function AboutPage({ params }: { params: { locale: string } }) {
  const { locale } = params
  const dict = dictionaries[locale] || dictionaries[routing.defaultLocale]
  const pageUrl = localizedUrl('/que-es-where-we-go', locale)

  // AboutPage referenciando la misma entidad Organization/WebSite que declara
  // la home: consolida la marca en vez de competir con ella por "where we go".
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    url: pageUrl,
    name: dict['about.meta_title'],
    description: dict['about.meta_description'],
    inLanguage: locale,
    isPartOf: { '@id': 'https://wherewego.site/#website' },
    about: { '@id': 'https://wherewego.site/#organization' },
    mainEntity: { '@id': 'https://wherewego.site/#organization' },
  }

  return (
    <div className="relative -mx-4 md:-mx-6 lg:-mx-10 min-h-[100vh] rounded-[28px] bg-[#07060a] overflow-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-base opacity-50" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-aurora opacity-40" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-vignette" />

      <div className="relative z-10 px-4 md:px-6 lg:px-10 py-10 space-y-10 max-w-2xl mx-auto">

        <Breadcrumbs locale={locale} items={[
          { name: homeCrumb(locale), href: '/' },
          { name: dict['about.eyebrow'] },
        ]} />

        {/* ── Hero ─────────────────────────────────────────────── */}
        <div className="text-center space-y-4 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#d8af3a]/10 border border-[#d8af3a]/25 text-[#d8af3a] text-xs font-semibold uppercase tracking-widest">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M6 0l1.5 4.5H12l-3.75 2.7 1.4 4.3L6 8.9l-3.65 2.6 1.4-4.3L0 4.5h4.5L6 0z" /></svg>
            <T k="about.eyebrow" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight text-balance">
            <T k="about.hero_title" />
          </h1>
          <p className="text-white/60 text-base leading-relaxed">
            <T k="about.hero_subtitle" />
          </p>
          <Link
            href="/discover?tab=events"
            prefetch={false}
            className="inline-block px-8 py-3.5 rounded-2xl bg-[#d8af3a] text-black font-bold text-base shadow-[0_0_24px_rgba(216,175,58,0.4)] hover:bg-[#e8c85a] hover:shadow-[0_0_32px_rgba(216,175,58,0.55)] transition-all"
          >
            <T k="about.cta_discover" />
          </Link>
        </div>

        {/* ── Que es ───────────────────────────────────────────── */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-white"><T k="about.what_title" /></h2>
          <p className="text-sm text-white/65 leading-relaxed"><T k="about.what_body" /></p>
        </div>

        {/* ── Beneficios ───────────────────────────────────────── */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-white"><T k="about.benefits_title" /></h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {BENEFITS.map(key => (
              <div key={key} className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-white/4 border border-white/8">
                <BenefitIcon />
                <div>
                  <h3 className="text-sm font-semibold text-white"><T k={`about.benefit_${key}_title`} /></h3>
                  <p className="text-xs text-white/55 leading-snug mt-0.5"><T k={`about.benefit_${key}_body`} /></p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Como funciona ────────────────────────────────────── */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-white"><T k="about.how_title" /></h2>
          <ol className="space-y-3">
            {HOW_STEPS.map((n, i) => (
              <li key={n} className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-white/4 border border-white/8">
                <span className="shrink-0 w-6 h-6 rounded-full bg-[#d8af3a]/15 border border-[#d8af3a]/30 text-[#d8af3a] text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                <div>
                  <h3 className="text-sm font-semibold text-white"><T k={`about.how_${n}_title`} /></h3>
                  <p className="text-xs text-white/55 leading-snug mt-0.5"><T k={`about.how_${n}_body`} /></p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* ── Ciudades ─────────────────────────────────────────── */}
        <div className="space-y-3 bg-white/4 border border-white/8 rounded-3xl p-5">
          <h2 className="text-lg font-bold text-white"><T k="about.cities_title" /></h2>
          <p className="text-sm text-white/60 leading-relaxed"><T k="about.cities_body" /></p>
        </div>

        {/* ── FAQ ──────────────────────────────────────────────── */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-white"><T k="about.faq_title" /></h2>
          <div className="space-y-2">
            {FAQ.map(n => (
              <div key={n} className="px-4 py-3.5 rounded-2xl bg-white/4 border border-white/8">
                <h3 className="text-sm font-semibold text-white"><T k={`about.faq_${n}_q`} /></h3>
                <p className="text-xs text-white/55 leading-relaxed mt-1"><T k={`about.faq_${n}_a`} /></p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Para profesionales ───────────────────────────────── */}
        <div className="space-y-3 text-center border-t border-white/8 pt-8">
          <h2 className="text-lg font-bold text-white"><T k="about.pro_title" /></h2>
          <p className="text-sm text-white/60 leading-relaxed max-w-md mx-auto"><T k="about.pro_body" /></p>
          <Link
            href="/promote"
            prefetch={false}
            className="inline-block px-6 py-3 rounded-2xl bg-white/8 border border-white/15 text-white font-semibold text-sm hover:bg-white/12 hover:border-[#d8af3a]/40 hover:text-[#d8af3a] transition-all"
          >
            <T k="about.pro_cta" />
          </Link>
        </div>

        {/* ── CTA final ────────────────────────────────────────── */}
        <div className="text-center space-y-3 pb-2">
          <h2 className="text-lg font-bold text-white"><T k="about.final_title" /></h2>
          <Link
            href="/discover?tab=events"
            prefetch={false}
            className="inline-block px-8 py-3.5 rounded-2xl bg-[#d8af3a] text-black font-bold text-base shadow-[0_0_24px_rgba(216,175,58,0.4)] hover:bg-[#e8c85a] transition-all"
          >
            <T k="about.final_cta" />
          </Link>
        </div>

      </div>
    </div>
  )
}
