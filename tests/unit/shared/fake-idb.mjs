// IndexedDB opened and read the way df-data.js does it, on fake-indexeddb,
// for the suite backup's tests. Not a test file itself.

export function open(name, version, upgrade) {
  return new Promise((ok, no) => {
    const r = indexedDB.open(name, version);
    if (upgrade) r.onupgradeneeded = (e) => upgrade(r.result, e.oldVersion, r.transaction);
    r.onsuccess = () => { const db = r.result; db.onversionchange = () => db.close(); ok(db); };
    r.onerror = () => no(r.error);
    r.onblocked = () => no(new Error("Close this app's other tabs and try again."));
  });
}
export function rows(db, store) {
  return new Promise((ok, no) => {
    const out = [];
    const r = db.transaction(store).objectStore(store).openCursor();
    r.onsuccess = () => { const c = r.result; if (!c) { ok(out); return; } out.push([c.key, c.value]); c.continue(); };
    r.onerror = () => no(r.error);
  });
}
