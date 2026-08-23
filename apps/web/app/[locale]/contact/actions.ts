"use server"
import { redirect } from 'next/navigation'
import { getResend, EMAIL_FROM, CONTACT_TO_EMAIL } from '@/lib/resend'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clean(value: FormDataEntryValue | null, max: number) {
  return String(value || '').trim().slice(0, max)
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

export async function submitContact(formData: FormData) {
  const name = clean(formData.get('name'), 120)
  const email = clean(formData.get('email'), 254)
  const message = clean(formData.get('message'), 2000)

  if (!name || !message || !EMAIL_RE.test(email)) {
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
  redirect(ok ? '/contact?ok=1' : '/contact?ok=0')
}
