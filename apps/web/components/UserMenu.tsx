"use client"
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { useI18n } from '@/lib/i18n'
import { useEffect, useRef, useState } from 'react'

export function UserMenu() {
  const { user, signOut } = useAuth()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  const [label, setLabel] = useState<string>(user?.email?.split('@')[0] || 'Cuenta')
  const isOwner = ((user?.email || '') as string).toLowerCase() === 'seoclaro22@gmail.com'

  // Cargar nombre a mostrar (display_name)
  useEffect(() => {
    let alive = true
    if (!user) return
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { storageKey: 'nighthub-auth', persistSession: true, autoRefreshToken: true } }
    )
    ;(async () => {
      try {
        const { data } = await sb
          .from('users')
          .select('display_name')
          .eq('id', user.id)
          .maybeSingle()
        if (!alive) return
        const dn = (data as any)?.display_name?.trim()
        if (dn) setLabel(dn)
      } catch {}
    })()
    return () => { alive = false }
  }, [user?.id])

  if (!user) return <Link className="hover:text-gold" href="/auth">{t('nav.signin')}</Link>

  return (
    <div className="relative" ref={ref}>
      <button className="hover:text-gold" onClick={() => setOpen(v => !v)}>{label}</button>
      {open && (
        <div className="absolute right-0 mt-2 card p-2 w-44 text-sm">
          <Link className="block px-2 py-1 hover:text-gold" href="/account">{t('nav.account')}</Link>
          <Link className="block px-2 py-1 hover:text-gold" href="/favorites">{t('nav.favorites')}</Link>
          <Link className="block px-2 py-1 hover:text-gold" href="/tickets">{t('nav.tickets')}</Link>
          {isOwner && (
            <Link className="block px-2 py-1 hover:text-gold" href="/admin">Back Office</Link>
          )}
          <button className="block text-left w-full px-2 py-1 hover:text-gold" onClick={() => signOut().then(()=>location.assign('/'))}>{t('action.signout')}</button>
        </div>
      )}
    </div>
  )
}
