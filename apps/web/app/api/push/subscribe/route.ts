import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service-role client: bypasses RLS so the API route can write on behalf of the user
function sbAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Get the authenticated user from the Authorization header (Supabase JWT)
async function getUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data } = await sbAdmin().auth.getUser(token)
  return data?.user ?? null
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { endpoint, p256dh, auth, userAgent } = body
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { error } = await sbAdmin()
    .from('push_subscriptions')
    .upsert(
      { user_id: user.id, endpoint, p256dh, auth, user_agent: userAgent, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,endpoint' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { endpoint } = await req.json()
  if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })

  await sbAdmin()
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)

  return NextResponse.json({ ok: true })
}
