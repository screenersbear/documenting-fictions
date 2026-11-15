// the-eye/components/people-out.js: The Eye's shoots for the one list of
// people (round 2, connect/08), and names changed on the person page coming
// back into its talent and team.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadDFData } from '../shared/_env.mjs';

let D;
beforeEach(async () => {
  D = await loadDFData();
  delete window.EyeParts;
  await import('../../../the-eye/components/people-out.js?' + Math.random());
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

function app(shoots = []) {
  const ed = {
    state: { shoots },
    STATUS_LABELS: { delivered: 'Delivered', waiting_to_shoot: 'Shoot ready' },
    saveState: vi.fn(),
  };
  window.EyeParts.addPeopleOut(ed);
  return ed;
}
// A new June each time: taking a change writes into the talent.
const june = () => ({ name: 'June Park', socialHandles: [{ platform: 'instagram', handle: 'junepark.jpg' }] });
const shoot = (o) => ({ id: 's1', title: 'Rooftop portraits', date: '2026-11-07', status: 'delivered', talents: [june()], teamMembers: [], ...o });

describe('addPeopleOut', () => {
  it('adds what it shares, and keeps the parts already there', async () => {
    const ed = {};
    window.EyeParts.addPeopleOut(ed);
    expect(Object.keys(ed)).toEqual(['peopleThings', 'tellPeople', 'takePeopleEdits', 'dayWords']);
    window.EyeParts.other = 1;
    await import('../../../the-eye/components/people-out.js?again');
    expect(window.EyeParts.other).toBe(1);
  });
});

describe('peopleThings', () => {
  it('gives each shoot: its title, day and status, who was on it, its cover, opening at the shoot', async () => {
    const ed = app([shoot({ projectPhoto: 'data:image/jpeg;base64,AQID', teamMembers: [{ role: 'Makeup', name: 'Jules', socialPlatform: 'instagram', socialHandle: 'jules.mua' }] })]);
    const [t] = ed.peopleThings();
    expect(t).toMatchObject({
      id: 's1', kind: 'shoot', title: 'Rooftop portraits', line: '7 Nov · Delivered', day: '2026-11-07', params: { shoot: 's1' },
      people: [{ name: 'June Park', instagram: 'junepark.jpg', tiktok: '', role: 'Talent' }, { name: 'Jules', instagram: 'jules.mua', tiktok: '', role: 'Makeup' }],
      coverKey: '27:a:image/jpeg;base64,AQID',
    });
    const [pic] = await t.covers();
    expect([...new Uint8Array(pic.bytes)]).toEqual([1, 2, 3]);
  });
  it('fills in what a shoot leaves out, and skips one with no id', async () => {
    const ed = app([shoot({ id: 's2', title: '', date: '', status: 'odd', talents: [], projectPhoto: null }), null, { title: 'No id' }]);
    const things = ed.peopleThings();
    expect(things).toHaveLength(1);
    expect(things[0]).toMatchObject({ title: 'Untitled shoot', line: '', day: '', people: [], coverKey: '' });
    expect(await things[0].covers()).toEqual([]);
    expect(app([shoot({ date: '7 Nov' })]).peopleThings()[0].line).toBe('Delivered');
  });
});

describe('tellPeople', () => {
  it('tells the list a moment after the last change', async () => {
    vi.useFakeTimers();
    const spy = vi.spyOn(D, 'publishThings').mockResolvedValue({});
    const ed = app([shoot()]);
    ed.tellPeople();
    ed.tellPeople(50);
    vi.advanceTimersByTime(49);
    expect(spy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBe('the-eye');
    expect(spy.mock.calls[0][1].map(t => t.id)).toEqual(['s1']);
  });
  it('tells the year page the shoots shot each year, and tells the list without it', async () => {
    vi.useFakeTimers();
    const spy = vi.spyOn(D, 'publishThings').mockResolvedValue({});
    const ed = app([shoot(), shoot({ id: 's2', date: '2026-02-01', status: 'editing' }), shoot({ id: 's3', date: '2026-12-20', status: 'waiting_to_shoot' }), shoot({ id: 's4', date: '2025-08-01' })]);
    ed.tellPeople(0);
    vi.advanceTimersByTime(0);
    expect(window.DFYear.readYear('the-eye')).toEqual({ 2026: { shoots: 2 }, 2025: { shoots: 1 } });
    delete window.DFYear;
    ed.tellPeople(0);
    vi.advanceTimersByTime(0);
    expect(spy).toHaveBeenCalledTimes(2);
  });
  it("doesn't mind a failed write, or no shared files", async () => {
    vi.useFakeTimers();
    vi.spyOn(D, 'publishThings').mockRejectedValue(new Error('full'));
    app([shoot()]).tellPeople(0);
    vi.advanceTimersByTime(0);
    await Promise.resolve();
    delete window.DFData;
    expect(() => app().tellPeople()).not.toThrow();
  });
  it('writes the shoots for real', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    app([shoot()]).tellPeople(0);
    vi.advanceTimersByTime(0);
    vi.useRealTimers();
    await vi.waitFor(async () => expect((await D.thingsAll()).map(t => t.key)).toEqual(['the-eye:s1']));
    expect((await D.peopleAll()).map(p => p.name)).toEqual(['June Park']);
  });
});

describe('takePeopleEdits', () => {
  async function setUp(shoots) {
    const ed = app(shoots);
    await D.publishThings('the-eye', ed.peopleThings());
    return ed;
  }
  it("brings a name changed on the person page into the talent and team it's about", async () => {
    const ed = await setUp([
      shoot({ teamMembers: [{ role: 'Makeup', name: 'Jules', socialPlatform: 'instagram', socialHandle: 'jules.mua' }, { role: 'Hair', name: 'Tia', socialPlatform: 'tiktok', socialHandle: 'tia.t' }] }),
      shoot({ id: 's2', talents: [{ name: 'June Park', socialHandles: [{ platform: 'website', handle: 'x' }] }, { name: 'Leo' }] }),
    ]);
    const all = await D.peopleAll();
    const id = (name) => all.find(p => p.name === name).id;
    await D.editPerson(id('June Park'), { name: 'June Park Lee', instagram: 'june.lee', tiktok: 'jl' });
    await D.editPerson(id('Jules'), { name: 'Jules M.', instagram: 'jules.m' });
    await D.editPerson(id('Tia'), { name: 'Tia', tiktok: 'tia.new' });
    expect(await ed.takePeopleEdits()).toBe(4);
    const [s1, s2] = ed.state.shoots;
    expect(s1.talents[0]).toEqual({ name: 'June Park Lee', socialHandles: [{ platform: 'instagram', handle: 'june.lee' }, { platform: 'tiktok', handle: 'jl' }] });
    expect(s2.talents[0]).toEqual({ name: 'June Park Lee', socialHandles: [{ platform: 'website', handle: 'x' }, { platform: 'instagram', handle: 'june.lee' }, { platform: 'tiktok', handle: 'jl' }] });
    expect(s2.talents[1]).toEqual({ name: 'Leo' });
    expect(s1.teamMembers[0]).toMatchObject({ name: 'Jules M.', socialHandle: 'jules.m' });
    expect(s1.teamMembers[1]).toMatchObject({ name: 'Tia', socialHandle: 'tia.new' });
    expect(ed.saveState).toHaveBeenCalledTimes(1);
    // Taken once: not again.
    expect(await ed.takePeopleEdits()).toBe(0);
  });
  it('changes nothing when the copies already say it, or nobody was changed', async () => {
    const ed = await setUp([shoot({ teamMembers: [{ role: 'Makeup', name: 'Jules' }] })]);
    expect(await ed.takePeopleEdits()).toBe(0);
    const all = await D.peopleAll();
    await D.editPerson(all.find(p => p.name === 'June Park').id, { name: 'June Park', instagram: 'junepark.jpg' });
    await D.editPerson(all.find(p => p.name === 'Jules').id, { name: 'Jules', instagram: '' });
    expect(await ed.takePeopleEdits()).toBe(0);
    expect(ed.saveState).not.toHaveBeenCalled();
  });
  it('takes handles taken away, passes over shoots with nobody, and never blanks a name', async () => {
    const ed = await setUp([shoot({ talents: [june(), { name: 'Kit', socialHandles: [{ platform: 'instagram', handle: 'kit.k' }] }], teamMembers: [{ role: 'Makeup', name: 'Jules', socialHandle: 'jules.mua' }] }), shoot({ id: 's2', talents: undefined, teamMembers: undefined })]);
    const all = await D.peopleAll();
    await D.editPerson(all.find(p => p.name === 'June Park').id, { name: 'June Park', instagram: '', tiktok: '' });
    // A person known to the list without a name (as if only by a handle in a caption).
    const jules = { ...all.find(p => p.name === 'Jules'), name: '', editedAt: '2999-01-01T00:00:00.000Z' };
    const kit = { ...all.find(p => p.name === 'Kit'), name: '', instagram: 'kit.new', keys: ['ig:kit.k', 'name:kit', 'ig:kit.new'], editedAt: '2999-01-01T00:00:00.000Z' };
    await window.DFDataParts.withPeople(db => new Promise((ok) => { const tx = db.transaction('people', 'readwrite'); tx.objectStore('people').put(jules); tx.objectStore('people').put(kit); tx.oncomplete = ok; }));
    expect(await ed.takePeopleEdits()).toBe(2);
    expect(ed.state.shoots[0].talents[0]).toEqual({ name: 'June Park', socialHandles: [] });
    expect(ed.state.shoots[0].talents[1]).toEqual({ name: 'Kit', socialHandles: [{ platform: 'instagram', handle: 'kit.new' }] });
    expect(ed.state.shoots[0].teamMembers[0]).toMatchObject({ name: 'Jules', socialHandle: 'jules.mua' });
  });
  it('does nothing without the shared files, or when storage is blocked', async () => {
    const ed = await setUp([shoot()]);
    const all = await D.peopleAll();
    await D.editPerson(all[0].id, { name: 'June P', instagram: 'junepark.jpg' });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(await ed.takePeopleEdits()).toBe(1);
    delete window.DFData;
    expect(await app().takePeopleEdits()).toBe(0);
  });
});
