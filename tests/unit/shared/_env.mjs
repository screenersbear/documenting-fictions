// Shared set-up for the tests of the shared data files, shared/data/ (not a
// test file itself).
//
// They're classic scripts, loaded in order like the pages load them; the last,
// df-data.js, sets window.DFData. Each test loads a fresh copy (its module
// state, like the cached Overthoughts connection, starts empty) over a fresh,
// empty IndexedDB.
//
// jsdom's Blob can't go through IndexedDB (structuredClone turns it into a
// plain object), so the tests use Node's own Blob and File, which can, and a
// small FileReader that reads those. fetch() and Response follow the global
// Blob, so data URLs come back as the same kind of Blob.
import { vi, expect } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { Blob as NodeBlob, File as NodeFile } from 'node:buffer';
import { crc32 as zlibCrc32 } from 'node:zlib';

export const JsdomBlob = globalThis.Blob;
export { NodeBlob, NodeFile };

// readAsDataURL, as a browser does it; FakeFileReader.failWith makes the next
// reads fail the way a browser's do (onerror, with reader.error set).
export class FakeFileReader {
  static failWith = null;
  readAsDataURL(blob) {
    const fail = FakeFileReader.failWith;
    Promise.resolve()
      .then(async () => {
        if (fail) throw fail;
        const b64 = Buffer.from(await blob.arrayBuffer()).toString('base64');
        return `data:${blob.type || 'application/octet-stream'};base64,${b64}`;
      })
      .then(
        (url) => { this.result = url; this.onload(); },
        (err) => { this.error = err; this.onerror(); },
      );
  }
}

// Vitest's jsdom set-up swaps in jsdom's own ArrayBuffer and typed arrays,
// while structuredClone (and so IndexedDB), Node's Blob and TextEncoder make
// Node's. A browser page has one of each, so the tests put Node's back:
// otherwise `instanceof ArrayBuffer` fails on a value read from IndexedDB.
const TYPED = ['ArrayBuffer', 'Int8Array', 'Uint8Array', 'Uint8ClampedArray', 'Int16Array', 'Uint16Array', 'Int32Array', 'Uint32Array',
  'Float32Array', 'Float64Array', 'BigInt64Array', 'BigUint64Array', 'DataView'];
for (const name of TYPED) {
  const C = globalThis[name];
  const sample = name === 'ArrayBuffer' ? new C(1) : name === 'DataView' ? new C(new ArrayBuffer(1)) : new C(1);
  globalThis[name] = structuredClone(sample).constructor;
}

export async function loadDFData() {
  globalThis.Blob = NodeBlob;
  globalThis.File = NodeFile;
  globalThis.FileReader = FakeFileReader;
  FakeFileReader.failWith = null;
  globalThis.indexedDB = new IDBFactory();
  globalThis.IDBKeyRange = IDBKeyRange;
  try { localStorage.clear(); } catch (e) { /* stubbed in a test */ }
  delete window.DF_SUITE;
  vi.resetModules();
  await import('../../../shared/data/basics.js');
  await import('../../../shared/data/files.js');
  await import('../../../shared/data/overthoughts.js');
  await import('../../../shared/data/the-eye.js');
  await import('../../../shared/data/journal-move.js');
  await import('../../../shared/data/json-backup.js');
  await import('../../../shared/data/zip-format.js');
  await import('../../../shared/data/zip-backup.js');
  await import('../../../shared/data/zip-restore.js');
  await import('../../../shared/data/links.js');
  await import('../../../shared/data/df-data.js');
  return window.DFData;
}

// ---------- Plain IndexedDB, for setting up and checking ----------
export function rawOpen(name, version, upgrade) {
  return new Promise((ok, no) => {
    const r = version == null ? indexedDB.open(name) : indexedDB.open(name, version);
    if (upgrade) r.onupgradeneeded = () => upgrade(r.result, r.transaction);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  });
}
export function rawDone(tx) {
  return new Promise((ok, no) => { tx.oncomplete = () => ok(); tx.onabort = tx.onerror = () => no(tx.error); });
}
export function rawReq(r) {
  return new Promise((ok, no) => { r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
}
// rows: list of values (keyPath stores) or [key, value] pairs.
export async function rawPut(db, store, rows) {
  const tx = db.transaction(store, 'readwrite');
  const os = tx.objectStore(store);
  rows.forEach((r) => (os.keyPath == null ? os.put(r[1], r[0]) : os.put(r)));
  return rawDone(tx);
}
export async function rawAll(db, store) {
  const os = db.transaction(store).objectStore(store);
  const [keys, vals] = await Promise.all([rawReq(os.getAllKeys()), rawReq(os.getAll())]);
  return keys.map((k, i) => [k, vals[i]]);
}
// Makes a database with stores: { name: { keyPath?, autoIncrement?, indexes?: [[name, keyPath, opts]], rows } }.
export async function makeDb(name, stores, version = 1) {
  const db = await rawOpen(name, version, (d) => {
    for (const [s, def] of Object.entries(stores)) {
      const opts = {};
      if (def.keyPath !== undefined) opts.keyPath = def.keyPath;
      if (def.autoIncrement) opts.autoIncrement = true;
      const os = d.createObjectStore(s, opts);
      (def.indexes || []).forEach(([n, kp, o]) => os.createIndex(n, kp, o || {}));
    }
  });
  for (const [s, def] of Object.entries(stores)) if (def.rows && def.rows.length) await rawPut(db, s, def.rows);
  return db;
}
export async function dbList() {
  return (await indexedDB.databases()).map((d) => d.name).sort();
}

export const bytesOf = async (blob) => new Uint8Array(await blob.arrayBuffer());
export const textBytes = (s) => new Uint8Array(Buffer.from(s, 'utf8'));

// An independent CRC-32 (Node's zlib) to check the app's against.
export const crc32 = (bytes) => zlibCrc32(bytes);

// Makes Blobs of one type report `extra` more bytes than they hold, so a photo
// past 4 GB (or 200 MB) can be backed up without holding that much. Their
// bytes stay real. Returns the undo.
export function pretendBigger(type, extra) {
  const desc = Object.getOwnPropertyDescriptor(NodeBlob.prototype, 'size');
  Object.defineProperty(NodeBlob.prototype, 'size', {
    configurable: true,
    get() { const s = desc.get.call(this); return this.type === type ? s + extra : s; },
  });
  return () => Object.defineProperty(NodeBlob.prototype, 'size', desc);
}

// A rejection checked to be a real Error with this message (exact, or a
// RegExp): `.rejects.toThrow('…')` here also passes for a rejection with null.
export async function expectError(p, message) {
  let err;
  let threw = false;
  try { await p; } catch (e) { threw = true; err = e; }
  expect(threw, 'expected a rejection').toBe(true);
  expect(err).toBeInstanceOf(Error);
  if (message instanceof RegExp) expect(err.message).toMatch(message);
  else if (message !== undefined) expect(err.message).toBe(message);
  return err;
}
