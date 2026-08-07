"use client"
import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth'
import {
  hasAnalyticsConsent,
  getDeviceId,
  setDeviceId,
  getSessionId,
  setSessionId,
  getSessionLastSeen,
  setSessionLastSeen,
  getSessionStart,
  setSessionStart
} from '@/lib/analytics-client'

const SESSION_TIMEOUT_MS = 30 * 60 * 1000
const HEARTBEAT_MS = 30 * 1000

function getDeviceMeta() {
  const ua = navigator.userAgent || ''
  const lang = navigator.language || ''
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  const isPwa = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
  const lower = ua.toLowerCase()
  const isTablet = /ipad|tablet/.test(lower)
  const isMobile = !isTablet && /mobi|iphone|android|phone|ipod|blackberry|iemobile|opera mini/.test(lower)
  const deviceType = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop'
  let os = 'other'
  if (/android/.test(lower)) os = 'android'
  else if (/iphone|ipad|ipod/.test(lower)) os = 'ios'
  else if (/win/.test(lower)) os = 'windows'
  else if (/mac/.test(lower)) os = 'mac'
  else if (/linux/.test(lower)) os = 'linux'
  return { ua, lang, tz, deviceType, os, isPwa }
}

function getEventIdFromPath(pathname: string) {
  const match = pathname.match(/^\/event\/([^/]+)/)
  return match ? match[1] : null
}

export function AnalyticsTracker() {
  const { user } = useAuth()
  const pathname = usePathname() || '/'
  const params = useSearchParams()
  const query = params?.toString() || ''
  const fullPath = query ? `${pathname}?${query}` : pathname
  const [consentEnabled, setConsentEnabled] = useState(false)

  // Cliente compartido y no uno nuevo con su propia clave de storage
  // (createClient sin opciones usaba la clave por defecto, distinta de
  // 'nighthub-auth', asi que ademas de la fuga era una segunda sesion
  // paralela sin relacion con la del usuario). Ver lib/supabase-browser.ts.
  const sb = supabaseBrowser

  const deviceIdRef = useRef<string | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const sessionStartRef = useRef<number | null>(null)
  const viewIdRef = useRef<string | null>(null)
  const viewStartRef = useRef<number | null>(null)
  const lastPathRef = useRef<string>('')
  const heartbeatRef = useRef<number | null>(null)
  const newDeviceRef = useRef<boolean>(false)

  useEffect(() => {
    const syncConsent = () => setConsentEnabled(hasAnalyticsConsent())
    syncConsent()
    window.addEventListener('nh-consent-changed', syncConsent)
    return () => window.removeEventListener('nh-consent-changed', syncConsent)
  }, [])

  async function touchDevice(nowIso: string, userId: string | null) {
    if (!deviceIdRef.current) return
    const { ua, lang, tz, deviceType, os, isPwa } = getDeviceMeta()
    const payload: any = {
      device_id: deviceIdRef.current,
      last_seen_at: nowIso,
      user_id: userId,
      device_type: deviceType,
      os,
      lang,
      tz,
      user_agent: ua,
      is_pwa: isPwa
    }
    if (newDeviceRef.current) {
      payload.first_seen_at = nowIso
      payload.first_referrer = document.referrer || null
    }
    payload.last_referrer = document.referrer || null
    // insert y no upsert(onConflict): un INSERT ... ON CONFLICT DO UPDATE
    // exige permiso de SELECT sobre la tabla para poder comprobar si la fila
    // ya existe, incluso cuando no hay colision real. Sin una politica
    // SELECT publica (no debe haberla: expondria user_agent/referrer/user_id
    // de todos los visitantes a cualquiera con la anon key), ese upsert
    // fallaba siempre con RLS, tambien para dispositivos nuevos.
    try {
      const { error } = await sb.from('app_devices').insert(payload)
      if (error?.code === '23505') {
        // device_id ya existe: es el heartbeat normal de una visita que
        // vuelve. El trigger preserve_analytics_owner (ver
        // supabase/fix-analytics-tracking.sql) protege el user_id de la fila
        // si ya pertenecia a otro usuario.
        await sb.from('app_devices').update(payload).eq('device_id', deviceIdRef.current)
      }
    } catch {}
  }

  async function ensureSession(currentPath: string, eventId: string | null) {
    if (!hasAnalyticsConsent()) return null
    const now = Date.now()
    const nowIso = new Date(now).toISOString()

    let deviceId = deviceIdRef.current || getDeviceId()
    if (!deviceId) {
      deviceId = crypto.randomUUID()
      setDeviceId(deviceId)
      newDeviceRef.current = true
    }
    deviceIdRef.current = deviceId

    // El device tiene que existir ANTES que la sesion: app_sessions.device_id
    // es clave foranea de app_devices, y hasta ahora la sesion se insertaba
    // primero. Para cualquier dispositivo nuevo, ese insert violaba la FK
    // (23503, "Key is not present in table app_devices") y quedaba
    // silenciado por el catch{} de abajo: la sesion nunca llegaba a
    // guardarse.
    await touchDevice(nowIso, user?.id || null)

    let sessionId = sessionIdRef.current || getSessionId()
    const lastSeen = getSessionLastSeen()
    const expired = !lastSeen || (now - lastSeen) > SESSION_TIMEOUT_MS
    if (!sessionId || expired) {
      sessionId = crypto.randomUUID()
      setSessionId(sessionId)
      setSessionStart(now)
      const { ua, lang, tz, deviceType, os, isPwa } = getDeviceMeta()
      try {
        await sb.from('app_sessions').insert({
          id: sessionId,
          device_id: deviceId,
          user_id: user?.id || null,
          started_at: nowIso,
          last_seen_at: nowIso,
          duration_ms: 0,
          current_path: currentPath,
          current_event_id: eventId,
          is_new_device: newDeviceRef.current,
          device_type: deviceType,
          os,
          lang,
          tz,
          user_agent: ua,
          is_pwa: isPwa
        })
      } catch {}
    }
    sessionIdRef.current = sessionId
    sessionStartRef.current = getSessionStart() || now
    setSessionLastSeen(now)
    return { sessionId, deviceId }
  }

  async function touchSession(currentPath: string, eventId: string | null) {
    if (!hasAnalyticsConsent()) return
    const sessionId = sessionIdRef.current || getSessionId()
    const deviceId = deviceIdRef.current || getDeviceId()
    if (!sessionId || !deviceId) return
    const now = Date.now()
    const start = sessionStartRef.current || getSessionStart() || now
    const duration = Math.max(0, now - start)
    const nowIso = new Date(now).toISOString()
    setSessionLastSeen(now)
    try {
      await sb.from('app_sessions')
        .update({
          last_seen_at: nowIso,
          duration_ms: duration,
          current_path: currentPath,
          current_event_id: eventId,
          user_id: user?.id || null
        })
        .eq('id', sessionId)
    } catch {}
    await touchDevice(nowIso, user?.id || null)
  }

  async function endView() {
    if (!viewIdRef.current || !viewStartRef.current) return
    const now = Date.now()
    const duration = Math.max(0, now - viewStartRef.current)
    const nowIso = new Date(now).toISOString()
    const viewId = viewIdRef.current
    viewIdRef.current = null
    viewStartRef.current = null
    try {
      await sb.from('app_page_views').update({ ended_at: nowIso, duration_ms: duration }).eq('id', viewId)
    } catch {}
  }

  async function startView(currentPath: string, eventId: string | null) {
    if (!hasAnalyticsConsent()) return
    const ids = await ensureSession(currentPath, eventId)
    if (!ids) return
    const now = new Date().toISOString()
    const viewId = crypto.randomUUID()
    const referrer = lastPathRef.current || document.referrer || null
    try {
      await sb.from('app_page_views').insert({
        id: viewId,
        session_id: ids.sessionId,
        device_id: ids.deviceId,
        user_id: user?.id || null,
        path: currentPath,
        screen: pathname,
        referrer,
        event_id: eventId,
        started_at: now
      })
      viewIdRef.current = viewId
      viewStartRef.current = Date.now()
    } catch {}
  }

  useEffect(() => {
    if (!consentEnabled) return
    const eventId = getEventIdFromPath(pathname)
    ;(async () => {
      await endView()
      await startView(fullPath, eventId)
      await touchSession(fullPath, eventId)
      lastPathRef.current = fullPath
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullPath, consentEnabled])

  useEffect(() => {
    if (!consentEnabled) return
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        const eventId = getEventIdFromPath(pathname)
        endView()
        touchSession(fullPath, eventId)
      }
    }
    const onPageHide = () => {
      const eventId = getEventIdFromPath(pathname)
      endView()
      touchSession(fullPath, eventId)
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [fullPath, pathname, consentEnabled])

  useEffect(() => {
    if (heartbeatRef.current) {
      window.clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
    if (!consentEnabled) return
    heartbeatRef.current = window.setInterval(() => {
      const eventId = getEventIdFromPath(pathname)
      touchSession(fullPath, eventId)
    }, HEARTBEAT_MS)
    return () => {
      if (heartbeatRef.current) window.clearInterval(heartbeatRef.current)
    }
  }, [fullPath, pathname, user?.id, consentEnabled])

  useEffect(() => {
    if (!consentEnabled) return
    const eventId = getEventIdFromPath(pathname)
    touchSession(fullPath, eventId)
  }, [user?.id, fullPath, pathname, consentEnabled])

  return null
}
