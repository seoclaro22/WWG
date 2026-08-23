import { Resend } from 'resend'

let client: Resend | null = null

export function getResend() {
  if (!client) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('missing_resend_key')
    client = new Resend(key)
  }
  return client
}

// Hasta que el dominio wherewego.site este verificado en Resend, usar
// onboarding@resend.dev (solo entrega a la cuenta propietaria de la API key).
export const EMAIL_FROM = process.env.EMAIL_FROM || 'Where We Go <onboarding@resend.dev>'
export const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || 'seoclaro22@gmail.com'
