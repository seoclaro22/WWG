import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['es', 'en', 'de'],
  defaultLocale: 'es',
  // El espanol se sirve sin prefijo en la raiz (protege las URLs ya indexadas).
  // Ingles y aleman van prefijados: /en/... y /de/...
  localePrefix: 'as-needed',
  // Sin redireccion automatica por Accept-Language/cookie: cada URL sirve
  // siempre su idioma. URLs deterministas, que es lo que necesita el SEO.
  localeDetection: false,
})

export type Locale = (typeof routing.locales)[number]
