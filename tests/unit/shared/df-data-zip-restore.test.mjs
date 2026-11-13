// shared/df-data.js: putting a zip backup back (restoreZip): opening and
// checking it (one zip or all its parts, Contact Sheet's first zips too),
// reading the zip from its end (zip64, comments, squeezed files), and
// swapping each database for its part of the backup.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { loadDFData, makeDb, rawAll, rawOpen, dbList, expectError, NodeBlob, NodeFile } from './_env.mjs';
import { makeZip, backupZip, deflateRaw } from './_zip.mjs';

let D;
const NOW = new Date(2026, 10, 12, 10, 0, 0).getTime();
beforeEach(async () => {
  D = await loadDFData();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

const LONG = 'y'.repeat(70000);
const BAD = "That file isn't a notebook backup.";
const OTHER = 'That file is a backup of a different notebook.';
const newDevice = () => { globalThis.indexedDB = new IDBFactory(); };
const all = async (name, store) => { const db = await rawOpen(name); try { return await rawAll(db, store); } finally { db.close(); } };
const manifest = (databases, o = {}) => ({ format: 'df-backup', version: 1, app: 'x', kind: 'notebook', exportedAt: 'then', extra: {}, databases, local: {}, ...o });
const store = (rows, meta = { keyPath: null, autoIncrement: false, indexes: [] }) => ({ meta, rows });

async function seedNotebook() {
  (await makeDb('nb', {
    shots: { keyPath: 'id', indexes: [['day', 'day'], ['tags', 'tags', { multiEntry: true }], ['code', 'code', { unique: true }]], rows: [
      { id: 'a', day: '1', tags: ['t'], code: 'c1', photo: new NodeFile(['photo-bytes'], 'p.jpg', { type: 'image/jpeg', lastModified: 77 }), thumb: new NodeBlob(['tb'], { type: 'image/png' }), when: new Date(Date.UTC(2020, 0, 2)) },
      { id: 'b', day: '2', tags: [], code: 'c2', bytes: new Uint8Array([1, 2, 3]).buffer, view: new Int16Array([-1, 2]), long: LONG, list: [1, 'two', null, { deep: [true] }] },
    ] },
    kv: { rows: [['theme', 'dark'], [new Date(Date.UTC(2021, 0, 1)), { n: 1 }]] },
    auto: { keyPath: 'k', autoIncrement: true, rows: [{ v: 'first' }, { v: 'second' }] },
  }, 3)).close();
}

async function expectNotebook() {
  const shots = Object.fromEntries(await all('nb', 'shots'));
  const a = shots.a;
  expect(a.photo).toBeInstanceOf(NodeFile);
  expect([a.photo.name, a.photo.type, a.photo.lastModified, await a.photo.text()]).toEqual(['p.jpg', 'image/jpeg', 77, 'photo-bytes']);
  expect(a.thumb).toBeInstanceOf(NodeBlob);
  expect(a.thumb).not.toBeInstanceOf(NodeFile);
  expect([a.thumb.type, await a.thumb.text()]).toEqual(['image/png', 'tb']);
  expect(a.when).toEqual(new Date(Date.UTC(2020, 0, 2)));
  const b = shots.b;
  expect(b.bytes).toBeInstanceOf(ArrayBuffer);
  expect([...new Uint8Array(b.bytes)]).toEqual([1, 2, 3]);
  expect(b.view).toBeInstanceOf(Int16Array);
  expect([...b.view]).toEqual([-1, 2]);
  expect(b.long).toBe(LONG);
  expect(b.list).toEqual([1, 'two', null, { deep: [true] }]);
  expect(await all('nb', 'kv')).toEqual([[new Date(Date.UTC(2021, 0, 1)), { n: 1 }], ['theme', 'dark']]);
  expect(await all('nb', 'auto')).toEqual([[1, { v: 'first', k: 1 }], [2, { v: 'second', k: 2 }]]);
}

describe('restoreZip: a whole backup back', () => {
  it('puts a backup back on a new device: databases as they were, photos and all', async () => {
    await seedNotebook();
    localStorage.setItem('short', 's');
    localStorage.setItem('long', LONG);
    const made = await D.zipBackup({ app: 'ref', databases: ['nb'], local: ['short', 'long'], extra: { e: 1 } });
    newDevice();
    const progress = vi.fn();
    const got = await D.restoreZip(made.parts[0], { databases: ['nb', 'not-in-it'], onProgress: progress });
    expect(got.counts).toEqual({ nb: { auto: 2, kv: 2, shots: 2 } });
    expect(got.extra).toEqual({ e: 1 });
    expect(got.manifest.app).toBe('ref');
    expect(await got.local('short')).toBe('s');
    expect(await got.local('long')).toBe(LONG);
    expect(await got.local('absent')).toBeNull();
    expect(progress.mock.calls.map(([p]) => p)).toEqual([1, 2, 3, 4, 5, 6].map((n) => n / 6));
    const db = await rawOpen('nb');
    expect(db.version).toBe(3);
    const shots = db.transaction('shots').objectStore('shots');
    expect(shots.keyPath).toBe('id');
    expect([...shots.indexNames]).toEqual(['code', 'day', 'tags']);
    expect([shots.index('code').unique, shots.index('tags').multiEntry, shots.index('day').unique, shots.index('day').multiEntry]).toEqual([true, true, false, false]);
    const auto = db.transaction('auto').objectStore('auto');
    expect([auto.keyPath, auto.autoIncrement]).toEqual(['k', true]);
    const kv = db.transaction('kv').objectStore('kv');
    expect([kv.keyPath, kv.autoIncrement]).toEqual([null, false]);
    db.close();
    await expectNotebook();
    expect(await dbList()).toEqual(['nb']);
  });
  it('swaps a database on this device for the backup: rows put back, rows it lacks taken out, other stores left', async () => {
    await seedNotebook();
    const made = await D.zipBackup({ app: 'ref', databases: ['nb'] });
    const db = await rawOpen('nb');
    const tx = db.transaction(['shots', 'kv', 'auto'], 'readwrite');
    tx.objectStore('shots').put({ id: 'a', day: 'changed', tags: [], code: 'zz' });
    tx.objectStore('shots').put({ id: 'new', day: 'n', tags: [], code: 'n' });
    tx.objectStore('kv').put('x', 'added');
    tx.objectStore('auto').clear();
    await new Promise((r) => { tx.oncomplete = r; });
    db.close();
    (await rawOpen('nb', 4, (d) => d.createObjectStore('later').put('kept', 1))).close();
    const got = await D.restoreZip([made.parts[0]], { databases: ['nb'] });
    expect(got.counts).toEqual({ nb: { auto: 2, kv: 2, shots: 2 } });
    await expectNotebook();
    expect((await all('nb', 'shots')).map(([k]) => k)).toEqual(['a', 'b']);
    expect(await all('nb', 'later')).toEqual([[1, 'kept']]);
    expect((await rawOpen('nb')).version).toBe(4);
  });
  it('restores a backup made of several files, picked in any order', async () => {
    (await makeDb('nb', { s: { rows: [[1, [60, 40, 1, 150].map((n) => new Uint8Array(n).fill(n).buffer)]] } })).close();
    const made = await D.zipBackup({ app: 'x', databases: ['nb'], partSize: 100 });
    expect(made.parts.length).toBe(3);
    newDevice();
    await D.restoreZip([made.parts[2], made.parts[0], made.parts[1]], { databases: ['nb'] });
    const [[, list]] = await all('nb', 's');
    expect(list.map((b) => [b.byteLength, new Uint8Array(b)[0]])).toEqual([[60, 60], [40, 40], [1, 1], [150, 150]]);
  });
  it('restores a big photo copied out a few MB at a time', async () => {
    const big = new Uint8Array(8 * 1024 * 1024);
    for (let i = 0; i < big.length; i += 1000) big[i] = (i / 1000) & 0xff;
    (await makeDb('nb', { s: { rows: [[1, new NodeFile([big], 'big.heic', { type: 'image/heic', lastModified: 0 })], [2, new NodeBlob([big])]] } })).close();
    const made = await D.zipBackup({ app: 'x', databases: ['nb'] });
    newDevice();
    const sliced = vi.spyOn(NodeBlob.prototype, 'slice');
    await D.restoreZip(made.parts[0], { databases: ['nb'] });
    const [[, f], [, b]] = await all('nb', 's');
    expect(f).toBeInstanceOf(NodeFile);
    expect([f.name, f.type, f.lastModified]).toEqual(['big.heic', 'image/heic', NOW]);
    expect(b).not.toBeInstanceOf(NodeFile);
    expect(b.type).toBe('');
    expect(new Uint8Array(await f.arrayBuffer())).toEqual(big);
    expect(new Uint8Array(await b.arrayBuffer())).toEqual(big);
    const chunks = sliced.mock.calls.filter(([a, e]) => e - a === 4 * 1024 * 1024).map(([a]) => a);
    expect(chunks).toEqual([0, 4194304, 0, 4194304]); // and none past the end
  }, 30000);
  it('tells how far it has got counting only the rows there are', async () => {
    const progress = vi.fn();
    await D.restoreZip(backupZip(manifest({ nb: { stores: { s: {}, t: { rows: [[1, 'a'], [2, 'b']] } } } })), { databases: ['nb'], onProgress: progress });
    expect(progress.mock.calls).toEqual([[0.5], [1]]);
  });
  it('restores nothing (no rows) from a backup of empty stores, telling how far as done', async () => {
    (await makeDb('nb', { s: {} })).close();
    const made = await D.zipBackup({ app: 'x', databases: ['nb'] });
    const progress = vi.fn();
    expect((await D.restoreZip(made.parts[0], { databases: ['nb'], onProgress: progress })).counts).toEqual({ nb: { s: 0 } });
    expect(progress).not.toHaveBeenCalled();
  });
});

describe('restoreZip: which backup it is', () => {
  const zipOf = (m, files) => backupZip(m, files);
  it("says a backup without the notebook's database is of a different notebook", async () => {
    await expectError(D.restoreZip(zipOf(manifest({ other: { stores: {} } })), { databases: ['nb'] }), OTHER);
    await expectError(D.restoreZip(zipOf(manifest({ nb: { stores: {} } }))), OTHER);
  });
  it('checks the kind when asked: one notebook vs all four', async () => {
    const notebook = zipOf(manifest({ nb: { stores: {} } }));
    await expectError(D.restoreZip(notebook, { databases: ['nb'], kind: 'suite' }), "That file isn't a backup of all four. A single notebook's backup goes back in from that notebook's options.");
    await expectError(D.restoreZip(zipOf(manifest({ nb: { stores: {} } }, { kind: 'suite' })), { databases: ['nb'], kind: 'notebook' }), OTHER);
  });
  it('takes a backup of the right kind even when none of its databases are wanted', async () => {
    const got = await D.restoreZip(zipOf(manifest({ a: { stores: {} } }, { kind: 'suite', extra: undefined })), { databases: ['nb'], kind: 'suite' });
    expect(got.counts).toEqual({});
    expect(got.extra).toEqual({});
    expect(await dbList()).toEqual([]);
  });
  it('lets the caller look at its localStorage first and refuse it, changing nothing', async () => {
    (await makeDb('nb', { s: { rows: [[1, 'mine']] } })).close();
    const m = manifest({ nb: { stores: { s: store([[2, 'theirs']]) } } }, { local: { who: 'them', n: 5, f: { __file: 'files/w', as: 'text' } } });
    const seen = [];
    const check = async (local) => {
      seen.push(await local('who'), await local('n'), await local('f'), await local('none'));
      throw new Error('Not this one.');
    };
    await expectError(D.restoreZip(zipOf(m, { 'files/w': 'words' }), { databases: ['nb'], check }), 'Not this one.');
    expect(seen).toEqual(['them', 5, 'words', null]);
    expect(await all('nb', 's')).toEqual([[1, 'mine']]);
  });
  it('gives no localStorage for a backup without any', async () => {
    const got = await D.restoreZip(zipOf(manifest({ nb: { stores: {} } }, { local: undefined })), { databases: ['nb'] });
    expect(await got.local('k')).toBeNull();
  });
  it("reads Contact Sheet's first zips (one database, its own format)", async () => {
    const old = { format: 'contact-sheet-backup', database: 'contact-sheet', version: 2, exportedAt: 'once', stores: { sheets: store([['s1', { n: 1 }]]) } };
    const got = await D.restoreZip(zipOf(old), { databases: ['contact-sheet'], kind: 'notebook' });
    expect(got.manifest).toEqual({ format: 'df-backup', version: 1, app: 'contact-sheet', kind: 'notebook', exportedAt: 'once', extra: {}, databases: { 'contact-sheet': { version: 2, stores: old.stores } }, local: {} });
    expect(got.counts).toEqual({ 'contact-sheet': { sheets: 1 } });
    expect((await rawOpen('contact-sheet')).version).toBe(2);
    const named = await D.restoreZip(zipOf({ ...old, app: 'cs', extra: { z: 1 } }), { databases: ['contact-sheet'] });
    expect([named.manifest.app, named.extra]).toEqual(['cs', { z: 1 }]);
  });
  it("doesn't take Contact Sheet's format without its database or stores", async () => {
    await expectError(D.restoreZip(zipOf({ format: 'contact-sheet-backup', stores: {} }), { databases: ['contact-sheet'] }), BAD);
    await expectError(D.restoreZip(zipOf({ format: 'contact-sheet-backup', database: 'contact-sheet' }), { databases: ['contact-sheet'] }), BAD);
  });
  it("says a backup from newer notebooks needs this app updated", async () => {
    await expectError(D.restoreZip(zipOf(manifest({ nb: { stores: {} } }, { version: 2 })), { databases: ['nb'] }), 'That backup was made by a newer version of the notebooks. Update this app, then try again.');
    await expect(D.restoreZip(zipOf(manifest({ nb: { stores: {} } }, { version: undefined })), { databases: ['nb'] })).resolves.toBeTruthy();
  });
  it("says a file that isn't one of the notebooks' zips isn't a backup", async () => {
    const cases = [
      new NodeFile(['{"app":"ref"}'], 'old.json'),
      new NodeBlob([]),
      makeZip([{ name: 'other.txt', data: 'hi' }]),
      makeZip([{ name: 'backup.json', data: '{not json' }]),
      backupZip(null),
      backupZip({ format: 'something-else', databases: {} }),
      backupZip({ format: 'df-backup' }),
      makeZip([{ name: 'part.json', data: JSON.stringify({ format: 'df-backup-part', id: 'i', part: 1, of: 1 }) }]),
      makeZip([{ name: 'part.json', data: 'broken' }]),
    ];
    for (const [i, f] of cases.entries()) {
      const e = await expectError(D.restoreZip(f, { databases: ['nb'] }), BAD);
      expect(e.message, `case ${i}`).toBe(BAD);
    }
    await expectError(D.restoreZip([], { databases: ['nb'] }), BAD);
  });
  it('refuses the lot when one of the files picked is not a zip', async () => {
    const good = zipOf(manifest({ nb: { stores: { s: store([[1, 'x']]) } } }));
    await expectError(D.restoreZip([good, new NodeFile(['not a zip'], 'notes.txt')], { databases: ['nb'] }), BAD);
    expect(await dbList()).toEqual([]);
  });
  it("converts only Contact Sheet's format, not a backup that happens to name a database", async () => {
    const m = manifest({ a: { stores: {} } }, { kind: 'suite', database: 'contact-sheet', stores: { s: {} } });
    const got = await D.restoreZip(zipOf(m), { databases: ['a'], kind: 'suite' });
    expect(got.manifest).toEqual(m);
  });
  it('says what is missing when a file it names is not in it, changing nothing', async () => {
    (await makeDb('nb', { s: { rows: [[1, 'mine']] } })).close();
    const m = manifest({ nb: { stores: { s: store([[1, { p: { __file: 'files/000000', as: 'blob' } }]]) } } });
    await expectError(D.restoreZip(zipOf(m), { databases: ['nb'] }), 'Part of that backup is missing, so nothing was changed.');
    const inLocal = manifest({ nb: { stores: {} } }, { local: { k: [{ __file: 'files/9', as: 'text' }] } });
    await expectError(D.restoreZip(zipOf(inLocal), { databases: ['nb'] }), 'Part of that backup is missing, so nothing was changed.');
    expect(await all('nb', 's')).toEqual([[1, 'mine']]);
  });
});

describe('restoreZip: a backup in several files', () => {
  async function threeParts() {
    (await makeDb('nb', { s: { rows: [[1, [60, 60, 60].map((n) => new Uint8Array(n).buffer)]] } })).close();
    return (await D.zipBackup({ app: 'x', databases: ['nb'], partSize: 100 })).parts;
  }
  it('says to pick them all when some are missing', async () => {
    const [p1, p2, p3] = await threeParts();
    await expectError(D.restoreZip([p1, p3], { databases: ['nb'] }), 'That backup is in 3 files, and 2 of them were picked. Pick all 3 together.');
    await expectError(D.restoreZip(p1, { databases: ['nb'] }), 'That backup is in 3 files, and 1 of them was picked. Pick all 3 together.');
    await expect(D.restoreZip([p2, p3, p1], { databases: ['nb'] })).resolves.toBeTruthy();
  });
  it('says the first one is missing when only later ones are picked', async () => {
    const [, p2, p3] = await threeParts();
    await expectError(D.restoreZip([p2, p3], { databases: ['nb'] }), "That backup is in 3 files, and the first one wasn't picked. Pick all 3 together.");
  });
  it("doesn't count files from another backup, or ones that aren't parts", async () => {
    const [p1, p2] = await threeParts();
    const other = await threeParts();
    await expectError(D.restoreZip([p1, p2, other[2], makeZip([{ name: 'x', data: 'y' }]), makeZip([{ name: 'part.json', data: '?' }])], { databases: ['nb'] }), 'That backup is in 3 files, and 2 of them were picked. Pick all 3 together.');
  });
  it("needs only its parts when the first file's own part.json is missing", async () => {
    const files = { 'files/a': 'A', 'files/b': 'B' };
    const m = manifest({ nb: { stores: { s: store([[1, { __file: 'files/a', as: 'text' }], [2, { __file: 'files/b', as: 'text' }]]) } } }, { parts: { id: 'P', of: 2 } });
    const head = backupZip(m, files);
    const part = (n, name) => makeZip([{ name: 'part.json', data: JSON.stringify({ id: 'P', part: n, of: 2 }) }, { name, data: files[name] }]);
    const got = await D.restoreZip([head, part(1, 'files/a'), part(2, 'files/b')], { databases: ['nb'] });
    expect(got.counts).toEqual({ nb: { s: 2 } });
    expect(await all('nb', 's')).toEqual([[1, 'A'], [2, 'B']]);
    await expectError(D.restoreZip([backupZip(m, { 'files/a': 'A' }), part(1, 'files/b')], { databases: ['nb'] }), 'That backup is in 2 files, and 1 of them was picked. Pick all 2 together.');
  });
});

describe('restoreZip: reading the zip', () => {
  const m1 = (file, as = 'text') => manifest({ nb: { stores: { s: store([[1, { __file: file, as }]]) } } });
  const restoreText = async (zip) => { await D.restoreZip(zip, { databases: ['nb'] }); return (await all('nb', 's'))[0][1]; };

  it('reads a zip64 zip: end record, locator, and every size and place in the extras', async () => {
    const zip = makeZip([
      { name: 'backup.json', data: JSON.stringify(m1('files/a')), wide: { size: true, packed: true, at: true }, otherExtra: true, note: 'first comment' },
      { name: 'files/a', data: 'zip64 text', wide: { at: true }, note: 'a file comment' },
    ], { zip64End: 'all' });
    expect(await restoreText(zip)).toBe('zip64 text');
  });
  it('reads sizes in the extra in their order when only some are there', async () => {
    const zip = makeZip([
      { name: 'backup.json', data: JSON.stringify(m1('files/a')), wide: { size: true, at: true } },
      { name: 'files/a', data: 'packed only', wide: { packed: true } },
    ], { zip64End: 'count' });
    expect(await restoreText(zip)).toBe('packed only');
  });
  it('goes to the zip64 end record for any one of the end fields marked', async () => {
    for (const mark of ['count', 'size', 'at']) {
      const zip = makeZip([{ name: 'backup.json', data: JSON.stringify(m1('files/a')) }, { name: 'files/a', data: `marked ${mark}` }], { zip64End: mark });
      expect(await restoreText(zip)).toBe(`marked ${mark}`);
    }
  });
  it('skips the extra field of a local header to reach the data', async () => {
    const zip = makeZip([
      { name: 'backup.json', data: JSON.stringify(m1('files/a')), localExtra: new Uint8Array(9).fill(7) },
      { name: 'files/a', data: 'after the extra', localExtra: new Uint8Array(20).fill(1) },
    ]);
    expect(await restoreText(zip)).toBe('after the extra');
  });
  it('reads an entry with an empty name at the very end of the directory', async () => {
    const zip = makeZip([{ name: 'backup.json', data: JSON.stringify(m1('')) }, { name: '', data: 'nameless' }]);
    expect(await restoreText(zip)).toBe('nameless');
  });
  it('takes every value from the zip64 end record once any one field of the plain one is marked', async () => {
    const entries = [{ name: 'backup.json', data: JSON.stringify(m1('files/a')) }, { name: 'files/a', data: 'from the record' }];
    expect(await restoreText(makeZip(entries, { zip64End: 'count', plainSize: 3, plainAt: 5 }))).toBe('from the record');
    expect(await restoreText(makeZip(entries, { zip64End: 'size', plainAt: 5 }))).toBe('from the record');
    expect(await restoreText(makeZip(entries, { zip64End: 'at', plainSize: 3 }))).toBe('from the record');
  });
  it('ignores a zip64 end record when nothing in the plain one is marked', async () => {
    const entries = [{ name: 'backup.json', data: JSON.stringify(m1('files/a')) }, { name: 'files/a', data: 'plain values' }];
    expect(await restoreText(makeZip(entries, { zip64End: 'none', record: { count: 0, size: 0, at: 0 } }))).toBe('plain values');
  });
  it('reads a zip64 entry count past 4 billion (as many as the directory holds)', async () => {
    const entries = [{ name: 'backup.json', data: JSON.stringify(m1('files/a')) }, { name: 'files/a', data: 'many' }];
    expect(await restoreText(makeZip(entries, { zip64End: 'count', record: { count: 2 ** 32 } }))).toBe('many');
  });
  it('reads the plain end record when a zip64 mark has no locator before it', async () => {
    const zip = makeZip([{ name: 'backup.json', data: JSON.stringify(m1('files/a')) }, { name: 'files/a', data: 'no locator' }], { countOverride: 0xffff });
    expect(await restoreText(zip)).toBe('no locator');
    const noLoc = makeZip([{ name: 'backup.json', data: JSON.stringify(m1('files/a')) }, { name: 'files/a', data: 'record, no locator' }], { zip64End: 'count', noLocator: true });
    expect(await restoreText(noLoc)).toBe('record, no locator');
  });
  it('finds the end record behind the longest comment a zip can have', async () => {
    const zip = makeZip([{ name: 'backup.json', data: JSON.stringify(m1('files/a')) }, { name: 'files/a', data: 'long comment' }], { comment: new Uint8Array(0xffff).fill(0x20) });
    expect(await restoreText(zip)).toBe('long comment');
  });
  it('finds a zip64 locator right at the start of the part it searches', async () => {
    const entries = [{ name: 'backup.json', data: JSON.stringify(m1('files/a')) }, { name: 'files/a', data: 'locator at 0' }];
    expect(await restoreText(makeZip(entries, { zip64End: 'all', comment: new Uint8Array(0xffff - 20) }))).toBe('locator at 0');
    // Too close to the start for a locator: the plain end record is used.
    expect(await restoreText(makeZip(entries, { countOverride: 0xffff, comment: new Uint8Array(0xffff - 5) }))).toBe('locator at 0');
  });
  it('reads only as many entries as the end record says', async () => {
    const zip = makeZip([{ name: 'backup.json', data: JSON.stringify(m1('files/a')) }, { name: 'files/a', data: 'x' }], { countOverride: 1 });
    await expectError(D.restoreZip(zip, { databases: ['nb'] }), 'Part of that backup is missing, so nothing was changed.');
  });
  it('stops at the end of the central directory even when told there are more', async () => {
    const zip = makeZip([{ name: 'backup.json', data: JSON.stringify(m1('files/a')) }, { name: 'files/a', data: 'stopped' }], { countOverride: 9, cenSizePlus: 46 });
    expect(await restoreText(zip)).toBe('stopped');
  });
  it('opens files squeezed (deflated) by another zip tool', async () => {
    const text = 'squeezed '.repeat(200);
    const json = JSON.stringify(m1('files/a'));
    const zip = makeZip([
      { name: 'backup.json', data: json, method: 8, stored: await deflateRaw(Buffer.from(json)) },
      { name: 'files/a', data: text, method: 8, stored: await deflateRaw(Buffer.from(text)) },
    ]);
    expect(await restoreText(zip)).toBe(text);
  });
  it("can't read a file squeezed some other way, or when the browser can't open squeezed files", async () => {
    const changed = "That backup was changed after it was saved and can't be read.";
    const m = manifest({ nb: { stores: {} } }, { local: { k: { __file: 'files/a', as: 'text' } } });
    const odd = makeZip([{ name: 'backup.json', data: JSON.stringify(m) }, { name: 'files/a', data: 'x', method: 12 }]);
    const got = await D.restoreZip(odd, { databases: ['nb'] });
    await expectError(got.local('k'), changed);
    const squeezed = makeZip([{ name: 'backup.json', data: JSON.stringify(m) }, { name: 'files/a', data: 'x', method: 8, stored: await deflateRaw(Buffer.from('x')) }]);
    const real = globalThis.DecompressionStream;
    globalThis.DecompressionStream = undefined;
    try {
      const g2 = await D.restoreZip(squeezed, { databases: ['nb'] });
      await expectError(g2.local('k'), changed);
      await expectError(D.restoreZip(makeZip([{ name: 'backup.json', data: JSON.stringify(m), method: 8, stored: await deflateRaw(Buffer.from(JSON.stringify(m))) }]), { databases: ['nb'] }), BAD);
    } finally { globalThis.DecompressionStream = real; }
  });
  it('reads files in the way older backups marked them (no `as`)', async () => {
    const m = manifest({ nb: { stores: { s: store([
      [1, { __file: 'files/buf', buf: true }],
      [2, { __file: 'files/view', view: 'Uint16Array' }],
      [3, { __file: 'files/blob', type: 'text/plain', name: 'n.txt', lastModified: 5 }],
      [4, { __file: 'files/view', as: 'view', view: 'NoSuchArray' }],
      [5, { __file: 'files/blob', as: 'blob' }],
      [6, { __date: '2020-01-01T00:00:00.000Z', nested: { __date: 7 } }],
      [7, { __file: 'files/blob', as: 'blob', name: '', type: 'text/plain' }],
      [8, { __file: 'files/view', as: 'buf', view: 'Uint16Array' }],
    ]) } } });
    const zip = backupZip(m, { 'files/buf': new Uint8Array([1, 2]), 'files/view': new Uint8Array([1, 0, 2, 0]), 'files/blob': 'blob text' });
    await D.restoreZip(zip, { databases: ['nb'] });
    const v = Object.fromEntries(await all('nb', 's'));
    expect(v[1]).toBeInstanceOf(ArrayBuffer);
    expect([...new Uint8Array(v[1])]).toEqual([1, 2]);
    expect(v[2]).toBeInstanceOf(Uint16Array);
    expect([...v[2]]).toEqual([1, 2]);
    expect(v[3]).toBeInstanceOf(NodeFile);
    expect([v[3].name, v[3].type, v[3].lastModified, await v[3].text()]).toEqual(['n.txt', 'text/plain', 5, 'blob text']);
    expect(v[4]).toBeInstanceOf(ArrayBuffer);
    expect(v[5]).toBeInstanceOf(NodeBlob);
    expect(v[5]).not.toBeInstanceOf(NodeFile);
    expect(v[5].type).toBe('');
    expect(v[6]).toEqual(new Date('2020-01-01T00:00:00.000Z'));
    expect(v[7]).toBeInstanceOf(NodeFile);
    expect([v[7].name, v[7].lastModified]).toEqual(['', NOW]);
    expect(v[8]).toBeInstanceOf(ArrayBuffer);
  });
});

describe('restoreZip: into the database', () => {
  it('makes a database the device lacks from the backup, as it says it was', async () => {
    const m = manifest({ nb: { stores: {
      bare: { rows: [[1, 'no meta']] },
      byPath: { meta: { keyPath: 'a.b', autoIncrement: false }, rows: [[5, { a: { b: 5 } }]] },
      compound: { meta: { keyPath: ['x', 'y'], indexes: [{ name: 'ix', keyPath: 'x' }] }, rows: [[[1, 2], { x: 1, y: 2 }]] },
      count: { meta: { keyPath: null, autoIncrement: true }, rows: [[1, 'a'], [2, 'b']] },
    } } });
    const got = await D.restoreZip(backupZip(m), { databases: ['nb'] });
    expect(got.counts).toEqual({ nb: { bare: 1, byPath: 1, compound: 1, count: 2 } });
    const db = await rawOpen('nb');
    expect(db.version).toBe(1);
    const os = (n) => db.transaction(n).objectStore(n);
    expect([os('bare').keyPath, os('bare').autoIncrement]).toEqual([null, false]);
    expect([os('byPath').keyPath, os('byPath').autoIncrement]).toEqual(['a.b', false]);
    expect(os('compound').keyPath).toEqual(['x', 'y']);
    expect([os('compound').index('ix').unique, os('compound').index('ix').multiEntry]).toEqual([false, false]);
    expect([os('count').keyPath, os('count').autoIncrement]).toEqual([null, true]);
    db.close();
    expect(await all('nb', 'byPath')).toEqual([[5, { a: { b: 5 } }]]);
    expect(await all('nb', 'compound')).toEqual([[[1, 2], { x: 1, y: 2 }]]);
  });
  it('keeps the rows it put back by every kind of key (dotted, compound: read from the row itself; dates) and takes out the rest', async () => {
    (await makeDb('nb', {
      byPath: { keyPath: 'a.b', rows: [{ a: { b: 5 }, old: 1 }, { a: { b: 6 } }] },
      compound: { keyPath: ['x', 'y'], rows: [{ x: 1, y: 2, old: 1 }, { x: 1, y: 3 }] },
      dates: { rows: [[new Date(5), 'old'], [new Date(6), 'gone']] },
    })).close();
    const m = manifest({ nb: { stores: {
      byPath: { rows: [[null, { a: { b: 5 } }]] },
      compound: { rows: [['not the key', { x: 1, y: 2 }]] },
      dates: { rows: [[{ __date: new Date(5).toISOString() }, 'new']] },
    } } });
    await D.restoreZip(backupZip(m), { databases: ['nb'] });
    expect(await all('nb', 'byPath')).toEqual([[5, { a: { b: 5 } }]]);
    expect(await all('nb', 'compound')).toEqual([[[1, 2], { x: 1, y: 2 }]]);
    expect(await all('nb', 'dates')).toEqual([[new Date(5), 'new']]);
  });
  it('empties a store the backup has no rows for, and leaves alone stores it has no part in', async () => {
    (await makeDb('nb', { s: { rows: [[1, 'a']] }, t: { rows: [[1, 'b']] }, u: { rows: [[1, 'c']] } })).close();
    const got = await D.restoreZip(backupZip(manifest({ nb: { stores: { s: {}, t: { rows: [] }, extra: { rows: [[1, 'x']] } } } })), { databases: ['nb'] });
    expect(got.counts).toEqual({ nb: { s: 0, t: 0 } });
    expect(await all('nb', 's')).toEqual([]);
    expect(await all('nb', 't')).toEqual([]);
    expect(await all('nb', 'u')).toEqual([[1, 'c']]);
  });
  it('adds stores the backup has to a database the browser did not list (made with fewer)', async () => {
    (await makeDb('nb', { s: { rows: [[1, 'old']] } })).close();
    indexedDB.databases = async () => [];
    const m = manifest({ nb: { version: 2, stores: { s: { rows: [[2, 'new']] }, t: { meta: { keyPath: 'id' }, rows: [['k', { id: 'k' }]] } } } });
    expect((await D.restoreZip(backupZip(m), { databases: ['nb'] })).counts).toEqual({ nb: { s: 1, t: 1 } });
    delete indexedDB.databases;
    expect(await all('nb', 's')).toEqual([[2, 'new']]);
    expect(await all('nb', 't')).toEqual([['k', { id: 'k' }]]);
  });
  it('puts back into the database as it is when the browser cannot list databases', async () => {
    (await makeDb('nb', { s: { rows: [[1, 'old']] } }, 3)).close();
    indexedDB.databases = undefined;
    const m = manifest({ nb: { version: 9, stores: { s: { rows: [[2, 'new']] }, t: { rows: [[1, 'x']] } } }, fresh: { stores: { s: { rows: [[1, 'y']] } } } });
    const got = await D.restoreZip(backupZip(m), { databases: ['nb', 'fresh'] });
    expect(got.counts).toEqual({ nb: { s: 1 }, fresh: {} });
    delete indexedDB.databases;
    expect(await all('nb', 's')).toEqual([[2, 'new']]);
    expect((await rawOpen('nb')).version).toBe(3);
  });
  it('writes rows forty at a time, the rest at the end, and sooner once 24 MB (exactly) has been read', async () => {
    (await makeDb('nb', { s: {} })).close();
    const rows = Array.from({ length: 80 }, (_, i) => [i, `r${i}`]);
    const writes = [];
    const realTx = Object.getPrototypeOf((await rawOpen('nb'))).transaction;
    vi.spyOn(Object.getPrototypeOf(await rawOpen('nb')), 'transaction').mockImplementation(function (names, mode) {
      const tx = realTx.call(this, names, mode);
      if (mode === 'readwrite') { const os = tx.objectStore(names); const put = os.put.bind(os); let n = 0; os.put = (...a) => { n += 1; return put(...a); }; tx.addEventListener('complete', () => writes.push(n)); }
      return tx;
    });
    await D.restoreZip(backupZip(manifest({ nb: { stores: { s: { rows } } } })), { databases: ['nb'] });
    expect(writes).toEqual([40, 40]);
    expect((await all('nb', 's')).length).toBe(80);

    writes.length = 0;
    const mb12 = new Uint8Array(12 * 1024 * 1024);
    const big = manifest({ nb: { stores: { s: { rows: [[1, { __file: 'files/a', as: 'buf' }], [2, { __file: 'files/b', as: 'buf' }], [3, 'small'], [4, 'small']] } } } });
    await D.restoreZip(backupZip(big, { 'files/a': mb12, 'files/b': mb12 }), { databases: ['nb'] });
    expect(writes).toEqual([2, 2, 0]); // then one to take out the 76 rows it doesn't have
    expect((await all('nb', 's')).map(([k]) => k)).toEqual([1, 2, 3, 4]);
  }, 30000);
  it("says to restore again when a row won't go in, and logs why", async () => {
    (await makeDb('nb', { s: { keyPath: 'id', rows: [{ id: 1 }] } })).close();
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const m = manifest({ nb: { stores: { s: { rows: [[2, { noId: true }]] } } } });
    await expectError(D.restoreZip(backupZip(m), { databases: ['nb'] }), "The backup didn't all go in. Restore it again to finish it.");
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][0].name).toBe('DataError');
    expect(await all('nb', 's')).toEqual([[1, { id: 1 }]]);
  });
  // A row of an auto-increment store with a key path whose key isn't in the
  // backed-up value goes in under a new key, and stays: it's one of the backup's.
  it('keeps a row whose key was made for it as it went in', async () => {
    (await makeDb('nb', { s: { keyPath: 'a.b', autoIncrement: true, rows: [{ a: { b: 7 }, old: true }] } })).close();
    const got = await D.restoreZip(backupZip(manifest({ nb: { stores: { s: { rows: [[null, {}], [3, { a: { b: 3 } }]] } } } })), { databases: ['nb'] });
    expect(got.counts).toEqual({ nb: { s: 2 } });
    expect(await all('nb', 's')).toEqual([[3, { a: { b: 3 } }], [8, { a: { b: 8 } }]]);
  });
});
