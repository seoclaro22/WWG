"use client"
import { useEffect, useMemo, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
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

  const sb = useMemo(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), [])

  const deviceIdRef = useRef<string | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const sessionStartRef = useRef<number | null>(null)
  const viewIdRef = useRef<string | null>(null)
  const viewStartRef = useRef<number | null>(null)
  const lastPathRef = useRef<string>('')
  const heartbeatRef = useRef<number | null>(null)
  const newDeviceRef = useRef<boolean>(false)

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
    try {
      await sb.from('app_devices').upsert(payload, { onConflict: 'device_id' })
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
    await touchDevice(nowIso, user?.id || null)
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
    if (!hasAnalyticsConsent()) return
    const eventId = getEventIdFromPath(pathname)
    ;(async () => {
      await endView()
      await startView(fullPath, eventId)
      await touchSession(fullPath, eventId)
      lastPathRef.current = fullPath
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullPath])

  useEffect(() => {
    if (!hasAnalyticsConsent()) return
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
  }, [fullPath, pathname])

  useEffect(() => {
    if (!hasAnalyticsConsent()) return
    if (heartbeatRef.current) window.clearInterval(heartbeatRef.current)
    heartbeatRef.current = window.setInterval(() => {
      const eventId = getEventIdFromPath(pathname)
      touchSession(fullPath, eventId)
    }, HEARTBEAT_MS)
    return () => {
      if (heartbeatRef.current) window.clearInterval(heartbeatRef.current)
    }
  }, [fullPath, pathname, user?.id])

  useEffect(() => {
    if (!hasAnalyticsConsent()) return
    const eventId = getEventIdFromPath(pathname)
    touchSession(fullPath, eventId)
  }, [user?.id, fullPath, pathname])

  return null
}
