"use client"
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { Link } from '@/lib/navigation'

// Pagina donde aterriza quien pincha el enlace de recuperacion del correo.
//
// No hace falta leer el token a mano: el cliente de Supabase se crea con
// detectSessionInUrl, asi que al cargar la pagina canjea solo el token del
// hash por una sesion. Lo unico que hay que hacer aqui es esperar a que esa
// sesion aparezca y, mientras tanto, no enseñar el formulario.

const inputCls = "w-full h-12 text-base bg-white/5 border border-white/15 rounded-2xl px-4 text-white placeholder-white/30 focus:outline-none focus:border-[#d8af3a]/60 focus:bg-white/8 transition-colors"

const MIN_LARGO = 8

export default function ResetPasswordPage() {
  const { user, updatePassword } = useAuth()
  const { t } = useI18n()
  const [estado, setEstado] = useState<'comprobando' | 'listo' | 'invalido'>('comprobando')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [hecho, setHecho] = useState(false)

  useEffect(() => {
    // Un enlace caducado o ya usado no trae token: vuelve con el error en el
    // hash de la URL. Sin esto la pagina se quedaria esperando una sesion que
    // no va a llegar.
    if (typeof window !== 'undefined' && window.location.hash.includes('error')) {
      setEstado('invalido')
      return
    }
    if (user) {
      setEstado('listo')
      return
    }
    // Margen para que el cliente termine de canjear el token. Si pasado ese
    // tiempo sigue sin haber sesion, el enlace no servia.
    const id = setTimeout(() => setEstado((e) => (e === 'comprobando' ? 'invalido' : e)), 4000)
    return () => clearTimeout(id)
  }, [user])

  const wrap = (children: React.ReactNode) => (
    <div className="relative -mx-4 md:-mx-6 lg:-mx-10 px-4 md:px-6 lg:px-10 py-10 min-h-[100vh] rounded-[28px] bg-[#07060a]">
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-base opacity-40" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-aurora opacity-30" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-vignette" />
      <div className="relative z-10 max-w-sm mx-auto space-y-5">{children}</div>
    </div>
  )

  const cabecera = (titulo: string, sub?: string) => (
    <div className="text-center pt-4 pb-2">
      <div className="w-14 h-14 rounded-2xl bg-[#d8af3a]/15 border border-[#d8af3a]/25 flex items-center justify-center mx-auto mb-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d8af3a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-white">{titulo}</h1>
      {sub && <p className="text-sm text-white/50 mt-1">{sub}</p>}
    </div>
  )

  if (estado === 'comprobando') {
    return wrap(
      <>
        {cabecera(t('auth.new_title'))}
        <p className="text-center text-sm text-white/50">{t('auth.link_checking')}</p>
      </>
    )
  }

  if (estado === 'invalido') {
    return wrap(
      <>
        {cabecera(t('auth.new_title'))}
        <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2.5 leading-snug">
          {t('auth.link_invalid')}
        </div>
        <Link
          href="/auth"
          className="block w-full py-3 rounded-2xl bg-[#d8af3a] text-black font-bold text-base text-center shadow-[0_0_20px_rgba(216,175,58,0.35)] hover:bg-[#e8c85a] transition-all"
        >
          {t('auth.link_ask_new')}
        </Link>
      </>
    )
  }

  if (hecho) {
    return wrap(
      <>
        {cabecera(t('auth.new_title'))}
        <div className="text-emerald-300 text-sm bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-3 py-2.5 leading-snug">
          {t('auth.new_saved')}
        </div>
        <Link
          href="/account"
          className="block w-full py-3 rounded-2xl bg-[#d8af3a] text-black font-bold text-base text-center shadow-[0_0_20px_rgba(216,175,58,0.35)] hover:bg-[#e8c85a] transition-all"
        >
          {t('auth.go_account')}
        </Link>
      </>
    )
  }

  async function guardar() {
    setErr(null)
    if (password.length < MIN_LARGO) { setErr(t('auth.new_short')); return }
    if (password !== repeat) { setErr(t('auth.new_mismatch')); return }
    setBusy(true)
    try {
      await updatePassword(password)
      setHecho(true)
    } catch (e: any) {
      setErr(e.message || 'Error')
    } finally {
      setBusy(false)
    }
  }

  return wrap(
    <>
      {cabecera(t('auth.new_title'), t('auth.new_intro'))}
      <div className="bg-white/4 border border-white/10 rounded-3xl p-5 space-y-4">
        <div className="space-y-1">
          <label className="text-xs text-white/50 uppercase tracking-wider font-semibold">{t('auth.new_password')}</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            className={inputCls}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-white/50 uppercase tracking-wider font-semibold">{t('auth.new_repeat')}</label>
          <input
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            type="password"
            className={inputCls}
            placeholder="••••••••"
            autoComplete="new-password"
            onKeyDown={(e) => { if (e.key === 'Enter') guardar() }}
          />
        </div>
        <p className="text-xs text-white/35">{t('auth.new_short')}</p>
        {err && (
          <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2">{err}</div>
        )}
        <button
          className="w-full py-3 rounded-2xl bg-[#d8af3a] text-black font-bold text-base shadow-[0_0_20px_rgba(216,175,58,0.35)] hover:bg-[#e8c85a] hover:shadow-[0_0_28px_rgba(216,175,58,0.5)] transition-all disabled:opacity-40"
          disabled={busy}
          onClick={guardar}
        >
          {busy ? t('auth.new_saving') : t('auth.new_save')}
        </button>
      </div>
    </>
  )
}
