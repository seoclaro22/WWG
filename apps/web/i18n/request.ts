import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

// next-intl se usa solo para el enrutado por idioma (middleware, Link, locale
// en servidor). Las traducciones las gestiona nuestro propio diccionario en
// lib/dictionaries.ts, cuyas claves llevan puntos ('nav.home') y next-intl
// las rechazaria como namespaces anidados. Por eso no le pasamos mensajes.
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale
  }
  return { locale, messages: {} }
})
