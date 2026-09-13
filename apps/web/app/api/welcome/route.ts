import { NextRequest, NextResponse } from 'next/server'
import { getResend, EMAIL_FROM } from '@/lib/resend'
import { getSupabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const authorization = req.headers.get('authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!token) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseServer()
    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    const user = authData?.user
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }
    if (!user.email || !user.email_confirmed_at) {
      return NextResponse.json({ ok: false, error: 'email_not_confirmed' }, { status: 403 })
    }
    if (!user.user_metadata?.wwg_welcome_requested || user.app_metadata?.wwg_welcome_sent_at) {
      return NextResponse.json({ ok: true, skipped: true })
    }
    const resend = getResend()
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: user.email,
      subject: 'Bienvenido a Where We Go',
      html: '<p>Gracias por registrarte en Where We Go. A partir de ahora puedes guardar tus clubs, DJs y eventos favoritos, y te avisaremos cuando publiquen nuevo cartel o esten a punto de empezar.</p>',
    }, { idempotencyKey: `welcome/${user.id}` })
    if (error) {
      console.error('welcome_send_failed', error.name)
      return NextResponse.json({ ok: false, error: 'email_send_failed' }, { status: 502 })
    }
    const { error: saveError } = await supabase.auth.admin.updateUserById(user.id, {
      app_metadata: { ...user.app_metadata, wwg_welcome_sent_at: new Date().toISOString() },
    })
    if (saveError) {
      console.error('welcome_status_failed', saveError.code)
      return NextResponse.json({ ok: false, error: 'email_status_failed' }, { status: 500 })
    }
  } catch {
    console.error('welcome_request_failed')
    return NextResponse.json({ ok: false, error: 'email_send_failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
