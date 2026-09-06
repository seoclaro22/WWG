import { createClient } from '@supabase/supabase-js'
import { fetchWithTimeout } from '@/lib/supabase-fetch'

export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, anon, {
    global: { fetch: fetchWithTimeout },
  })
}
