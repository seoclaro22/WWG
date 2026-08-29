"use server"
import { getSupabaseClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clientIp() {
  const fwd = headers().get('x-forwarded-for') || ''
  return fwd.split(',')[0].trim() || 'unknown'
}

function clean(value: FormDataEntryValue | null, max: number) {
  const s = String(value || '').trim()
  return s.slice(0, max)
}

export async function submitSubmission(formData: FormData) {
  const rawType = String(formData.get('type') || '').toLowerCase()
  const type = rawType === 'club' ? 'club' : 'event'
  const sponsoredRequest = String(formData.get('sponsored') || 'no') === 'yes'

  const name = clean(formData.get('name'), 120)
  const contact_email = clean(formData.get('email'), 254)
  if (!name || !EMAIL_RE.test(contact_email)) {
    redirect('/promote?ok=0')
  }

  const payload = {
    name,
    address: clean(formData.get('address'), 300),
    description: clean(formData.get('description'), 2000),
    referral_link: clean(formData.get('ref'), 500) || null,
    phone: clean(formData.get('phone'), 30) || null,
    sponsored_request: type === 'event' ? sponsoredRequest : false,
  }
  const sb = getSupabaseClient()

  // Sin captcha en el formulario, el INSERT de submissions esta abierto a
  // cualquiera (asi tiene que ser: lo rellena publico anonimo). El limite
  // real esta aqui: max 3 envios por IP y por email cada 10 minutos.
  const ip = clientIp()
  const [okIp, okEmail] = await Promise.all([
    sb.rpc('check_rate_limit', { p_bucket: `promote:ip:${ip}`, p_max: 3, p_window_seconds: 600 }),
    sb.rpc('check_rate_limit', { p_bucket: `promote:email:${contact_email}`, p_max: 3, p_window_seconds: 600 }),
  ])
  if (okIp.error || okEmail.error || !okIp.data || !okEmail.data) {
    redirect('/promote?ok=0')
  }

  const { error } = await sb.from('submissions').insert({ type, payload, contact_email })
  if (error) throw error
  redirect('/promote?ok=1')
}
