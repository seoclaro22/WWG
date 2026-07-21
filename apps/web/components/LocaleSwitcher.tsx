"use client"
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { usePathname, useRouter } from '@/lib/navigation'
import { createClient } from '@supabase/supabase-js'

export function LocaleSwitcher() {
  const { locale } = useI18n()
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  return (
    <select
      value={locale}
      onChange={async e => {
        const l = e.target.value
        if (typeof window !== 'undefined') localStorage.setItem('nh-locale', l)
        if (user) {
          try { await createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { storageKey: 'nighthub-auth', persistSession: true, autoRefreshToken: true } }).from('users').update({ locale: l }).eq('id', user.id) } catch {}
        }
        // Navega a la misma pagina en el otro idioma (/discover -> /en/discover).
        router.replace(pathname, { locale: l })
      }}
      className="bg-base-card border border-white/10 rounded-xl p-1 text-xs"
    >
      <option value="es">ES</option>
      <option value="en">EN</option>
      <option value="de">DE</option>
    </select>
  )
}
