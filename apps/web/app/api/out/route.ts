import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const eventId = url.searchParams.get('event')
  const source = url.searchParams.get('source') || 'discover'
  const uid = url.searchParams.get('u')
  if (!eventId) return NextResponse.json({ error: 'missing event' }, { status: 400 })

  const sb = getSupabaseClient()
  const { data: ev, error } = await sb
    .from('events_public')
    .select('id,url_referral')
    .eq('id', eventId)
    .maybeSingle()
  if (error || !ev) return NextResponse.redirect('/', { status: 302 })

  const rawReferral = (ev.url_referral || '').toString().trim()
  let referral = rawReferral || '/'
  if (referral.startsWith('//')) referral = `https:${referral}`
  if (!/^https?:\/\//i.test(referral) && !referral.startsWith('/')) {
    referral = `https://${referral}`
  }
  // Tracking (best-effort; ignore failure)
  await sb.from('clicks').insert({ event_id: eventId, source, referral_url: referral, user_id: uid || null })

  return NextResponse.redirect(referral, { status: 302 })
}
