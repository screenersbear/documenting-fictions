// rounds/data/to-ref.js: a yes passed to Ref as a 'new-client' link in
// df-links (who it is, their handle, when they were pitched, their photo),
// only while New clients is switched on; and taken back while Ref hasn't
// started their board. Inside the suite only: on its own (rounds/STANDALONE.md)
// Rounds has no Ref.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadDFData, NodeBlob } from '../shared/_env.mjs';

let D;
let R; // rounds/data/to-ref.js
let db; // rounds/data/db.js
beforeEach(async () => {
  D = await loadDFData();
  db = await import('../../../rounds/data/db.js');
  R = await import('../../../rounds/data/to-ref.js');
  window.DF_SUITE = { get: () => null }; // inside the suite
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); delete window.DF_SUITE; });

const person = (o) => ({ id: 'ana', name: 'Ana Ruiz', group: 'client', instagram: 'ana.jpg', photoKey: '', ...o });
const linkOf = async (p) => R.refLinkFor(p);
const coverOf = async (l) => (await D.linkPictures(l.id))?.cover;
const bytesOf = (cover) => [...new Uint8Array(cover.bytes)];
// A talent photo kept in The Eye's database, as The Eye keeps it.
async function eyeKeeps(key, value) {
  const eye = await new Promise((ok, no) => {
    const r = indexedDB.open('starky-moodboards', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('images');
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  });
  await new Promise((ok) => { const tx = eye.transaction('images', 'readwrite'); tx.objectStore('images').put(value, key); tx.oncomplete = ok; });
  eye.close();
}

describe('passToRef', () => {
  it('makes their link to Ref: who, their handle and when they were pitched, with their own photo', async () => {
    await db.savePhoto('ana', new Uint8Array([1, 2, 3]).buffer, 'image/png');
    const p = person();
    await R.passToRef(p, '2026-11-02');
    const l = await linkOf(p);
    expect(l).toMatchObject({ fromApp: 'rounds', fromId: 'ana', toApp: 'ref', toId: '', type: 'new-client', name: 'Ana Ruiz', handle: 'ana.jpg', pitched: '2026-11-02' });
    const cover = await coverOf(l);
    expect(cover.type).toBe('image/png');
    expect(bytesOf(cover)).toEqual([1, 2, 3]);
  });
  it('calls a photo with no type a JPEG', async () => {
    await db.savePhoto('ana', new Uint8Array([9]).buffer, '');
    await R.passToRef(person(), '');
    expect((await coverOf(await linkOf(person()))).type).toBe('image/jpeg');
  });
  it('takes their photo from The Eye when Rounds has none of its own', async () => {
    await eyeKeeps('s1__talent_t1', ['data:image/webp;base64,AQID']);
    const p = person({ photoKey: 's1__talent_t1' });
    await R.passToRef(p, '');
    const cover = await coverOf(await linkOf(p));
    expect(cover.type).toBe('image/webp');
    expect(bytesOf(cover)).toEqual([1, 2, 3]);
  });
  it("calls a photo from The Eye with no type a JPEG", async () => {
    await eyeKeeps('k', ['data:,AB']);
    vi.stubGlobal('fetch', async () => ({ blob: async () => new NodeBlob([new Uint8Array([7])]) }));
    await R.passToRef(person({ photoKey: 'k' }), '');
    const cover = await coverOf(await linkOf(person()));
    expect(cover.type).toBe('image/jpeg');
    expect(bytesOf(cover)).toEqual([7]);
  });
  it('passes them on with no photo when there is none, or it will not load', async () => {
    await R.passToRef(person(), '');
    expect(await coverOf(await linkOf(person()))).toBeUndefined();
    await eyeKeeps('k', ['data:image/png;base64,AQ==']);
    vi.stubGlobal('fetch', async () => { throw new Error('offline'); });
    await R.passToRef(person({ photoKey: 'k' }), '');
    expect(await linkOf(person())).toMatchObject({ type: 'new-client', name: 'Ana Ruiz' });
    await R.passToRef(person({ photoKey: 'nothing-there' }), '');
    expect(await linkOf(person())).toMatchObject({ type: 'new-client' });
  });
  it("brings their link up to date, keeping it and the board Ref started", async () => {
    const first = await R.passToRef(person(), '2026-11-02');
    await D.saveLink({ ...first, toId: 'board-1' });
    await R.passToRef(person({ name: 'Ana R.', instagram: '' }), '2026-11-09');
    const all = await D.linksWhere({ fromApp: 'rounds', fromId: 'ana', type: 'new-client' });
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ id: first.id, toId: 'board-1', name: 'Ana R.', handle: '', pitched: '2026-11-09' });
  });
  it('passes no one on with New clients switched off, or outside the suite', async () => {
    window.DFConnect.setConnect('clients', false);
    expect(await R.passToRef(person(), '')).toBeNull();
    expect(await linkOf(person())).toBeNull();
    window.DFConnect.setConnect('clients', true);
    const connect = window.DFConnect;
    delete window.DFConnect;
    expect(await R.passToRef(person(), '')).toBeNull();
    window.DFConnect = connect;
    window.DFData = { ...D, saveLink: undefined };
    expect(await R.passToRef(person(), '')).toBeNull();
    delete window.DFData;
    expect(await R.passToRef(person(), '')).toBeNull();
    window.DFData = D;
    expect(await linkOf(person())).toBeNull();
  });
});

describe('refLinkFor', () => {
  it('is their link to Ref, and no one else\'s', async () => {
    await R.passToRef(person(), '');
    await R.passToRef(person({ id: 'bo', name: 'Bo' }), '');
    expect((await linkOf(person())).name).toBe('Ana Ruiz');
    expect((await linkOf(person({ id: 'bo' }))).name).toBe('Bo');
    expect(await linkOf(person({ id: 'cy' }))).toBeNull();
  });
  it('is none outside the suite', async () => {
    delete window.DFConnect;
    expect(await linkOf(person())).toBeNull();
  });
});

describe('takeBackFromRef', () => {
  it('takes the link back while Ref has not started their board', async () => {
    await R.passToRef(person(), '');
    await R.takeBackFromRef(person());
    expect(await linkOf(person())).toBeNull();
  });
  it('leaves a board already started, with everything in it', async () => {
    const l = await R.passToRef(person(), '');
    await D.saveLink({ ...l, toId: 'board-1' });
    await R.takeBackFromRef(person());
    expect(await linkOf(person())).toMatchObject({ toId: 'board-1' });
  });
  it('does nothing for someone never passed on, or without the hand-offs loaded', async () => {
    await expect(R.takeBackFromRef(person())).resolves.toBeUndefined();
    delete window.DFConnect;
    await expect(R.takeBackFromRef(person())).resolves.toBeUndefined();
  });
});

describe('Rounds on its own', () => {
  it('passes nothing to Ref, finds no link, and takes nothing back', async () => {
    const l = await R.passToRef(person(), '2026-11-02');
    delete window.DF_SUITE;
    expect(await R.passToRef(person({ id: 'bo', name: 'Bo' }), '')).toBeNull();
    expect(await D.linksWhere({ fromApp: 'rounds', fromId: 'bo' })).toEqual([]);
    expect(await linkOf(person())).toBeNull();
    await R.takeBackFromRef(person());
    expect((await D.linksWhere({ fromApp: 'rounds', type: 'new-client' })).map((x) => x.id)).toEqual([l.id]);
  });
});
