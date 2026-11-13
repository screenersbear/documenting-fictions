// Documenting Fictions: the shelf's offline copy. Each notebook has its own
// worker for its own folder (registered from the shelf, see app.js); this one
// answers for the shelf itself and the covers it shows.
// Bump CACHE_NAME with every deploy so installed copies pick up new files.
const CACHE_NAME = 'df-suite-v21';
const ASSETS = [
  './', './index.html', './app.js', './suite.js', './manifest.json', './icon-180.png', './icon-512.png',
  './styles/shelf.css', './styles/cover-stickers.css', './styles/shelf-bar.css', './styles/sheet.css', './styles/sticker-new.css', './styles/toast.css', './styles/sheet-words.css', './styles/type.css',
  './data/sticker-store.js', './components/sticker-art.js', './components/sticker-new.js', './components/stickers.js', './pages/shelf-turntable.js', './pages/shelf-hands.js', './pages/shelf-options.js', './components/toast.js', './pages/shelf-open.js', './components/screen-fit.js',
  './data/suite-backup.js', './components/backup-sheet.js',
  './shared/data/basics.js', './shared/data/files.js', './shared/data/overthoughts.js', './shared/data/the-eye.js', './shared/data/journal-move.js', './shared/data/json-backup.js',
  './shared/data/zip-format.js', './shared/data/zip-backup.js', './shared/data/zip-restore.js', './shared/data/links.js', './shared/data/df-data.js',
  './ref/fonts/klee-one-latin.woff', './ref/fonts/figtree-latin.woff2', './ref/fonts/archivo-black-latin.woff2',
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
  const art = /\/(art|fonts)\//.test(url.pathname);
  const keep = !notebook || art;
  // The covers and fonts don't change between deploys (a deploy clears this
  // cache): straight from the cache, so the shelf doesn't wait on the network
  // for the letters on its covers.
  if (art) {
    event.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)); }
      return res;
    })));
    return;
  }
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
