import { createNavigation } from 'next-intl/navigation'
import { routing } from '@/i18n/routing'

// Link/router conscientes del idioma: al navegar desde /en, los enlaces
// mantienen el prefijo (/en/event/x) en vez de saltar al espanol.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
