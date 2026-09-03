"use client"
import { Link } from '@/lib/navigation'
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
  const [modalOpen, setModalOpen] = useState(false)
  const [analytics, setAnalytics] = useState(false)
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
    try { window.dispatchEvent(new Event('nh-consent-changed')) } catch {}
    setVisible(false)
    setModalOpen(false)
  }

  if (!visible) return null
  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-50 p-3 md:p-4">
        <div className="max-w-xl mx-auto rounded-3xl border border-white/10 bg-[#0c0a10] shadow-[0_0_30px_rgba(0,0,0,0.5)] p-5 space-y-3">
          <h2 className="text-base font-bold text-white">{t('cookie.title')}</h2>
          <p className="text-sm text-white/60 leading-relaxed">
            {t('cookie.banner')} <Link className="underline hover:text-white/80" href="/cookies">Cookies</Link>.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              className="px-4 py-2 rounded-2xl bg-[#d8af3a] text-black font-bold text-sm hover:bg-[#e8c85a] transition-colors"
              onClick={() => set('accepted')}
            >
              {t('cookie.accept')}
            </button>
            <button
              className="px-4 py-2 rounded-2xl border border-white/20 text-white text-sm font-semibold hover:bg-white/5 transition-colors"
              onClick={() => set('rejected')}
            >
              {t('cookie.reject')}
            </button>
            <button
              className="px-4 py-2 text-sm text-white/50 underline hover:text-white/80 transition-colors"
              onClick={() => { setAnalytics(false); setModalOpen(true) }}
            >
              {t('cookie.configure')}
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70" onClick={() => setModalOpen(false)}>
          <div
            className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0c0a10] p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-white">{t('cookie.modal_title')}</h2>
              <p className="text-sm text-white/60 leading-relaxed">{t('cookie.modal_body')}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-white">{t('cookie.necessary_title')}</span>
                <span className="text-xs font-medium text-[#d8af3a]">{t('cookie.necessary_badge')}</span>
              </div>
              <p className="text-xs text-white/50 leading-relaxed">{t('cookie.necessary_desc')}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-white">{t('cookie.analytics_title')}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={analytics}
                  onClick={() => setAnalytics((v) => !v)}
                  className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${analytics ? 'bg-[#d8af3a]' : 'bg-white/15'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${analytics ? 'translate-x-4' : ''}`} />
                </button>
              </div>
              <p className="text-xs text-white/50 leading-relaxed">{t('cookie.analytics_desc')}</p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                className="px-4 py-2 rounded-2xl bg-[#d8af3a] text-black font-bold text-sm hover:bg-[#e8c85a] transition-colors"
                onClick={() => set(analytics ? 'accepted' : 'rejected')}
              >
                {t('cookie.save_preferences')}
              </button>
              <button
                className="px-4 py-2 rounded-2xl border border-white/20 text-white text-sm font-semibold hover:bg-white/5 transition-colors"
                onClick={() => set('accepted')}
              >
                {t('cookie.accept')}
              </button>
              <button
                className="px-4 py-2 text-sm text-white/50 underline hover:text-white/80 transition-colors"
                onClick={() => setModalOpen(false)}
              >
                {t('cookie.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
