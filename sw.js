const CACHE_NAME = 'starky-v121';
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

// A version that came in from the network (a 'network' page load, below) is
// kept aside here as it arrives, never in the live cache, so nothing gets
// mixed. Its new worker's install starts from these files instead of
// fetching them all over again, and a later launch can tell that a version
// newer than the saved one has already run on this phone. Cleared with the
// other old caches whenever a new version takes over.
const STAGING_CACHE = 'starky-staging';

// How long a launch waits on the network before opening from the saved copy
// instead. With one bar of signal a request can hang for many seconds before
// failing, and the app sat on its blank start screen the whole time.
const NETWORK_TIMEOUT_MS = 2000;

// The same, when a newer version than the saved copy has already run here
// but isn't saved yet (see handleNavigation): the saved copy would take the
// app back to the older version, so the network gets longer. Still capped —
// a dead connection can hang for a minute before failing, and it would end
// on the saved copy anyway.
const NEWER_VERSION_TIMEOUT_MS = 10000;

// The files the page asks for right after it loads (style.css, app.js…)
// follow wherever the page itself came from, for this long after it does.
const PAGE_LOAD_WINDOW_MS = 60000;

self.addEventListener('install', (event) => {
  // Each file goes into the new cache as soon as it's in, rather than all
  // together at the end, so an install that iOS cuts short (the app put away
  // a few seconds after a deploy, or a weak signal) carries on from where it
  // stopped next time instead of starting the whole ~4MB over. The new
  // version still only takes over once every file is in, and until then
  // nothing is served from this cache (fromCache only reads the live one).
  //
  // Unless every file is already in it: then this name is most likely the
  // live version's own (a deploy that changed sw.js without bumping
  // CACHE_NAME), still in use, and its files have to change all together or
  // not at all, so that case keeps the old all-at-once addAll.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(ASSETS.map((url) => cache.match(url, { ignoreSearch: true, ignoreVary: true }))).then((found) => {
        if (found.every(Boolean)) return cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'no-store' })));
        return Promise.all(ASSETS.map((url) => installFile(cache, url)));
      })
    )
  );
  // No skipWaiting() here any more. Taking over the moment it installed is
  // what made the page reload itself a few seconds into a session (app.js
  // reloaded on every controllerchange), closing whatever was open. A new
  // version now waits until app.js says nobody's using the app (see
  // 'skipWaiting' below). The very first install isn't affected: with no
  // version before it, it takes over straight away on its own.
});

// A copy already on the phone is checked with the server rather than
// downloaded again: this install's own, from an attempt that was cut short;
// the one a launch just fetched from the network (STAGING_CACHE); or the
// live one. The server answers 304 only when that copy is exactly the file
// deployed now, otherwise it sends the new file, so an old file can't slip
// into the new version; it just isn't fetched twice. With no copy, or none
// with a stamp to check it by, it's a plain download as before. no-store,
// same reason as the fetches below: this copy is what the app opens from
// on a weak signal, so it has to be what's actually deployed, not a stale
// file the browser had sitting in its own HTTP cache.
function installFile(cache, url) {
  const request = new Request(url);
  const lookup = { ignoreSearch: true, ignoreVary: true };
  return cache.match(request, lookup)
    .then((own) => (own
      ? { response: own, own: true }
      : caches.match(request, { ignoreSearch: true, ignoreVary: true, cacheName: STAGING_CACHE })
        .then((staged) => staged || caches.match(request, lookup))
        .then((other) => (other ? { response: other, own: false } : null))))
    .catch(() => null)
    .then((copy) => {
      // Same rule as addAll, which this replaces: a missing or failed file
      // fails the install, and the version waits for the next try.
      const download = () => fetch(new Request(url, { cache: 'no-store' })).then((response) => {
        if (!response.ok) throw new TypeError(`Couldn't fetch ${url} (${response.status})`);
        return cache.put(request, response);
      });
      const usable = !!copy && copy.response.status === 200 && !copy.response.redirected;
      const etag = usable ? copy.response.headers.get('ETag') : null;
      const lastModified = usable ? copy.response.headers.get('Last-Modified') : null;
      if (!etag && !lastModified) return download();
      const headers = etag ? { 'If-None-Match': etag } : { 'If-Modified-Since': lastModified };
      // Anything but a plain yes or no from the check falls back to a plain
      // download, so at worst this costs what the old install did.
      return fetch(new Request(url, { cache: 'no-store', headers })).then((response) => {
        if (response.status === 304) return copy.own ? undefined : cache.put(request, copy.response);
        if (response.ok) return cache.put(request, response);
        return download();
      }, download);
    });
}

// app.js sends this once the page is idle (still hidden at launch, or in the
// background with nothing open) and it's safe to reload into the new version.
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // STAGING_CACHE goes too: what it held is either the version taking over
  // (now saved in full) or a later one, whose own install fetches it again.
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

// The live cache only. STAGING_CACHE and a new version's unfinished install
// sit beside it, and neither may be mixed into a launch.
function fromCache(request, options) {
  return caches.match(request, Object.assign({}, options, { cacheName: CACHE_NAME })).catch(() => undefined);
}

function fromStaging(request) {
  return caches.match(request, { ignoreSearch: true, cacheName: STAGING_CACHE }).catch(() => undefined);
}

function putInCache(request, response) {
  if (!response || response.status !== 200) return Promise.resolve();
  const copy = response.clone();
  return caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
}

// Kept aside for the new version's install (see STAGING_CACHE). The copy is
// taken straight away, before the page starts reading the response; a
// redirected answer is skipped, since the browser won't open a page from one.
function putInStaging(request, response) {
  if (!response || response.status !== 200 || response.redirected) return Promise.resolve();
  let copy;
  try { copy = response.clone(); } catch (e) { return Promise.resolve(); }
  return caches.open(STAGING_CACHE).then((cache) => cache.put(request, copy));
}

// The network if it answers within waitMs (NETWORK_TIMEOUT_MS unless given),
// else the saved copy; with no saved copy it keeps waiting on the network,
// and with neither it fails like any offline request. onAnswer(response,
// fromCacheFlag) runs just before the answer goes out.
function networkOrCache(network, cached, onAnswer, waitMs = NETWORK_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let answered = false;
    const answer = (response, wasCached) => {
      if (answered) return;
      answered = true;
      clearTimeout(timer);
      // Whatever goes wrong in there, the answer still goes out.
      try { if (onAnswer) onAnswer(response, wasCached); } catch (e) { /* ignore */ }
      resolve(response);
    };
    const timer = setTimeout(() => {
      cached.then((response) => { if (response) answer(response, true); });
    }, waitMs);
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
  // The newest version a launch has run from the network, if one has since
  // the saved copy was made (see STAGING_CACHE).
  const staged = fromStaging(request);
  let noteAnswer;
  const answered = new Promise((resolve) => { noteAnswer = resolve; });
  // Keeps the worker alive for a network answer that arrives after the
  // saved copy already went out. That late answer isn't saved on its own:
  // a new index.html saved beside the old app.js would open broken next
  // time. If it shows a newer deploy, this asks for the new version
  // instead, which downloads every file and swaps them in together. When
  // the network's answer is what went out, app.js asks instead, once the
  // page has loaded: by then its files are in STAGING_CACHE, so the install
  // only downloads what the page didn't.
  keepAlive(event, Promise.all([network, cached, answered]).then(([response, saved, wasCached]) => {
    if (wasCached && saved && !sameVersion(response, saved)) return self.registration.update();
  }));
  return Promise.all([cached, staged]).then(([saved, newest]) => {
    // A newer version than the saved one has already run here, and its
    // worker hasn't finished saving it yet. The saved copy would open the
    // older version again, on data the newer one may already have changed,
    // so the network gets longer to answer. With no connection at all the
    // saved copy still opens straight away: the app always opens offline.
    const newerHasRun = !!saved && !!newest && !sameVersion(newest, saved);
    return networkOrCache(network, cached, (response, wasCached) => {
      noteAnswer(wasCached);
      if (wasCached) { setPageLoadMode('cache'); return; }
      const newVersion = !sameVersion(response, saved);
      setPageLoadMode(newVersion ? 'network' : 'race');
      if (newVersion) keepAlive(event, putInStaging(request, response));
    }, newerHasRun ? NEWER_VERSION_TIMEOUT_MS : NETWORK_TIMEOUT_MS);
  });
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
  // however long it takes, or a new page could run old code. Nothing goes
  // into the live cache here (the new version arrives there as a whole, when
  // its worker installs); it's only kept aside in STAGING_CACHE, for that
  // install to start from. Registered before the answer goes out, like
  // raceAndSave's copy.
  if (mode === 'network') {
    const network = fromNetwork(request);
    keepAlive(event, network.then((response) => putInStaging(request, response)));
    return network.catch(() => fromCache(request).then((saved) => saved || Response.error()));
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
