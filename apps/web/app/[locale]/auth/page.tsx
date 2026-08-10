"use client"
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { routing } from '@/i18n/routing'

const inputCls = "w-full h-12 text-base bg-white/5 border border-white/15 rounded-2xl px-4 text-white placeholder-white/30 focus:outline-none focus:border-[#d8af3a]/60 focus:bg-white/8 transition-colors"

export default function AuthPage() {
  const { user, signIn, signUp, signOut, resetPassword } = useAuth()
  const { t, locale } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [mode, setMode] = useState<'in' | 'up' | 'reset'>('in')
  const [err, setErr] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [accept, setAccept] = useState(true)
  const router = useRouter()

  function goMode(next: 'in' | 'up' | 'reset') {
    setMode(next)
    setErr(null)
    setSent(false)
  }

  const pageWrap = (children: React.ReactNode) => (
    <div className="relative -mx-4 md:-mx-6 lg:-mx-10 px-4 md:px-6 lg:px-10 py-10 min-h-[100vh] rounded-[28px] bg-[#07060a]">
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-base opacity-40" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-aurora opacity-30" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-vignette" />
      <div className="relative z-10">{children}</div>
    </div>
  )

  if (user) {
    return pageWrap(
      <div className="max-w-sm mx-auto text-center space-y-4 pt-10">
        <div className="w-16 h-16 rounded-2xl bg-[#d8af3a]/10 border border-[#d8af3a]/20 flex items-center justify-center mx-auto">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d8af3a" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <p className="text-white/70 text-sm">{user.email}</p>
        <button
          className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/8 hover:border-[#d8af3a]/30 hover:text-white transition-all text-sm font-medium"
          onClick={() => signOut().then(() => router.push('/'))}
        >
          {t('action.signout')}
        </button>
      </div>
    )
  }

  return pageWrap(
    <div className="max-w-sm mx-auto space-y-5">

      {/* Header */}
      <div className="text-center pt-4 pb-2">
        <div className="w-14 h-14 rounded-2xl bg-[#d8af3a]/15 border border-[#d8af3a]/25 flex items-center justify-center mx-auto mb-4">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#d8af3a"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white">{mode === 'reset' ? t('auth.reset_title') : t('auth.title')}</h1>
        <p className="text-sm text-white/50 mt-1">{mode === 'reset' ? t('auth.reset_intro') : t('auth.subtitle')}</p>
      </div>

      {/* Form */}
      <div className="bg-white/4 border border-white/10 rounded-3xl p-5 space-y-4">
        <div className="space-y-1">
          <label className="text-xs text-white/50 uppercase tracking-wider font-semibold">{t('auth.email')}</label>
          <input value={email} onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="email@ejemplo.com" autoComplete="email" />
        </div>
        {mode !== 'reset' && (
          <div className="space-y-1">
            <label className="text-xs text-white/50 uppercase tracking-wider font-semibold">{t('auth.password')}</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" className={inputCls} placeholder="••••••••" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
          </div>
        )}
        {/* El enlace de recuperacion, junto al campo que falla. Antes no habia
            ninguna forma de recuperar la cuenta desde aqui. */}
        {mode === 'in' && (
          <div className="text-right -mt-1">
            <button type="button" className="text-xs text-white/45 hover:text-[#d8af3a] transition-colors" onClick={() => goMode('reset')}>
              {t('auth.forgot')}
            </button>
          </div>
        )}
        {mode === 'up' && (
          <div className="space-y-1">
            <label className="text-xs text-white/50 uppercase tracking-wider font-semibold">Nombre o nick</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} className={inputCls} placeholder="Tu nombre o nick" required />
          </div>
        )}
        {err && (
          <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2">{err}</div>
        )}
        {sent && (
          <div className="flex gap-2.5 text-emerald-300 text-sm bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-3 py-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16v16H4z" opacity="0" /><path d="M22 6l-10 7L2 6" /><rect x="2" y="4" width="20" height="16" rx="2" />
            </svg>
            <span className="leading-snug">{t('auth.reset_sent')}</span>
          </div>
        )}
        {mode === 'up' && (
          <label className="flex items-start gap-2.5 text-xs text-white/60 leading-relaxed cursor-pointer">
            <input type="checkbox" className="mt-0.5 accent-[#d8af3a]" checked={accept} onChange={e => setAccept(e.target.checked)} />
            <span>
              {t('consent.accept')} <a className="text-[#d8af3a] hover:underline" href="/privacy" target="_blank">{t('account.privacy_policy')}</a> {t('consent.and')} <a className="text-[#d8af3a] hover:underline" href="/cookies" target="_blank">{t('account.cookies')}</a>.
            </span>
          </label>
        )}
        <button
          className="w-full py-3 rounded-2xl bg-[#d8af3a] text-black font-bold text-base shadow-[0_0_20px_rgba(216,175,58,0.35)] hover:bg-[#e8c85a] hover:shadow-[0_0_28px_rgba(216,175,58,0.5)] transition-all disabled:opacity-40"
          disabled={busy || (mode === 'up' && !accept)}
          onClick={async () => {
            setErr(null)
            try {
              if (mode === 'reset') {
                if (!email.trim()) { setErr(t('auth.need_email')); return }
                setBusy(true)
                // El enlace del correo tiene que volver al mismo idioma desde
                // el que se pidio, o el usuario acaba en una pagina en espanol
                // despues de haber navegado en aleman.
                const prefix = locale === routing.defaultLocale ? '' : `/${locale}`
                await resetPassword(email.trim(), `${window.location.origin}${prefix}/auth/reset`)
                setSent(true)
                setBusy(false)
                return
              }
              if (mode === 'in') {
                await signIn(email, password)
              } else {
                if (!accept) { setErr('Debes aceptar la Politica de Privacidad y Cookies.'); return }
                if (!displayName.trim()) { setErr('Indica un nombre o nick para mostrar.'); return }
                await signUp(email, password)
                try {
                  // Cliente compartido y no uno nuevo: ver lib/supabase-browser.ts.
                  const { supabaseBrowser } = await import('@/lib/supabase-browser')
                  const u = (await supabaseBrowser.auth.getUser()).data.user
                  if (u) await supabaseBrowser.from('users').upsert({ id: u.id, email: u.email as string, display_name: displayName.trim() })
                } catch {}
              }
              router.push('/')
            } catch (e: any) {
              setBusy(false)
              setErr(e.message || 'Error')
            }
          }}
        >
          {mode === 'reset'
            ? (busy ? t('auth.reset_sending') : t('auth.reset_send'))
            : mode === 'in' ? t('auth.signin') : t('auth.signup')}
        </button>
        <div className="text-center text-xs text-white/40">
          {mode === 'in' ? (
            <button type="button" className="hover:text-[#d8af3a] transition-colors" onClick={() => goMode('up')}>{t('auth.to_signup')}</button>
          ) : mode === 'reset' ? (
            <button type="button" className="hover:text-[#d8af3a] transition-colors" onClick={() => goMode('in')}>{t('auth.back_signin')}</button>
          ) : (
            <button type="button" className="hover:text-[#d8af3a] transition-colors" onClick={() => goMode('in')}>{t('auth.to_signin')}</button>
          )}
        </div>
      </div>

      {/* Legal */}
      <p className="text-center text-xs text-white/30">
        {t('legal.notice')}{' '}
        <a className="text-white/50 hover:text-[#d8af3a] transition-colors" href="/privacy" target="_blank">{t('account.privacy_policy')}</a>
        {' · '}
        <a className="text-white/50 hover:text-[#d8af3a] transition-colors" href="/cookies" target="_blank">{t('account.cookies')}</a>
      </p>

      {/* Benefits */}
      <div className="bg-white/4 border border-white/8 rounded-2xl p-4 space-y-2">
        <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">{t('benefits.title')}</p>
        <ul className="space-y-1.5">
          {[t('benefits.save'), t('benefits.follow'), t('benefits.tickets'), t('benefits.sync'), t('benefits.push')].map((b, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-white/60">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d8af3a]/60 shrink-0" />
              {b}
            </li>
          ))}
        </ul>
      </div>

    </div>
  )
}
