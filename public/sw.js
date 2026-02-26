// public/sw.js — Service Worker for MSFunded PWA

const CACHE_NAME = 'msfunded-v1'

// Assets to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/journal',
  '/analytics',
  '/playbook',
  '/propfirms',
]

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Ignore failures — some pages need auth
      })
    })
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: network-first with cache fallback
self.addEventListener('fetch', (event) => {
  // Skip API calls and auth — always fresh
  if (
    event.request.url.includes('/api/') ||
    event.request.url.includes('/_next/') ||
    event.request.method !== 'GET'
  ) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => {
        // Fall back to cache when offline
        return caches.match(event.request).then(cached => {
          if (cached) return cached
          // Return offline page for navigation
          if (event.request.mode === 'navigate') {
            return caches.match('/dashboard')
          }
        })
      })
  )
})

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'MSFunded', {
      body: data.body ?? '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag ?? 'msfunded',
      data: { url: data.url ?? '/dashboard' },
    })
  )
})

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data?.url ?? '/dashboard')
  )
})