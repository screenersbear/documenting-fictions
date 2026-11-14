// This phone's own values, kept apart from Rounds' data in a database of
// their own ('rounds-device'), so they're never in the shelf's backup nor in
// rounds.json: the sync repository and key and how the last sync went, the
// copy both sides last agreed on, clashes waiting for an answer, and the
// leads from Claude waiting to be looked at.
const DB_NAME = 'rounds-device';

let dbPromise = null;
function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore('meta', { keyPath: 'key' }); };
    req.onsuccess = () => {
      req.result.onversionchange = () => { req.result.close(); dbPromise = null; };
      resolve(req.result);
    };
    req.onerror = () => { dbPromise = null; reject(req.error); };
  });
  return dbPromise;
}

async function run(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(['meta'], mode);
    let out;
    t.oncomplete = () => resolve(out);
    t.onabort = () => reject(t.error || new Error("That wasn't saved. Your phone may be out of space."));
    fn(t.objectStore('meta'), (v) => { out = v; });
  });
}

// A value, or the fallback when there's none (or it was cleared).
export async function getMeta(key, fallback = null) {
  const r = await run('readonly', (s, set) => { s.get(key).onsuccess = (e) => set(e.target.result); });
  return r === undefined || r.value == null ? fallback : r.value;
}
export const setMeta = (key, value) => run('readwrite', (s) => { s.put({ key, value }); });
