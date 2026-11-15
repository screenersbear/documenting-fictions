// rounds/data/people-out.js: Rounds' people for the one list of people
// (round 2, connect/08), and names changed on the person page coming back.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadDFData } from '../shared/_env.mjs';

let D;
let R; // rounds/data/people-out.js
let db; // rounds/data/db.js
beforeEach(async () => {
  D = await loadDFData();
  R = await import('../../../rounds/data/people-out.js');
  db = await import('../../../rounds/data/db.js');
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

const WEEK = { work: [1, 2, 3, 4, 5], off: [0] };
const TODAY = '2026-11-16'; // a Monday
const person = (o) => ({ id: 'r1', name: 'June Park', group: 'regular', instagram: 'junepark.jpg', tiktok: '', letGo: false, photoKey: '', next: { kind: 'checkin', due: '2026-12-02', step: 0 }, ...o });

describe('dueLine', () => {
  it('says when the move is due, as the person page does', () => {
    expect(R.dueLine({ kind: 'checkin', due: '2026-12-02' }, WEEK, TODAY)).toBe('Due 2 Dec');
    expect(R.dueLine({ kind: 'checkin', due: '2026-11-16' }, WEEK, TODAY)).toBe('Due today');
    expect(R.dueLine({ kind: 'checkin', due: '2026-11-10' }, WEEK, TODAY)).toBe('Due today');
    expect(R.dueLine({ kind: 'checkin', due: '2026-11-17' }, WEEK, TODAY)).toBe('Due tomorrow');
    expect(R.dueLine({ kind: 'checkin', due: '2026-11-19' }, WEEK, TODAY)).toBe('Due Thursday');
  });
});

describe('personThing', () => {
  it('gives a person: their name, next move and when, group, opening at them', () => {
    const t = R.personThing(person({ updatedAt: '2026-11-01T00:00:00.000Z' }), TODAY, WEEK, false);
    expect(t).toMatchObject({
      id: 'r1', kind: 'person', title: 'June Park', line: 'Check in, due 2 Dec', day: '2026-12-02',
      people: [{ name: 'June Park', instagram: 'junepark.jpg', tiktok: '', roundsId: 'r1', at: '2026-11-01T00:00:00.000Z' }],
      params: { person: 'r1' }, coverKey: '',
      more: { next: { title: 'Check in', line: 'Due 2 Dec', bg: '#0A4FD6' }, group: 'Regular' },
    });
    expect(t.more.next.icon).toContain('<svg');
  });
  it('says so when nothing is planned, or they were let go', () => {
    expect(R.personThing(person({ next: null, group: 'odd' }), TODAY, WEEK, false)).toMatchObject({ line: 'Nothing planned', day: '', more: { next: { title: 'Nothing planned', line: '', bg: '#E1E1DC', icon: '' }, group: '' }, people: [{ at: '' }] });
    expect(R.personThing(person({ letGo: true }), TODAY, WEEK, false)).toMatchObject({ line: 'Let go', more: { next: { title: 'Let go' } } });
  });
  it('names someone by a handle when they have no name yet', () => {
    expect(R.personThing(person({ name: '' }), TODAY, WEEK, false).title).toBe('@junepark.jpg');
    expect(R.personThing(person({ name: '', instagram: '', tiktok: 'jp' }), TODAY, WEEK, false).title).toBe('@jp');
    expect(R.personThing(person({ name: '', instagram: '' }), TODAY, WEEK, false).title).toBe('Someone');
    expect(R.personThing(person({ next: { kind: 'intros', due: TODAY } }), TODAY, WEEK, false).line).toBe('Ask who June knows, due today');
  });
  it("gives their photo: one added in Rounds, else The Eye's, else none", async () => {
    await db.savePhoto('r1', new Uint8Array([7, 8]).buffer, 'image/png');
    const own = R.personThing(person(), TODAY, WEEK, true);
    expect(own.coverKey).toBe('own:r1');
    const [pic] = await own.covers();
    expect(pic.type).toBe('image/png');
    expect([...new Uint8Array(pic.bytes)]).toEqual([7, 8]);
    await db.dropPhoto('r1');
    expect(await own.covers()).toEqual([]);
    // The Eye's talent photo, kept there as [{ src }].
    const eye = await D.open('starky-moodboards', 1, (d) => d.createObjectStore('images'));
    await D.putMany(eye, 'images', [['s1__talent_t1', [{ src: 'data:image/jpeg;base64,AQID' }]]]);
    eye.close();
    const fromEye = R.personThing(person({ photoKey: 's1__talent_t1' }), TODAY, WEEK, false);
    expect(fromEye.coverKey).toBe('eye:s1__talent_t1');
    expect([...new Uint8Array((await fromEye.covers())[0].bytes)]).toEqual([1, 2, 3]);
    expect(await R.personThing(person({ photoKey: 'missing' }), TODAY, WEEK, false).covers()).toEqual([]);
    expect(await R.personThing(person(), TODAY, WEEK, false).covers()).toEqual([]);
  });
});

describe('tellPeople', () => {
  it('tells the list its people a moment after the last change, and after every change from then on', async () => {
    await db.savePeople([person(), person({ id: 'r2', name: 'Leo', instagram: '' })]);
    await db.savePhoto('r2', new Uint8Array([1]).buffer, 'image/jpeg');
    const spy = vi.spyOn(D, 'publishThings');
    R.tellPeople(0);
    await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    await vi.waitFor(async () => expect((await D.thingsAll()).map((t) => [t.key, t.coverKey])).toEqual([['rounds:r1', ''], ['rounds:r2', 'own:r2']]));
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    R.tellPeopleFromNowOn();
    await db.savePerson(person({ name: 'June P.' }));
    expect(spy).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1500);
    vi.useRealTimers();
    await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    await vi.waitFor(async () => expect((await D.peopleAll()).map((p) => p.name).sort()).toEqual(['June P.', 'Leo']));
  });
  it("doesn't mind a failed write, or no shared files", async () => {
    vi.spyOn(D, 'publishThings').mockRejectedValue(new Error('full'));
    R.tellPeople(0);
    await vi.waitFor(() => expect(D.publishThings).toHaveBeenCalled());
    delete window.DFData;
    expect(() => R.tellPeople(0)).not.toThrow();
  });
});

describe('takePeopleEdits', () => {
  async function setUp(people) {
    await db.savePeople(people);
    await D.publishThings('rounds', (await db.listPeople()).map((p) => R.personThing(p, TODAY, WEEK, false)));
    return D.peopleAll();
  }
  it('brings a name and handles changed on the person page into the Rounds person', async () => {
    const [june] = await setUp([person()]);
    await D.editPerson(june.id, { name: 'June Park Lee', instagram: 'june.lee', tiktok: 'jl' });
    expect(await R.takePeopleEdits()).toBe(1);
    expect(await db.getPerson('r1')).toMatchObject({ name: 'June Park Lee', instagram: 'june.lee', tiktok: 'jl' });
    expect(await R.takePeopleEdits()).toBe(0); // taken once
  });
  it('keeps a change made in Rounds after the one on the person page, and a name never blanks', async () => {
    const records = await setUp([person(), person({ id: 'r2', name: 'Leo', instagram: 'leo' }), person({ id: 'r3', name: 'Ana', instagram: 'ana' })]);
    const id = (n) => records.find((r) => r.name === n).id;
    await D.editPerson(id('June Park'), { name: 'June Park Lee', instagram: 'junepark.jpg' });
    await D.editPerson(id('Leo'), { name: '', instagram: 'leo' }); // nothing new
    await D.editPerson(id('Ana'), { name: 'Ana', instagram: 'ana.new' });
    await new Promise((ok) => setTimeout(ok, 5));
    await db.savePerson({ ...(await db.getPerson('r1')), name: 'June (Rounds)' });
    expect(await R.takePeopleEdits()).toBe(1);
    expect((await db.getPerson('r1')).name).toBe('June (Rounds)');
    expect(await db.getPerson('r2')).toMatchObject({ name: 'Leo', instagram: 'leo' });
    expect(await db.getPerson('r3')).toMatchObject({ name: 'Ana', instagram: 'ana.new' });
  });
  it('does nothing when nobody was changed, without the shared files, or with storage blocked', async () => {
    const [june] = await setUp([person()]);
    expect(await R.takePeopleEdits()).toBe(0);
    // Someone changed who isn't in Rounds.
    await D.publishThings('the-eye', [{ id: 's1', title: 'Shoot', people: [{ name: 'Kit' }] }]);
    const kit = (await D.peopleAll()).find((r) => r.name === 'Kit');
    await D.editPerson(kit.id, { name: 'Kit K' });
    expect(await R.takePeopleEdits()).toBe(0);
    // Someone the list has no name for (as if known only by a handle): Rounds keeps its name.
    const blank = { ...june, name: '', instagram: 'jp.new', editedAt: '2999-01-01T00:00:00.000Z' };
    await window.DFDataParts.withPeople((d) => new Promise((ok) => { const tx = d.transaction('people', 'readwrite'); tx.objectStore('people').put(blank); tx.oncomplete = ok; }));
    expect(await R.takePeopleEdits()).toBe(1);
    expect(await db.getPerson('r1')).toMatchObject({ name: 'June Park', instagram: 'jp.new' });
    localStorage.clear();
    await D.editPerson(june.id, { name: 'June P', instagram: 'junepark.jpg' });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(await R.takePeopleEdits()).toBe(1);
    delete window.DFData;
    expect(await R.takePeopleEdits()).toBe(0);
  });
});

describe('listedAs', () => {
  it('names a Rounds person for the list by their id, with when they last changed', () => {
    expect(R.listedAs(person({ updatedAt: '2026-11-10T09:00:00.000Z' }))).toEqual({ name: 'June Park', instagram: 'junepark.jpg', tiktok: '', roundsId: 'r1', at: '2026-11-10T09:00:00.000Z' });
    expect(R.listedAs(person()).at).toBe('');
  });
});

describe('shelfPageOf', () => {
  it("gives their page on the shelf once the list has them, in the suite only", async () => {
    window.DF_SUITE = { get: () => null };
    expect(await R.shelfPageOf(person())).toBeNull(); // not in the list yet
    const [r] = await D.gatherPeople([R.listedAs(person())]);
    expect(await R.shelfPageOf(person())).toBe(`../?person=${r.id}`);
    // Found by their id, whatever their name is now.
    expect(await R.shelfPageOf(person({ name: 'June P', instagram: '' }))).toBe(`../?person=${r.id}`);
    delete window.DF_SUITE;
    expect(await R.shelfPageOf(person())).toBeNull(); // on its own, Rounds has no shelf
  });
  it("gives nothing without the shared files, or when the list can't be read", async () => {
    window.DF_SUITE = { get: () => null };
    vi.spyOn(D, 'personFor').mockRejectedValue(new Error('blocked'));
    expect(await R.shelfPageOf(person())).toBeNull();
    delete window.DFData;
    expect(await R.shelfPageOf(person())).toBeNull();
    delete window.DF_SUITE;
  });
});
