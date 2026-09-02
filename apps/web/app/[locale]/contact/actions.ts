"use server"
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getResend, EMAIL_FROM, CONTACT_TO_EMAIL } from '@/lib/resend'
import { getSupabaseClient } from '@/lib/supabase'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clean(value: FormDataEntryValue | null, max: number) {
  return String(value || '').trim().slice(0, max)
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

function clientIp() {
  const fwd = headers().get('x-forwarded-for') || ''
  return fwd.split(',')[0].trim() || 'unknown'
}

// Sin captcha, esto es lo unico que filtra el contenido en si (el honeypot y
// el rate limit de abajo solo frenan el patron de envio, no lo que dice el
// mensaje). No es exhaustivo ni intenta serlo: cubre lo que de verdad ha
// llegado (venta de sexo/escorts, prestamos, casino) mas el indicio mas
// fiable de spam masivo, que es meter varios enlaces en el mensaje.
const SPAM_RE = /\b(viagra|cialis|sexo|escort|prostitu|camgirl|webcam|porn|xxx|nude|casino|apuestas|pr[ée]stamo|cr[ée]dito f[áa]cil|inversi[óo]n garantizada|criptomoneda|forex|backlink)\b/i

function looksLikeSpam(message: string) {
  if (SPAM_RE.test(message)) return true
  const linkCount = (message.match(/https?:\/\//gi) || []).length
  return linkCount >= 2
}

export async function submitContact(formData: FormData) {
  const name = clean(formData.get('name'), 120)
  const email = clean(formData.get('email'), 254)
  const message = clean(formData.get('message'), 2000)

  // Honeypot: campo invisible para humanos, invitador para bots que rellenan
  // todo lo que ven en el HTML. Igual que en /promote, no hay captcha en un
  // formulario abierto al publico, asi que la barrera real es esta mas el
  // limite por IP de abajo.
  if (clean(formData.get('company'), 200)) {
    redirect('/thanks')
  }

  if (!name || !message || !EMAIL_RE.test(email)) {
    redirect('/contact?ok=0')
  }

  // Igual que el honeypot: se descarta en silencio (pantalla de exito) para
  // no darle a quien manda esto una senal de que ha sido bloqueado.
  if (looksLikeSpam(message)) {
    redirect('/thanks')
  }

  const ip = clientIp()
  const sb = getSupabaseClient()
  const { data: okIp, error: rlError } = await sb.rpc('check_rate_limit', { p_bucket: `contact:ip:${ip}`, p_max: 3, p_window_seconds: 600 })
  if (rlError || !okIp) {
    redirect('/contact?ok=0')
  }

  let ok = false
  try {
    const resend = getResend()
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: CONTACT_TO_EMAIL,
      replyTo: email,
      subject: `Contacto WWG: ${name}`,
      html: `<p><strong>Nombre:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Mensaje:</strong></p><p>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>`,
    })
    ok = !error
  } catch {
    ok = false
  }
  redirect(ok ? '/thanks' : '/contact?ok=0')
}
