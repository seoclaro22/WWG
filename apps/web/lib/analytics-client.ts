"use client"

const CONSENT_KEY = 'nh-consent'
const DEVICE_KEY = 'nh-device'
const SESSION_KEY = 'nh-session'
const SESSION_TS_KEY = 'nh-session-ts'
const SESSION_START_KEY = 'nh-session-start'

function setCookie(name: string, value: string, days = 180) {
  const d = new Date()
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`
}

function getCookie(name: string) {
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return m ? decodeURIComponent(m[2]) : null
}

function readLocal(key: string) {
  try { return localStorage.getItem(key) } catch { return null }
}

function writeLocal(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch {}
}

export function hasAnalyticsConsent() {
  if (typeof window === 'undefined') return false
  const stored = readLocal(CONSENT_KEY) || getCookie(CONSENT_KEY)
  return stored === 'accepted'
}

export function getDeviceId() {
  if (!hasAnalyticsConsent()) return null
  return readLocal(DEVICE_KEY) || getCookie(DEVICE_KEY)
}

export function setDeviceId(id: string) {
  if (!hasAnalyticsConsent()) return
  writeLocal(DEVICE_KEY, id)
  setCookie(DEVICE_KEY, id)
}

export function getSessionId() {
  if (!hasAnalyticsConsent()) return null
  return readLocal(SESSION_KEY) || getCookie(SESSION_KEY)
}

export function setSessionId(id: string) {
  if (!hasAnalyticsConsent()) return
  writeLocal(SESSION_KEY, id)
  setCookie(SESSION_KEY, id)
}

export function getSessionLastSeen() {
  if (!hasAnalyticsConsent()) return null
  const raw = readLocal(SESSION_TS_KEY) || getCookie(SESSION_TS_KEY)
  return raw ? Number(raw) : null
}

export function setSessionLastSeen(ts: number) {
  if (!hasAnalyticsConsent()) return
  const val = String(ts)
  writeLocal(SESSION_TS_KEY, val)
  setCookie(SESSION_TS_KEY, val)
}

export function getSessionStart() {
  if (!hasAnalyticsConsent()) return null
  const raw = readLocal(SESSION_START_KEY) || getCookie(SESSION_START_KEY)
  return raw ? Number(raw) : null
}

export function setSessionStart(ts: number) {
  if (!hasAnalyticsConsent()) return
  const val = String(ts)
  writeLocal(SESSION_START_KEY, val)
  setCookie(SESSION_START_KEY, val)
}

export function clearAnalyticsStorage() {
  try { localStorage.removeItem(DEVICE_KEY) } catch {}
  try { localStorage.removeItem(SESSION_KEY) } catch {}
  try { localStorage.removeItem(SESSION_TS_KEY) } catch {}
  try { localStorage.removeItem(SESSION_START_KEY) } catch {}
  document.cookie = `${DEVICE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
  document.cookie = `${SESSION_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
  document.cookie = `${SESSION_TS_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
  document.cookie = `${SESSION_START_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}

export function getAnalyticsContext() {
  if (!hasAnalyticsConsent()) return null
  const deviceId = getDeviceId()
  const sessionId = getSessionId()
  if (!deviceId || !sessionId) return null
  return { deviceId, sessionId }
}

