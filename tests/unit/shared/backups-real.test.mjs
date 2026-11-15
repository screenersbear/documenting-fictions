// Back up end to end, over the real df-data.js and real zips: a backup made
// on one device and restored on another, one notebook or all four, and an
// old backup that still has Overthoughts in it (taken out on 15 Nov).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { loadDFData, makeDb, rawAll, rawOpen, dbList } from './_env.mjs';
import { load } from './_backups.mjs';

let D;
let B;
beforeEach(async () => {
  D = await loadDFData();
  B = await load(D);
});
afterEach(() => { delete window.DFData; delete window.DFBackups; });

const newDevice = () => { globalThis.indexedDB = new IDBFactory(); localStorage.clear(); };
const all = async (name, store) => { const db = await rawOpen(name); try { return await rawAll(db, store); } finally { db.close(); } };
async function seed() {
  (await makeDb('ref-notebook', { boards: { keyPath: 'id', rows: [{ id: 'b1', name: 'Board' }] } })).close();
  (await makeDb('rounds', { people: { keyPath: 'id', rows: [{ id: 'p1', name: 'Ana' }] } })).close();
  (await makeDb('rounds-device', { s: { rows: [['id', 'this-phone']] } })).close();
  localStorage.setItem('ref-notebook-book', 'ocean');
  localStorage.setItem('rounds-book', 'leaf');
}

describe('a backup of all four, on a new device', () => {
  it('brings every notebook back, and never Rounds\' device key', async () => {
    await seed();
    const made = await B.makeBackup();
    newDevice();
    expect(await B.whatsIn(made.parts)).toEqual({ all: true });
    await B.restore(made.parts);
    expect(await all('ref-notebook', 'boards')).toEqual([['b1', { id: 'b1', name: 'Board' }]]);
    expect(await all('rounds', 'people')).toEqual([['p1', { id: 'p1', name: 'Ana' }]]);
    expect(await dbList()).not.toContain('rounds-device');
    expect(localStorage.getItem('ref-notebook-book')).toBe('ocean');
    expect(localStorage.getItem('rounds-book')).toBe('leaf');
  });
  it('gives just one notebook its part, the others left as they are', async () => {
    await seed();
    const made = await B.makeBackup();
    newDevice();
    (await makeDb('ref-notebook', { boards: { keyPath: 'id', rows: [{ id: 'mine' }] } })).close();
    await B.restore(made.parts, { only: 'rounds' });
    expect(await all('rounds', 'people')).toEqual([['p1', { id: 'p1', name: 'Ana' }]]);
    expect(await all('ref-notebook', 'boards')).toEqual([['mine', { id: 'mine' }]]);
    expect(localStorage.getItem('rounds-book')).toBe('leaf');
    expect(localStorage.getItem('ref-notebook-book')).toBeNull();
  });
});

describe('a backup of one notebook', () => {
  it('is that notebook alone, and goes back into it', async () => {
    await seed();
    const made = await B.makeBackup(undefined, 'ref');
    expect(made.parts.map((f) => f.name)).toEqual([`ref-backup-${D.todayStr()}.zip`]);
    newDevice();
    expect(await B.whatsIn(made.parts)).toEqual({ app: 'ref' });
    await B.restore(made.parts, { only: 'ref' });
    expect(await all('ref-notebook', 'boards')).toEqual([['b1', { id: 'b1', name: 'Board' }]]);
    expect(await dbList()).toEqual(['ref-notebook']);
    expect(localStorage.getItem('ref-notebook-book')).toBe('ocean');
  });
  it("is the same backup Ref's own Options made, so either goes back in", async () => {
    await seed();
    const own = await D.zipBackup({ app: 'ref', databases: ['ref-notebook'], extra: { book: 'ocean' } });
    newDevice();
    await B.restore(own.parts, { only: 'ref' });
    expect(await all('ref-notebook', 'boards')).toEqual([['b1', { id: 'b1', name: 'Board' }]]);
    expect(localStorage.getItem('ref-notebook-book')).toBe('ocean');
  });
  it("won't go into a different notebook", async () => {
    await seed();
    const made = await B.makeBackup(undefined, 'ref');
    newDevice();
    await expect(B.restore(made.parts, { only: 'rounds' })).rejects.toThrow('That file is a backup of a different notebook.');
    expect(await dbList()).toEqual([]);
  });
});

describe('an old backup with Overthoughts in it', () => {
  async function oldBackup() {
    await seed();
    (await makeDb('overthoughts', { entries: { keyPath: 'id', rows: [{ id: 'e1' }] } })).close();
    localStorage.setItem('overthoughts-book', 'fern');
    return D.zipBackup({
      app: 'documenting-fictions', kind: 'suite',
      databases: ['ref-notebook', 'overthoughts', 'rounds'],
      local: ['ref-notebook-book', 'overthoughts-book', 'rounds-book'],
    });
  }
  it('restores fine and skips that part', async () => {
    const made = await oldBackup();
    newDevice();
    await B.restore(made.parts);
    expect(await dbList()).toEqual(['ref-notebook', 'rounds']);
    expect(localStorage.getItem('overthoughts-book')).toBeNull();
    expect(localStorage.getItem('ref-notebook-book')).toBe('ocean');
  });
  it("one of Overthoughts on its own isn't taken", async () => {
    await seed();
    (await makeDb('overthoughts', { entries: { keyPath: 'id', rows: [{ id: 'e1' }] } })).close();
    const own = await D.zipBackup({ app: 'overthoughts', databases: ['overthoughts'] });
    newDevice();
    await expect(B.whatsIn(own.parts)).rejects.toThrow('That file is a backup of a different notebook.');
    expect(await dbList()).toEqual([]);
  });
});
