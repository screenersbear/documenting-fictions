// shared/df-data.js: a whole database as one JSON file and back (exportDb,
// importDb, with photos and other non-JSON values packed into the JSON).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadDFData, makeDb, rawAll, rawOpen, FakeFileReader, NodeBlob, NodeFile, expectError } from './_env.mjs';

let D;
const NOW = new Date(2026, 10, 12, 10, 0, 0).getTime();
beforeEach(async () => {
  D = await loadDFData();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

const notebook = async () => makeDb('nb', {
  shots: { keyPath: 'id', autoIncrement: true, indexes: [['byDay', 'day', { unique: false }], ['tags', 'tags', { multiEntry: true }], ['code', 'code', { unique: true }]], rows: [{ id: 1, day: '2026-01-01', tags: ['a'], code: 'x' }] },
  kv: { rows: [['theme', 'dark'], [3, { n: 3 }]] },
});

describe('exportDb', () => {
  it('writes every store with its shape and rows, named for the app and the day', async () => {
    (await notebook()).close();
    const f = await D.exportDb('nb', { app: 'ref', extra: { theme: 'dark' } });
    expect(f.name).toBe('ref-2026-11-12.json');
    expect(f.type).toBe('application/json');
    expect(JSON.parse(await f.text())).toEqual({
      app: 'ref', database: 'nb', version: 1, exportedAt: new Date(NOW).toISOString(), extra: { theme: 'dark' },
      stores: {
        kv: { meta: { keyPath: null, autoIncrement: false, indexes: [] }, rows: [[3, { n: 3 }], ['theme', 'dark']] },
        shots: {
          meta: { keyPath: 'id', autoIncrement: true, indexes: [
            { name: 'byDay', keyPath: 'day', unique: false, multiEntry: false },
            { name: 'code', keyPath: 'code', unique: true, multiEntry: false },
            { name: 'tags', keyPath: 'tags', unique: false, multiEntry: true },
          ] },
          rows: [[1, { id: 1, day: '2026-01-01', tags: ['a'], code: 'x' }]],
        },
      },
    });
  });
  it('names the file after the database without an app, and takes a filename given', async () => {
    (await notebook()).close();
    const a = await D.exportDb('nb');
    expect(a.name).toBe('nb-2026-11-12.json');
    const data = JSON.parse(await a.text());
    expect(data.app).toBe('nb');
    expect(data.extra).toEqual({});
    expect((await D.exportDb('nb', { filename: 'mine.json' })).name).toBe('mine.json');
  });
  it('writes an empty database as no stores', async () => {
    (await rawOpen('empty', 2)).close();
    const data = JSON.parse(await (await D.exportDb('empty')).text());
    expect(data.version).toBe(2);
    expect(data.stores).toEqual({});
  });
  it('packs photos, bytes, typed arrays and dates so they come back as they were', async () => {
    const photo = new NodeFile(['jpegbytes'], 'p.jpg', { type: 'image/jpeg', lastModified: 1234 });
    const plain = new NodeBlob(['raw']);
    const value = {
      photo, plain, buf: new Uint8Array([1, 2, 3]).buffer, view: new Float32Array([1.5, -2]), when: new Date(Date.UTC(2020, 1, 2)),
      list: [new Uint8Array([9]), 'text', 1, null, true], nested: { deep: { n: 0 } }, nothing: null,
    };
    (await makeDb('nb', { s: { rows: [[new Date(Date.UTC(2021, 0, 1)), value]] } })).close();
    const f = await D.exportDb('nb');
    const packed = JSON.parse(await f.text()).stores.s.rows[0];
    expect(packed[0]).toEqual({ __date: '2021-01-01T00:00:00.000Z' });
    expect(packed[1].photo).toEqual({ __blob: 'data:image/jpeg;base64,anBlZ2J5dGVz', type: 'image/jpeg', name: 'p.jpg', lastModified: 1234 });
    expect(packed[1].plain).toEqual({ __blob: 'data:application/octet-stream;base64,cmF3', type: '' });
    expect(packed[1].buf).toEqual({ __buf: 'data:application/octet-stream;base64,AQID' });
    expect(packed[1].view).toEqual({ __view: 'Float32Array', __buf: expect.stringMatching(/^data:application\/octet-stream;base64,/) });
    expect(packed[1].list[0]).toEqual({ __view: 'Uint8Array', __buf: 'data:application/octet-stream;base64,CQ==' });
    expect(packed[1].list.slice(1)).toEqual(['text', 1, null, true]);

    indexedDB.deleteDatabase('nb');
    (await makeDb('nb', { s: {} })).close();
    await D.importDb(f, 'nb');
    const db = await rawOpen('nb');
    const [[k, v]] = await rawAll(db, 's');
    db.close();
    expect(k).toEqual(new Date(Date.UTC(2021, 0, 1)));
    expect(v.photo).toBeInstanceOf(NodeFile);
    expect([v.photo.name, v.photo.type, v.photo.lastModified, await v.photo.text()]).toEqual(['p.jpg', 'image/jpeg', 1234, 'jpegbytes']);
    expect(v.plain).toBeInstanceOf(NodeBlob);
    expect(v.plain).not.toBeInstanceOf(NodeFile);
    expect([v.plain.type, await v.plain.text()]).toEqual(['application/octet-stream', 'raw']);
    expect(v.buf).toBeInstanceOf(ArrayBuffer);
    expect([...new Uint8Array(v.buf)]).toEqual([1, 2, 3]);
    expect(v.view).toBeInstanceOf(Float32Array);
    expect([...v.view]).toEqual([1.5, -2]);
    expect(v.when).toEqual(new Date(Date.UTC(2020, 1, 2)));
    expect(v.list[0]).toBeInstanceOf(Uint8Array);
    expect([...v.list[0]]).toEqual([9]);
    expect(v.list.slice(1)).toEqual(['text', 1, null, true]);
    expect(v.nested).toEqual({ deep: { n: 0 } });
    expect(v.nothing).toBeNull();
  });
  it('rejects when a photo cannot be read', async () => {
    (await makeDb('nb', { s: { rows: [[1, new NodeBlob(['x'])]] } })).close();
    FakeFileReader.failWith = new Error('read failed');
    await expectError(D.exportDb('nb'), 'read failed');
  });
});

describe('importDb', () => {
  const backup = (o) => new NodeFile([JSON.stringify({ app: 'ref', database: 'nb', stores: {}, ...o })], 'b.json');
  it('replaces each store with the rows in the file and says how many went in', async () => {
    (await notebook()).close();
    const f = backup({ extra: { theme: 'light' }, stores: {
      shots: { rows: [[5, { id: 5, day: 'd', tags: [], code: 'y' }], [6, { id: 6, day: 'e', tags: [], code: 'z' }]] },
      kv: { rows: [['k', 'v']] },
      gone: { rows: [['x', 1]] },
    } });
    expect(await D.importDb(f, 'nb', { app: 'ref' })).toEqual({ extra: { theme: 'light' }, counts: { shots: 2, kv: 1 } });
    const db = await rawOpen('nb');
    expect((await rawAll(db, 'shots')).map(([k]) => k)).toEqual([5, 6]);
    expect(await rawAll(db, 'kv')).toEqual([['k', 'v']]);
    expect([...db.objectStoreNames]).not.toContain('gone');
    db.close();
  });
  it('adds over what is there when not replacing (the file wins on the same key)', async () => {
    (await notebook()).close();
    const f = backup({ stores: { kv: { rows: [['theme', 'light'], ['new', 1]] } } });
    expect(await D.importDb(f, 'nb', { replace: false })).toEqual({ extra: {}, counts: { kv: 2 } });
    const db = await rawOpen('nb');
    expect(await rawAll(db, 'kv')).toEqual([[3, { n: 3 }], ['new', 1], ['theme', 'light']]);
    expect((await rawAll(db, 'shots')).length).toBe(1);
    db.close();
  });
  it('takes a file with no rows at all', async () => {
    (await notebook()).close();
    expect(await D.importDb(backup({ stores: { kv: { rows: [] } } }), 'nb')).toEqual({ extra: {}, counts: { kv: 0 } });
    const db = await rawOpen('nb');
    expect(await rawAll(db, 'kv')).toEqual([]);
    db.close();
  });
  it("says a file that isn't JSON isn't a notebook backup", async () => {
    await expectError(D.importDb(new NodeFile(['<html>'], 'x'), 'nb'), "That file isn't a notebook backup.");
  });
  it('says a backup of another notebook is one', async () => {
    const msg = 'That file is a backup of a different notebook.';
    await expectError(D.importDb(new NodeFile(['null'], 'x'), 'nb'), msg);
    await expectError(D.importDb(backup({ stores: undefined }), 'nb'), msg);
    await expectError(D.importDb(backup({ app: 'the-eye' }), 'nb', { app: 'ref' }), msg);
    await expectError(D.importDb(backup({ database: 'other' }), 'nb'), msg);
  });
  it('does not check the app when none is asked for', async () => {
    (await notebook()).close();
    await expect(D.importDb(backup({ app: 'anything', stores: { kv: { rows: [] } } }), 'nb')).resolves.toEqual({ extra: {}, counts: { kv: 0 } });
  });
  it('rejects a backup that has none of the database\'s stores, in its own words, changing nothing', async () => {
    (await notebook()).close();
    await expectError(D.importDb(backup({ stores: { other: { rows: [] } } }), 'nb'), 'That file is a backup of a different notebook.');
    const db = await rawOpen('nb');
    expect(await rawAll(db, 'kv')).toEqual([[3, { n: 3 }], ['theme', 'dark']]);
    db.close();
  });
  it('rejects a row a store cannot take at all, writing nothing: not the clear, not the rows before it', async () => {
    const nb = await notebook();
    const before = { shots: await rawAll(nb, 'shots'), kv: await rawAll(nb, 'kv') };
    nb.close();
    expect(before.shots.length).toBe(1);
    const rows = [[5, { id: 5, day: 'a', tags: [], code: 'p' }], [6, { id: 'no' }], [7, 'not an object, so it has no id']];
    await expectError(D.importDb(backup({ stores: { shots: { rows }, kv: { rows: [['k', 'v']] } } }), 'nb'), "That wasn't saved.");
    const db = await rawOpen('nb');
    expect({ shots: await rawAll(db, 'shots'), kv: await rawAll(db, 'kv') }).toEqual(before);
    db.close();
  });
  it('round-trips an export, keys of stores without a key path included', async () => {
    (await notebook()).close();
    const f = await D.exportDb('nb', { app: 'ref' });
    const db = await rawOpen('nb');
    const tx = db.transaction(['kv', 'shots'], 'readwrite');
    tx.objectStore('kv').clear(); tx.objectStore('kv').put('junk', 'junk'); tx.objectStore('shots').clear();
    await new Promise((r) => { tx.oncomplete = r; });
    db.close();
    expect(await D.importDb(f, 'nb', { app: 'ref' })).toEqual({ extra: {}, counts: { kv: 2, shots: 1 } });
    const back = await rawOpen('nb');
    expect(await rawAll(back, 'kv')).toEqual([[3, { n: 3 }], ['theme', 'dark']]);
    expect(await rawAll(back, 'shots')).toEqual([[1, { id: 1, day: '2026-01-01', tags: ['a'], code: 'x' }]]);
    back.close();
  });
  it('brings back a photo without its type as the type the data says, and a missing date as now', async () => {
    (await makeDb('nb', { s: {} })).close();
    const f = backup({ stores: { s: { rows: [['a', { __blob: 'data:image/png;base64,AA==', name: 'n.png' }], ['b', { __blob: 'data:image/gif;base64,AA==' }], ['c', { __buf: 'data:;base64,AQ==', __view: 'NoSuchArray' }], ['d', { __blob: 1, __buf: 2, __date: 3 }]] } } });
    await D.importDb(f, 'nb');
    const db = await rawOpen('nb');
    const v = Object.fromEntries(await rawAll(db, 's'));
    db.close();
    expect([v.a.name, v.a.type, v.a.lastModified]).toEqual(['n.png', 'image/png', NOW]);
    expect(v.b.type).toBe('image/gif');
    expect(v.c).toBeInstanceOf(ArrayBuffer);
    expect([...new Uint8Array(v.c)]).toEqual([1]);
    expect(v.d).toEqual({ __blob: 1, __buf: 2, __date: 3 });
  });
});
