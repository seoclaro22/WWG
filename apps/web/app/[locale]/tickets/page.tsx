"use client"
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { storageKey: 'nighthub-auth', persistSession: true, autoRefreshToken: true } })
}

type Ticket = { id: number; event_id: string; ts: string; name?: string; start_at?: string | null; club_name?: string | null }

export default function TicketsPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<Ticket[]>([])
  const { t } = useI18n()

  useEffect(() => {
    if (!user) { setItems([]); return }
    ;(async () => {
      const s = sb()
      const { data: clicks } = await s.from('clicks').select('id,event_id,ts').eq('user_id', user.id).order('ts', { ascending: false })
      const eventsIds = (clicks || []).map(c => c.event_id)
      let eventsMap: Record<string, any> = {}
      if (eventsIds.length) {
        const { data } = await s.from('events_public').select('id,name,start_at,club_name').in('id', eventsIds)
        for (const e of (data || [])) eventsMap[e.id] = e
      }
      const merged = (clicks || []).map(c => ({ id: c.id as number, event_id: c.event_id as string, ts: c.ts as string, ...eventsMap[c.event_id as string] }))
      setItems(merged)
    })()
  }, [user])

  if (!user) return <div className="muted">{t('common.login_to_view')}</div>

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('tickets.title')}</h1>
      <div className="grid gap-3">
        {items.map(it => (
          <Link key={it.id} href={`/event/${it.event_id}`} className="card p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{it.name || 'Evento'}</div>
              <div className="text-sm text-white/60">{it.club_name || '—'} · {new Date(it.start_at || it.ts).toLocaleString('es-ES')}</div>
            </div>
            <div className="text-xs text-white/50">Reservado</div>
          </Link>
        ))}
        {items.length === 0 && <div className="muted">{t('tickets.empty')}</div>}
      </div>
    </div>
  )
}
