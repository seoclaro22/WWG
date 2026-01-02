import './globals.css'
import { ReactNode } from 'react'
import { I18nProvider } from '@/lib/i18n'
import { AuthProvider } from '@/lib/auth'
import { Navbar } from '@/components/Navbar'
import { CookieConsent } from '@/components/CookieConsent'
import { Toaster } from '@/components/Toaster'

export const metadata = {
  title: 'Where We Go',
  description: 'Agenda local curada. Donde vamos hoy?'
}

// Evita el prerender estatico en build (usa runtime siempre)
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="text-white bg-base-bg">
        <AuthProvider>
          <I18nProvider>
            <div className="mx-auto w-full max-w-3xl md:max-w-4xl lg:max-w-5xl min-h-screen flex flex-col px-4">
              <Navbar />
              <main className="flex-1 p-3 md:p-6">{children}</main>
              <Toaster />
              <CookieConsent />
            </div>
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
