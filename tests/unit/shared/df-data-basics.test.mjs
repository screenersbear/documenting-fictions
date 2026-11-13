// shared/df-data.js: the plain IndexedDB helpers (open, rows, getOne, putMany,
// deleteOne) and the small ones (hasText, todayStr, uid, nowIso, sizeText,
// inSuite, notebookUrl).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadDFData, rawOpen, rawPut, rawAll, makeDb, dbList, expectError } from './_env.mjs';

let D;
beforeEach(async () => { D = await loadDFData(); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

// A db whose next transaction is aborted as soon as it's made (a browser
// giving up on it), to see the helpers' failure paths.
function abortNext(db) {
  const real = db.transaction.bind(db);
  db.transaction = (...a) => { const tx = real(...a); queueMicrotask(() => tx.abort()); db.transaction = real; return tx; };
  return db;
}

// A db whose next save goes straight to an abort carrying the error (no
// error event on the way, as when a disk fills while committing): the
// failed request's error is kept from reaching the transaction.
function abortWithError(db) {
  const real = db.transaction.bind(db);
  db.transaction = (...a) => {
    const tx = real(...a);
    const os = tx.objectStore.bind(tx);
    tx.objectStore = (n) => {
      const s = os(n);
      const put = s.put.bind(s);
      s.put = (...v) => { const r = put(...v); r.onerror = (e) => e.stopPropagation(); return r; };
      return s;
    };
    db.transaction = real;
    return tx;
  };
  return db;
}

describe('open', () => {
  it('makes a new database through the upgrade, with the old version and the upgrade transaction', async () => {
    const seen = [];
    const db = await D.open('fresh', 3, (d, old, tx) => { seen.push(old, tx.mode); d.createObjectStore('s'); });
    expect(seen).toEqual([0, 'versionchange']);
    expect(db.version).toBe(3);
    expect([...db.objectStoreNames]).toEqual(['s']);
    db.close();
  });
  it('opens an existing database as it is when no version is given, without upgrading', async () => {
    (await makeDb('have', { a: { keyPath: 'id' } }, 4)).close();
    const upgrade = vi.fn();
    const db = await D.open('have', undefined, upgrade);
    expect(db.version).toBe(4);
    expect(upgrade).not.toHaveBeenCalled();
    db.close();
  });
  it('passes the old version when upgrading an existing database', async () => {
    (await makeDb('old', { a: {} }, 2)).close();
    const olds = [];
    const db = await D.open('old', 5, (d, old) => olds.push(old));
    expect(olds).toEqual([2]);
    expect(db.version).toBe(5);
    db.close();
  });
  it('rejects with the browser error when asked for an older version', async () => {
    (await makeDb('newer', { a: {} }, 3)).close();
    await expect(D.open('newer', 1)).rejects.toMatchObject({ name: 'VersionError' });
  });
  it('closes its connection when another wants to upgrade it, so the upgrade goes ahead', async () => {
    const first = await D.open('shared', 1, (d) => d.createObjectStore('s'));
    const second = await D.open('shared', 2, (d) => d.createObjectStore('t'));
    expect(second.version).toBe(2);
    expect(() => first.transaction('s')).toThrow();
    second.close();
  });
  it('says to close the other tabs when an old connection blocks the upgrade', async () => {
    const stuck = await rawOpen('blocked', 1, (d) => d.createObjectStore('s'));
    await expectError(D.open('blocked', 2), "Close this app's other tabs and try again.");
    stuck.close();
  });
});

describe('rows', () => {
  it('lists every row with its key, in key order, for a store with a key path', async () => {
    const db = await makeDb('r', { s: { keyPath: 'id', rows: [{ id: 'b', n: 2 }, { id: 'a', n: 1 }] } });
    expect(await D.rows(db, 's')).toEqual([['a', { id: 'a', n: 1 }], ['b', { id: 'b', n: 2 }]]);
    db.close();
  });
  it('lists rows of a store without a key path with their own keys', async () => {
    const db = await makeDb('r', { s: { rows: [[2, 'two'], [1, 'one']] } });
    expect(await D.rows(db, 's')).toEqual([[1, 'one'], [2, 'two']]);
    db.close();
  });
  it('gives an empty list for an empty store', async () => {
    const db = await makeDb('r', { s: {} });
    expect(await D.rows(db, 's')).toEqual([]);
    db.close();
  });
  it('rejects when the store does not exist', async () => {
    const db = await makeDb('r', { s: {} });
    await expect(D.rows(db, 'nope')).rejects.toMatchObject({ name: 'NotFoundError' });
    db.close();
  });
  it('rejects with the request error when the read is aborted', async () => {
    const db = await makeDb('r', { s: { rows: [[1, 'x']] } });
    await expect(D.rows(abortNext(db), 's')).rejects.toMatchObject({ name: 'AbortError' });
    db.close();
  });
});

describe('getOne', () => {
  it('reads one value by key', async () => {
    const db = await makeDb('g', { s: { keyPath: 'id', rows: [{ id: 'a', v: 1 }] } });
    expect(await D.getOne(db, 's', 'a')).toEqual({ id: 'a', v: 1 });
    db.close();
  });
  it('gives undefined for a key that is not there', async () => {
    const db = await makeDb('g', { s: {} });
    expect(await D.getOne(db, 's', 'missing')).toBeUndefined();
    db.close();
  });
  it('rejects with the request error when the read is aborted', async () => {
    const db = await makeDb('g', { s: { rows: [[1, 'x']] } });
    await expect(D.getOne(abortNext(db), 's', 1)).rejects.toMatchObject({ name: 'AbortError' });
    db.close();
  });
});

describe('putMany', () => {
  it('stores values in a store with a key path', async () => {
    const db = await makeDb('p', { s: { keyPath: 'id' } });
    await expect(D.putMany(db, 's', [{ id: 1, a: 'x' }, { id: 2, a: 'y' }])).resolves.toBeUndefined();
    expect(await rawAll(db, 's')).toEqual([[1, { id: 1, a: 'x' }], [2, { id: 2, a: 'y' }]]);
    db.close();
  });
  it('stores [key, value] pairs in a store without a key path', async () => {
    const db = await makeDb('p', { s: {} });
    await D.putMany(db, 's', [['k1', 'one'], ['k2', { two: 2 }]]);
    expect(await rawAll(db, 's')).toEqual([['k1', 'one'], ['k2', { two: 2 }]]);
    db.close();
  });
  it('overwrites a row with the same key, and does nothing for an empty list', async () => {
    const db = await makeDb('p', { s: { keyPath: 'id', rows: [{ id: 1, a: 'old' }] } });
    await D.putMany(db, 's', [{ id: 1, a: 'new' }]);
    await D.putMany(db, 's', []);
    expect(await rawAll(db, 's')).toEqual([[1, { id: 1, a: 'new' }]]);
    db.close();
  });
  it("says it wasn't saved when a row breaks a unique index (the error reaches the save first), and keeps nothing", async () => {
    const db = await makeDb('p', { s: { keyPath: 'id', indexes: [['email', 'email', { unique: true }]] } });
    await expectError(D.putMany(db, 's', [{ id: 1, email: 'a' }, { id: 2, email: 'a' }]), "That wasn't saved.");
    expect(await rawAll(db, 's')).toEqual([]);
    db.close();
  });
  it("rejects with the browser's own error when the save is aborted with one", async () => {
    const db = await makeDb('p', { s: { keyPath: 'id', indexes: [['email', 'email', { unique: true }]] } });
    await expect(D.putMany(abortWithError(db), 's', [{ id: 1, email: 'a' }, { id: 2, email: 'a' }])).rejects.toMatchObject({ name: 'ConstraintError' });
    expect(await rawAll(db, 's')).toEqual([]);
    db.close();
  });
  it("says it wasn't saved when the save is aborted without an error", async () => {
    const db = await makeDb('p', { s: { keyPath: 'id' } });
    await expectError(D.putMany(abortNext(db), 's', [{ id: 1 }]), "That wasn't saved.");
    expect(await rawAll(db, 's')).toEqual([]);
    db.close();
  });
});

describe('deleteOne', () => {
  it('deletes one row and leaves the rest', async () => {
    const db = await makeDb('d', { s: { rows: [[1, 'a'], [2, 'b']] } });
    await expect(D.deleteOne(db, 's', 1)).resolves.toBeUndefined();
    expect(await rawAll(db, 's')).toEqual([[2, 'b']]);
    db.close();
  });
  it('is fine with a key that is not there', async () => {
    const db = await makeDb('d', { s: { rows: [[1, 'a']] } });
    await D.deleteOne(db, 's', 99);
    expect(await rawAll(db, 's')).toEqual([[1, 'a']]);
    db.close();
  });
  it('rejects when the store does not exist', async () => {
    const db = await makeDb('d', { s: {} });
    await expect(D.deleteOne(db, 'nope', 1)).rejects.toMatchObject({ name: 'NotFoundError' });
    db.close();
  });
});

describe('hasText', () => {
  it('is true for a string with something other than spaces in it', () => {
    expect(D.hasText('a')).toBe(true);
    expect(D.hasText('  word  ')).toBe(true);
  });
  it('is false for empty and blank strings', () => {
    expect(D.hasText('')).toBe(false);
    expect(D.hasText('   \n\t')).toBe(false);
  });
  it('is false for anything that is not a string', () => {
    [null, undefined, 0, 12, {}, ['a'], true].forEach((v) => expect(D.hasText(v)).toBe(false));
  });
});

describe('todayStr and nowIso', () => {
  it('gives the local date with the month and day padded', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 0, 5, 9, 0));
    expect(D.todayStr()).toBe('2026-01-05');
  });
  it('gives two-digit months and days as they are', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 12, 12, 0));
    expect(D.todayStr()).toBe('2026-11-12');
  });
  it('goes by local time just before and just after midnight, across a year', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2025, 11, 31, 23, 59, 59));
    expect(D.todayStr()).toBe('2025-12-31');
    vi.setSystemTime(new Date(2026, 0, 1, 0, 0, 0));
    expect(D.todayStr()).toBe('2026-01-01');
  });
  it('nowIso is the time now as an ISO string', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.UTC(2026, 1, 28, 23, 30, 5, 7));
    expect(D.nowIso()).toBe('2026-02-28T23:30:05.007Z');
  });
});

describe('uid', () => {
  it('is the time in base 36 then six random base-36 characters', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(1700000000000);
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
    expect(D.uid()).toBe(`${(1700000000000).toString(36)}${(0.123456789).toString(36).slice(2, 8)}`);
    expect(D.uid()).toBe('loyw3v284fzzzx');
  });
  it('differs from one call to the next', () => {
    const seen = new Set(Array.from({ length: 200 }, () => D.uid()));
    expect(seen.size).toBe(200);
  });
  it('is short when the random number is short', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(0);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(D.uid()).toBe('0i');
  });
});

describe('sizeText', () => {
  it('shows kilobytes, never less than 1 KB', () => {
    expect(D.sizeText(0)).toBe('1 KB');
    expect(D.sizeText(1)).toBe('1 KB');
    expect(D.sizeText(1499)).toBe('1 KB');
    expect(D.sizeText(1500)).toBe('2 KB');
    expect(D.sizeText(999499)).toBe('999 KB');
  });
  it('shows megabytes from a million bytes', () => {
    expect(D.sizeText(999999)).toBe('1000 KB');
    expect(D.sizeText(1e6)).toBe('1 MB');
    expect(D.sizeText(2.5e6)).toBe('3 MB');
    expect(D.sizeText(999e6)).toBe('999 MB');
  });
  it('shows gigabytes with one decimal from a billion bytes', () => {
    expect(D.sizeText(1e9 - 1)).toBe('1000 MB');
    expect(D.sizeText(1e9)).toBe('1.0 GB');
    expect(D.sizeText(1.26e9)).toBe('1.3 GB');
    expect(D.sizeText(5e12)).toBe('5000.0 GB');
  });
});

describe('inSuite and notebookUrl', () => {
  it('is not in the suite on its own', () => {
    expect(D.inSuite()).toBe(false);
    expect(D.notebookUrl('the-eye', { shoot: '1' })).toBeNull();
  });
  it('is in the suite when the suite says so', () => {
    window.DF_SUITE = 1;
    expect(D.inSuite()).toBe(true);
  });
  it('links to a sibling notebook folder, with or without parameters', () => {
    window.DF_SUITE = true;
    expect(D.notebookUrl('the-eye')).toBe('../the-eye/');
    expect(D.notebookUrl('ref', { board: 'b 1', page: 2 })).toBe('../ref/?board=b+1&page=2');
    expect(D.notebookUrl('ref', null)).toBe('../ref/');
  });
  it('treats a falsy flag as not in the suite', () => {
    window.DF_SUITE = 0;
    expect(D.inSuite()).toBe(false);
    expect(D.notebookUrl('ref')).toBeNull();
  });
});

describe('the loaded script', () => {
  it('sets window.DFData with every helper and nothing else', () => {
    expect(Object.keys(window.DFData).sort()).toEqual([
      'boardFile', 'backupSteps', 'deleteOne', 'dropLinks', 'dropReflections', 'exportDb', 'eyeBackupFile', 'eyeShootName', 'eyeState',
      'getLink', 'getOne', 'hasText', 'importDb', 'inSuite', 'isZipFile', 'journalMoved', 'linkId', 'linkPictures', 'linksWhere',
      'moveJournal', 'notebookUrl', 'nowIso', 'open', 'overthoughts', 'pickFile', 'pickFiles', 'pictureUrl', 'putMany', 'readBoardFile',
      'readEyeFile', 'reflectionId', 'reflections', 'restoreZip', 'rows', 'saveFile', 'saveLink', 'saveReflections', 'sizeText',
      'somethingToMove', 'todayStr', 'uid', 'zipBackup',
    ].sort());
  });
  it('opens no database just by loading', async () => {
    expect(await dbList()).toEqual([]);
  });
  it('makes raw helpers agree with it (sanity)', async () => {
    const db = await makeDb('x', { s: {} });
    await rawPut(db, 's', [[1, 'a']]);
    expect(await D.getOne(db, 's', 1)).toBe('a');
    db.close();
  });
});
