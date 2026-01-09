import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { getSupabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

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

function parseRoles(raw: unknown) {
  if (Array.isArray(raw)) return raw.filter(Boolean) as string[]
  if (typeof raw === 'string') {
    return raw.replace(/[{}]/g, '').split(',').filter(Boolean)
  }
  return []
}

export async function POST(req: NextRequest) {
  if (!vapidPublic || !vapidPrivate) {
    return NextResponse.json({ ok: false, error: 'missing_vapid' }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  const eventId = body?.eventId as string | undefined
  if (!eventId) {
    return NextResponse.json({ ok: false, error: 'missing_event' }, { status: 400 })
  }

  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) {
    return NextResponse.json({ ok: false, error: 'missing_auth' }, { status: 401 })
  }

  const sb = getSupabaseServer()
  const { data: authData, error: authError } = await sb.auth.getUser(token)
  if (authError || !authData?.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const { data: roleRow } = await sb
    .from('users')
    .select('roles')
    .eq('id', authData.user.id)
    .maybeSingle()
  const roles = parseRoles(roleRow?.roles)
  if (!roles.includes('admin') && !roles.includes('moderator')) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
  }

  const { data: event, error: evErr } = await sb
    .from('events')
    .select('id,name,club_id,status')
    .eq('id', eventId)
    .maybeSingle()
  if (evErr || !event) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  }
  if (event.status !== 'published') {
    return NextResponse.json({ ok: false, error: 'not_published' }, { status: 400 })
  }

  const { data: djRows } = await sb
    .from('event_djs')
    .select('dj_id')
    .eq('event_id', eventId)
  const djIds = (djRows || []).map((r) => r.dj_id).filter(Boolean)

  const userIds = new Set<string>()
  if (event.club_id) {
    const { data: clubFavs } = await sb
      .from('favorites')
      .select('user_id')
      .eq('target_type', 'club')
      .eq('target_id', event.club_id)
    for (const row of clubFavs || []) userIds.add(row.user_id)
  }
  if (djIds.length) {
    const { data: djFavs } = await sb
      .from('favorites')
      .select('user_id')
      .eq('target_type', 'dj')
      .in('target_id', djIds)
    for (const row of djFavs || []) userIds.add(row.user_id)
  }

  const ids = Array.from(userIds)
  if (!ids.length) {
    return NextResponse.json({ ok: true, sent: 0, users: 0 })
  }

  const { data: subs } = await sb
    .from('push_subscriptions')
    .select('id,endpoint,p256dh,auth')
    .in('user_id', ids)
  if (!subs?.length) {
    return NextResponse.json({ ok: true, sent: 0, users: ids.length })
  }

  ensureVapid()

  const payload = JSON.stringify({
    title: 'Nuevo evento',
    body: event.name,
    url: `/event/${event.id}`
  })

  let sent = 0
  let failed = 0
  const toDelete: string[] = []
  for (const sub of subs) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth }
    }
    try {
      await webpush.sendNotification(pushSub as any, payload, { TTL: 60 * 60 })
      sent += 1
    } catch (err: any) {
      failed += 1
      const status = err?.statusCode || err?.status
      if (status === 404 || status === 410) toDelete.push(sub.id)
    }
  }

  if (toDelete.length) {
    await sb.from('push_subscriptions').delete().in('id', toDelete)
  }

  return NextResponse.json({ ok: true, sent, failed, users: ids.length })
}
