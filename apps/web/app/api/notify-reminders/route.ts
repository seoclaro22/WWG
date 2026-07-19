import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { getSupabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const vapidPublic =
  process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivate = process.env.VAPID_PRIVATE_KEY
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com'

let vapidReady = false
function ensureVapid() {
  if (vapidReady) return
  if (!vapidPublic || !vapidPrivate) return
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)
  vapidReady = true
}

// Recordatorio diario: avisa a los usuarios que guardaron en favoritos
// un evento que empieza en las proximas 24 horas.
// Lo invoca el cron de Vercel (vercel.json) con Authorization: Bearer CRON_SECRET.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'missing_cron_secret' }, { status: 500 })
  }
  const authHeader = req.headers.get('authorization') || ''
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  if (!vapidPublic || !vapidPrivate) {
    return NextResponse.json({ ok: false, error: 'missing_vapid' }, { status: 500 })
  }

  const sb = getSupabaseServer()
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const { data: events, error: evErr } = await sb
    .from('events')
    .select('id,name,start_at')
    .eq('status', 'published')
    .gte('start_at', now.toISOString())
    .lte('start_at', in24h.toISOString())
  if (evErr) {
    return NextResponse.json({ ok: false, error: evErr.message }, { status: 500 })
  }
  if (!events?.length) {
    return NextResponse.json({ ok: true, events: 0, sent: 0 })
  }

  const eventIds = events.map(e => e.id)
  const { data: favs } = await sb
    .from('favorites')
    .select('user_id,target_id')
    .eq('target_type', 'event')
    .in('target_id', eventIds)
  if (!favs?.length) {
    return NextResponse.json({ ok: true, events: events.length, sent: 0 })
  }

  const userIds = Array.from(new Set(favs.map(f => f.user_id)))
  const { data: subs } = await sb
    .from('push_subscriptions')
    .select('id,user_id,endpoint,p256dh,auth')
    .in('user_id', userIds)
  if (!subs?.length) {
    return NextResponse.json({ ok: true, events: events.length, sent: 0 })
  }

  ensureVapid()

  const eventById = new Map(events.map(e => [e.id, e]))
  const subsByUser = new Map<string, typeof subs>()
  for (const s of subs) {
    const list = subsByUser.get(s.user_id) || []
    list.push(s)
    subsByUser.set(s.user_id, list)
  }

  let sent = 0
  let failed = 0
  const toDelete: string[] = []
  for (const fav of favs) {
    const event = eventById.get(fav.target_id)
    const userSubs = subsByUser.get(fav.user_id)
    if (!event || !userSubs?.length) continue
    const time = new Date(event.start_at).toLocaleTimeString('es-ES', {
      hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
    })
    const payload = JSON.stringify({
      title: 'Hoy tienes un plan',
      body: `${event.name} · ${time}`,
      url: `/event/${event.id}`
    })
    for (const sub of userSubs) {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      }
      try {
        await webpush.sendNotification(pushSub as any, payload, { TTL: 60 * 60 * 12 })
        sent += 1
      } catch (err: any) {
        failed += 1
        const status = err?.statusCode || err?.status
        if (status === 404 || status === 410) toDelete.push(sub.id)
      }
    }
  }

  if (toDelete.length) {
    await sb.from('push_subscriptions').delete().in('id', Array.from(new Set(toDelete)))
  }

  return NextResponse.json({ ok: true, events: events.length, sent, failed })
}
