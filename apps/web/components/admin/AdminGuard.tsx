"use client"
import { useIsModerator } from '@/components/admin/useIsModerator'

// Sin atajo por email: estaba escrito en el bundle publico, asi que anunciaba a
// cualquiera cual es la cuenta que da acceso total, y ademas saltaba la
// comprobacion real de rol. El permiso se decide solo en is_moderator(), que se
// apoya en la base de datos, y la barrera real son las politicas RLS: esto solo
// decide que se dibuja.
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const ok = useIsModerator()
  if (ok === null) return <div className="muted">Cargando...</div>
  if (!ok) return <div className="muted">No tienes permisos para acceder al Back Office.</div>
  return <>{children}</>
}
