// Supabase Edge Function: notify-event
// Triggered via HTTP POST from a Postgres webhook when an event is published.
// Finds users who favorited the club, gets their push subscriptions, sends web-push.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @ts-ignore — web-push compatible build for Deno/Edge
import webpush from 'https://esm.sh/web-push@3.6.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_EMAIL = Deno.env.get('VAPID_EMAIL') || 'mailto:hola@wherewego.app'

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE)

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  // Postgres webhook sends: { type, table, record, old_record, schema }
  const record = body?.record
  if (!record) return new Response('No record', { status: 400 })

  // Only act when an event transitions to 'published'
  if (record.status !== 'published') {
    return new Response('Not a publish action', { status: 200 })
  }

  const clubId = record.club_id
  const eventId = record.id
  const eventName = record.name || 'Nuevo evento'
  const eventUrl = `/discover?event=${eventId}`

  if (!clubId) return new Response('No club_id', { status: 200 })

  // 1. Find users who have this club in favorites
  const { data: favs, error: favErr } = await sb
    .from('favorites')
    .select('user_id')
    .eq('target_type', 'club')
    .eq('target_id', clubId)

  if (favErr || !favs?.length) {
    return new Response('No favorites found', { status: 200 })
  }

  const userIds = favs.map((f: any) => f.user_id)

  // 2. Get club name for the notification body
  const { data: club } = await sb
    .from('clubs')
    .select('name')
    .eq('id', clubId)
    .maybeSingle()

  const clubName = club?.name || 'Un club que sigues'

  // 3. Get push subscriptions for those users
  const { data: subs, error: subErr } = await sb
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('user_id', userIds)

  if (subErr || !subs?.length) {
    return new Response('No push subscriptions', { status: 200 })
  }

  // 4. Send push notification to each subscription
  const payload = JSON.stringify({
    title: `Nuevo evento en ${clubName}`,
    body: eventName,
    url: eventUrl,
    tag: `event-${eventId}`,
    icon: '/icon-192.png',
  })

  const results = await Promise.allSettled(
    subs.map((s: any) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      )
    )
  )

  // Remove expired/invalid subscriptions (410 Gone)
  const gone = subs.filter((_: any, i: number) => {
    const r = results[i]
    return r.status === 'rejected' && (r as any).reason?.statusCode === 410
  })

  if (gone.length) {
    await sb
      .from('push_subscriptions')
      .delete()
      .in('endpoint', gone.map((s: any) => s.endpoint))
  }

  const sent = results.filter((r) => r.status === 'fulfilled').length
  return new Response(JSON.stringify({ sent, total: subs.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
