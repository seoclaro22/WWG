"use client"
import { createClient } from '@supabase/supabase-js'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { storageKey: 'nighthub-auth', persistSession: true, autoRefreshToken: true } }
  )
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.1 21s-6.1-3.7-9.1-7.3C.8 11.2 2 7.5 5.4 6.6c2-.5 3.8.3 4.7 1.7.9-1.4 2.6-2.2 4.7-1.7 3.4.9 4.6 4.6 2.4 7.1-3 3.6-9.1 7.3-9.1 7.3z" stroke="#fff" strokeOpacity="0.9" strokeWidth="1.2" fill={filled ? '#FF4D67' : 'transparent'} />
    </svg>
  )
}

export function FavoriteButton({
  eventId,
  compact,
  targetType = 'event',
  initialActive,
  onToggled,
  useLocalCache = false,
}: {
  eventId: string
  compact?: boolean
  targetType?: 'event' | 'club' | 'dj'
  initialActive?: boolean
  onToggled?: (added: boolean) => void
  useLocalCache?: boolean
}) {
  const { user } = useAuth()
  const { t } = useI18n()
  const [fav, setFav] = useState(false)
  const favRef = useRef(false)
  const [loading, setLoading] = useState(false)
  const [needAuth, setNeedAuth] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const setSafe = (val: boolean) => { if (!alive) return; favRef.current = val; setFav(val) }
    // Local cache is optional to avoid mostrar activos si no existen en BD
    if (useLocalCache) {
      try {
        if (typeof window !== 'undefined') {
          const key = `nighthub-fav-${targetType}`
          const raw = localStorage.getItem(key)
          if (raw) {
            const arr: string[] = JSON.parse(raw)
            if (Array.isArray(arr)) setSafe(arr.includes(eventId))
          }
        }
      } catch {}
    }
    if (typeof initialActive !== 'undefined') setSafe(initialActive)
    if (!user) { return () => { alive = false } }
    ;(async () => {
      try {
        const { data } = await sb()
          .from('favorites')
          .select('user_id')
          .eq('user_id', user.id)
          .eq('target_type', targetType)
          .eq('target_id', eventId)
          .maybeSingle()
        const remote = !!data
        if (!alive) return
        // Avoid flicker: only set if different from current
        if (remote !== favRef.current) setSafe(remote)
      } catch {}
    })()
    return () => { alive = false }
  }, [user, eventId, targetType, initialActive])

  const updateLocal = (added: boolean) => {
    try {
      if (typeof window === 'undefined') return
      const key = `nighthub-fav-${targetType}`
      const raw = localStorage.getItem(key)
      let arr: string[] = []
      if (raw) {
        try { arr = JSON.parse(raw) || [] } catch { arr = [] }
      }
      const has = arr.includes(eventId)
      const updated = !has ? [...arr, eventId] : arr.filter(x => x !== eventId)
      const ensured = added ? Array.from(new Set([...updated, eventId])) : updated.filter(x => x !== eventId)
      localStorage.setItem(key, JSON.stringify(ensured))
    } catch {}
  }

  async function toggle() {
    if (!user) { setNeedAuth(true); return }
    setLoading(true)
    setErrorMsg(null)

    // Optimistic
    const prev = fav
    const next = !prev
    setFav(next)
    favRef.current = next
    onToggled?.(next)
    updateLocal(next)

    try {
      try { await sb().from('users').upsert({ id: user.id, email: (user.email as string) || '' }) } catch {}
      if (!next) {
        const { error } = await sb()
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('target_type', targetType)
          .eq('target_id', eventId)
        if (error) throw error
      } else {
        const { error } = await sb()
          .from('favorites')
          .insert({ user_id: user.id, target_type: targetType, target_id: eventId })
        if ((error as any) && (error as any).code !== '23505') throw error
      }
      // Verificar persistencia real y alinear estado
      const verify = await sb()
        .from('favorites')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('target_type', targetType)
        .eq('target_id', eventId)
        .maybeSingle()
      const persisted = !!verify.data
      if (persisted !== next) throw new Error('No se pudo persistir el favorito (RLS/permiso).')
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('nighthub-fav-changed', { detail: { id: eventId, type: targetType, added: next } }))
          window.dispatchEvent(new CustomEvent('nighthub-toast', { detail: { message: next ? 'Guardado en favoritos' : 'Eliminado de favoritos' } }))
        }
      } catch {}
    } catch (e: any) {
      setFav(prev)
      onToggled?.(prev)
      updateLocal(prev)
      setErrorMsg(e?.message || 'No se pudo guardar el favorito')
    } finally {
      setLoading(false)
    }
  }

  const cls = compact
    ? 'inline-flex items-center justify-center rounded-full border border-white/20 bg-black/30 hover:bg-white/10 transition w-8 h-8'
    : 'inline-flex items-center justify-center rounded-full border border-white/20 bg-black/30 hover:bg-white/10 transition w-9 h-9'

  return (
    <>
      <button onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); toggle() }} disabled={loading} aria-label={fav ? t('action.saved') : t('action.save')} className={cls}>
        <HeartIcon filled={fav} />
      </button>
      {needAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setNeedAuth(false)}>
          <div className="card p-4 max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="font-medium mb-2">Crea una cuenta para guardar eventos</div>
            <div className="text-sm text-white/70 mb-3">Registrate o inicia sesion para anadir favoritos y recibir alertas personalizadas.</div>
            <a href="/auth" className="btn btn-primary w-full">Ir a registrarme</a>
            <button className="btn btn-secondary w-full mt-2" onClick={() => setNeedAuth(false)}>Cerrar</button>
          </div>
        </div>
      )}
      {errorMsg && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <div className="card px-3 py-2 text-sm text-red-300 border-red-500/40">{errorMsg}</div>
        </div>
      )}
    </>
  )
}

export default FavoriteButton

