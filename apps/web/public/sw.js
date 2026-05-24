// Where We Go — Service Worker v2

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Where We Go', body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'Where We Go'
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: '/badge-72.png',
    data: { url: data.url || '/discover' },
    tag: data.tag || 'wwg-event',
    renotify: true,
    vibrate: [200, 100, 200],
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/discover'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((c) => 'focus' in c)
      if (existing) return existing.focus().then((c) => c.navigate(url))
      return self.clients.openWindow(url)
    })
  )
})
