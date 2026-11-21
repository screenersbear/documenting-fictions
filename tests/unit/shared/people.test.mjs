// shared/data/people.js: one person for all four notebooks (round 2,
// connect/08), matched on handle, then name; kept apart and asked about when
// it isn't clear.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadDFData, rawOpen } from './_env.mjs';

let D;
let P; // the inner parts (gatherInto and friends take a clock and ids)
beforeEach(async () => {
  D = await loadDFData();
  P = window.DFDataParts;
});
const NOW = '2026-11-15T12:00:00.000Z';
const ids = () => { let n = 0; return () => `p${++n}`; };
const gather = (found, records = []) => P.gatherInto(records, found, NOW, ids());

describe('handles and keys', () => {
  it('reads a handle as typed, with an @, or as a link to the profile', () => {
    expect(D.cleanHandle('@maya.rr')).toBe('maya.rr');
    expect(D.cleanHandle('  maya.rr ')).toBe('maya.rr');
    expect(D.cleanHandle('https://www.instagram.com/maya.rr/?hl=en')).toBe('maya.rr');
    expect(D.cleanHandle('tiktok.com/@maya_tt')).toBe('maya_tt');
    expect(D.cleanHandle('ma ya')).toBe('maya');
    expect(D.cleanHandle(null)).toBe('');
  });
  it('gives every key a person can be found by, without case or extra spaces', () => {
    expect(D.personKeys({ name: '  June   Park ', instagram: '@JunePark.jpg', tiktok: 'June' })).toEqual(['ig:junepark.jpg', 'tt:june', 'name:june park']);
    expect(D.personKeys({ name: 'June' })).toEqual(['name:june']);
    expect(D.personKeys({ instagram: 'june' })).toEqual(['ig:june']);
    expect(D.personKeys({ name: ' ', instagram: '' })).toEqual([]);
  });
  it('remembers where someone was found: a Rounds person by its id, a name by its name and handles', () => {
    expect(P.sigOf({ roundsId: 'r1', name: 'June' })).toBe('rounds:r1');
    expect(P.sigOf({ name: 'June', instagram: 'jp' })).toBe('ig:jp|name:june');
  });
});

describe('gatherInto', () => {
  it('makes a person for each new name, and finds them again the same way', () => {
    const { records, changed } = gather([{ name: 'June Park', instagram: '@junepark.jpg', role: 'Talent' }, { name: 'Leo Grant' }]);
    expect(records).toEqual([
      { id: 'p1', name: 'June Park', instagram: 'junepark.jpg', tiktok: '', keys: ['ig:junepark.jpg', 'name:june park'], sigs: ['ig:junepark.jpg|name:june park'], maybe: [], apart: [], createdAt: NOW, updatedAt: NOW },
      { id: 'p2', name: 'Leo Grant', instagram: '', tiktok: '', keys: ['name:leo grant'], sigs: ['name:leo grant'], maybe: [], apart: [], createdAt: NOW, updatedAt: NOW },
    ]);
    expect(changed).toHaveLength(2);
    const again = P.gatherInto(records, [{ name: 'June Park', instagram: 'junepark.jpg' }, { name: 'Leo Grant' }], NOW, ids());
    expect(again.changed).toEqual([]);
    expect(again.records).toEqual(records);
  });
  it('matches on a handle, whatever the name says, and learns the other names they go by', () => {
    const { records } = gather([{ name: 'June Park', instagram: 'junepark.jpg' }]);
    const r = P.gatherInto(records, [{ name: 'June P.', instagram: 'JunePark.jpg' }, { name: 'June', tiktok: 'jp', instagram: 'junepark.jpg' }], NOW, ids());
    expect(r.records).toHaveLength(1);
    expect(r.records[0]).toMatchObject({ name: 'June Park', tiktok: 'jp', keys: ['ig:junepark.jpg', 'name:june park', 'name:june p.', 'tt:jp', 'name:june'] });
    // A TikTok handle finds them too.
    expect(P.gatherInto(r.records, [{ name: 'Junie', tiktok: '@JP' }], NOW, ids()).records).toHaveLength(1);
  });
  it('matches the only person of a name when no handle says otherwise, filling in the handle', () => {
    const { records } = gather([{ name: 'June Park' }]);
    const r = P.gatherInto(records, [{ name: 'june  park', instagram: 'junepark.jpg' }], NOW, ids());
    expect(r.records).toHaveLength(1);
    expect(r.records[0]).toMatchObject({ name: 'June Park', instagram: 'junepark.jpg' });
  });
  it("keeps apart the same name with another handle, and asks: they're maybe the same", () => {
    const { records } = gather([{ name: 'June Park', instagram: 'junepark.jpg' }]);
    let n = 0;
    const r = P.gatherInto(records, [{ name: 'June Park', instagram: 'june.other' }, { name: 'Ana', tiktok: 'a1' }, { name: 'Ana', tiktok: 'a2' }], NOW, () => `q${++n}`);
    expect(r.records.map((x) => [x.id, x.name, x.maybe])).toEqual([['p1', 'June Park', []], ['q1', 'June Park', ['p1']], ['q2', 'Ana', []], ['q3', 'Ana', ['q2']]]);
  });
  it('keeps two Rounds people of the same name apart (Rounds has them as two), and asks', () => {
    let n = 0;
    const r = P.gatherInto([], [{ name: 'Alex Kim', roundsId: 'a' }, { name: 'Alex Kim', roundsId: 'b' }], NOW, () => `r${++n}`);
    expect(r.records.map((x) => [x.id, x.sigs, x.maybe])).toEqual([['r1', ['rounds:a'], []], ['r2', ['rounds:b'], ['r1']]]);
    // Each is found again as themselves.
    expect(P.gatherInto(r.records, [{ name: 'Alex Kim', roundsId: 'b' }, { name: 'Alex Kim', roundsId: 'a' }], NOW, () => 'z').changed).toEqual([]);
  });
  it("still finds a Rounds person by name from another notebook, and the same Rounds person again by name", () => {
    const { records } = gather([{ name: 'Alex Kim', roundsId: 'a' }]);
    // The Eye's Alex Kim, no handle: the one Alex Kim.
    const eye = P.gatherInto(records, [{ name: 'Alex Kim', role: 'Talent' }], NOW, () => 'z');
    expect(eye.records).toHaveLength(1);
    expect(eye.records[0].sigs).toEqual(['rounds:a', 'name:alex kim']);
    // A name-only record found first, then Rounds' Alex Kim: the same one.
    const first = gather([{ name: 'Alex Kim' }]).records;
    expect(P.gatherInto(first, [{ name: 'Alex Kim', roundsId: 'a' }], NOW, () => 'z').records).toHaveLength(1);
  });
  it('asks about a name shared by two people, and finds that name the same way after', () => {
    let records = gather([{ name: 'June Park', instagram: 'a' }, { name: 'June Park', instagram: 'b' }]).records;
    const r = P.gatherInto(records, [{ name: 'June Park' }], NOW, () => 'x');
    expect(r.changed).toEqual([expect.objectContaining({ id: 'x', maybe: ['p1', 'p2'] })]);
    records = r.records;
    expect(P.gatherInto(records, [{ name: 'June Park' }], NOW, () => 'y').changed).toEqual([]);
  });
  it('keeps someone known only by a handle, with no name yet', () => {
    expect(gather([{ instagram: '@solo' }]).records[0]).toMatchObject({ name: '', instagram: 'solo', keys: ['ig:solo'] });
  });
  it('leaves out someone with no name and no handle', () => {
    expect(gather([null, { name: ' ' }, { role: 'Talent' }]).records).toEqual([]);
  });
  it("takes Rounds' name and handles when they're newer than a change on the person page", () => {
    let records = gather([{ name: 'Maya R.', instagram: 'maya.rr', roundsId: 'r1', at: '2026-11-01T00:00:00.000Z' }]).records;
    // Renamed in Rounds: found by its Rounds id, the new name kept.
    records = P.gatherInto(records, [{ name: 'Maya Ruiz', instagram: 'maya.ruiz', roundsId: 'r1', at: '2026-11-02T00:00:00.000Z' }], NOW, ids()).records;
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ name: 'Maya Ruiz', instagram: 'maya.ruiz', keys: ['ig:maya.rr', 'name:maya r.', 'ig:maya.ruiz', 'name:maya ruiz'] });
    // Changed on the person page since: Rounds' older copy doesn't undo it.
    records = [P.editRecord(records[0], { name: 'Maya Ruiz Diaz', instagram: 'maya.rd' }, '2026-11-10T00:00:00.000Z')];
    records = P.gatherInto(records, [{ name: 'Maya Ruiz', instagram: 'maya.ruiz', roundsId: 'r1', at: '2026-11-02T00:00:00.000Z' }], NOW, ids()).records;
    expect(records[0]).toMatchObject({ name: 'Maya Ruiz Diaz', instagram: 'maya.rd' });
    // Nor does a copy from Rounds that doesn't say when it changed.
    expect(P.gatherInto(records, [{ name: 'Old', roundsId: 'r1' }], NOW, ids()).records[0].name).toBe('Maya Ruiz Diaz');
    // A name found elsewhere only fills in what's missing.
    records = P.gatherInto(records, [{ name: 'Maya Ruiz Diaz', instagram: 'maya.rd', tiktok: 'mrd' }], NOW, ids()).records;
    expect(records[0]).toMatchObject({ name: 'Maya Ruiz Diaz', instagram: 'maya.rd', tiktok: 'mrd' });
    // A Rounds person with a blank handle doesn't blank theirs.
    records = P.gatherInto(records, [{ name: 'Maya', roundsId: 'r1', at: '2026-12-01T00:00:00.000Z' }], NOW, ids()).records;
    expect(records[0]).toMatchObject({ name: 'Maya', instagram: 'maya.rd' });
  });
  it("doesn't change what it was given", () => {
    const { records } = gather([{ name: 'June' }]);
    const copy = JSON.parse(JSON.stringify(records));
    P.gatherInto(records, [{ name: 'June', instagram: 'j' }], NOW, ids());
    expect(records).toEqual(copy);
  });
});

describe('findPerson', () => {
  it('finds a name in a notebook the same way the list was made, or nobody', () => {
    const { records } = gather([{ name: 'June Park', instagram: 'jp' }, { name: 'Leo' }, { name: 'Ana', tiktok: 'a1' }, { name: 'Ana', tiktok: 'a2' }]);
    expect(D.findPerson(records, { name: 'June Park', instagram: '@JP' }).id).toBe('p1');
    expect(D.findPerson(records, { name: 'leo' }).id).toBe('p2');
    expect(D.findPerson(records, { name: 'Ana' })).toBeNull();
    expect(D.findPerson(records, { name: 'Nobody' })).toBeNull();
    expect(D.findPerson(records, { name: '' })).toBeNull();
    expect(D.findPerson(records, null)).toBeNull();
    expect(D.findPerson(records, { instagram: 'unknown' })).toBeNull();
  });
});

describe('Same person?', () => {
  const pair = () => gather([{ name: 'June Park', instagram: 'a' }, { name: 'June Park', instagram: 'b' }, { name: 'June Park' }]).records;
  it('lists each pair asked about once, while both are here and not said to differ', () => {
    const records = pair();
    expect(D.maybePairs(records).map(([a, b]) => [a.id, b.id])).toEqual([['p1', 'p2'], ['p1', 'p3'], ['p2', 'p3']]);
    const [a, b] = P.apartRecords(records[0], records[1], NOW);
    expect(D.maybePairs([a, b, records[2]]).map(([x, y]) => [x.id, y.id])).toEqual([['p1', 'p3'], ['p2', 'p3']]);
    expect(D.maybePairs([records[2]])).toEqual([]);
  });
  it('merges two into one: keys, finds and questions kept, and others told', () => {
    const records = pair();
    const { changed, gone } = P.mergeRecords(records, 'p1', 'p3', NOW);
    expect(gone.id).toBe('p3');
    // p3's question about p2 is now p1's.
    expect(changed).toEqual([expect.objectContaining({ id: 'p1', instagram: 'a', keys: ['ig:a', 'name:june park'], sigs: ['ig:a|name:june park', 'name:june park'], maybe: ['p2'], updatedAt: NOW })]);
    // Asked both ways now (p1 about p2, p2 about p1): still one question.
    expect(D.maybePairs([changed[0], records[1]]).map(([a, b]) => [a.id, b.id])).toEqual([['p2', 'p1']]);
    // The merged one is found where p3 was.
    expect(D.findPerson([changed[0], records[1]], { name: 'June Park' }).id).toBe('p1');
  });
  it('takes handles the kept one lacks, and turns "apart" from the gone one into the kept one', () => {
    const base = (id, name, more = {}) => ({ id, name, instagram: '', tiktok: '', keys: D.personKeys({ name, ...more }), sigs: [], maybe: [], apart: [], ...more });
    const recs = [base('p1', 'Leo'), base('p2', 'Leo', { instagram: 'leo.g', tiktok: 'leo.t', apart: ['p3'] }), base('p3', 'Ana', { apart: ['p2'] })];
    const { changed } = P.mergeRecords(recs, 'p1', 'p2', NOW);
    expect(changed[0]).toMatchObject({ instagram: 'leo.g', tiktok: 'leo.t', apart: ['p3'] });
    expect(changed[1]).toMatchObject({ id: 'p3', apart: ['p1'] });
    expect(P.mergeRecords(recs, 'p1', 'p1').changed).toEqual([]);
    expect(P.mergeRecords(recs, 'p1', 'nobody').changed).toEqual([]);
  });
});

describe('editRecord', () => {
  it('changes the name and handles, keeping the old keys', () => {
    const [r] = gather([{ name: 'June', instagram: 'old' }]).records;
    expect(P.editRecord(r, { name: ' June Park ', instagram: '@new', tiktok: '' }, NOW)).toMatchObject({ name: 'June Park', instagram: 'new', tiktok: '', keys: ['ig:old', 'name:june', 'ig:new', 'name:june park'], editedAt: NOW });
    expect(P.editRecord(r, { name: '', instagram: 'old' }, NOW).name).toBe('June');
  });
});

describe('the df-people database', () => {
  it('is made with its two stores, people and things', async () => {
    await D.peopleAll();
    const db = await rawOpen('df-people');
    expect([...db.objectStoreNames]).toEqual(['people', 'things']);
    db.close();
  });
  it('gathers people in, gives them back, and finds a name', async () => {
    const all = await D.gatherPeople([{ name: 'June Park', instagram: 'jp' }]);
    expect(all).toHaveLength(1);
    expect(await D.gatherPeople([{ name: 'June Park', instagram: 'jp' }])).toEqual(all);
    expect(await D.peopleAll()).toEqual(all);
    expect(await D.getPerson(all[0].id)).toEqual(all[0]);
    expect(await D.personFor({ instagram: 'JP' })).toEqual(all[0]);
    expect(await D.personFor({ name: 'Nobody' })).toBeNull();
  });
  it('answers Same person?: one stays, or both stay apart', async () => {
    const [a, b, c] = await D.gatherPeople([{ name: 'June', instagram: 'a' }, { name: 'June', instagram: 'b' }, { name: 'June', instagram: 'c' }]);
    expect(D.maybePairs(await D.peopleAll())).toHaveLength(3);
    expect(await D.answerSame(a.id, b.id, true)).toMatchObject({ id: a.id, keys: ['ig:a', 'name:june', 'ig:b'] });
    expect((await D.peopleAll()).map((r) => r.id).sort()).toEqual([a.id, c.id].sort());
    expect(await D.answerSame(a.id, c.id, false)).toMatchObject({ id: a.id });
    expect(D.maybePairs(await D.peopleAll())).toEqual([]);
    expect(await D.answerSame(a.id, 'gone', true)).toBeNull();
  });
  it('changes a person from the person page', async () => {
    const [r] = await D.gatherPeople([{ name: 'June', instagram: 'old' }]);
    expect(await D.editPerson(r.id, { name: 'June Park', instagram: 'new' })).toMatchObject({ name: 'June Park', instagram: 'new' });
    expect((await D.getPerson(r.id)).name).toBe('June Park');
    expect(await D.editPerson('nobody', { name: 'X' })).toBeNull();
  });
  it('links to a person page only inside the suite', () => {
    expect(D.personUrl('p 1')).toBeNull();
    window.DF_SUITE = { id: 'the-eye' };
    expect(D.personUrl('p 1')).toBe('../?person=p%201');
  });
});
