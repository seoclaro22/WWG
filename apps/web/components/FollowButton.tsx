"use client"
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'

// Cliente compartido de toda la app; ver lib/supabase-browser.ts.
function sb() {
  return supabaseBrowser
}

export function FollowButton({ clubId, djId }: { clubId?: string; djId?: string }) {
  const { user } = useAuth()
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(false)
  const targetType = djId ? 'dj' : 'club'
  const targetId = djId || clubId!
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { setFollowing(false); return }
    sb().from('follows').select('user_id').eq('user_id', user.id).eq('target_type',targetType).eq('target_id', targetId).maybeSingle().then(({ data }) => {
      setFollowing(!!data)
    })
  }, [user, targetId, targetType])

  async function toggle() {
    if (!user) return
    setLoading(true)
    try {
      try { await sb().from('users').upsert({ id: user.id, email: (user.email as string) || '' }) } catch {}
      if (following) {
        const { error } = await sb().from('follows').delete().eq('user_id', user.id).eq('target_type',targetType).eq('target_id', targetId)
        if (error) throw error
        // Mantén limpio favoritos si seguimos el mismo criterio
        await sb().from('favorites').delete().eq('user_id', user.id).eq('target_type', targetType as any).eq('target_id', targetId)
        setFollowing(false)
      } else {
        const { error } = await sb().from('follows').insert({ user_id: user.id, target_type: targetType, target_id: targetId })
        if (error) throw error
        // Para visibilidad en /favorites, reflejamos seguimiento como favorito
        const fav = await sb().from('favorites').upsert({ user_id: user.id, target_type: targetType as any, target_id: targetId }, { onConflict: 'user_id,target_type,target_id' })
        if (fav.error) throw fav.error
        setFollowing(true)
      }
      // Realtime notificará a /favorites; no disparamos eventos locales
      setErrorMsg(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={toggle} disabled={!user || loading} className={`btn ${following ? 'btn-primary' : 'btn-secondary'}`}>
        {following ? 'Siguiendo' : 'Seguir'}
      </button>
      {errorMsg && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <div className="card px-3 py-2 text-sm text-red-300 border-red-500/40">{errorMsg}</div>
        </div>
      )}
    </>
  )
}
