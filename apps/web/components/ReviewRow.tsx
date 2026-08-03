"use client"
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useEffect, useState } from 'react'
import { LDate } from './LDate'

// Cliente compartido de toda la app; ver lib/supabase-browser.ts.
function sb(){
  return supabaseBrowser
}

export function ReviewRow({ r }: { r: { id: string; text: string | null; created_at: string; user_id: string | null } }){
  const [me, setMe] = useState<string | null>(null)
  const [hidden, setHidden] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let mounted = true
    sb().auth.getUser().then(({ data }) => { if (mounted) setMe(data.user?.id || null) })
    return () => { mounted = false }
  }, [])

  async function del(){
    if (!me || me !== r.user_id) return
    if (!confirm('Eliminar tu reseña?')) return
    setBusy(true)
    const { error } = await sb().from('reviews').delete().eq('id', r.id)
    if (!error) setHidden(true)
    setBusy(false)
  }

  if (hidden) return null
  const initial = 'U'
  return (
    <div className="card p-3">
      <div className="flex items-center justify-between text-xs text-white/60">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/10 border border-white/10 text-[11px] font-semibold text-white/90">
            {initial}
          </div>
          <span className="text-white/80">Usuario</span>
        </div>
        <span className="whitespace-nowrap"><LDate value={r.created_at as any} /></span>
      </div>
      <div className="text-sm mt-1">{r.text || '-'}</div>
      {me && me === r.user_id && (
        <div className="mt-2">
          <button disabled={busy} onClick={del} className="btn btn-secondary btn-sm">Eliminar</button>
        </div>
      )}
    </div>
  )
}

