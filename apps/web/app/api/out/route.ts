import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SOURCE_RE = /^[a-z0-9_-]{1,40}$/i

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const eventId = url.searchParams.get('event')
  const rawSource = url.searchParams.get('source') || 'discover'
  const source = SOURCE_RE.test(rawSource) ? rawSource : 'discover'
  const rawUid = url.searchParams.get('u')
  const uid = rawUid && UUID_RE.test(rawUid) ? rawUid : null
  if (!eventId || !UUID_RE.test(eventId)) {
    return NextResponse.json({ error: 'missing event' }, { status: 400 })
  }

  const sb = getSupabaseClient()
  const { data: ev, error } = await sb
    .from('events_public')
    .select('id,url_referral')
    .eq('id', eventId)
    .maybeSingle()
  if (error || !ev) return NextResponse.redirect(new URL('/', req.url), { status: 302 })

  const rawReferral = (ev.url_referral || '').toString().trim()
  let referral = rawReferral || '/'
  if (referral.startsWith('//')) referral = `https:${referral}`
  if (!/^https?:\/\//i.test(referral) && !referral.startsWith('/')) {
    referral = `https://${referral}`
  }
  // Tracking (best-effort; ignore failure)
  await sb.from('clicks').insert({ event_id: eventId, source, referral_url: referral, user_id: uid })

  const dest = referral.startsWith('/') ? new URL(referral, req.url) : referral
  return NextResponse.redirect(dest, { status: 302 })
}
