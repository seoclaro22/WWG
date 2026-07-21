import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  // Se excluyen la API, los archivos SEO (sitemap/robots/llms) y cualquier
  // fichero con extension o interno de Next. El resto pasa por el enrutado
  // por idioma (el espanol se sirve sin prefijo).
  matcher: [
    '/((?!api|_next|_vercel|sitemap\\.xml|robots\\.txt|llms\\.txt|.*\\..*).*)',
  ],
}
