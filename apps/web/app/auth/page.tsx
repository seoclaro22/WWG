"use client"
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const { user, signIn, signUp, signOut } = useAuth()
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [err, setErr] = useState<string | null>(null)
  const [accept, setAccept] = useState(true)
  const router = useRouter()

  if (user) {
    return (
      <div className="relative -mx-4 md:-mx-6 lg:-mx-10 px-4 md:px-6 lg:px-10 py-8 md:py-10 min-h-[100vh] rounded-[28px] border border-white/5 bg-[radial-gradient(circle_at_20%_20%,rgba(88,57,176,0.35),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(91,12,245,0.3),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(255,76,181,0.28),transparent_28%),#070a14]">
        <div className="absolute inset-0 pointer-events-none rounded-[28px] mix-blend-screen opacity-70 landing-aurora" />
        <div className="absolute inset-0 pointer-events-none rounded-[28px] mix-blend-screen opacity-35 landing-gold" />
        <div className="absolute inset-0 pointer-events-none rounded-[28px] mix-blend-screen opacity-60" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(44,191,255,0.12), rgba(7,10,20,0.1) 35%, transparent 50%)' }} />
        <div className="relative z-10 space-y-4 max-w-xl mx-auto text-center">
          <div className="text-xl">Hola, {user.email}</div>
          <button className="btn btn-secondary" onClick={() => signOut().then(() => router.push('/'))}>{t('action.signout')}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative -mx-4 md:-mx-6 lg:-mx-10 px-4 md:px-6 lg:px-10 py-8 md:py-10 min-h-[100vh] rounded-[28px] border border-white/5 bg-[radial-gradient(circle_at_20%_20%,rgba(88,57,176,0.35),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(91,12,245,0.3),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(255,76,181,0.28),transparent_28%),#070a14]">
      <div className="absolute inset-0 pointer-events-none rounded-[28px] mix-blend-screen opacity-70 landing-aurora" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] mix-blend-screen opacity-35 landing-gold" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] mix-blend-screen opacity-60" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(44,191,255,0.12), rgba(7,10,20,0.1) 35%, transparent 50%)' }} />
      <div className="relative z-10 space-y-6 max-w-xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">{t('auth.title')}</h1>
          <p className="muted">{t('auth.subtitle')}</p>
        </div>
        <form
          className="card p-5 space-y-4 w-full max-w-md mx-auto"
          onSubmit={async (e) => {
            e.preventDefault()
            setErr(null)
            try {
              if (mode === 'in') {
                await signIn(email, password)
              } else {
                if (!accept) { setErr('Debes aceptar la Politica de Privacidad y Cookies.'); return }
                if (!displayName.trim()) { setErr('Indica un nombre o nick para mostrar.'); return }
                await signUp(email, password)
                try {
                  const { createClient } = await import('@supabase/supabase-js')
                  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { storageKey: 'nighthub-auth', persistSession: true, autoRefreshToken: true } })
                  const u = (await sb.auth.getUser()).data.user
                  if (u) {
                    await sb.from('users').upsert({ id: u.id, email: u.email as string, display_name: displayName.trim() })
                  }
                } catch {}
              }
              router.push('/')
            } catch (e: any) {
              setErr(e.message || 'Error')
            }
          }}
        >
          <label className="block text-sm">{t('auth.email')}</label>
          <input value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full h-12 text-base bg-transparent border border-white/20 rounded-xl px-3" placeholder="email@ejemplo.com" />
          <label className="block text-sm mt-2">{t('auth.password')}</label>
          <input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" className="w-full h-12 text-base bg-transparent border border-white/20 rounded-xl px-3" placeholder="********" />
          {mode === 'up' && (
            <>
              <label className="block text-sm mt-2">Nombre o nick a mostrar</label>
              <input value={displayName} onChange={(e)=>setDisplayName(e.target.value)} className="w-full h-12 text-base bg-transparent border border-white/20 rounded-xl px-3" placeholder="Tu nombre o nick" required />
            </>
          )}
          {err && <div className="text-red-400 text-sm">{err}</div>}
          {mode === 'up' && (
            <label className="flex items-start gap-2 text-xs md:text-sm text-white/80 leading-snug">
              <input type="checkbox" className="mt-0.5" checked={accept} onChange={e=>setAccept(e.target.checked)} />
              <span>
                {t('consent.accept')} <a className="underline" href="/privacy" target="_blank">{t('account.privacy_policy')}</a> {t('consent.and')} <a className="underline" href="/cookies" target="_blank">{t('account.cookies')}</a>.
              </span>
            </label>
          )}
          <button className="btn btn-primary w-full mt-1 py-3 text-base" disabled={mode==='up' && !accept}>{mode === 'in' ? t('auth.signin') : t('auth.signup')}</button>
          <div className="text-center text-xs text-white/60">
            {mode === 'in' ? (
              <button type="button" className="underline" onClick={()=>setMode('up')}>{t('auth.to_signup')}</button>
            ) : (
              <button type="button" className="underline" onClick={()=>setMode('in')}>{t('auth.to_signin')}</button>
            )}
          </div>
        </form>

        <div className="card p-3 text-xs md:text-sm text-white/70 w-full max-w-md mx-auto text-center">
          {t('legal.notice')}{' '}
          <a className="underline" href="/privacy" target="_blank" rel="noreferrer">{t('account.privacy_policy')}</a>
          {' · '}
          <a className="underline" href="/cookies" target="_blank" rel="noreferrer">{t('account.cookies')}</a>
        </div>

        <div className="card p-4 space-y-2 w-full max-w-md mx-auto">
          <div className="font-medium text-sm">{t('benefits.title')}</div>
          <ul className="list-disc pl-5 text-white/80 text-xs md:text-sm space-y-1">
            <li>{t('benefits.save')}</li>
            <li>{t('benefits.follow')}</li>
            <li>{t('benefits.tickets')}</li>
            <li>{t('benefits.sync')}</li>
            <li>{t('benefits.push')}</li>
          </ul>
        </div>

      </div>
    </div>
  )
}
