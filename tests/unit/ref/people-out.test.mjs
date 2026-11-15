// ref/data/people-out.js: Ref's boards for the one list of people (round 2,
// connect/08): who each is for and who was on the shoots it went to.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadDFData } from '../shared/_env.mjs';

let D;
let R;
let db;
beforeEach(async () => {
  D = await loadDFData();
  R = await import('../../../ref/data/people-out.js');
  db = await import('../../../ref/data/db.js');
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

const board = (o) => ({ id: 'b1', name: 'Rooftop, golden hour', pages: [{ images: [{ id: 'a' }, null, { id: 'b' }] }, { images: [{ id: 'a' }, { id: 'c' }, { id: 'd' }] }], createdAt: '2026-11-01T10:00:00.000Z', updatedAt: '2026-11-07T10:00:00.000Z', ...o });
const shoot = { id: 's1', title: 'Rooftop portraits', talents: [{ name: 'June Park', socialHandles: [{ platform: 'instagram', handle: 'junepark.jpg' }] }] };
const eye = (shoots) => localStorage.setItem('dailies_state_v1', JSON.stringify({ shoots }));

describe('boardThing', () => {
  it('gives a board: its name, pages and shoot, who it is for and who was on it, opening at the board', () => {
    const t = R.boardThing(board({ client: { name: 'Dana Ortiz', handle: 'dana.o' } }), [shoot]);
    expect(t).toMatchObject({
      id: 'b1', kind: 'board', title: 'Rooftop, golden hour', line: '2 pages · for Rooftop portraits', day: '2026-11-07',
      people: [{ name: 'Dana Ortiz', instagram: 'dana.o' }, { name: 'June Park', instagram: 'junepark.jpg', tiktok: '', role: 'Talent' }],
      params: { board: 'b1' }, more: { made: '2026-11-01T10:00:00.000Z' }, coverKey: 'a,b,c',
    });
  });
  it('fills in what a board leaves out', () => {
    expect(R.boardThing({ id: 'b2', name: ' ', pages: [{}], client: { name: '' } })).toMatchObject({ title: 'Mood board', line: '1 page', day: '', people: [], more: { made: '' }, coverKey: '' });
    expect(R.boardThing({ id: 'b3' })).toMatchObject({ line: '0 pages', people: [] });
    expect(R.boardThing(board({ client: { name: 'Dana' } })).people).toEqual([{ name: 'Dana', instagram: '' }]);
  });
  it("gives its first three photos' thumbnails, those still there", async () => {
    await db.addPhoto({ id: 'a', name: 'a' }, new Uint8Array([1]), new Uint8Array([10, 11]));
    await db.addPhoto({ id: 'c', name: 'c' }, new Uint8Array([3]), new Uint8Array([30]));
    const covers = await R.boardThing(board()).covers();
    expect(covers.map((c) => [c.type, [...new Uint8Array(c.bytes)]])).toEqual([['image/jpeg', [10, 11]], ['image/jpeg', [30]]]);
  });
});

describe('tellPeople', () => {
  it('tells the list every board, with the shoots each was sent to, now and after each change', async () => {
    eye([shoot, { id: 's2', title: 'Other' }]);
    await db.saveBoard(board());
    await db.saveBoard(board({ id: 'b2', name: 'Second' }));
    await D.saveLink({ type: 'moodboard', fromApp: 'ref', fromId: 'b1', toApp: 'the-eye', toId: 's1' });
    await D.saveLink({ type: 'moodboard', fromApp: 'ref', fromId: 'b1', toApp: 'the-eye', toId: 'gone' });
    const spy = vi.spyOn(D, 'publishThings');
    R.tellPeople(0);
    await vi.waitFor(async () => expect((await D.thingsAll()).map((t) => [t.key, t.line])).toEqual([['ref:b1', '2 pages · for Rooftop portraits'], ['ref:b2', '2 pages']]));
    expect((await D.peopleAll()).map((p) => p.name)).toEqual(['June Park']);
    R.tellPeopleFromNowOn();
    await db.deleteBoard('b2');
    await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(2), { timeout: 3000 });
    await vi.waitFor(async () => expect((await D.thingsAll()).map((t) => t.key)).toEqual(['ref:b1']));
  });
  it("works without The Eye, and doesn't mind a failed write or no shared files", async () => {
    await db.saveBoard(board());
    vi.spyOn(D, 'publishThings').mockRejectedValue(new Error('full'));
    R.tellPeople(0);
    await vi.waitFor(() => expect(D.publishThings).toHaveBeenCalled());
    expect(D.publishThings.mock.calls[0][1][0].line).toBe('2 pages');
    delete window.DFData;
    expect(() => R.tellPeople(0)).not.toThrow();
  });
});
