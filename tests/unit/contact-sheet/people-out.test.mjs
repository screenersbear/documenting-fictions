// contact-sheet/data/people-out.js: Layouts' layouts for the one list of
// people (round 2, connect/08): the handles in each caption, and everyone on
// the shoot its finals came from.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadDFData, NodeBlob } from '../shared/_env.mjs';

let D;
let L;
let db;
beforeEach(async () => {
  D = await loadDFData();
  L = await import('../../../contact-sheet/data/people-out.js');
  db = await import('../../../contact-sheet/data/db.js');
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

const shoot = { id: 's1', title: 'Rooftop portraits', talents: [{ name: 'June Park' }] };
const post = (o) => ({ id: 'p1', name: 'Rooftop portraits, carousel', caption: 'Rooftop portraits with June Park @junepark.jpg. Hair and makeup @iryna.hmua.', post: 'carousel', createdAt: '2026-11-09T10:00:00.000Z', updatedAt: '2026-11-09T12:00:00.000Z', ...o });

describe('layoutThing', () => {
  it('gives a post: its name, kind and day, the handles in its caption and the people on its shoot, opening in the editor', () => {
    expect(L.layoutThing(post(), shoot)).toMatchObject({
      id: 'p1', kind: 'post', title: 'Rooftop portraits, carousel', line: 'Carousel · 9 Nov', day: '2026-11-09',
      people: [{ instagram: 'junepark.jpg' }, { instagram: 'iryna.hmua' }, { name: 'June Park', instagram: '', tiktok: '', role: 'Talent' }],
      params: { layout: 'p1' }, more: { made: '2026-11-09T10:00:00.000Z' }, coverKey: '',
    });
    expect(L.layoutThing(post({ post: 'single' })).line).toBe('Single post · 9 Nov');
  });
  it('fills in what a layout leaves out', async () => {
    const t = L.layoutThing({ id: 'p2', name: ' ' });
    expect(t).toMatchObject({ kind: 'layout', title: 'Untitled layout', line: 'Layout', day: '', people: [], more: { made: '' } });
    expect(await t.covers()).toEqual([]);
    expect(L.layoutThing({ id: 'p3', caption: 'no handles', updatedAt: 'bad' })).toMatchObject({ kind: 'post', line: 'Layout' });
    delete window.DFConnect;
    expect(L.layoutThing(post()).people).toEqual([]);
  });
  it('gives its thumbnail, keyed by its size and when it changed', async () => {
    const t = L.layoutThing(post({ thumb: new NodeBlob([new Uint8Array([4, 5])], { type: 'image/jpeg' }) }));
    expect(t.coverKey).toBe('2:2026-11-09T12:00:00.000Z');
    const [c] = await t.covers();
    expect([c.type, [...new Uint8Array(c.bytes)]]).toEqual(['image/jpeg', [4, 5]]);
    const untyped = L.layoutThing(post({ thumb: new NodeBlob([new Uint8Array([1])]), updatedAt: '' }));
    expect(untyped.coverKey).toBe('1:');
    expect((await untyped.covers())[0].type).toBe('image/jpeg');
  });
});

describe('tellPeople', () => {
  it('tells the list every layout, each with the shoot its finals came from, now and after each change', async () => {
    localStorage.setItem('dailies_state_v1', JSON.stringify({ shoots: [shoot] }));
    const link = await D.saveLink({ type: 'finals', fromApp: 'the-eye', fromId: 's1', toApp: 'contact-sheet' });
    const gone = await D.saveLink({ type: 'finals', fromApp: 'the-eye', fromId: 'deleted', toApp: 'contact-sheet' });
    await db.saveProject(post({ fromEye: link.id }));
    await db.saveProject(post({ id: 'p2', caption: '', post: undefined, fromEye: gone.id }));
    await db.saveProject(post({ id: 'p3', caption: '', fromEye: 'no-such-link' }));
    const spy = vi.spyOn(D, 'publishThings');
    L.tellPeople(0);
    await vi.waitFor(async () => expect((await D.thingsAll()).map((t) => t.key).sort()).toEqual(['contact-sheet:p1', 'contact-sheet:p2', 'contact-sheet:p3']));
    // A handle alone and a name alone can't be told to be one person: two records.
    expect((await D.peopleAll()).map((p) => p.name || p.instagram).sort()).toEqual(['June Park', 'iryna.hmua', 'junepark.jpg']);
    L.tellPeopleFromNowOn();
    await db.deleteProject('p2');
    await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(2), { timeout: 3000 });
    await vi.waitFor(async () => expect((await D.thingsAll()).map((t) => t.key).sort()).toEqual(['contact-sheet:p1', 'contact-sheet:p3']));
  });
  it('tells the year page the layouts made each year, and tells the list without it', async () => {
    await db.saveProject(post());
    await db.saveProject(post({ id: 'p2', createdAt: '2025-06-01T10:00:00.000Z' }));
    const spy = vi.spyOn(D, 'publishThings');
    L.tellPeople(0);
    await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(window.DFYear.readYear('contact-sheet')).toEqual({ 2026: { posts: 1 }, 2025: { posts: 1 } });
    delete window.DFYear;
    L.tellPeople(0);
    await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
  });
  it("works without The Eye, and doesn't mind a failed write or no shared files", async () => {
    await db.saveProject(post());
    vi.spyOn(D, 'publishThings').mockRejectedValue(new Error('full'));
    L.tellPeople(0);
    await vi.waitFor(() => expect(D.publishThings).toHaveBeenCalled());
    delete window.DFData;
    expect(() => L.tellPeople(0)).not.toThrow();
  });
  it("still tells the others when one layout's hand-off can't be read", async () => {
    await db.saveProject(post({ fromEye: 'l1' }));
    await db.saveProject(post({ id: 'p2', caption: '' }));
    vi.spyOn(D, 'getLink').mockRejectedValue(new Error('blocked'));
    L.tellPeople(0);
    await vi.waitFor(async () => expect((await D.thingsAll()).map((t) => [t.key, t.people.length]).sort()).toEqual([['contact-sheet:p1', 2], ['contact-sheet:p2', 0]]));
  });
});
