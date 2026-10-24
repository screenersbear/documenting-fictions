const CACHE_NAME = 'starky-v112';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './lib/jspdf.umd.min.js',
  './lib/pdf.min.js',
  './lib/pdf.worker.min.js',
  './manifest.json',
  './icon-180.png',
  './icon-512.png',
  './logo.png',
  './world-map.svg',
];

// How long a launch waits on the network before opening from the saved copy
// instead. With one bar of signal a request can hang for many seconds before
// failing, and the app sat on its blank start screen the whole time.
const NETWORK_TIMEOUT_MS = 2000;

// The files the page asks for right after it loads (style.css, app.js…)
// follow wherever the page itself came from, for this long after it does.
const PAGE_LOAD_WINDOW_MS = 60000;

self.addEventListener('install', (event) => {
  // no-store, same reason as the fetches below: this copy is what the app
  // opens from on a weak signal, so it has to be what's actually deployed,
  // not a stale file the browser had sitting in its own HTTP cache.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'no-store' }))))
  );
  // No skipWaiting() here any more. Taking over the moment it installed is
  // what made the page reload itself a few seconds into a session (app.js
  // reloaded on every controllerchange), closing whatever was open. A new
  // version now waits until app.js says nobody's using the app (see
  // 'skipWaiting' below). The very first install isn't affected: with no
  // version before it, it takes over straight away on its own.
});

// app.js sends this once the page is idle (still hidden at launch, or in the
// background with nothing open) and it's safe to reload into the new version.
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Where the page last came from: 'cache' (the network didn't answer in time),
// 'network' (it did, with a different version from the saved copy — a fresh
// deploy) or 'race' (it did, and it's the version already saved). One app,
// one window, so one value is enough.
let pageLoadMode = 'race';
let pageLoadModeUntil = 0;

function setPageLoadMode(mode) {
  pageLoadMode = mode;
  pageLoadModeUntil = Date.now() + PAGE_LOAD_WINDOW_MS;
}

function currentPageLoadMode() {
  return Date.now() < pageLoadModeUntil ? pageLoadMode : 'race';
}

// Two responses are the same deployed file when the server stamps them the
// same. No stamp at all counts as different, which only ever means waiting
// on the network, the old behaviour.
function sameVersion(a, b) {
  if (!a || !b) return false;
  const stamp = (r) => r.headers.get('ETag') || r.headers.get('Last-Modified') || '';
  return !!stamp(a) && stamp(a) === stamp(b);
}

function fromNetwork(request) {
  // no-store bypasses the browser's own HTTP cache, not just this SW's
  // Cache Storage — without it, a host that sets any cache lifetime on
  // static assets can make the network fetch silently resolve to a stale
  // response the browser cached below the service worker, even right
  // after a fresh deploy with a bumped CACHE_NAME.
  return fetch(request, { cache: 'no-store' });
}

function fromCache(request, options) {
  return caches.match(request, options).catch(() => undefined);
}

function putInCache(request, response) {
  if (!response || response.status !== 200) return Promise.resolve();
  const copy = response.clone();
  return caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
}

// The network if it answers within NETWORK_TIMEOUT_MS, else the saved copy;
// with no saved copy it keeps waiting on the network, and with neither it
// fails like any offline request. onAnswer(response, fromCacheFlag) runs
// just before the answer goes out.
function networkOrCache(network, cached, onAnswer) {
  return new Promise((resolve) => {
    let answered = false;
    const answer = (response, wasCached) => {
      if (answered) return;
      answered = true;
      clearTimeout(timer);
      if (onAnswer) onAnswer(response, wasCached);
      resolve(response);
    };
    const timer = setTimeout(() => {
      cached.then((response) => { if (response) answer(response, true); });
    }, NETWORK_TIMEOUT_MS);
    network.then(
      (response) => answer(response, false),
      () => cached.then((response) => answer(response || Response.error(), !!response))
    );
  });
}

// The page itself decides where everything in this load comes from, so the
// app never opens as a mix of two versions (an old index.html beside a new
// app.js breaks the app until the next launch).
function handleNavigation(event) {
  const request = event.request;
  const network = fromNetwork(request);
  // ignoreSearch: the app is one page, so ./index.html?anything is still it.
  const cached = fromCache(request, { ignoreSearch: true });
  // Keeps the worker alive for a network answer that arrives after the
  // saved copy already went out. That late answer isn't saved on its own:
  // a new index.html saved beside the old app.js would open broken next
  // time. If it shows a newer deploy, this asks for the new version
  // instead, which downloads every file and swaps them in together.
  keepAlive(event, Promise.all([network, cached]).then(([response, saved]) => {
    if (saved && !sameVersion(response, saved)) return self.registration.update();
  }));
  return cached.then((saved) => networkOrCache(network, cached, (response, wasCached) => {
    if (wasCached) setPageLoadMode('cache');
    else setPageLoadMode(sameVersion(response, saved) ? 'race' : 'network');
  }));
}

function handleSubresource(event) {
  const request = event.request;
  const mode = currentPageLoadMode();
  // The page came from the saved copy: so does everything it asks for,
  // straight away (a file that was never saved still comes from the network).
  if (mode === 'cache') {
    return fromCache(request).then((saved) => saved || raceAndSave(event));
  }
  // A fresh deploy came in from the network: the rest of it has to as well,
  // however long it takes, or a new page could run old code. Nothing's saved
  // here — the new version arrives as a whole when its worker installs.
  if (mode === 'network') {
    return fromNetwork(request).catch(() => fromCache(request).then((saved) => saved || Response.error()));
  }
  return raceAndSave(event);
}

// Same version as what's saved: the network gets its ~2 seconds, the saved
// copy covers anything slower, and a late answer still updates the copy.
function raceAndSave(event) {
  const request = event.request;
  const network = fromNetwork(request);
  // Registered before the answer goes out, so the copy is taken before the
  // page starts reading the response.
  keepAlive(event, network.then((response) => putInCache(request, response)));
  return networkOrCache(network, fromCache(request));
}

// waitUntil, minus its failure modes: a rejected promise is just a missed
// cache update, and a call that comes too late (after the event's done)
// mustn't turn into a failed request.
function keepAlive(event, promise) {
  const settled = promise.catch(() => {});
  try { event.waitUntil(settled); } catch (e) { /* event already finished */ }
}

self.addEventListener('fetch', (event) => {
  // Only GETs are ever saved or served from the cache; anything else goes
  // to the network untouched (the app itself only ever makes GETs).
  if (event.request.method !== 'GET') return;
  event.respondWith(event.request.mode === 'navigate' ? handleNavigation(event) : handleSubresource(event));
});
