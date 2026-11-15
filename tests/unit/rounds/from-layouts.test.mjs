// rounds/data/from-layouts.js: posts shared from Layouts that tag people
// Rounds knows ('post-people' links in df-links). Each post is taken once:
// the people tagged get Your photos are up, the link keeps who they were,
// and a post that tags no one here is put away without a slip.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadDFData } from '../shared/_env.mjs';
import { photosUp } from '../../../rounds/data/photos-up.js';

let D;
let L; // rounds/data/from-layouts.js
let db; // rounds/data/db.js
const TODAY = '2026-11-16';
const NOW = new Date(2026, 10, 16, 10, 0, 0);
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  D = await loadDFData();
  db = await import('../../../rounds/data/db.js');
  L = await import('../../../rounds/data/from-layouts.js');
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

const person = (id, instagram, o) => ({ id, name: id, group: 'client', added: '2026-11-01', letGo: false, shoots: [], instagram, next: { kind: 'checkin', due: '2026-12-01', step: 0 }, ...o });
const post = (id, handles, o) => ({ id, fromApp: 'contact-sheet', fromId: id, toApp: 'rounds', toId: '', type: 'post-people', title: 'Rooftop', handles, ...o });
const strip = ({ createdAt, updatedAt, ...rest }) => rest;
const linkNow = async (id) => D.getLink(id);

describe('takeFromLayouts', () => {
  it("gives the people tagged Your photos are up, and notes on the post who they were", async () => {
    const ana = person('ana', 'ana.jpg');
    const bo = person('bo', 'bo_shoots');
    const cy = person('cy', 'cy');
    await db.savePeople([ana, bo, cy]);
    await D.saveLink(post('p1', ['@Ana.jpg', 'bo_shoots', 'stranger']));
    expect(await L.takeFromLayouts()).toBe(2);
    expect(strip(await db.getPerson('ana'))).toEqual(photosUp(ana, 'Rooftop', TODAY));
    expect(strip(await db.getPerson('bo'))).toEqual(photosUp(bo, 'Rooftop', TODAY));
    expect(strip(await db.getPerson('cy'))).toEqual(cy);
    const l = await linkNow('p1');
    expect(l).toMatchObject({ takenAt: NOW.toISOString(), people: ['ana', 'bo'] });
    expect(l.tuckedAt).toBeUndefined();
    // Taken once: the next look finds nothing waiting.
    expect(await L.takeFromLayouts()).toBe(0);
  });
  it('puts a post that tags no one here away, with no one on it', async () => {
    await db.savePerson(person('ana', 'ana.jpg'));
    await D.saveLink(post('p1', ['nobody']));
    expect(await L.takeFromLayouts()).toBe(0);
    expect(await linkNow('p1')).toMatchObject({ takenAt: NOW.toISOString(), tuckedAt: NOW.toISOString(), people: [] });
    expect(strip(await db.getPerson('ana'))).toEqual(person('ana', 'ana.jpg'));
  });
  it('takes several posts, each person once, and leaves posts already taken', async () => {
    const ana = person('ana', 'ana.jpg');
    await db.savePerson(ana);
    await D.saveLink(post('p1', ['ana.jpg'], { title: 'First' }));
    await D.saveLink(post('p2', ['ana.jpg'], { title: 'Second' }));
    await D.saveLink(post('old', ['ana.jpg'], { title: 'Old', takenAt: '2026-11-01T00:00:00.000Z', people: [] }));
    expect(await L.takeFromLayouts()).toBe(1);
    expect((await db.getPerson('ana')).next.kind).toBe('photos');
    expect((await linkNow('old')).people).toEqual([]);
    expect((await linkNow('old')).takenAt).toBe('2026-11-01T00:00:00.000Z');
  });
  it("only takes Rounds' own post links", async () => {
    await db.savePerson(person('ana', 'ana.jpg'));
    await D.saveLink(post('p1', ['ana.jpg'], { toApp: 'ref' }));
    await D.saveLink(post('p2', ['ana.jpg'], { type: 'moodboard' }));
    expect(await L.takeFromLayouts()).toBe(0);
    expect((await linkNow('p1')).takenAt).toBeUndefined();
    expect((await linkNow('p2')).takenAt).toBeUndefined();
  });
  it('is nothing with nothing waiting', async () => {
    await db.savePerson(person('ana', 'ana.jpg'));
    expect(await L.takeFromLayouts()).toBe(0);
  });
  it('is nothing without the suite\'s shared files, or without their links', async () => {
    const had = window.DFData;
    window.DFData = { ...had, linksWhere: undefined };
    expect(await L.takeFromLayouts()).toBe(0);
    delete window.DFData;
    expect(await L.takeFromLayouts()).toBe(0);
    window.DFData = had;
  });
});
