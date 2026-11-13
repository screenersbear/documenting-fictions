// shared/df-data.js: the low-memory zip backup (zipBackup, its zip writer and
// CRC-32, the scratch database, parts for a phone), handing it over a file a
// tap (backupSteps) and telling a zip from a JSON backup (isZipFile).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadDFData, makeDb, dbList, crc32, textBytes, pretendBigger, JsdomBlob, NodeBlob, NodeFile, expectError } from './_env.mjs';
import { listZip, jsonOf } from './_zip.mjs';
import { IDBObjectStore } from 'fake-indexeddb';

let D;
const NOW = new Date(2026, 10, 12, 10, 31, 45).getTime();
beforeEach(async () => {
  D = await loadDFData();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete navigator.canShare;
  delete window.matchMedia;
});

const LONG = 'x'.repeat(64 * 1024 + 1);
const zipNames = async (f) => (await listZip(f)).map((e) => e.name);
const byName = async (f) => Object.fromEntries((await listZip(f)).map((e) => [e.name, e]));
const scratchNames = async () => (await dbList()).filter((n) => n.startsWith('df-backup-scratch-'));
const onPhone = () => {
  navigator.canShare = vi.fn(() => true);
  window.matchMedia = vi.fn(() => ({ matches: true }));
};

async function seedNotebook() {
  const photo = new NodeFile(['photo-bytes'], 'p.jpg', { type: 'image/jpeg', lastModified: 77 });
  (await makeDb('nb', {
    shots: { keyPath: 'id', indexes: [['day', 'day']], rows: [
      { id: 'a', day: '2026-01-01', photo, thumb: new NodeBlob(['tb'], { type: 'image/png' }), when: new Date(Date.UTC(2020, 0, 2)) },
      { id: 'b', day: '2026-01-02', bytes: new Uint8Array([1, 2, 3]).buffer, view: new Int16Array([-1, 2]), long: LONG, list: [1, 'two', null] },
    ] },
    kv: { rows: [['theme', 'dark'], [new Date(Date.UTC(2021, 0, 1)), { n: 1 }]] },
  }, 3)).close();
}

describe('zipBackup', () => {
  it('backs up the databases and localStorage keys this device has into one zip', async () => {
    await seedNotebook();
    localStorage.setItem('short', 'v');
    localStorage.setItem('long', LONG);
    const made = await D.zipBackup({ app: 'ref', databases: ['nb', 'missing'], local: ['short', 'long', 'absent'], extra: { a: 1 } });
    expect(made.parts.length).toBe(1);
    const [f] = made.parts;
    expect([f.name, f.type, made.size]).toEqual(['ref-backup-2026-11-12.zip', 'application/zip', f.size]);
    expect(await zipNames(f)).toEqual(['backup.json', 'part.json', 'files/000000', 'files/000001', 'files/000002', 'files/000003', 'files/000004', 'files/000005']);
    const z = await byName(f);
    const m = jsonOf(z['backup.json']);
    const part = jsonOf(z['part.json']);
    expect(part).toEqual({ format: 'df-backup-part', id: m.parts.id, part: 1, of: 1 });
    expect(m.parts).toEqual({ id: expect.stringMatching(/^[0-9a-z]+$/), of: 1 });
    expect(m).toMatchObject({ format: 'df-backup', version: 1, app: 'ref', kind: 'notebook', exportedAt: new Date(NOW).toISOString(), extra: { a: 1 } });
    expect(Object.keys(m.databases)).toEqual(['nb']);
    expect(m.databases.nb.version).toBe(3);
    expect(m.databases.nb.stores.kv).toEqual({ meta: { keyPath: null, autoIncrement: false, indexes: [] }, rows: [[{ __date: '2021-01-01T00:00:00.000Z' }, { n: 1 }], ['theme', 'dark']] });
    const shots = m.databases.nb.stores.shots;
    expect(shots.meta).toEqual({ keyPath: 'id', autoIncrement: false, indexes: [{ name: 'day', keyPath: 'day', unique: false, multiEntry: false }] });
    expect(shots.rows).toEqual([
      ['a', { id: 'a', day: '2026-01-01', photo: { __file: 'files/000000', as: 'blob', type: 'image/jpeg', name: 'p.jpg', lastModified: 77 }, thumb: { __file: 'files/000001', as: 'blob', type: 'image/png' }, when: { __date: '2020-01-02T00:00:00.000Z' } }],
      ['b', { id: 'b', day: '2026-01-02', bytes: { __file: 'files/000002', as: 'buf' }, view: { __file: 'files/000003', as: 'view', view: 'Int16Array' }, long: { __file: 'files/000004', as: 'text' }, list: [1, 'two', null] }],
    ]);
    expect(m.local).toEqual({ short: 'v', long: { __file: 'files/000005', as: 'text' } });
    const text = (n) => Buffer.from(z[n].data).toString('utf8');
    expect([text('files/000000'), text('files/000001'), text('files/000004'), text('files/000005')]).toEqual(['photo-bytes', 'tb', LONG, LONG]);
    expect([...z['files/000002'].data]).toEqual([1, 2, 3]);
    expect([...new Int16Array(new Uint8Array(z['files/000003'].data).buffer)]).toEqual([-1, 2]);
    expect(await dbList()).not.toContain('missing');
  });
  it('writes a plain stored zip: UTF-8 names, checksums that match, the time it was made', async () => {
    await seedNotebook();
    const made = await D.zipBackup({ app: 'ref', databases: ['nb'] });
    const list = await listZip(made.parts[0]);
    const d = new Date(NOW);
    for (const e of list) {
      expect(e.crc, e.name).toBe(crc32(e.data));
      expect([e.flags, e.method, e.size]).toEqual([0x0800, 0, e.data.length]);
      expect(e.time).toBe((10 << 11) | (31 << 5) | 22);
      expect(e.date).toBe(((d.getFullYear() - 1980) << 9) | (11 << 5) | 12);
    }
    // The local headers say the same, and the directory ends where the end record starts (no zip64 records).
    const b = new Uint8Array(await made.parts[0].arrayBuffer());
    const dv = new DataView(b.buffer);
    for (const e of list) {
      expect([dv.getUint32(e.at, true), dv.getUint16(e.at + 4, true), dv.getUint16(e.at + 6, true), dv.getUint16(e.at + 8, true), dv.getUint16(e.at + 10, true), dv.getUint16(e.at + 12, true), dv.getUint32(e.at + 14, true), dv.getUint32(e.at + 18, true), dv.getUint32(e.at + 22, true), dv.getUint16(e.at + 28, true)], e.name)
        .toEqual([0x04034b50, 20, 0x0800, 0, e.time, e.date, e.crc, e.size, e.size, 0]);
    }
    const end = b.length - 22;
    const cenAt = dv.getUint32(end + 16, true);
    expect(cenAt + dv.getUint32(end + 12, true)).toBe(end);
    expect([dv.getUint16(end + 8, true), dv.getUint16(end + 10, true)]).toEqual([list.length, list.length]);
    expect(cenAt).toBe(list[list.length - 1].at + 30 + list[list.length - 1].name.length + list[list.length - 1].size);
  });
  it('gives a checksum the standard CRC-32 for known bytes', async () => {
    (await makeDb('nb', { s: { rows: [[1, new NodeBlob(['123456789'])], [2, new Uint8Array(0).buffer], [3, new NodeBlob(['The quick brown fox jumps over the lazy dog'])]] } })).close();
    const z = await byName((await D.zipBackup({ app: 'x', databases: ['nb'] })).parts[0]);
    expect(z['files/000000'].crc).toBe(0xcbf43926);
    expect(z['files/000001'].crc).toBe(0);
    expect(z['files/000002'].crc).toBe(0x414fa339);
  });
  it('reads a photo for its checksum a few MB at a time where Blobs have no stream()', async () => {
    const big = new Uint8Array(8 * 1024 * 1024);
    for (let i = 0; i < big.length; i += 4093) big[i] = i & 0xff;
    (await makeDb('nb', { s: { rows: [[1, new NodeBlob([big])]] } })).close();
    const desc = Object.getOwnPropertyDescriptor(NodeBlob.prototype, 'stream');
    Object.defineProperty(NodeBlob.prototype, 'stream', { configurable: true, value: undefined });
    try {
      const sliced = vi.spyOn(NodeBlob.prototype, 'slice');
      const z = await byName((await D.zipBackup({ app: 'x', databases: ['nb'] })).parts[0]);
      expect(z['files/000000'].crc).toBe(crc32(big));
      const reads = sliced.mock.calls.filter(([a, b]) => b - a === 4 * 1024 * 1024);
      expect(reads.map(([a]) => a)).toEqual([0, 4194304]); // and none past the end
    } finally {
      Object.defineProperty(NodeBlob.prototype, 'stream', desc);
    }
  }, 30000);
  it('is null when there is nothing to back up, and leaves no scratch', async () => {
    expect(await D.zipBackup({ app: 'x', databases: ['missing'], local: ['absent'] })).toBeNull();
    expect(await D.zipBackup()).toBeNull();
    expect(await dbList()).toEqual([]);
  });
  it('keeps text of 64 KB in backup.json and puts longer text in a file of its own', async () => {
    (await makeDb('nb', { s: { rows: [[1, 'e'.repeat(64 * 1024)], [2, 'f'.repeat(64 * 1024 + 1)]] } })).close();
    const z = await byName((await D.zipBackup({ app: 'x', databases: ['nb'] })).parts[0]);
    const rows = jsonOf(z['backup.json']).databases.nb.stores.s.rows;
    expect(rows[0][1]).toBe('e'.repeat(64 * 1024));
    expect(rows[1][1]).toEqual({ __file: 'files/000000', as: 'text' });
    expect(z['files/000000'].data.length).toBe(64 * 1024 + 1);
  });
  it('backs up localStorage alone', async () => {
    localStorage.setItem('k', '');
    const made = await D.zipBackup({ app: 'x', local: ['k'] });
    const m = jsonOf((await byName(made.parts[0]))['backup.json']);
    expect(m.databases).toEqual({});
    expect(m.local).toEqual({ k: '' });
  });
  it('leaves out localStorage it cannot read (private mode)', async () => {
    (await makeDb('nb', { s: {} })).close();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('no'); });
    const made = await D.zipBackup({ app: 'x', databases: ['nb'], local: ['k'] });
    expect(jsonOf((await byName(made.parts[0]))['backup.json']).local).toEqual({});
  });
  it('backs up an empty database, and keeps the filename given', async () => {
    (await makeDb('nb', { s: {} })).close();
    const progress = vi.fn();
    const made = await D.zipBackup({ app: 'x', kind: 'suite', databases: ['nb'], filename: 'all four.zip', onProgress: progress });
    expect(made.parts[0].name).toBe('all four.zip');
    const m = jsonOf((await byName(made.parts[0]))['backup.json']);
    expect(m.kind).toBe('suite');
    expect(m.extra).toEqual({});
    expect(m.databases.nb.stores.s.rows).toEqual([]);
    expect(progress).not.toHaveBeenCalled();
  });
  it('tells how far it has got, row by row, across databases', async () => {
    (await makeDb('one', { s: { rows: [[1, 'a'], [2, 'b'], [3, 'c']] } })).close();
    (await makeDb('two', { s: { rows: [[1, 'd']] }, t: {} })).close();
    const progress = vi.fn();
    await D.zipBackup({ app: 'x', databases: ['one', 'two'], onProgress: progress });
    expect(progress.mock.calls.map(([p]) => p)).toEqual([0.25, 0.5, 0.75, 1]);
  });
  it('reads a store a page of rows at a time, every row once, in key order', async () => {
    const rows = Array.from({ length: 25 }, (_, i) => [i, { n: i, pic: i % 7 === 0 ? new NodeBlob([`p${i}`]) : null }]);
    (await makeDb('nb', { s: { rows }, ten: { rows: rows.slice(0, 10) } })).close();
    const made = await D.zipBackup({ app: 'x', databases: ['nb'] });
    const z = await byName(made.parts[0]);
    const m = jsonOf(z['backup.json']);
    expect(m.databases.nb.stores.s.rows.map(([k]) => k)).toEqual(rows.map(([k]) => k));
    expect(m.databases.nb.stores.ten.rows.map(([k]) => k)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(Object.keys(z).filter((n) => n.startsWith('files/')).length).toBe(6);
    const pic = m.databases.nb.stores.s.rows[21][1].pic;
    expect(Buffer.from(z[pic.__file].data).toString()).toBe('p21');
    expect(z[pic.__file].crc).toBe(crc32(textBytes('p21')));
  });

  it("works out a photo's checksum from a second read of its rows, and reads rows without photos once", async () => {
    (await makeDb('nb', { s: { rows: [[1, { p: new NodeBlob(['pic']), q: 'plain' }], [2, 'plain']] }, t: { rows: [[1, 'plain']] }, u: { rows: [[1, [new NodeBlob(['in a list']), 'plain']]] } })).close();
    const reads = { s: [], t: [], u: [] };
    const realGetAll = IDBObjectStore.prototype.getAll;
    vi.spyOn(IDBObjectStore.prototype, 'getAll').mockImplementation(function (...a) {
      const r = realGetAll.apply(this, a);
      if (reads[this.name]) r.addEventListener('success', () => reads[this.name].push(r.result));
      return r;
    });
    const streamed = [];
    const realStream = NodeBlob.prototype.stream;
    vi.spyOn(NodeBlob.prototype, 'stream').mockImplementation(function () { streamed.push(this); return realStream.call(this); });
    const z = await byName((await D.zipBackup({ app: 'x', databases: ['nb'] })).parts[0]);
    expect([reads.s.length, reads.t.length, reads.u.length]).toEqual([2, 1, 2]);
    expect(streamed).toEqual([reads.s[1][0].p, reads.u[1][0][0]]);
    expect(streamed[0]).not.toBe(reads.s[0][0].p);
    expect(z['files/000000'].crc).toBe(crc32(textBytes('pic')));
  });

  describe('while another tab writes to the database', () => {
    // Runs `write(store)` in a transaction of its own right after the
    // backup's `method` request on store s (once), as another tab would.
    function writeAfter(method, write) {
      const real = IDBObjectStore.prototype[method];
      let done = false;
      vi.spyOn(IDBObjectStore.prototype, method).mockImplementation(function (...a) {
        const r = real.apply(this, a);
        if (!done && this.name === 's') { done = true; write(this.transaction.db.transaction('s', 'readwrite').objectStore('s')); }
        return r;
      });
    }
    const checksumsMatch = async (made) => {
      const z = await byName(made.parts[0]);
      for (const [n, e] of Object.entries(z)) expect(e.crc, n).toBe(crc32(e.data));
      return z;
    };
    it('takes the checksums from the rows themselves when rows were added between the two reads', async () => {
      (await makeDb('nb', { s: { rows: [[2, new NodeBlob(['bbbb'])], [3, new NodeBlob(['cccc'])]] } })).close();
      writeAfter('getAll', (os) => os.put(new NodeBlob(['aaaa']), 1));
      const z = await checksumsMatch(await D.zipBackup({ app: 'x', databases: ['nb'] }));
      expect(Buffer.from(z['files/000000'].data).toString()).toBe('bbbb');
      expect(jsonOf(z['backup.json']).databases.nb.stores.s.rows.map(([k]) => k)).toEqual([2, 3]);
    });
    it('takes the checksums from the rows themselves when the rows changed but not their number', async () => {
      (await makeDb('nb', { s: { rows: [[2, new NodeBlob(['bbbb'])], [3, new NodeBlob(['cccc'])]] } })).close();
      writeAfter('getAll', (os) => { os.delete(3); os.put(new NodeBlob(['dddd']), 4); });
      await checksumsMatch(await D.zipBackup({ app: 'x', databases: ['nb'] }));
    });
    it('takes the checksums from the rows themselves when a row was added after them', async () => {
      (await makeDb('nb', { s: { rows: [[2, new NodeBlob(['bbbb'])], [3, new NodeBlob(['cccc'])]] } })).close();
      writeAfter('getAll', (os) => os.put(new NodeBlob(['dddd']), 4));
      await checksumsMatch(await D.zipBackup({ app: 'x', databases: ['nb'] }));
    });
    it('takes the checksum from a photo itself when its row was emptied meanwhile', async () => {
      (await makeDb('nb', { s: { rows: [[2, { p: new NodeBlob(['bbbb']) }]] } })).close();
      writeAfter('getAll', (os) => os.put(null, 2));
      await checksumsMatch(await D.zipBackup({ app: 'x', databases: ['nb'] }));
    });
    it('takes the checksum from a photo itself when its second copy is a different size', async () => {
      (await makeDb('nb', { s: { rows: [[2, { p: new NodeBlob(['bbbb']) }]] } })).close();
      writeAfter('getAll', (os) => os.put({ p: new NodeBlob(['longer']) }, 2));
      const z = await checksumsMatch(await D.zipBackup({ app: 'x', databases: ['nb'] }));
      expect(Buffer.from(z['files/000000'].data).toString()).toBe('bbbb');
    });
    it('never tells more than all done when rows were added after counting', async () => {
      (await makeDb('nb', { s: {} })).close();
      writeAfter('count', (os) => { os.put('a', 1); os.put('b', 2); });
      const progress = vi.fn();
      await D.zipBackup({ app: 'x', databases: ['nb'], onProgress: progress });
      expect(progress.mock.calls).toEqual([[1], [1]]);
    });
    it('counts on from the rows it counted', async () => {
      (await makeDb('nb', { s: { rows: [[5, 'x'], [6, 'y']] } })).close();
      writeAfter('count', (os) => { os.put('a', 1); os.put('b', 2); });
      const progress = vi.fn();
      await D.zipBackup({ app: 'x', databases: ['nb'], onProgress: progress });
      expect(progress.mock.calls).toEqual([[0.5], [1], [1], [1]]);
    });
  });

  describe('in parts', () => {
    async function seedSizes(sizes) {
      (await makeDb('nb', { s: { rows: [[1, sizes.map((n) => new Uint8Array(n).fill(n % 256).buffer)]] } })).close();
    }
    it('puts the files in parts of partSize at most, a bigger file in a part of its own', async () => {
      await seedSizes([60, 40, 1, 150, 10]);
      const made = await D.zipBackup({ app: 'x', databases: ['nb'], partSize: 100, filename: 'nb-backup.ZIP' });
      expect(made.parts.map((p) => p.name)).toEqual(['nb-backup (1 of 4).zip', 'nb-backup (2 of 4).zip', 'nb-backup (3 of 4).zip', 'nb-backup (4 of 4).zip']);
      expect(made.size).toBe(made.parts.reduce((n, p) => n + p.size, 0));
      const lists = await Promise.all(made.parts.map(byName));
      expect(lists.map((z) => Object.keys(z))).toEqual([
        ['backup.json', 'part.json', 'files/000000', 'files/000001'],
        ['part.json', 'files/000002'],
        ['part.json', 'files/000003'],
        ['part.json', 'files/000004'],
      ]);
      const id = jsonOf(lists[0]['backup.json']).parts.id;
      expect(jsonOf(lists[0]['backup.json']).parts.of).toBe(4);
      expect(lists.map((z) => jsonOf(z['part.json']))).toEqual([1, 2, 3, 4].map((part) => ({ format: 'df-backup-part', id, part, of: 4 })));
      expect(lists[2]['files/000003'].data.length).toBe(150);
    });
    it('keeps a file that fits exactly in the part', async () => {
      await seedSizes([60, 40]);
      const made = await D.zipBackup({ app: 'x', databases: ['nb'], partSize: 100 });
      expect(made.parts.map((p) => p.name)).toEqual(['x-backup-2026-11-12.zip']);
    });
    it('lets go of a part once saved', async () => {
      await seedSizes([60, 60]);
      const made = await D.zipBackup({ app: 'x', databases: ['nb'], partSize: 100 });
      made.release(0);
      expect(made.parts[0]).toBeNull();
      expect(made.parts[1]).toBeInstanceOf(NodeFile);
    });
    it('takes .zip off the end of the name given only at the end', async () => {
      await seedSizes([60, 60]);
      expect((await D.zipBackup({ app: 'x', databases: ['nb'], filename: 'a.zip.b' })).parts[0].name).toBe('a.zip.b.zip');
      expect((await D.zipBackup({ app: 'x', databases: ['nb'], filename: 'a.zip.b', partSize: 100 })).parts.map((p) => p.name)).toEqual(['a.zip.b (1 of 2).zip', 'a.zip.b (2 of 2).zip']);
    });
    it('makes 200 MB parts for a phone and one file elsewhere', async () => {
      const undo = pretendBigger('x/big', 150 * 1024 * 1024);
      try {
        (await makeDb('nb', { s: { rows: [[1, [new NodeBlob(['a'], { type: 'x/big' }), new NodeBlob(['b'], { type: 'x/big' })]]] } })).close();
        expect((await D.zipBackup({ app: 'x', databases: ['nb'] })).parts.length).toBe(1);
        onPhone();
        expect((await D.zipBackup({ app: 'x', databases: ['nb'] })).parts.length).toBe(2);
      } finally { undo(); }
    });
    it('keeps a small backup in one file on a phone', async () => {
      await seedSizes([5000, 5000]);
      onPhone();
      expect((await D.zipBackup({ app: 'x', databases: ['nb'] })).parts.length).toBe(1);
    });
  });

  describe('the scratch database', () => {
    it('keeps bytes and long text there until the backup is done, under a name with the time', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      (await makeDb('nb', { s: { rows: [[1, new Uint8Array(3).buffer]] } })).close();
      const made = await D.zipBackup({ app: 'x', databases: ['nb'] });
      expect(await scratchNames()).toEqual([`df-backup-scratch-${NOW}-${NOW.toString(36).slice(0, 8)}`]);
      await made.done(0);
      expect(await scratchNames()).toEqual([]);
    });
    it('clears it two minutes after it is done', async () => {
      (await makeDb('nb', { s: { rows: [[1, LONG]] } })).close();
      const made = await D.zipBackup({ app: 'x', databases: ['nb'] });
      vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] });
      let finished = false;
      made.done().then(() => { finished = true; });
      vi.advanceTimersByTime(119999);
      expect((await scratchNames()).length).toBe(1);
      vi.advanceTimersByTime(1);
      await vi.waitFor(() => expect(finished).toBe(true));
      expect(await scratchNames()).toEqual([]);
    });
    it('makes none for a backup of photos stored as Blobs', async () => {
      (await makeDb('nb', { s: { rows: [[1, new NodeBlob(['p'])]] } })).close();
      await D.zipBackup({ app: 'x', databases: ['nb'] });
      expect(await scratchNames()).toEqual([]);
    });
    it('stores a batch once 24 MB (exactly) is waiting, the rest when the zip is made, opening the scratch once', async () => {
      const one = (k) => [k, new Uint8Array([k]).buffer];
      const big = (k) => [k, new Uint8Array(12 * 1024 * 1024 - 9).fill(k).buffer];
      // Pages of ten rows: 10 bytes, then 24 MB less 10 bytes, then 1 byte.
      const rows = [...Array.from({ length: 10 }, (_, i) => one(i + 1)), big(11), big(12), ...Array.from({ length: 9 }, (_, i) => one(i + 13))];
      (await makeDb('nb', { s: { rows } })).close();
      const puts = new Map();
      const realPut = IDBObjectStore.prototype.put;
      vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (...a) {
        if (this.transaction.db.name.startsWith('df-backup-scratch-')) puts.set(this.transaction, (puts.get(this.transaction) || 0) + 1);
        return realPut.apply(this, a);
      });
      const opens = [];
      let changes = 0;
      const realOpen = indexedDB.open.bind(indexedDB);
      indexedDB.open = (...a) => {
        const r = realOpen(...a);
        if (String(a[0]).startsWith('df-backup-scratch-')) { opens.push(a[0]); r.addEventListener('success', () => r.result.addEventListener('versionchange', () => { changes += 1; })); }
        return r;
      };
      const made = await D.zipBackup({ app: 'x', databases: ['nb'] });
      expect([...puts.values()]).toEqual([20, 1]);
      expect(opens.length).toBe(1);
      const z = await byName(made.parts[0]);
      expect(Object.keys(z).length).toBe(23);
      expect(z['files/000010'].data.length).toBe(12 * 1024 * 1024 - 9);
      expect(z['files/000011'].data[5]).toBe(12);
      expect([...z['files/000020'].data]).toEqual([21]);
      for (const [n, e] of Object.entries(z)) expect(e.crc, n).toBe(crc32(e.data));
      await made.done(0);
      expect(await scratchNames()).toEqual([]);
      expect(changes).toBe(0); // closed before it was deleted, not made to close
      delete indexedDB.open;
    }, 30000);
    it('sweeps away scratch over an hour old left by a backup that never finished', async () => {
      const names = [`df-backup-scratch-${NOW - 3600001}-aaaa`, `df-backup-scratch-${NOW - 3600000}-bbbb`, `df-backup-scratch-${NOW - 10}-cccc`, 'df-backup-scratch-old', 'df-backup-scratch-12x-dddd', 'df-backup-scratch-a1-ffff', `x-df-backup-scratch-${NOW - 9e9}-eeee`, 'abcdefghijklmnopqr1-gggg'];
      for (const n of names) (await makeDb(n, { f: {} })).close();
      (await makeDb('nb', { s: { rows: [[1, 'a']] } })).close();
      await D.zipBackup({ app: 'x', databases: ['nb'] });
      await vi.waitFor(async () => expect(await dbList()).not.toContain(names[0]));
      expect(await dbList()).toEqual([...names.slice(1), 'nb'].sort());
    });
    it('passes over databases the browser lists without a name', async () => {
      const old = `df-backup-scratch-${NOW - 9e9}-aaaa`;
      (await makeDb(old, { f: {} })).close();
      (await makeDb('nb', { s: { rows: [[1, 'a']] } })).close();
      const real = indexedDB.databases.bind(indexedDB);
      indexedDB.databases = async () => [{ version: 1 }, ...(await real())];
      await D.zipBackup({ app: 'x', databases: ['nb'] });
      delete indexedDB.databases;
      await vi.waitFor(async () => expect(await dbList()).toEqual(['nb']));
    });
    it("doesn't sweep when the list of databases can't be had (and fails if it can't list them for itself)", async () => {
      (await makeDb(`df-backup-scratch-${NOW - 9e9}-aaaa`, { f: {} })).close();
      (await makeDb('nb', { s: { rows: [[1, 'a']] } })).close();
      indexedDB.databases = () => Promise.reject(new Error('no list'));
      await expectError(D.zipBackup({ app: 'x', databases: ['nb'] }), 'no list');
      indexedDB.databases = undefined;
      const made = await D.zipBackup({ app: 'x', databases: ['nb'] });
      expect(made.parts.length).toBe(1);
      delete indexedDB.databases;
      expect(await dbList()).toContain(`df-backup-scratch-${NOW - 9e9}-aaaa`);
    });
    it('backs up every database asked for when the browser cannot list them (making the missing ones)', async () => {
      (await makeDb('nb', { s: { rows: [[1, 'a']] } })).close();
      indexedDB.databases = undefined;
      const made = await D.zipBackup({ app: 'x', databases: ['nb', 'missing'] });
      const m = jsonOf((await byName(made.parts[0]))['backup.json']);
      expect(Object.keys(m.databases)).toEqual(['nb', 'missing']);
      expect(m.databases.missing).toEqual({ version: 1, stores: {} });
    });
    it('gives up when a stored copy comes back shorter than it went in', async () => {
      (await makeDb('nb', { s: { rows: [[1, new Uint8Array(4).buffer], [2, new Uint8Array(4).buffer]] } })).close();
      const real = IDBObjectStore.prototype.put;
      let n = 0;
      vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (v, k) {
        return this.transaction.db.name.startsWith('df-backup-scratch-') && n++ === 1 ? real.call(this, v.slice(0, 3), k) : real.call(this, v, k);
      });
      await expectError(D.zipBackup({ app: 'x', databases: ['nb'] }), "The backup couldn't be put together. Try again.");
      expect(await scratchNames()).toEqual([]);
    });
    it("gives up, clearing the scratch, when the stored copies don't come back as files", async () => {
      // Some browsers' IndexedDB can't keep Blobs (jsdom's here: they come back as plain objects).
      (await makeDb('nb', { s: { rows: [[1, new Uint8Array(4).buffer]] } })).close();
      globalThis.Blob = JsdomBlob;
      try {
        await expectError(D.zipBackup({ app: 'x', databases: ['nb'] }), "The backup couldn't be put together. Try again.");
      } finally { globalThis.Blob = NodeBlob; }
      expect(await scratchNames()).toEqual([]);
    });
  });

  it('writes zip64 records for a photo past 4 GB and the files after it', async () => {
    const undo = pretendBigger('x/huge', 2 ** 32);
    try {
      (await makeDb('nb', { s: { rows: [[1, [new NodeBlob(['HUGE'], { type: 'x/huge' }), new NodeBlob(['after'])]]] } })).close();
      const made = await D.zipBackup({ app: 'x', databases: ['nb'] });
      const b = new Uint8Array(await made.parts[0].arrayBuffer());
      const dv = new DataView(b.buffer);
      const find = (sig, from = 0) => { for (let i = from; i + 4 <= b.length; i++) if (dv.getUint32(i, true) === sig) return i; return -1; };
      const all = (sig) => { const out = []; for (let i = find(sig); i >= 0; i = find(sig, i + 1)) out.push(i); return out; };
      const name = (at, len) => Buffer.from(b.subarray(at, at + len)).toString();
      const real = 4 + 2 ** 32;
      // Local headers: the big one has its sizes in a zip64 extra; the next one is plain.
      const locals = all(0x04034b50).map((at) => ({ at, v: dv.getUint16(at + 4, true), c: dv.getUint32(at + 18, true), u: dv.getUint32(at + 22, true), n: name(at + 30, dv.getUint16(at + 26, true)), x: dv.getUint16(at + 28, true) }));
      expect(locals.map((l) => l.n)).toEqual(['backup.json', 'part.json', 'files/000000', 'files/000001']);
      const big = locals[2];
      expect([big.v, big.c, big.u, big.x]).toEqual([45, 0xffffffff, 0xffffffff, 20]);
      const bx = big.at + 30 + 12;
      expect([dv.getUint16(bx, true), dv.getUint16(bx + 2, true), dv.getUint32(bx + 4, true) + dv.getUint32(bx + 8, true) * 2 ** 32, dv.getUint32(bx + 12, true) + dv.getUint32(bx + 16, true) * 2 ** 32]).toEqual([1, 16, real, real]);
      expect(name(bx + 20, 4)).toBe('HUGE');
      expect([locals[3].v, locals[3].c, locals[3].u, locals[3].x]).toEqual([20, 5, 5, 0]);
      // Central records: the big one and the one past 4 GB have zip64 extras.
      const get64 = (at) => dv.getUint32(at, true) + dv.getUint32(at + 4, true) * 2 ** 32;
      const cens = all(0x02014b50).map((at) => ({ at, made: dv.getUint16(at + 4, true), need: dv.getUint16(at + 6, true), c: dv.getUint32(at + 20, true), u: dv.getUint32(at + 24, true), x: dv.getUint16(at + 30, true), off: dv.getUint32(at + 42, true), n: name(at + 46, dv.getUint16(at + 28, true)) }));
      expect(cens.map((c) => c.n)).toEqual(['backup.json', 'part.json', 'files/000000', 'files/000001']);
      expect(cens.slice(0, 2).map((c) => [c.made, c.need, c.x])).toEqual([[20, 20, 0], [20, 20, 0]]);
      const [, , cb, ca] = cens;
      const bigAt = big.at;
      expect([cb.made, cb.need, cb.c, cb.u, cb.x, cb.off]).toEqual([45, 45, 0xffffffff, 0xffffffff, 28, 0xffffffff]);
      let x = cb.at + 46 + 12;
      expect([dv.getUint16(x, true), dv.getUint16(x + 2, true), get64(x + 4), get64(x + 12), get64(x + 20)]).toEqual([1, 24, real, real, bigAt]);
      const afterAt = bigAt + 30 + 12 + 20 + real;
      x = ca.at + 46 + 12;
      expect([ca.made, ca.need, ca.c, ca.u, ca.x, ca.off]).toEqual([45, 45, 0xffffffff, 0xffffffff, 28, 0xffffffff]);
      expect([dv.getUint16(x, true), dv.getUint16(x + 2, true), get64(x + 4), get64(x + 12), get64(x + 20)]).toEqual([1, 24, 5, 5, afterAt]);
      // The end: a zip64 end record and its locator, then the usual end record pointing to them.
      const cenAt = afterAt + 30 + 12 + 5;
      const cenSize = cens.reduce((n, c) => n + 46 + dv.getUint16(c.at + 28, true) + c.x, 0);
      const z = find(0x06064b50);
      expect([get64(z + 4), dv.getUint16(z + 12, true), dv.getUint16(z + 14, true), get64(z + 24), get64(z + 32), get64(z + 40), get64(z + 48)]).toEqual([44, 45, 45, 4, 4, cenSize, cenAt]);
      expect([dv.getUint32(z + 56, true), get64(z + 64), dv.getUint32(z + 72, true)]).toEqual([0x07064b50, cenAt + cenSize, 1]);
      const e = z + 76;
      expect([dv.getUint32(e, true), dv.getUint16(e + 8, true), dv.getUint16(e + 10, true), dv.getUint32(e + 12, true), dv.getUint32(e + 16, true), b.length - e]).toEqual([0x06054b50, 4, 4, cenSize, 0xffffffff, 22]);
    } finally { undo(); }
  });
});

describe('zip64 from 0xffffffff bytes (4 GB less one: the mark for "in the zip64 extra")', () => {
  // Backs up one row of photos: 'H' a 4-byte photo said to be `extra` bytes
  // bigger, 'T' a small one after it. The layout before the big photo is the
  // same from run to run (fixed time and id), so a first run with extra 0
  // tells where it starts.
  async function backup(files, extra) {
    D = await loadDFData();
    const undo = pretendBigger('x/huge', extra);
    try {
      const blobs = files.map((t) => (t === 'H' ? new NodeBlob(['HUGE'], { type: 'x/huge' }) : new NodeBlob(['tail'])));
      (await makeDb('nb', { s: { rows: [[1, blobs]] } })).close();
      const made = await D.zipBackup({ app: 'x', databases: ['nb'] });
      return new Uint8Array(await made.parts[0].arrayBuffer());
    } finally { undo(); }
  }
  const sigs = (b, sig) => { const dv = new DataView(b.buffer); const out = []; for (let i = 0; i + 4 <= b.length; i++) if (dv.getUint32(i, true) === sig) out.push(i); return out; };
  const nameAt = (b, at, off) => Buffer.from(b.subarray(at + off, at + off + new DataView(b.buffer).getUint16(at + (off === 30 ? 26 : 28), true))).toString();
  const localOf = (b, name) => sigs(b, 0x04034b50).find((at) => nameAt(b, at, 30) === name);
  const centralOf = (b, name) => sigs(b, 0x02014b50).find((at) => nameAt(b, at, 46) === name);
  beforeEach(() => { vi.spyOn(Math, 'random').mockReturnValue(0.25); });

  it('writes zip64 end records for 65,535 files (too many to count in the plain one), and reads them back', async () => {
    (await makeDb('nb', { s: { rows: [[1, Array.from({ length: 0xffff - 2 }, (_, i) => new NodeBlob([String(i % 10)]))]] } })).close();
    const made = await D.zipBackup({ app: 'x', databases: ['nb'] });
    const b = new Uint8Array(await made.parts[0].arrayBuffer());
    const dv = new DataView(b.buffer);
    const end = b.length - 22;
    expect([dv.getUint32(end - 20, true), dv.getUint32(end - 76, true)]).toEqual([0x07064b50, 0x06064b50]);
    expect([dv.getUint16(end + 8, true), dv.getUint16(end + 10, true)]).toEqual([0xffff, 0xffff]);
    expect(dv.getUint32(end - 76 + 32, true)).toBe(0xffff);
    await expectError(D.restoreZip(made.parts[0], { databases: ['nb'], check: () => { throw new Error('All 65,535 found.'); } }), 'All 65,535 found.');
  }, 60000);
  it('gives a photo of exactly 0xffffffff bytes its sizes in a zip64 extra', async () => {
    const b = await backup(['H'], 0xffffffff - 4);
    const dv = new DataView(b.buffer);
    const at = localOf(b, 'files/000000');
    expect([dv.getUint16(at + 4, true), dv.getUint32(at + 18, true), dv.getUint16(at + 28, true)]).toEqual([45, 0xffffffff, 20]);
    expect(dv.getUint32(at + 30 + 12 + 4, true) + dv.getUint32(at + 30 + 12 + 8, true) * 2 ** 32).toBe(0xffffffff);
  });
  it('gives a file that starts exactly 0xffffffff bytes in its place in a zip64 extra', async () => {
    const at = localOf(await backup(['H', 'T'], 0), 'files/000000');
    const b = await backup(['H', 'T'], 0xffffffff - at - 42 - 4);
    const dv = new DataView(b.buffer);
    expect(dv.getUint16(localOf(b, 'files/000000') + 4, true)).toBe(20);
    const c = centralOf(b, 'files/000001');
    expect([dv.getUint16(c + 4, true), dv.getUint32(c + 42, true), dv.getUint16(c + 30, true)]).toEqual([45, 0xffffffff, 28]);
    expect(dv.getUint32(c + 46 + 12 + 20, true) + dv.getUint32(c + 46 + 12 + 24, true) * 2 ** 32).toBe(0xffffffff);
  });
  it('writes the zip64 end records when the directory starts exactly 0xffffffff bytes in', async () => {
    const at = localOf(await backup(['H'], 0), 'files/000000');
    const b = await backup(['H'], 0xffffffff - at - 42 - 4);
    const dv = new DataView(b.buffer);
    expect(sigs(b, 0x06064b50).length).toBe(1);
    expect(dv.getUint32(b.length - 22 + 16, true)).toBe(0xffffffff);
    const plain = await backup(['H'], 0);
    expect(sigs(plain, 0x06064b50)).toEqual([]);
  });
});

describe('backupSteps', () => {
  const made = (n, size = 1500) => ({ parts: Array.from({ length: n }, (_, i) => new NodeFile(['x'], `b${i}.zip`)), size, release: vi.fn() });
  beforeEach(() => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
  });
  it('saves a one-file backup in one tap', async () => {
    const m = made(1, 2.5e6);
    const steps = D.backupSteps(m);
    expect(steps.label).toBe('Save the backup');
    expect(steps.note).toBe('Ready: 3 MB.');
    expect(await steps.tap()).toBe(true);
    expect(m.release.mock.calls).toEqual([[0]]);
    expect(await steps.tap()).toBe(true);
    expect(m.release).toHaveBeenCalledTimes(1);
    expect(steps.label).toBe('Save the backup');
  });
  it('saves a backup in parts a file a tap, counting them off', async () => {
    const m = made(3, 1.2e9);
    const steps = D.backupSteps(m);
    expect(steps.note).toBe('Ready: 1.2 GB, in 3 files. Save all 3 to the same place: they go back in together.');
    expect(steps.label).toBe('Save file 1 of 3');
    expect(await steps.tap()).toBe(false);
    expect(steps.label).toBe('Save file 2 of 3');
    expect(await steps.tap()).toBe(false);
    expect(steps.label).toBe('Save file 3 of 3');
    expect(await steps.tap()).toBe(true);
    expect(steps.label).toBe('Save file 3 of 3');
    expect(m.release.mock.calls).toEqual([[0], [1], [2]]);
    expect(URL.createObjectURL.mock.calls.map(([f]) => f.name)).toEqual(['b0.zip', 'b1.zip', 'b2.zip']);
  });
  it('stays on a file whose saving was cancelled', async () => {
    onPhone();
    const m = made(2);
    navigator.share = vi.fn().mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'AbortError' })).mockResolvedValue();
    const steps = D.backupSteps(m);
    expect(await steps.tap()).toBe(false);
    expect(m.release).not.toHaveBeenCalled();
    expect(steps.label).toBe('Save file 1 of 2');
    expect(await steps.tap()).toBe(false);
    expect(steps.label).toBe('Save file 2 of 2');
    expect(navigator.share.mock.calls.map(([o]) => o.title)).toEqual(['b0.zip', 'b0.zip']);
    delete navigator.share;
  });
  it("downloads where there's no share sheet for files (a computer)", async () => {
    navigator.canShare = vi.fn(() => true);
    window.matchMedia = vi.fn(() => ({ matches: false }));
    navigator.share = vi.fn();
    await D.backupSteps(made(1)).tap();
    expect(navigator.share).not.toHaveBeenCalled();
    expect(window.matchMedia).toHaveBeenCalledWith('(pointer: coarse)');
    delete navigator.share;
  });
  it('downloads when the phone cannot share zips, or asking throws', async () => {
    navigator.share = vi.fn();
    window.matchMedia = vi.fn(() => ({ matches: true }));
    navigator.canShare = vi.fn((o) => !o.files);
    await D.backupSteps(made(1)).tap();
    const asked = navigator.canShare.mock.calls[0][0].files[0];
    expect([asked.name, asked.type, asked.size]).toEqual(['backup.zip', 'application/zip', 0]);
    window.matchMedia = () => { throw new Error('no'); };
    navigator.canShare = vi.fn(() => true);
    await D.backupSteps(made(1)).tap();
    expect(navigator.share).not.toHaveBeenCalled();
    delete navigator.share;
  });
});

describe('isZipFile', () => {
  const f = (bytes) => new NodeBlob([new Uint8Array(bytes)]);
  it('is true for a zip', async () => {
    expect(await D.isZipFile(f([0x50, 0x4b, 0x03, 0x04, 0, 0]))).toBe(true);
    (await makeDb('nb', { s: {} })).close();
    expect(await D.isZipFile((await D.zipBackup({ app: 'x', databases: ['nb'] })).parts[0])).toBe(true);
  });
  it('is false for a JSON backup and an empty file', async () => {
    expect(await D.isZipFile(new NodeBlob(['{"app":"ref"}']))).toBe(false);
    expect(await D.isZipFile(f([]))).toBe(false);
    expect(await D.isZipFile(f([0x50, 0x4b, 0x03]))).toBe(false);
  });
  it('checks every one of the four bytes', async () => {
    for (const bad of [[0x51, 0x4b, 3, 4], [0x50, 0x4a, 3, 4], [0x50, 0x4b, 5, 4], [0x50, 0x4b, 3, 5]]) expect(await D.isZipFile(f(bad))).toBe(false);
  });
});
