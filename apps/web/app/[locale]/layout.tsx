import '../globals.css'
import { ReactNode, Suspense } from 'react'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { siteMeta } from '@/lib/seo'
import { I18nProvider } from '@/lib/i18n'
import { AuthProvider } from '@/lib/auth'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { CookieConsent } from '@/components/CookieConsent'
import { Toaster } from '@/components/Toaster'
import { AnalyticsTracker } from '@/components/AnalyticsTracker'
import { GoogleAnalytics } from '@/components/GoogleAnalytics'

export function generateMetadata({ params }: { params: { locale: string } }) {
  const { title, description } = siteMeta(params.locale)
  return {
    metadataBase: new URL('https://wherewego.site'),
    title: { default: title, template: '%s | Where We Go' },
    description,
  }
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default function LocaleLayout({
  children,
  params: { locale },
}: {
  children: ReactNode
  params: { locale: string }
}) {
  if (!routing.locales.includes(locale as any)) notFound()
  setRequestLocale(locale)

  return (
    <html lang={locale} className="dark">
      <body className="text-white bg-base-bg">
        {/* Provee el locale a los componentes de next-intl (Link, useRouter). */}
        <NextIntlClientProvider locale={locale} messages={{}}>
        <AuthProvider>
          <I18nProvider initialLocale={locale}>
            <div className="mx-auto w-full max-w-3xl md:max-w-4xl lg:max-w-5xl min-h-screen flex flex-col px-4">
              <Navbar />
              <main className="flex-1 p-3 md:p-6">{children}</main>
              <Footer />
              <Toaster />
              <Suspense fallback={null}><AnalyticsTracker /></Suspense>
              <GoogleAnalytics />
              <CookieConsent />
            </div>
          </I18nProvider>
        </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
