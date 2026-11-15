// shared/data/people-things.js: each notebook's things with people in them,
// for the person page (round 2, connect/08) and search from the shelf (14).
import { describe, it, expect, beforeEach } from 'vitest';
import { loadDFData } from './_env.mjs';

let D;
let P;
beforeEach(async () => {
  D = await loadDFData();
  P = window.DFDataParts;
});
const pic = (n = 3) => ({ type: 'image/jpeg', bytes: new Uint8Array(n).buffer });
const shoot = (id, title, day, people, more = {}) => ({ id, kind: 'shoot', title, line: `${day} · Delivered`, day, people, params: { shoot: id }, ...more });
const june = { name: 'June Park', instagram: 'junepark.jpg', role: 'Talent' };

describe('cleanThing', () => {
  it('keeps what makes sense of a thing, with its key', () => {
    expect(P.cleanThing('the-eye', {
      id: 7, kind: ' shoot ', title: ' Rooftop portraits ', line: ' 7 Nov ', day: '2026-11-07T10:00:00Z',
      people: [june, { name: ' ', instagram: '' }, 'x', { name: 'Maya', roundsId: 'r1', at: 'then' }, { name: 'Leo', roundsId: 'r2' }],
      params: { shoot: '7' }, covers: [pic(), { bytes: 'no' }, pic(), pic(), pic(), pic()], more: { next: { title: 'Say thanks' } },
    })).toEqual({
      key: 'the-eye:7', app: 'the-eye', id: '7', kind: 'shoot', title: 'Rooftop portraits', line: '7 Nov', day: '2026-11-07',
      people: [{ name: 'June Park', instagram: 'junepark.jpg', tiktok: '', role: 'Talent' }, { name: 'Maya', instagram: '', tiktok: '', roundsId: 'r1', at: 'then' }, { name: 'Leo', instagram: '', tiktok: '', roundsId: 'r2', at: '' }],
      params: { shoot: '7' }, covers: [pic(), pic(), pic(), pic()], coverKey: '', more: { next: { title: 'Say thanks' } },
    });
  });
  it('fills in what was left out, and drops what is wrong', () => {
    expect(P.cleanThing('ref', { id: 'b1', title: 'Board', day: 'soon', people: 'x', params: ['x'], covers: 'x', more: 'x' }))
      .toEqual({ key: 'ref:b1', app: 'ref', id: 'b1', kind: 'thing', title: 'Board', line: '', day: '', people: [], params: null, covers: [], coverKey: '', more: {} });
  });
  it('refuses a thing with no id or no title', () => {
    expect(P.cleanThing('ref', null)).toBeNull();
    expect(P.cleanThing('ref', [])).toBeNull();
    expect(P.cleanThing('ref', { title: 'No id' })).toBeNull();
    expect(P.cleanThing('ref', { id: ' ', title: 'Blank id' })).toBeNull();
    expect(P.cleanThing('ref', { id: 'x', title: ' ' })).toBeNull();
  });
});

describe('pictureOf', () => {
  it('reads a data: address as bytes', () => {
    const p = D.pictureOf('data:image/png;base64,AQID');
    expect(p.type).toBe('image/png');
    expect([...new Uint8Array(p.bytes)]).toEqual([1, 2, 3]);
  });
  it("gives null for anything that isn't one", () => {
    expect(D.pictureOf('https://example.com/a.jpg')).toBeNull();
    expect(D.pictureOf('')).toBeNull();
    expect(D.pictureOf(null)).toBeNull();
    expect(D.pictureOf('data:image/png;base64,***')).toBeNull();
  });
});

describe('shootPeople', () => {
  it("gives a shoot's talent, then its team, with their handles and what they did", () => {
    expect(D.shootPeople({
      talents: [{ name: ' June Park ', socialHandles: [{ platform: 'instagram', handle: 'jp' }, { platform: 'tiktok', handle: 'jp.t' }] }, { name: 'Leo', socialHandles: null }, { name: ' ' }, null],
      teamMembers: [{ role: 'Makeup', name: 'Jules', socialPlatform: 'instagram', socialHandle: 'jules.mua' }, { role: ' ', name: 'Sam', socialPlatform: 'tiktok', socialHandle: 'sam.t' }, { name: 'Kit' }, { name: 'Ty', socialPlatform: 'tiktok' }],
    })).toEqual([
      { name: 'June Park', instagram: 'jp', tiktok: 'jp.t', role: 'Talent' },
      { name: 'Leo', instagram: '', tiktok: '', role: 'Talent' },
      { name: 'Jules', instagram: 'jules.mua', tiktok: '', role: 'Makeup' },
      { name: 'Sam', instagram: '', tiktok: 'sam.t', role: 'Team' },
      { name: 'Kit', instagram: '', tiktok: '', role: 'Team' },
      { name: 'Ty', instagram: '', tiktok: '', role: 'Team' },
    ]);
  });
  it('gives nobody for a shoot with nobody on it', () => {
    expect(D.shootPeople({})).toEqual([]);
  });
});

describe('publishThings', () => {
  it("asks for a thing's pictures only when it's new or changed, and writes only those", async () => {
    let asked = 0;
    const covers = async () => { asked += 1; return [pic(5), 'not a picture']; };
    const thing = (title, coverKey = 'a') => ({ id: 's1', title, people: [june], coverKey, covers });
    await D.publishThings('the-eye', [thing('Rooftop')]);
    expect(asked).toBe(1);
    const [first] = await D.thingsAll();
    expect(first.covers.map((c) => c.bytes.byteLength)).toEqual([5]);
    await D.publishThings('the-eye', [thing('Rooftop')]);
    expect(asked).toBe(1);
    expect((await D.thingsAll())[0].at).toBe(first.at);
    await D.publishThings('the-eye', [thing('Rooftop portraits')]);
    await D.publishThings('the-eye', [thing('Rooftop portraits', 'b')]);
    expect(asked).toBe(3);
    expect((await D.thingsAll())[0].title).toBe('Rooftop portraits');
  });
  it("writes a notebook's things, and the people in them join the list", async () => {
    const { things, people } = await D.publishThings('the-eye', [shoot('s1', 'Rooftop', '2026-11-07', [june]), { id: 'bad' }]);
    expect(things.map((t) => t.key)).toEqual(['the-eye:s1']);
    expect(things[0].at).toMatch(/^\d{4}-/);
    expect(people.map((p) => p.name)).toEqual(['June Park']);
    expect((await D.thingsAll()).map((t) => t.key)).toEqual(['the-eye:s1']);
    expect((await D.peopleAll()).map((p) => p.instagram)).toEqual(['junepark.jpg']);
  });
  it("replaces only that notebook's things: what it no longer has goes", async () => {
    await D.publishThings('the-eye', [shoot('s1', 'Rooftop', '2026-11-07', [june]), shoot('s2', 'Garden', '2026-10-21', [june])]);
    await D.publishThings('ref', [{ id: 'b1', kind: 'board', title: 'Rooftop, golden hour', people: [june], covers: [pic(2)] }]);
    await D.publishThings('ref', [{ id: 'b1', kind: 'board', title: 'Rooftop, golden hour', people: [june], covers: [pic(2)] }]);
    const { things } = await D.publishThings('the-eye', [shoot('s2', 'Garden test', '2026-10-21', [june])]);
    expect(things.map((t) => [t.key, t.title])).toEqual([['ref:b1', 'Rooftop, golden hour'], ['the-eye:s2', 'Garden test']]);
    expect((await D.thingsAll()).map((t) => t.key).sort()).toEqual(['ref:b1', 'the-eye:s2']);
    expect(await D.peopleAll()).toHaveLength(1);
    await D.publishThings('ref', 'nothing');
    expect((await D.thingsAll()).map((t) => t.key)).toEqual(['the-eye:s2']);
  });
});

describe('the person page', () => {
  async function setUp() {
    await D.publishThings('rounds', [{ id: 'r1', kind: 'person', title: 'June Park', line: 'Check in, due 2 Dec', people: [{ ...june, roundsId: 'r1', at: '2026-11-01' }], more: { next: { title: 'Plan the next one' } } }]);
    await D.publishThings('the-eye', [
      shoot('s1', 'Rooftop portraits', '2026-11-07', [{ name: 'June Park', role: 'Talent' }, { name: 'Jules M.', instagram: 'jules.mua', role: 'Makeup' }]),
      shoot('s2', 'Garden test', '2026-10-21', [{ name: 'June Park', instagram: 'junepark.jpg' }]),
      shoot('s3', 'Studio, warm light', '2026-08-12', [{ name: 'June Park', role: 'Model' }]),
      shoot('s4', 'Not hers', '2026-11-01', [{ name: 'Leo' }]),
    ]);
    await D.publishThings('ref', [{ id: 'b2', kind: 'board', title: 'June, next time', people: [june] }, { id: 'b1', kind: 'board', title: 'A board', people: [june] }]);
    await D.publishThings('contact-sheet', [{ id: 'l1', kind: 'post', title: 'Rooftop post', day: '2026-11-09', people: [{ instagram: 'junepark.jpg' }] }]);
    await D.publishThings('elsewhere', [{ id: 'x', title: 'Someone else', people: [june] }]);
    return (await D.peopleAll()).find((p) => p.name === 'June Park');
  }
  it('shows everything a person is in, newest first, under each notebook in loop order', async () => {
    const person = await setUp();
    const v = await D.personView(person.id);
    expect(v.person).toEqual(person);
    expect(Object.keys(v.byApp)).toEqual(['rounds', 'ref', 'the-eye', 'contact-sheet']);
    expect(v.byApp['the-eye'].map((t) => t.title)).toEqual(['Rooftop portraits', 'Garden test', 'Studio, warm light']);
    expect(v.byApp.ref.map((t) => t.title)).toEqual(['A board', 'June, next time']);
    expect(v.byApp['contact-sheet'].map((t) => t.title)).toEqual(['Rooftop post']);
    expect(v.rounds).toMatchObject({ title: 'June Park', line: 'Check in, due 2 Dec', more: { next: { title: 'Plan the next one' } } });
    expect(v.role).toBe('Talent');
    expect(v.maybe).toEqual([]);
  });
  it('gives the role from the newest shoot that has one, or none', async () => {
    await D.publishThings('the-eye', [shoot('s1', 'A', '2026-11-07', [{ name: 'Ana' }]), shoot('s2', 'B', '2026-10-07', [{ name: 'Ana', role: 'Stylist' }])]);
    await D.publishThings('ref', [{ id: 'b', title: 'Board', people: [{ name: 'Leo' }] }]);
    const [ana, leo] = (await D.peopleAll()).sort((a, b) => a.name.localeCompare(b.name));
    expect((await D.personView(ana.id)).role).toBe('Stylist');
    const v = await D.personView(leo.id);
    expect(v.role).toBe('');
    expect(v.rounds).toBeNull();
  });
  it('lists who Starky is asked about with them, and nothing for someone not on the list', async () => {
    await D.publishThings('the-eye', [shoot('s1', 'A', '2026-11-07', [{ name: 'Ana', instagram: 'a1' }, { name: 'Ana', instagram: 'a2' }])]);
    const [a, b] = await D.peopleAll();
    expect((await D.personView(a.id)).maybe.map((p) => p.id)).toEqual([b.id]);
    expect((await D.personView(b.id)).maybe.map((p) => p.id)).toEqual([a.id]);
    expect(await D.personView('nobody')).toBeNull();
  });
});

describe('search', () => {
  const people = [
    { id: 'p1', name: 'June Park', instagram: 'junepark.jpg', tiktok: '' },
    { id: 'p2', name: 'José Ruiz', instagram: '', tiktok: 'jose.r' },
    { id: 'p3', name: 'Ana', instagram: 'ana.j', tiktok: '' },
  ];
  const things = [
    { app: 'the-eye', title: 'Rooftop portraits', line: '7 Nov', day: '2026-11-07', people: [{ name: 'June Park', instagram: '', tiktok: '' }] },
    { app: 'the-eye', title: 'Garden test', line: 'June light', day: '2026-10-21', people: [] },
    { app: 'ref', title: 'Beach', line: '', day: '', people: [{ name: 'José Ruiz', instagram: '', tiktok: '' }] },
    { app: 'ref', title: 'Alpha', line: '', day: '', people: [{ name: 'José Ruiz', instagram: '', tiktok: '' }] },
    { app: 'elsewhere', title: 'June', line: '', day: '', people: [] },
  ];
  it('finds people first, then each notebook in loop order, by any of the words', () => {
    const r = D.searchIn(people, things, ' june ');
    expect(r.people.map((p) => p.id)).toEqual(['p1']);
    expect(Object.keys(r.byApp)).toEqual(['rounds', 'ref', 'the-eye', 'contact-sheet']);
    expect(r.byApp['the-eye'].map((t) => t.title)).toEqual(['Rooftop portraits', 'Garden test']);
    expect(r.byApp.ref).toEqual([]);
  });
  it('needs every word, ignores case, accents and an @', () => {
    expect(D.searchIn(people, things, 'JOSE').people.map((p) => p.id)).toEqual(['p2']);
    expect(D.searchIn(people, things, 'jose').byApp.ref.map((t) => t.title)).toEqual(['Alpha', 'Beach']);
    expect(D.searchIn(people, things, '@ana.j').people.map((p) => p.id)).toEqual(['p3']);
    expect(D.searchIn(people, things, 'june rooftop').people).toEqual([]);
    expect(D.searchIn(people, things, 'june rooftop').byApp['the-eye'].map((t) => t.title)).toEqual(['Rooftop portraits']);
    expect(D.searchIn(people, things, 'a').people.map((p) => p.name)).toEqual(['Ana', 'June Park']);
  });
  it('finds nothing for no words', () => {
    expect(D.searchIn(people, things, '  ')).toEqual({ people: [], byApp: { rounds: [], ref: [], 'the-eye': [], 'contact-sheet': [] } });
    expect(D.searchIn(people, things, undefined).people).toEqual([]);
  });
  it('searches what the notebooks wrote', async () => {
    await D.publishThings('ref', [{ id: 'b1', title: 'Rooftop, golden hour', people: [june] }]);
    const r = await D.searchAll('golden');
    expect(r.byApp.ref.map((t) => t.title)).toEqual(['Rooftop, golden hour']);
    expect((await D.searchAll('june')).people.map((p) => p.name)).toEqual(['June Park']);
  });
});
