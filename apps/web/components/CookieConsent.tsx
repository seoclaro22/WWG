"use client"
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { clearAnalyticsStorage } from '@/lib/analytics-client'
import { useI18n } from '@/lib/i18n'

const KEY = 'nh-consent'

function setCookie(name: string, value: string, days = 180) {
  const d = new Date()
  d.setTime(d.getTime() + days*24*60*60*1000)
  document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;SameSite=Lax`;
}
function getCookie(name: string) {
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return m ? decodeURIComponent(m[2]) : null
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const { t } = useI18n()

  useEffect(() => {
    const stored = localStorage.getItem(KEY) || getCookie(KEY)
    if (!stored) setVisible(true)
  }, [])

  function set(value: 'accepted'|'rejected') {
    try { localStorage.setItem(KEY, value) } catch {}
    try { setCookie(KEY, value) } catch {}
    // Exponer un flag simple para scripts opcionales
    ;(window as any).__nhConsent = value
    setVisible(false)
  }

  if (!visible) return null
  return (
    <div className="fixed bottom-3 left-0 right-0 z-50">
      <div className="max-w-xl mx-auto card p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-white/80">
          {t('cookie.banner')} <Link className="underline" href="/cookies">Cookies</Link>.
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary px-3 py-1 text-sm" onClick={()=>set('rejected')}>{t('cookie.reject')}</button>
          <button className="btn btn-primary px-3 py-1 text-sm" onClick={()=>set('accepted')}>{t('cookie.accept')}</button>
        </div>
      </div>
    </div>
  )
}

export function ResetConsentButton() {
  const { t } = useI18n()
  return (
    <button
      className="btn btn-secondary text-sm"
      onClick={() => {
        try { localStorage.removeItem(KEY) } catch {}
        document.cookie = `${KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
        clearAnalyticsStorage()
        location.reload()
      }}
    >
      {t('cookie.reset')}
    </button>
  )
}
