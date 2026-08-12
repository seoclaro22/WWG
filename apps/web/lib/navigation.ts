import { createNavigation } from 'next-intl/navigation'
import { routing } from '@/i18n/routing'

// Link/router conscientes del idioma: al navegar desde /en, los enlaces
// mantienen el prefijo (/en/event/x) en vez de saltar al espanol.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)

// getPathname aplica la politica de prefijos ('as-needed': el espanol va sin
// prefijo). Se usa para construir el destino de las redirecciones 308 de las
// URLs viejas con UUID; hacerlo a mano con /${locale} mandaba /es/club/x, que
// el middleware vuelve a redirigir, encadenando dos saltos.
export function localizedPath(pathname: string, locale: string) {
  return getPathname({ href: pathname, locale })
}
