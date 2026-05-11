const CACHE = 'companylog-v1'
const OFFLINE_URL = '/'

// On install: cache the shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_URL, '/manifest.json']))
  )
  self.skipWaiting()
})

// On activate: clear old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: network first, fall back to cache for navigation
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  const url = new URL(e.request.url)

  // Skip API and WebSocket requests — always go to network
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws/')) return

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Cache successful static responses
        if (res.ok && (url.pathname.startsWith('/assets/') || url.pathname === '/')) {
          const clone = res.clone()
          caches.open(CACHE).then((c) => c.put(e.request, clone))
        }
        return res
      })
      .catch(() =>
        caches.match(e.request).then((cached) => cached || caches.match(OFFLINE_URL))
      )
  )
})
