"use client"
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabaseBrowser } from '@/lib/supabase-browser'

// null mientras se resuelve. Lo usan AdminGuard (que pinta el back office
// entero) y QuickEdit (que pinta el boton de edicion en las fichas publicas),
// asi que la comprobacion de rol vive en un solo sitio.
//
// El permiso real lo aplica RLS en la base de datos: esto solo decide que se
// dibuja. Ver el comentario de AdminGuard.
export function useIsModerator() {
  const { user } = useAuth()
  const [ok, setOk] = useState<boolean | null>(null)

  useEffect(() => {
    if (!user) { setOk(false); return }
    const sb = supabaseBrowser
    let cancelled = false
    ;(async () => {
      const to = setTimeout(() => { if (!cancelled) setOk(false) }, 5000)
      const done = (value: boolean) => {
        if (cancelled) return
        clearTimeout(to)
        setOk(value)
      }
      try {
        const { data, error } = await sb.rpc('is_moderator', { uid: user.id })
        if (!error && typeof data === 'boolean') return done(!!data)
      } catch {}
      try {
        const { data } = await sb.from('users').select('roles').eq('id', user.id).maybeSingle()
        const roles: any = data?.roles
        const list: string[] = Array.isArray(roles)
          ? roles
          : (typeof roles === 'string' ? roles.replace(/[{}]/g, '').split(',') : [])
        return done(list.includes('moderator') || list.includes('admin'))
      } catch {}
      done(false)
    })()
    return () => { cancelled = true }
  }, [user])

  return ok
}
