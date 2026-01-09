"use server"
import { getSupabaseClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'

export async function submitSubmission(formData: FormData) {
  const rawType = String(formData.get('type') || '').toLowerCase()
  const type = rawType === 'club' ? 'club' : 'event'
  const sponsoredRequest = String(formData.get('sponsored') || 'no') === 'yes'
  const payload = {
    name: formData.get('name'),
    address: formData.get('address'),
    description: formData.get('description'),
    referral_link: formData.get('ref') || null,
    phone: formData.get('phone') || null,
    sponsored_request: type === 'event' ? sponsoredRequest : false,
  }
  const contact_email = String(formData.get('email') || '')
  const sb = getSupabaseClient()
  const { error } = await sb.from('submissions').insert({ type, payload, contact_email })
  if (error) throw error
  redirect('/promote?ok=1')
}
