// Documenting Fictions: the shelf's offline copy. Each notebook has its own
// worker for its own folder (registered from the shelf, see home.js); this one
// answers for the shelf itself and the covers it shows.
// Bump CACHE_NAME with every deploy so installed copies pick up new files.
const CACHE_NAME = 'df-suite-v1';
const ASSETS = [
  './', './index.html', './home.css', './home.js', './suite.js', './manifest.json', './icon-180.png', './icon-512.png',
  './ref/fonts/klee-one-latin.woff',
  './ref/art/ocean-cover.webp', './ref/art/ocean-block.webp',
  './the-eye/art/df-mango-cover.webp', './the-eye/art/df-mango-block.webp',
  './contact-sheet/art/orange-cover.webp', './contact-sheet/art/orange-block.webp',
  './overthoughts/art/leaf-cover.webp', './overthoughts/art/leaf-block.webp',
];
const NOTEBOOKS = ['ref', 'the-eye', 'contact-sheet', 'overthoughts'];
const base = new URL('./', self.location).pathname;
const notebookOf = (path) => NOTEBOOKS.find((n) => path.startsWith(`${base}${n}/`));

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS.map((u) => new Request(u, { cache: 'no-store' })))));
  self.skipWaiting();
});
// The app before the suite (The Eye, when it lived here) asks a new version to
// take over once nobody's using it.
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  // Only this worker's own old copies, and those of the app that lived here
  // before ('starky-'). The notebooks' caches are theirs to look after.
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME && (k.startsWith('df-suite-') || k.startsWith('starky-'))).map((k) => caches.delete(k)))));
  self.clients.claim();
});
// Network first, so a fresh deploy shows up right away; the cache answers offline.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.includes('/ml/')) return;
  const notebook = notebookOf(url.pathname);
  // A notebook's own pages belong to its own worker; this one only stands in
  // until that's installed, and keeps none of them.
  const keep = !notebook || /\/(art|fonts)\//.test(url.pathname);
  event.respondWith(
    fetch(req, { cache: 'no-store' })
      .then((res) => {
        if (keep && res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(req, { ignoreSearch: true });
        if (hit) return hit;
        if (req.mode === 'navigate') {
          if (notebook) return (await caches.match(`${base}${notebook}/index.html`)) || (await caches.match(`${base}${notebook}/`)) || Response.error();
          return caches.match('./index.html');
        }
        return Response.error();
      })
  );
});
