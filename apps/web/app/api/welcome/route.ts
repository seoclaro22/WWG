import { NextRequest, NextResponse } from 'next/server'
import { getResend, EMAIL_FROM } from '@/lib/resend'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 })
  }

  try {
    const resend = getResend()
    await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: 'Bienvenido a Where We Go',
      html: '<p>Gracias por registrarte en Where We Go. A partir de ahora puedes guardar tus clubs, DJs y eventos favoritos, y te avisaremos cuando publiquen nuevo cartel o esten a punto de empezar.</p>',
    })
  } catch {
    // No bloquear el registro si falla el envio del correo de bienvenida.
  }
  return NextResponse.json({ ok: true })
}
