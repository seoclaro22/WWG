"use client"
import { useAuth } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { useEffect, useState } from 'react'

function sb(){
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { storageKey: 'nighthub-auth', persistSession: true, autoRefreshToken: true } }
  )
}

export default function AccountPage(){
  const { user, signOut } = useAuth()
  const { setLocale: setAppLocale } = useI18n()
  const [displayName, setDisplayName] = useState('')
  const [locale, setLocale] = useState('es')
  const [roles, setRoles] = useState<string[]>([])
  const [saved, setSaved] = useState<string | null>(null)
  const [pushSupported, setPushSupported] = useState(true)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushMsg, setPushMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    (async () => {
      const { data } = await sb().from('users').select('display_name,locale,roles').eq('id', user.id).maybeSingle()
      if (data?.display_name) setDisplayName(data.display_name)
      const l = data?.locale || 'es'
      setLocale(l)
      try { setAppLocale(l) } catch {}
      const r = (data as any)?.roles
      const list: string[] = Array.isArray(r) ? r : (typeof r === 'string' ? r.replace(/[{}]/g,'').split(',').filter(Boolean) : [])
      setRoles(list)
    })()
  }, [user])

  useEffect(() => {
    if (!user) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setPushSupported(false)
      return
    }
    ;(async () => {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()
      setPushEnabled(!!sub)
    })()
  }, [user])

  if (!user) {
    return (
      <div className="relative -mx-4 md:-mx-6 lg:-mx-10 px-4 md:px-6 lg:px-10 py-8 md:py-10 min-h-[100vh] rounded-[28px] border border-white/5 bg-[radial-gradient(circle_at_20%_20%,rgba(88,57,176,0.35),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(91,12,245,0.3),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(255,76,181,0.28),transparent_28%),#070a14]">
        <div className="absolute inset-0 pointer-events-none rounded-[28px] mix-blend-screen opacity-70 landing-aurora" />
        <div className="absolute inset-0 pointer-events-none rounded-[28px] mix-blend-screen opacity-60" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(44,191,255,0.12), rgba(7,10,20,0.1) 35%, transparent 50%)' }} />
        <div className="relative z-10">
          <div className="muted">Inicia sesión para ver tu cuenta.</div>
        </div>
      </div>
    )
  }

  async function save(){
    if (!user) return
    await sb().from('users').update({ display_name: displayName, locale }).eq('id', user.id)
    try { setAppLocale(locale) } catch {}
    setSaved('Guardado')
    setTimeout(()=>setSaved(null), 1500)
  }

  async function deleteData(){
    if (!user) return
    const c = confirm('¿Seguro que deseas borrar tus datos en esta app? (No borra tu cuenta de autenticación)')
    if (!c) return
    const client = sb()
    await client.from('favorites').delete().eq('user_id', user.id)
    await client.from('follows').delete().eq('user_id', user.id)
    await client.from('reviews').delete().eq('user_id', user.id)
    await client.from('users').delete().eq('id', user.id)
    await signOut()
    window.location.href = '/'
  }

  function bufferToBase64(buffer: ArrayBuffer | null) {
    if (!buffer) return ''
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const raw = atob(base64)
    const output = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i += 1) {
      output[i] = raw.charCodeAt(i)
    }
    return output
  }

  async function enablePush() {
    if (!user || !pushSupported) return
    const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapid) {
      setPushMsg('Missing VAPID public key')
      return
    }
    setPushBusy(true)
    setPushMsg(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setPushMsg('Notifications not enabled')
        return
      }
      const reg = await navigator.serviceWorker.register('/sw.js')
      const existing = await reg.pushManager.getSubscription()
      const sub = existing || await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid)
      })
      const payload = {
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: bufferToBase64(sub.getKey('p256dh')),
        auth: bufferToBase64(sub.getKey('auth')),
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString()
      }
      const { error } = await sb()
        .from('push_subscriptions')
        .upsert(payload, { onConflict: 'user_id,endpoint' })
      if (error) {
        setPushMsg('Could not save subscription')
        return
      }
      setPushEnabled(true)
      setPushMsg('Notifications enabled')
    } catch (err) {
      setPushMsg('Could not enable notifications')
    } finally {
      setPushBusy(false)
    }
  }

  async function disablePush() {
    if (!user || !pushSupported) return
    setPushBusy(true)
    setPushMsg(null)
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await sb()
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', sub.endpoint)
      }
      setPushEnabled(false)
      setPushMsg('Notifications disabled')
    } catch (err) {
      setPushMsg('Could not disable notifications')
    } finally {
      setPushBusy(false)
    }
  }

  const isOwner = (user.email || '').toLowerCase() === 'seoclaro22@gmail.com'
  const isMod = roles.includes('admin') || roles.includes('moderator')

  return (
    <div className="relative -mx-4 md:-mx-6 lg:-mx-10 px-4 md:px-6 lg:px-10 py-8 md:py-10 min-h-[100vh] rounded-[28px] border border-white/5 bg-[radial-gradient(circle_at_20%_20%,rgba(88,57,176,0.35),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(91,12,245,0.3),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(255,76,181,0.28),transparent_28%),#070a14]">
      <div className="absolute inset-0 pointer-events-none rounded-[28px] mix-blend-screen opacity-70 landing-aurora" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] mix-blend-screen opacity-60" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(44,191,255,0.12), rgba(7,10,20,0.1) 35%, transparent 50%)' }} />
      <div className="relative z-10 space-y-6">
      <h1 className="text-2xl font-semibold">Cuenta</h1>
      <div className="card p-4 space-y-3 max-w-md">
        <div className="text-sm text-white/60">Email</div>
        <div>{user.email}</div>
        <label className="block text-sm mt-2">Nombre a mostrar</label>
        <input value={displayName} onChange={e=>setDisplayName(e.target.value)} className="w-full bg-transparent border border-white/10 rounded-xl p-2" />
        <label className="block text-sm mt-2">Idioma</label>
        <select value={locale} onChange={e=>setLocale(e.target.value)} className="bg-base-card border border-white/10 rounded-xl p-2">
          <option value="es">Español</option>
          <option value="en">English</option>
          <option value="de">Deutsch</option>
        </select>
        <button className="btn btn-primary mt-2" onClick={save}>Guardar</button>
        {saved && <div className="text-emerald-300 text-sm">{saved}</div>}
      </div>

      <div className="card p-4 space-y-2 max-w-md">
        <div className="font-medium">Notificaciones</div>
        <p className="text-sm text-white/70">Avisos suaves solo para tus favoritos.</p>
        {!pushSupported && (
          <div className="text-sm text-white/60">Este navegador no soporta notificaciones push.</div>
        )}
        {pushSupported && (
          <div className="flex items-center gap-2">
            <button className="btn btn-secondary" onClick={pushEnabled ? disablePush : enablePush} disabled={pushBusy}>
              {pushEnabled ? 'Desactivar' : 'Activar'}
            </button>
            <span className="text-sm text-white/60">{pushEnabled ? 'Activas' : 'Inactivas'}</span>
          </div>
        )}
        {pushMsg && <div className="text-sm text-emerald-300">{pushMsg}</div>}
      </div>

      {(isOwner || isMod) && (
        <div className="card p-4 space-y-2 max-w-md">
          <div className="font-medium">Back Office</div>
          <p className="text-sm text-white/70">Acceso directo al panel de administracion.</p>
          <Link className="btn btn-secondary w-max" href="/admin">Ir al Back Office</Link>
        </div>
      )}

      <div className="card p-4 space-y-2 max-w-md">
        <div className="font-medium">Privacidad</div>
        <p className="text-sm text-white/70">Gestiona tus datos y conoce cómo los tratamos.</p>
        <Link className="hover:text-gold" href="/privacy">Política de Privacidad</Link>
        <Link className="hover:text-gold" href="/cookies">Política de Cookies</Link>
      </div>

      <div className="card p-4 space-y-2 max-w-md">
        <div className="font-medium text-red-300">Zona peligrosa</div>
        <p className="text-sm text-white/70">Esta acción eliminará tus datos en NightHub (favoritos, seguidos, reseñas y tu perfil en esta app) y cerrará la sesión. No elimina tu cuenta de autenticación global. Si deseas eliminarla por completo, contáctanos.</p>
        <button className="btn btn-secondary" onClick={deleteData}>Borrar mis datos y cerrar cuenta en esta app</button>
      </div>
      </div>
    </div>
  )
}
