// Push notification client utilities

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

/** Returns true if Web Push is supported in this browser */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** Current notification permission status */
export function getPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

/**
 * Register service worker, request permission and subscribe to push.
 * Returns the PushSubscription or null if denied/unsupported.
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null

  // Register (or get existing) service worker
  let reg: ServiceWorkerRegistration
  try {
    reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    await navigator.serviceWorker.ready
  } catch {
    return null
  }

  // Request permission
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  // Subscribe to push
  try {
    const existing = await reg.pushManager.getSubscription()
    if (existing) return existing

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    })
    return sub
  } catch {
    return null
  }
}

/**
 * Save subscription to our backend (which stores it in Supabase).
 * Reads the Supabase session token from localStorage automatically.
 */
export async function saveSubscription(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON()
  const token = getSupabaseToken()
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      userAgent: navigator.userAgent,
    }),
  })
}

/**
 * Remove subscription from backend and unsubscribe from browser.
 */
export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return
  try {
    const token = getSupabaseToken()
    const reg = await navigator.serviceWorker.getRegistration('/sw.js')
    const sub = await reg?.pushManager.getSubscription()
    if (sub) {
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })
      await sub.unsubscribe()
    }
  } catch {}
}

/** Read Supabase access token from localStorage */
function getSupabaseToken(): string | null {
  try {
    const raw = localStorage.getItem('nighthub-auth')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.access_token ?? null
  } catch {
    return null
  }
}

// Helper: convert VAPID public key from base64url to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}
