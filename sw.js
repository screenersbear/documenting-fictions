const CACHE_NAME = 'starky-v62';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './lib/jspdf.umd.min.js',
  './manifest.json',
  './icon-180.png',
  './icon-512.png',
  './logo.png',
  './world-map.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    // no-store bypasses the browser's own HTTP cache, not just this SW's
    // Cache Storage — without it, a host that sets any cache lifetime on
    // static assets can make this "network-first" fetch silently resolve
    // to a stale response the browser cached below the service worker,
    // even right after a fresh deploy with a bumped CACHE_NAME.
    fetch(event.request, { cache: 'no-store' })
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
