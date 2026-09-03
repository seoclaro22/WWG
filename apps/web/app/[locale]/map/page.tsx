import { Suspense } from 'react'
import { setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { notFound } from 'next/navigation'
import { fetchMapVenues } from '@/lib/map-data'
import { EventMapContainer } from '@/components/map/EventMapContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { siteMeta } from '@/lib/seo'

export const revalidate = 60 // Revalida cada minuto para datos frescos de eventos

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const titles: Record<string, string> = {
    es: 'Mapa de Fiestas y Clubs | Where We Go',
    en: 'Party & Club Map | Where We Go',
    de: 'Party- & Clubkarte | Where We Go',
  }
  const descriptions: Record<string, string> = {
    es: 'Descubre en el mapa interactivo los eventos, discotecas y fiestas cerca de ti con filtros de fecha en tiempo real.',
    en: 'Explore nightlife events, clubs, and parties in an interactive real-time map with date filters.',
    de: 'Erkunde Events, Clubs und Partys in einer interaktiven Echtzeit-Karte mit Datumsfiltern.',
  }

  const title = titles[locale] || titles.es
  const description = descriptions[locale] || descriptions.es

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `/${locale}/map`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function MapPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams?: { zone?: string; date?: string; genre?: string }
}) {
  if (!routing.locales.includes(locale as any)) notFound()
  setRequestLocale(locale)

  const defaultZone = searchParams?.zone || 'mallorca'
  const venues = await fetchMapVenues()

  const breadcrumbLabels: Record<string, string> = {
    es: 'Mapa de Fiestas y Clubs',
    en: 'Party & Club Map',
    de: 'Party- & Clubkarte',
  }

  const homeLabels: Record<string, string> = {
    es: 'Inicio',
    en: 'Home',
    de: 'Startseite',
  }

  return (
    <div className="relative -mx-4 md:-mx-6 lg:-mx-10 px-4 md:px-6 lg:px-10 py-6 md:py-8 min-h-[100vh] rounded-[28px] border border-[#d8af3a]/10 bg-[#07060a]">
      {/* Fondos y auras de neón / oro */}
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-base opacity-40" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-aurora opacity-30" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-vignette" />

      <div className="relative z-10 space-y-5">
        <Breadcrumbs
          locale={locale}
          items={[
            { name: homeLabels[locale] || 'Inicio', href: '/' },
            { name: breadcrumbLabels[locale] || 'Mapa de Fiestas y Clubs' },
          ]}
        />

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/80 mb-1">
              {locale === 'es' ? 'Mapa Interactivo' : locale === 'de' ? 'Interaktive Karte' : 'Interactive Map'}
            </p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {locale === 'es'
                ? 'Mapa de Fiestas y Clubs'
                : locale === 'de'
                ? 'Party- & Clubkarte'
                : 'Party & Club Map'}
            </h1>
          </div>
          <p className="text-xs text-white/50 max-w-md">
            {locale === 'es'
              ? 'Explora las discotecas y fiestas en el mapa interactivo en tiempo real.'
              : locale === 'de'
              ? 'Erkunde Clubs und Partys auf der interaktiven Karte in Echtzeit.'
              : 'Explore clubs and parties on the interactive map in real time.'}
          </p>
        </div>

        {/* Contenedor del Mapa 3D */}
        <Suspense
          fallback={
            <div className="w-full h-[600px] rounded-3xl bg-[#0F141B] flex items-center justify-center border border-white/10">
              <div className="w-10 h-10 border-2 border-[#d8af3a] border-t-transparent animate-spin rounded-full" />
            </div>
          }
        >
          <EventMapContainer initialVenues={venues} defaultZone={defaultZone} />
        </Suspense>
      </div>
    </div>
  )
}
