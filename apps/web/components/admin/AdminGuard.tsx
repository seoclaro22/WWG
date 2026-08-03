"use client"
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabaseBrowser } from '@/lib/supabase-browser'

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [ok, setOk] = useState<boolean | null>(null)
  useEffect(() => {
    if (!user) { setOk(false); return }
    // Sin atajo por email: estaba escrito en el bundle publico, asi que
    // anunciaba a cualquiera cual es la cuenta que da acceso total, y ademas
    // saltaba la comprobacion real de rol. El permiso se decide solo en
    // is_moderator(), que se apoya en la base de datos.
    // Cliente compartido y no uno nuevo: ver lib/supabase-browser.ts.
    const sb = supabaseBrowser
    ;(async () => {
      let resolved = false
      const to = setTimeout(() => { if (!resolved) setOk(false) }, 5000)
      try {
        const { data, error } = await sb.rpc('is_moderator', { uid: user.id })
        if (!error && typeof data === 'boolean') { resolved = true; clearTimeout(to); setOk(!!data); return }
      } catch {}
      try {
        const { data } = await sb.from('users').select('roles').eq('id', user.id).maybeSingle()
        const roles: any = data?.roles
        const list: string[] = Array.isArray(roles)
          ? roles
          : (typeof roles === 'string' ? roles.replace(/[{}]/g, '').split(',') : [])
        resolved = true; clearTimeout(to)
        setOk(list.includes('moderator') || list.includes('admin'))
        return
      } catch {}
      resolved = true; clearTimeout(to)
      setOk(false)
    })()
  }, [user])
  if (ok === null) return <div className="muted">Cargando...</div>
  if (!ok) return <div className="muted">No tienes permisos para acceder al Back Office.</div>
  return <>{children}</>
}
