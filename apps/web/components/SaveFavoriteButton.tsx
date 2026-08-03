"use client"
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'

// Cliente compartido de toda la app; ver lib/supabase-browser.ts.
function sb() {
  return supabaseBrowser
}

export function SaveFavoriteButton({ targetId, targetType = 'event', compact }: { targetId: string; targetType?: 'event'|'club'|'dj'; compact?: boolean }) {
  const { user } = useAuth()
  const { t } = useI18n()
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [needAuth, setNeedAuth] = useState(false)

  useEffect(() => {
    let alive = true
    // Fijar estado rápido desde localStorage
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(`nighthub-fav-${targetType}`) : null
      if (raw) {
        const arr: string[] = JSON.parse(raw)
        if (Array.isArray(arr) && arr.includes(targetId)) setSaved(true)
      }
    } catch {}
    if (!user) return () => { alive = false }
    // Confirmar desde BD (RLS)
    sb().from('favorites')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .maybeSingle()
      .then(({ data }) => { if (alive) setSaved(!!data) })
      .catch(()=>{})
    return () => { alive = false }
  }, [user, targetId, targetType])

  async function toggle() {
    if (!user) { setNeedAuth(true); return }
    setBusy(true)
    const next = !saved
    setSaved(next)
    try {
      try { await sb().from('users').upsert({ id: user.id, email: (user.email as string) || '' }) } catch {}
      if (next) {
        const { error } = await sb().from('favorites').insert({ user_id: user.id, target_type: targetType, target_id: targetId })
        if (error && (error as any).code !== '23505') throw error
      } else {
        const { error } = await sb().from('favorites').delete().eq('user_id', user.id).eq('target_type', targetType).eq('target_id', targetId)
        if (error) throw error
      }
      // Mantener cache local para un render inmediato en otras vistas
      try {
        if (typeof window !== 'undefined') {
          const key = `nighthub-fav-${targetType}`
          const raw = localStorage.getItem(key)
          let arr: string[] = []
          if (raw) { try { arr = JSON.parse(raw) || [] } catch {} }
          const has = arr.includes(targetId)
          const updated = next ? (has ? arr : [...arr, targetId]) : arr.filter(x => x !== targetId)
          localStorage.setItem(key, JSON.stringify(updated))
        }
      } catch {}
      // Verificar en BD y notificar
      const verify = await sb().from('favorites')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .maybeSingle()
      const persisted = !!verify.data
      if (persisted !== next) {
        setSaved(!next)
        alert('No se pudo actualizar en la base de datos (RLS/permiso).')
      } else {
        try {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('nighthub-fav-changed', { detail: { id: targetId, type: targetType, added: next } }))
            window.dispatchEvent(new CustomEvent('nighthub-toast', { detail: { message: next ? 'Guardado en favoritos' : 'Eliminado de favoritos' } }))
          }
        } catch {}
      }
    } catch (e:any) {
      setSaved(!next)
      alert(e?.message || 'No se pudo actualizar favorito')
    } finally { setBusy(false) }
  }

  const cls = compact ? 'btn btn-secondary text-xs px-3 py-1' : 'btn btn-secondary text-sm px-3 py-1'
  return (
    <>
      <button className={cls} disabled={busy} onClick={toggle}>{saved ? (t('action.remove') || 'Quitar') : (t('action.follow') || 'Seguir')}</button>
      {needAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={()=>setNeedAuth(false)}>
          <div className="card p-4 max-w-sm" onClick={e=>e.stopPropagation()}>
            <div className="font-medium mb-2">Inicia sesion para guardar favoritos</div>
            <a href="/auth" className="btn btn-primary w-full">Ir a entrar</a>
            <button className="btn btn-secondary w-full mt-2" onClick={()=>setNeedAuth(false)}>Cerrar</button>
          </div>
        </div>
      )}
    </>
  )
}
