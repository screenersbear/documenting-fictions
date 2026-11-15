// Overthoughts was taken out of the suite on 15 Nov, and what it kept on the
// phone goes too (Starky): its database, the few things it saved in
// localStorage, its offline copy and its service worker. Run as the shelf
// starts; once it's all gone there's nothing left to do. Old backups that
// still have an Overthoughts part restore fine and skip it
// (shared/data/backup-books.js). (Loaded before app.js.)
(function () {
  'use strict';
  const DB = 'overthoughts';
  // Its keys: overthoughts-book, overthoughts-start, overthoughts-journal-moved,
  // and the shelf's for it, like df-suite-welcomed-overthoughts.
  const itsKey = (k) => k.startsWith('overthoughts-') || k.endsWith('-overthoughts');

  function dropKeys(store) {
    const keys = [];
    for (let i = 0; i < store.length; i++) keys.push(store.key(i));
    keys.filter((k) => k && itsKey(k)).forEach((k) => store.removeItem(k));
    if (store.getItem('df-suite-in') === 'overthoughts') store.removeItem('df-suite-in');
  }
  // Resolves once it's gone (or was never there). Another tab still holding
  // it open only puts it off: it goes when that tab lets go.
  const dropDb = (idb) => new Promise((done) => {
    const r = idb.deleteDatabase(DB);
    r.onsuccess = r.onerror = r.onblocked = () => done();
  });
  async function dropWorker(sw) {
    for (const reg of await sw.getRegistrations()) {
      if (new URL(reg.scope).pathname.endsWith('/overthoughts/')) await reg.unregister();
    }
  }
  async function dropCaches(cs) {
    for (const k of await cs.keys()) if (k.startsWith('overthoughts-')) await cs.delete(k);
  }

  // Each part on its own: one that can't run (private mode, no service
  // workers here) doesn't stop the others.
  async function retireOverthoughts(w = window) {
    const quietly = async (fn) => { try { await fn(); } catch (e) { /* not here, or not allowed: nothing to clear */ } };
    await quietly(() => dropKeys(w.localStorage));
    await quietly(() => dropDb(w.indexedDB));
    await quietly(() => dropWorker(w.navigator.serviceWorker));
    await quietly(() => dropCaches(w.caches));
  }

  window.DFRetire = { retireOverthoughts, itsKey };
  retireOverthoughts();
})();
