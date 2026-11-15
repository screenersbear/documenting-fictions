// Shared set-up for the tests of Back up's data files (not a test file
// itself): shared/data/backup-books.js, backup-json.js and backups.js, which
// build window.DFBackups over df-data.js (window.DFData, a stand-in here).
import { vi, expect } from 'vitest';
import { open, rows } from './fake-idb.mjs';

export const DBS = ['ref-notebook', 'contact-sheet', 'rounds', 'df-links', 'df-stickers', 'df-people'];
export const EYE_DB = 'starky-moodboards';
export const BOOK_KEYS = ['ref-notebook-book', 'contact-sheet-book', 'rounds-book'];
export const EYE = 'dailies_state_v1';
export const EYE_BAD = "The Eye's part of that file isn't right. Nothing was changed.";
export const NOT_A_BACKUP = "That file isn't a Documenting Fictions backup.";
export const OTHER = 'That file is a backup of a different notebook.';

// The three files, fresh (each runs once per import). `files` picks which.
const FILES = {
  'backup-books': () => import('../../../shared/data/backup-books.js'),
  'backup-json': () => import('../../../shared/data/backup-json.js'),
  backups: () => import('../../../shared/data/backups.js'),
};
export async function load(dfData, files = ['backup-books', 'backup-json', 'backups']) {
  vi.resetModules();
  delete window.DFBackups;
  if (dfData === undefined) delete window.DFData;
  else window.DFData = dfData;
  for (const f of files) await FILES[f]();
  return window.DFBackups;
}
// df-data.js as these files use it: an opener on fake-indexeddb, the rest stand-ins.
export function fakeDFData() {
  return {
    zipBackup: vi.fn(async () => ({ parts: ['zip'], size: 3 })),
    restoreZip: vi.fn(async () => ({ extra: {}, local: async () => null })),
    isZipFile: vi.fn(async (f) => /\.zip$/.test(f.name)),
    backupManifest: vi.fn(async () => ({ kind: 'suite', app: 'documenting-fictions' })),
    open: vi.fn(open),
    todayStr: vi.fn(() => '2026-11-12'),
  };
}

// vitest's rejects.toThrow also passes when a promise rejects with no error at all
// (null, false), so rejections are checked here for a real error (an Error, or
// IndexedDB's DOMException) and its message.
export async function rejectsWith(promise, message) {
  let err;
  try { await promise; } catch (e) { err = e; }
  expect(typeof err?.name).toBe('string');
  expect(typeof err?.message).toBe('string');
  if (message !== undefined) expect(() => { throw err; }).toThrow(message);
  return err;
}
export const lsKeys = () => Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).sort();
export const exists = async (name) => (await indexedDB.databases()).some((d) => d.name === name);
// A database already on the device: `stores` is { name: { keyPath, autoIncrement, rows: [[key, value]] } }.
export async function makeDb(name, version, stores) {
  const db = await open(name, version, (made) => {
    for (const [s, m] of Object.entries(stores)) made.createObjectStore(s, m.keyPath ? { keyPath: m.keyPath } : {});
  });
  for (const [s, m] of Object.entries(stores)) {
    if (!(m.rows || []).length) continue;
    const tx = db.transaction(s, 'readwrite');
    m.rows.forEach(([k, v]) => (m.keyPath ? tx.objectStore(s).put(v) : tx.objectStore(s).put(v, k)));
    await new Promise((ok, no) => { tx.oncomplete = ok; tx.onerror = () => no(tx.error); });
  }
  db.close();
}
// Everything in a database: its version, and each store's shape and rows.
export async function readDb(name) {
  const db = await open(name);
  const out = { version: db.version, stores: {} };
  for (const s of [...db.objectStoreNames]) {
    const os = db.transaction(s).objectStore(s);
    const indexes = [...os.indexNames].map((n) => { const ix = os.index(n); return { name: n, keyPath: ix.keyPath, unique: ix.unique, multiEntry: ix.multiEntry }; });
    out.stores[s] = { keyPath: os.keyPath, autoIncrement: os.autoIncrement, indexes, rows: await rows(db, s) };
  }
  db.close();
  return out;
}
export const fileOf = (data, name = 'backup.json') => new File([typeof data === 'string' ? data : JSON.stringify(data)], name, { type: 'application/json' });
export const suite = (notebooks) => ({ app: 'documenting-fictions', kind: 'suite-backup', version: 1, exportedAt: '2026-11-01T00:00:00.000Z', notebooks });
export const part = (database, stores, more = {}) => ({ app: database, database, version: 1, exportedAt: 'x', extra: {}, stores, ...more });
export const eyePart = (state, images) => ({ state, ...(images === undefined ? {} : { images }) });
// Every readwrite transaction on that database is cut short (an abort has no error object).
export function cutWritesTo(D, name) {
  D.open.mockImplementation(async (n, ...rest) => {
    const db = await open(n, ...rest);
    if (n === name) {
      const tx0 = db.transaction.bind(db);
      db.transaction = (stores, mode) => {
        const tx = tx0(stores, mode);
        if (mode === 'readwrite') queueMicrotask(() => tx.abort());
        return tx;
      };
    }
    return db;
  });
}
// A zip for D.restoreZip: what it holds for localStorage keys, and its
// extra. Its check runs the way df-data.js runs it.
export function zipHolding(D, local, extra = {}) {
  const read = async (k) => (k in local ? local[k] : null);
  const checkLocal = vi.fn(read);
  const rLocal = vi.fn(read);
  D.restoreZip.mockImplementation(async (files, opts) => {
    if (opts.check) await opts.check(checkLocal);
    return { manifest: {}, extra, counts: {}, local: rLocal };
  });
  return { checkLocal, rLocal };
}
