/* sw.js */
// ============================================================================
// GIBI STORE v3 — Service Worker
// SPA shell: only index.html + assets need caching now (no more separate
// HTML pages per view). Cache-first for the shell, network-first for
// Supabase. Bump CACHE_NAME any time a cached file changes.
// ============================================================================

const CACHE_NAME = 'gibi-store-v3-4';
const APP_SHELL = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './css/styles.css',
  './js/config.js',
  './js/icons.js',
  './js/router.js',
  './js/notifications.js',
  './js/auth.js',
  './js/lightbox.js',
  './js/order.js',
  './js/view-auth.js',
  './js/view-home.js',
  './js/view-listing.js',
  './js/view-sell.js',
  './js/view-orders.js',
  './js/view-profile.js',
  './js/view-seller.js',
  './js/view-rewards.js',
  './js/view-search.js',
  './js/view-admin.js',
  './js/view-owner.js',
  './js/view-help.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  return url.hostname.includes('supabase.co') || url.hostname.includes('supabase.in');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (isApiRequest(url)) {
    event.respondWith(
      fetch(request).catch(() => new Response(JSON.stringify({ error: 'offline' }), {
        headers: { 'Content-Type': 'application/json' }, status: 503
      }))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response && response.status === 200 && request.url.startsWith(self.location.origin)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          if (request.mode === 'navigate') return caches.match('./offline.html');
        });
    })
  );
});
