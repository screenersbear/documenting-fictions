// shared/df-data.js: every helper that opens a database lets go of it again
// when it's done (all but Overthoughts' own, which is kept open on purpose),
// so a notebook in another tab can upgrade it.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IDBDatabase, IDBObjectStore } from 'fake-indexeddb';
import { loadDFData, makeDb, expectError, NodeBlob, NodeFile } from './_env.mjs';
import { backupZip } from './_zip.mjs';

let D;
let opened;
let closed;
beforeEach(async () => {
  D = await loadDFData();
  opened = [];
  closed = new Set();
  const realOpen = indexedDB.open.bind(indexedDB);
  indexedDB.open = (...a) => {
    const r = realOpen(...a);
    r.addEventListener('success', () => opened.push(r.result));
    return r;
  };
  const realClose = IDBDatabase.prototype.close;
  vi.spyOn(IDBDatabase.prototype, 'close').mockImplementation(function () { closed.add(this); return realClose.call(this); });
});
afterEach(() => { vi.restoreAllMocks(); });

const stillOpen = () => opened.filter((db) => !closed.has(db)).map((db) => db.name);
const seed = () => makeDb('nb', { s: { rows: [[1, { p: new NodeBlob(['x']), b: new Uint8Array(2).buffer }]] } });

describe('connections are let go of', () => {
  it('by exportDb and importDb', async () => {
    (await seed()).close();
    opened.length = 0;
    const f = await D.exportDb('nb');
    await D.importDb(f, 'nb');
    expect(opened.length).toBe(2);
    expect(stillOpen()).toEqual([]);
  });
  it('by importDb when the backup has none of its stores, and when a row breaks its write', async () => {
    (await seed()).close();
    opened.length = 0;
    const file = (stores) => new NodeFile([JSON.stringify({ database: 'nb', stores })], 'nb.json');
    await expectError(D.importDb(file({ other: { rows: [] } }), 'nb'), 'That file is a backup of a different notebook.');
    await expectError(D.importDb(file({ s: { rows: [[{}, 'an object is no key']] } }), 'nb'), "That wasn't saved.");
    expect(opened.length).toBe(2);
    expect(stillOpen()).toEqual([]);
  });
  it('by zipBackup (each database twice: counting and reading) and its scratch once done', async () => {
    (await seed()).close();
    opened.length = 0;
    const made = await D.zipBackup({ app: 'x', databases: ['nb'] });
    expect(opened.map((db) => db.name).filter((n) => n === 'nb').length).toBe(2);
    await made.done(0);
    expect(stillOpen()).toEqual([]);
  });
  it('by zipBackup when it gives up (a stored copy comes back short)', async () => {
    (await seed()).close();
    opened.length = 0;
    const real = IDBObjectStore.prototype.put;
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (v, k) {
      return real.call(this, this.transaction.db.name.startsWith('df-backup-scratch-') ? v.slice(1) : v, k);
    });
    await expectError(D.zipBackup({ app: 'x', databases: ['nb'] }), "The backup couldn't be put together. Try again.");
    expect(opened.map((db) => db.name.slice(0, 18))).toEqual(['nb', 'nb', 'df-backup-scratch-']);
    expect(stillOpen()).toEqual([]);
  });
  it('by restoreZip, even when a row will not go in', async () => {
    (await makeDb('nb', { s: { keyPath: 'id' } })).close();
    opened.length = 0;
    const ok = { format: 'df-backup', version: 1, kind: 'notebook', databases: { nb: { stores: { s: { rows: [[1, { id: 1 }]] } } } } };
    await D.restoreZip(backupZip(ok), { databases: ['nb'] });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const bad = { ...ok, databases: { nb: { stores: { s: { rows: [[1, { noId: 1 }]] } } } } };
    await expectError(D.restoreZip(backupZip(bad), { databases: ['nb'] }), "The backup didn't all go in. Restore it again to finish it.");
    expect(opened.length).toBe(2);
    expect(stillOpen()).toEqual([]);
  });
  it("by The Eye's helpers (Overthoughts' own stays open)", async () => {
    localStorage.setItem('dailies_state_v1', JSON.stringify({ shoots: [], journalEntries: [{ id: 'j1' }] }));
    await D.eyeBackupFile();
    await D.moveJournal();
    expect(stillOpen()).toEqual(['overthoughts']);
  });
  it('by the link helpers, when they work and when they fail', async () => {
    await D.saveLink({ id: 'a' }, { pages: [] });
    await D.getLink('a');
    await D.linkPictures('a');
    await D.linksWhere({ id: 'a' });
    await D.dropLinks(['a']);
    await expect(D.dropLinks([{}])).rejects.toMatchObject({ name: 'DataError' });
    expect(opened.length).toBe(6);
    expect(stillOpen()).toEqual([]);
  });
  it('by readBoardFile and boardFile, which open none', async () => {
    const f = await D.boardFile({ name: 'b' }, { pages: [{ bytes: new Uint8Array([1]).buffer }] });
    await D.readBoardFile(new NodeFile([await f.text()], 'b.json'));
    expect(opened).toEqual([]);
  });
});
