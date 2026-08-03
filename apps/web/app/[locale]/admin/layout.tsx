import type { Metadata } from 'next'

// noindex real para todo el backoffice. robots.txt ya pedia no rastrear /admin,
// pero eso es una indicacion que un buscador puede ignorar y que ademas no
// impide indexar una URL descubierta por un enlace. La cabecera de robots si.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
}

// Nota para cuando se retome la seguridad del backoffice: aqui es donde iria la
// comprobacion de sesion y rol en servidor. Hoy no se puede porque la sesion de
// Supabase se guarda en localStorage (lib/auth.tsx, storageKey 'nighthub-auth')
// y el servidor no la ve; haria falta pasar a sesion en cookies con
// @supabase/ssr. Mientras tanto la barrera real son las politicas RLS, no este
// layout ni AdminGuard, que solo deciden que se dibuja.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
