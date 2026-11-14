// The Eye's offline copy: what's saved on the phone, and installing and
// clearing it (data/offline-launch.js answers each request from it).
// Bump CACHE_NAME with every deploy so installed copies pick up new files.
const CACHE_NAME = 'the-eye-v175';
// The same notebook can live twice on one website (inside the Documenting
// Fictions suite and as its own app), and both workers see every cache there:
// each name carries the folder this copy lives in, and each copy only ever
// clears its own.
const HERE = new URL(self.registration.scope).pathname;
const CACHE = `${CACHE_NAME} ${HERE}`;
const ASSETS = [
  './',
  './index.html',
  './built/shared-data.js',
  './built/app.css',
  './built/markup.js',
  './built/app.js',
  './lib/jspdf.umd.min.js',
  './lib/pdf.min.js',
  './lib/pdf.worker.min.js',
  './manifest.json',
  './icon-180.png',
  './icon-512.png',
  './logo.png',
  './world-map.svg',
  './art/df-mango-cover.webp',
  './art/df-mango-block.webp',
  './art/df-orange-cover.webp',
  './art/df-orange-block.webp',
  './art/df-berry-cover.webp',
  './art/df-berry-block.webp',
  './art/df-fern-cover.webp',
  './art/df-fern-block.webp',
  './art/df-ocean-cover.webp',
  './art/df-ocean-block.webp',
  './art/df-leaf-cover.webp',
  './art/df-leaf-block.webp',
  './art/df-ink-cover.webp',
  './art/df-ink-block.webp',
  './fonts/klee-one-latin.woff',
  './fonts/kaisei-decol-500-latin.woff2',
  './fonts/figtree-latin.woff2',
  './fonts/archivo-black-latin.woff2',
];

// A version that came in from the network (a 'network' page load, below) is
// kept aside here as it arrives, never in the live cache, so nothing gets
// mixed. Its new worker's install starts from these files instead of
// fetching them all over again, and a later launch can tell that a version
// newer than the saved one has already run on this phone. Cleared with the
// other old caches whenever a new version takes over.
const STAGING_CACHE = `the-eye-staging ${HERE}`;

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
    caches.open(CACHE).then((cache) =>
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
      Promise.all(keys.filter((k) => k !== CACHE && k.endsWith(` ${HERE}`)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Where each launch, and the files it asks for, are answered from (the
// network or the copy saved here) is in its own file. Its address carries
// the version, so a new worker never starts with an older copy of it.
importScripts(`data/offline-launch.js?v=${CACHE_NAME}`);
