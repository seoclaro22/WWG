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
    // Via RPC y no upsert directo. Un INSERT ... ON CONFLICT necesita SELECT
    // sobre la tabla para comprobar si la fila existe, y un UPDATE con WHERE
    // tambien lo necesita para localizarla. La unica politica de SELECT es
    // para moderadores, asi que ambos fallaban: el upsert con RLS y el update
    // en silencio, respondiendo 204 sin tocar ninguna fila. Abrir el SELECT
    // no es opcion (expondria user_agent, referrer y user_id de cada
    // visitante a cualquiera con la anon key), asi que la escritura pasa por
    // una funcion SECURITY DEFINER. Ver supabase/fix-analytics-rpc.sql.
    try {
      await sb.rpc('analytics_touch_device', {
        p_device_id: deviceIdRef.current,
        p_last_seen: nowIso,
        p_user_id: userId,
        p_device_type: deviceType,
        p_os: os,
        p_lang: lang,
        p_tz: tz,
        p_user_agent: ua,
        p_is_pwa: isPwa,
        p_referrer: document.referrer || null,
      })
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
    // Por RPC: el update directo respondia 204 sin tocar ninguna fila, porque
    // un UPDATE con WHERE necesita SELECT y la fila no es visible al anonimo.
    // De este heartbeat salen la duracion media y los usuarios activos.
    try {
      await sb.rpc('analytics_touch_session', {
        p_session_id: sessionId,
        p_last_seen: nowIso,
        p_duration: duration,
        p_path: currentPath,
        p_event_id: eventId,
        p_user_id: user?.id || null,
      })
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
      await sb.rpc('analytics_end_view', {
        p_view_id: viewId,
        p_ended_at: nowIso,
        p_duration: duration,
      })
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
