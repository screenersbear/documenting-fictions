// rounds/data/eye.js: Rounds reading The Eye, never changing it. Its shoots
// (localStorage), the people from shoots since last time (noted for the
// shoot's record in The Eye), A year since, and a talent photo or a shoot's
// first final from The Eye's own database. Inside the suite only: on its own
// (rounds/STANDALONE.md) Rounds has no The Eye.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IDBObjectStore } from 'fake-indexeddb';
import { loadDFData } from '../shared/_env.mjs';

let D;
let E; // rounds/data/eye.js
let db; // rounds/data/db.js
const TODAY = '2026-11-16';
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 16, 10, 0, 0));
  D = await loadDFData();
  db = await import('../../../rounds/data/db.js');
  E = await import('../../../rounds/data/eye.js');
  window.DF_SUITE = { get: () => null }; // inside the suite
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); delete window.DF_SUITE; });

const eyeHas = (shoots) => localStorage.setItem('dailies_state_v1', JSON.stringify({ shoots }));
const shoot = (id, o) => ({
  id, title: `Shoot ${id}`, date: '2026-11-10', status: 'captured',
  talents: [{ id: 't1', name: 'Ana Ruiz', socialHandles: [{ platform: 'instagram', handle: '@ana.jpg' }] }], teamMembers: [], ...o,
});
const peopleLinks = () => D.linksWhere({ fromApp: 'the-eye', type: 'people' });
// The Eye's photo database, as The Eye makes it (version 1, one store), holding `rows`.
async function eyeKeeps(rows, stores = ['images']) {
  const eye = await new Promise((ok, no) => {
    const r = indexedDB.open('starky-moodboards', 1);
    r.onupgradeneeded = () => stores.forEach((s) => r.result.createObjectStore(s));
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  });
  if (rows.length) await new Promise((ok) => { const tx = eye.transaction('images', 'readwrite'); rows.forEach(([k, v]) => tx.objectStore('images').put(v, k)); tx.oncomplete = ok; });
  eye.close();
}

describe('eyeShoots', () => {
  it("is The Eye's shoots", () => {
    eyeHas([{ id: 's1' }, { id: 's2' }]);
    expect(E.eyeShoots()).toEqual([{ id: 's1' }, { id: 's2' }]);
  });
  it('is none before The Eye has kept anything, or when what it kept has no shoots', () => {
    expect(E.eyeShoots()).toEqual([]);
    localStorage.setItem('dailies_state_v1', JSON.stringify({ shoots: 'no' }));
    expect(E.eyeShoots()).toEqual([]);
    localStorage.setItem('dailies_state_v1', 'null');
    expect(E.eyeShoots()).toEqual([]);
  });
  it("is none when what's kept isn't readable", () => {
    localStorage.setItem('dailies_state_v1', '{nope');
    expect(E.eyeShoots()).toEqual([]);
  });
});

describe('bringInFromEye', () => {
  it("brings in the people from shoots since last time, and notes them for the shoot's record", async () => {
    eyeHas([shoot('s1')]);
    expect(await E.bringInFromEye()).toBe(1);
    const [ana] = await db.listPeople();
    expect(ana).toMatchObject({ name: 'Ana Ruiz', instagram: 'ana.jpg', shoots: ['s1'], photoKey: 's1__talent_t1', source: 'eye' });
    expect(await db.getSetting('eyeSeen', null)).toEqual(['s1']);
    const links = await peopleLinks();
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ fromApp: 'the-eye', fromId: 's1', toApp: 'rounds', toId: '', type: 'people', title: 'Shoot s1', names: ['Ana Ruiz'] });
    // Seen once: nothing new the next time.
    expect(await E.bringInFromEye()).toBe(0);
    expect(await db.listPeople()).toHaveLength(1);
  });
  it("keeps one note per shoot, brought up to date", async () => {
    const first = await D.saveLink({ fromApp: 'the-eye', fromId: 's1', toApp: 'rounds', toId: '', type: 'people', title: 'Old', names: ['Someone'] });
    eyeHas([shoot('s1')]);
    await E.bringInFromEye();
    const links = await peopleLinks();
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ id: first.id, title: 'Shoot s1', names: ['Ana Ruiz'] });
  });
  it("passes new shoots by with The shoot's people switched off: seen, but no one brought in", async () => {
    window.DFConnect.setConnect('people', false);
    eyeHas([shoot('s1')]);
    expect(await E.bringInFromEye()).toBe(0);
    expect(await db.listPeople()).toEqual([]);
    expect(await db.getSetting('eyeSeen', null)).toEqual(['s1']);
    expect(await peopleLinks()).toEqual([]);
  });
  it('brings people in without the hand-offs loaded, with nowhere to note them', async () => {
    delete window.DFConnect;
    window.DFData = { ...D, saveLink: undefined };
    eyeHas([shoot('s1')]);
    expect(await E.bringInFromEye()).toBe(1);
    window.DFData = D;
    expect(await peopleLinks()).toEqual([]);
    delete window.DFData;
    eyeHas([shoot('s1'), shoot('s2', { talents: [{ name: 'Bo' }] })]);
    expect(await E.bringInFromEye()).toBe(1);
    expect((await db.listPeople()).map((p) => p.name).sort()).toEqual(['Ana Ruiz', 'Bo']);
  });
  it('still brings them in when the note cannot be made', async () => {
    vi.spyOn(D, 'linksWhere').mockRejectedValue(new Error('blocked'));
    eyeHas([shoot('s1')]);
    expect(await E.bringInFromEye()).toBe(1);
  });
  it("is nothing with no shoots, or none taken yet (seen ones aren't saved again)", async () => {
    expect(await E.bringInFromEye()).toBe(0);
    expect(await db.getSetting('eyeSeen', null)).toBeNull();
    eyeHas([shoot('s1', { status: 'planning' })]);
    expect(await E.bringInFromEye()).toBe(0);
    expect(await db.getSetting('eyeSeen', null)).toBeNull();
    expect(await db.listPeople()).toEqual([]);
  });
});

describe('yearsFromEye', () => {
  const delivered = shoot('s1', { date: '2025-11-10', status: 'delivered' });
  const ana = { id: 'ana', name: 'Ana Ruiz', group: 'client', added: '2025-11-01', letGo: false, shoots: ['s1'], next: { kind: 'checkin', due: '2026-12-20', step: 0 } };
  it('gives the people of a shoot delivered a year ago A year since, once', async () => {
    eyeHas([delivered]);
    await db.savePerson(ana);
    expect(await E.yearsFromEye()).toBe(1);
    const [p] = await db.listPeople();
    expect(p.next).toMatchObject({ kind: 'checkin', due: TODAY, year: { shootId: 's1', shoot: 'Shoot s1' } });
    expect(await db.getSetting('yearSeen', null)).toEqual(['s1']);
    expect(await E.yearsFromEye()).toBe(0);
  });
  it("passes the year by with The shoot's people switched off", async () => {
    window.DFConnect.setConnect('people', false);
    eyeHas([delivered]);
    await db.savePerson(ana);
    expect(await E.yearsFromEye()).toBe(0);
    expect((await db.listPeople())[0].next).toEqual(ana.next);
    expect(await db.getSetting('yearSeen', null)).toEqual(['s1']);
  });
  it('works without the hand-offs loaded, and is nothing with no shoots or none a year old', async () => {
    delete window.DFConnect;
    expect(await E.yearsFromEye()).toBe(0);
    eyeHas([shoot('s1', { status: 'delivered' })]);
    await db.savePerson(ana);
    expect(await E.yearsFromEye()).toBe(0);
    expect(await db.getSetting('yearSeen', null)).toBeNull();
    eyeHas([delivered]);
    expect(await E.yearsFromEye()).toBe(1);
  });
});

describe('eyePhoto', () => {
  it('is a talent photo as The Eye keeps it: a picture, or a picture with its caption', async () => {
    await eyeKeeps([['k1', ['data:image/png;base64,AQ==']], ['k2', [{ src: 'data:image/jpeg;base64,Ag==', caption: 'x' }, 'data:,later']]]);
    expect(await E.eyePhoto('k1')).toBe('data:image/png;base64,AQ==');
    expect(await E.eyePhoto('k2')).toBe('data:image/jpeg;base64,Ag==');
  });
  it("is '' for no photo, an empty list, or something else kept", async () => {
    await eyeKeeps([['empty', []], ['odd', 'data:,x'], ['blank', [{ caption: 'no picture' }]], ['nothing', [null]]]);
    for (const k of ['missing', 'empty', 'odd', 'blank', 'nothing']) expect(await E.eyePhoto(k)).toBe('');
  });
  it("makes The Eye's database the way The Eye does when Rounds opens it first", async () => {
    expect(await E.eyePhoto('k')).toBe('');
    const eye = await new Promise((ok) => { const r = indexedDB.open('starky-moodboards'); r.onsuccess = () => ok(r.result); });
    expect(eye.version).toBe(1);
    expect([...eye.objectStoreNames]).toEqual(['images']);
    eye.close();
  });
  it("is '' when The Eye's database can't be read", async () => {
    await eyeKeeps([], ['other']); // no images store
    expect(await E.eyePhoto('k')).toBe('');
  });
  it("is '' when The Eye's database is newer, or IndexedDB won't open at all", async () => {
    await new Promise((ok) => { const r = indexedDB.open('starky-moodboards', 3); r.onupgradeneeded = () => r.result.createObjectStore('images'); r.onsuccess = () => { r.result.close(); ok(); }; });
    expect(await E.eyePhoto('k')).toBe('');
    vi.spyOn(indexedDB, 'open').mockImplementation(() => { throw new Error('no IndexedDB here'); });
    expect(await E.eyePhoto('k')).toBe('');
  });
  it("is '' when another tab holds on to an older copy of The Eye's database", async () => {
    // (An opening that's blocked: the request says so instead of opening.)
    const req = { set onupgradeneeded(f) {}, set onerror(f) {}, set onsuccess(f) {}, set onblocked(f) { queueMicrotask(f); } };
    vi.spyOn(indexedDB, 'open').mockReturnValue(req);
    expect(await E.eyePhoto('k')).toBe('');
  });
  it("is '' when the photo itself can't be read", async () => {
    await eyeKeeps([['k', ['data:,x']]]);
    vi.spyOn(IDBObjectStore.prototype, 'get').mockImplementation(() => { const r = {}; queueMicrotask(() => r.onerror()); return r; });
    expect(await E.eyePhoto('k')).toBe('');
  });
});

describe('Rounds on its own', () => {
  it("has no The Eye: no shoots, no one brought in, no A year since, no photo, and The Eye's database never opened", async () => {
    eyeHas([shoot('s1'), shoot('s2', { date: '2025-11-10', status: 'delivered' })]);
    await eyeKeeps([['k1', ['data:image/png;base64,AQ==']]]);
    delete window.DF_SUITE;
    const open = vi.spyOn(indexedDB, 'open');
    expect(E.eyeShoots()).toEqual([]);
    expect(await E.bringInFromEye()).toBe(0);
    expect(await E.yearsFromEye()).toBe(0);
    expect(await E.eyePhoto('k1')).toBe('');
    expect(open).not.toHaveBeenCalled();
    expect(await db.listPeople()).toEqual([]);
    expect(await peopleLinks()).toEqual([]);
  });
});
