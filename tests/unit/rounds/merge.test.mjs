// rounds/data/merge.js: how sync combines this phone's records with
// rounds.json's, field by field, asking on a real clash (Callback's design).
import { describe, it, expect } from 'vitest';
import {
  STORES, canonical, dataKey, content, sameContent, keyOf, getPath, setPath, quietField,
  mergeFields, resolvedRecord, planMerge, fileData, nextBase,
} from '../../../rounds/data/merge.js';

const NOW = '2026-11-14T12:00:00.000Z';
const t = (h) => `2026-11-14T${String(h).padStart(2, '0')}:00:00.000Z`;
const person = (id, fields = {}, at = t(1)) => ({ id, name: id, group: 'new', note: '', createdAt: t(0), updatedAt: at, ...fields });
const tomb = (id, store, at) => ({ id, store, deletedAt: at, createdAt: at, updatedAt: at });
const data = (over = {}) => ({ ...Object.fromEntries(STORES.map((s) => [s, []])), ...over });
const baseOf = (over) => Object.fromEntries(Object.entries(over).map(([s, list]) => [s, Object.fromEntries(list.map((r) => [r.id, r]))]));
const plan = (l, r, b = null) => planMerge(data(l), data(r), b && baseOf(b), { now: NOW });

describe('comparing copies', () => {
  it('canonical: the same data in any key order, undefined left out', () => {
    expect(canonical({ b: 1, a: [1, { d: undefined, c: 'x' }] })).toBe('{"a":[1,{"c":"x"}],"b":1}');
    expect(canonical({ a: 1, b: 2 })).toBe(canonical({ b: 2, a: 1 }));
    expect(canonical(undefined)).toBe('null');
    expect(canonical(null)).toBe('null');
    expect(canonical('x')).toBe('"x"');
    expect(canonical([])).toBe('[]');
  });
  it('dataKey: the same records in any order, any store missing', () => {
    const a = data({ people: [person('a'), person('b')] });
    expect(dataKey(a)).toBe(dataKey({ people: [person('b'), person('a')] }));
    expect(dataKey(a)).not.toBe(dataKey({ people: [person('a')] }));
    expect(dataKey({})).toBe(dataKey(data()));
  });
  it('content leaves out the id and times', () => {
    expect(content(person('a', { note: 'x' }))).toEqual({ name: 'a', group: 'new', note: 'x' });
    expect(sameContent(person('a', {}, t(1)), person('a', {}, t(5)))).toBe(true);
    expect(sameContent(person('a'), person('a', { note: 'y' }))).toBe(false);
  });
  it('keyOf names a record by its store', () => {
    expect(keyOf('people', 'p1')).toBe('people/p1');
  });
});

describe('paths', () => {
  it('getPath reads a nested field, or undefined', () => {
    expect(getPath({ lists: { email: true } }, 'lists.email')).toBe(true);
    expect(getPath({ lists: null }, 'lists.email')).toBeUndefined();
    expect(getPath({}, 'a.b.c')).toBeUndefined();
  });
  it('setPath writes one, making the way', () => {
    const o = { a: 5 };
    setPath(o, 'a.b', 1);
    setPath(o, 'c.d.e', 2);
    setPath(o, 'f', 3);
    expect(o).toEqual({ a: { b: 1 }, c: { d: { e: 2 } }, f: 3 });
  });
  it('setPath with undefined deletes it', () => {
    const o = { a: { b: 1, c: 2 }, d: 4 };
    setPath(o, 'a.b', undefined);
    setPath(o, 'd', undefined);
    expect(o).toEqual({ a: { c: 2 } });
  });
  it('quietField: times and what The Eye brought in on this phone', () => {
    for (const p of ['updatedAt', 'lists.changedAt', 'lastMove', 'lastShot', 'shoots', 'photoKey', 'groupPicked', 'shoots.0']) expect(quietField(p)).toBe(true);
    for (const p of ['name', 'note', 'next', 'lists.email', 'group', 'value', 'atlas', 'draft']) expect(quietField(p)).toBe(false);
  });
});

describe('mergeFields', () => {
  const b = { id: 'a', name: 'Ana', note: '', group: 'new', lists: { email: false, mail: false }, next: { kind: 'hello', due: '2026-11-14', step: 0 } };
  it('takes the change from the side that made it', () => {
    expect(mergeFields(b, { ...b, note: 'x' }, b).merged.note).toBe('x');
    expect(mergeFields(b, b, { ...b, note: 'y' }).merged.note).toBe('y');
    expect(mergeFields(b, b, { ...b, note: 'y' }).clashes).toEqual([]);
  });
  it('keeps both changes made to different fields', () => {
    const { merged, clashes } = mergeFields(b, { ...b, note: 'x' }, { ...b, group: 'client' });
    expect(merged).toMatchObject({ note: 'x', group: 'client' });
    expect(clashes).toEqual([]);
  });
  it('a nested field at a time: the email list here, the mail list there', () => {
    const { merged, clashes } = mergeFields(b, { ...b, lists: { email: true, mail: false } }, { ...b, lists: { email: false, mail: true } });
    expect(merged.lists).toEqual({ email: true, mail: true });
    expect(clashes).toEqual([]);
  });
  it('the same field changed both ways clashes, keeping this side', () => {
    const r = mergeFields(b, { ...b, note: 'x' }, { ...b, note: 'y' });
    expect(r.merged.note).toBe('x');
    expect(r.clashes).toEqual(['note']);
    expect(mergeFields(b, { ...b, lists: { email: true, mail: false } }, { ...b, lists: { email: 'yes', mail: false } }).clashes).toEqual(['lists.email']);
  });
  it('a next move is taken whole: a new day here and a new kind there clash', () => {
    const r = mergeFields(b, { ...b, next: { ...b.next, due: '2026-11-15' } }, { ...b, next: { ...b.next, kind: 'checkin' } });
    expect(r.clashes).toEqual(['next']);
    expect(r.merged.next).toEqual({ kind: 'hello', due: '2026-11-15', step: 0 });
    expect(mergeFields(b, { ...b, draft: { kind: 'pitch' } }, { ...b, draft: { kind: 'followup' } }).clashes).toEqual(['draft']);
  });
  it('an answer to a pitch is taken whole too', () => {
    const pitch = { answer: 'waiting', on: '2026-11-14', before: { group: 'prospect', groupPicked: false, next: null } };
    const at = { ...b, pitch };
    const r = mergeFields(at, { ...at, pitch: { ...pitch, answer: 'yes' } }, { ...at, pitch: { ...pitch, on: '2026-11-15' } });
    expect(r.clashes).toEqual(['pitch']);
  });
  it('a new nested object on both sides with no base is merged within', () => {
    const r = mergeFields({ id: 'a' }, { id: 'a', lists: { email: true } }, { id: 'a', lists: { mail: true } });
    expect(r.merged.lists).toEqual({ email: true, mail: true });
  });
  it('an object against a plain value clashes', () => {
    expect(mergeFields(b, { ...b, lists: 'none' }, { ...b, lists: { email: true } }).clashes).toEqual(['lists']);
    expect(mergeFields({ ...b, lists: 'x' }, { ...b, lists: { email: true } }, { ...b, lists: { mail: true } }).clashes).toEqual(['lists']);
  });
  it('a field removed on one side is removed', () => {
    const { note, ...noNote } = b;
    expect('note' in mergeFields(b, noNote, b).merged).toBe(false);
    expect('note' in mergeFields(b, b, noNote).merged).toBe(false);
  });
  it('leaves out the id and times at the top, keeps nested ones', () => {
    const m = mergeFields(null, { id: 'a', createdAt: 1, updatedAt: 2, x: { updatedAt: 3 } }, { id: 'a', createdAt: 1, updatedAt: 9, x: { updatedAt: 3 } });
    expect(m.merged).toEqual({ x: { updatedAt: 3 } });
  });
});

describe('resolvedRecord', () => {
  const c = {
    id: 'a', clashes: ['note', 'lists.email'],
    merged: { name: 'Ana', note: 'x', lists: { email: true, mail: true } },
    mine: { id: 'a', createdAt: t(0), note: 'x', lists: { email: true } },
    theirs: { id: 'a', createdAt: t(2), note: 'y', lists: { email: false } },
  };
  it('the clashing fields from the side picked, the rest as merged', () => {
    expect(resolvedRecord(c, 'theirs')).toEqual({ id: 'a', createdAt: t(0), name: 'Ana', note: 'y', lists: { email: false, mail: true } });
    expect(resolvedRecord(c, 'mine')).toEqual({ id: 'a', createdAt: t(0), name: 'Ana', note: 'x', lists: { email: true, mail: true } });
  });
  it('a field missing on the side picked is removed; the merged copy is left as it was', () => {
    const r = resolvedRecord({ ...c, mine: { id: 'a', lists: {} } }, 'mine');
    expect(r).toEqual({ id: 'a', createdAt: t(2), name: 'Ana', lists: { mail: true } });
    expect(c.merged.note).toBe('x');
  });
});

describe('planMerge: no shared copy yet', () => {
  it('nothing to do when both sides are the same', () => {
    const r = plan({ people: [person('a')] }, { people: [person('a')] });
    expect(r.changed).toBe(false);
    expect(r.conflicts).toEqual([]);
  });
  it('takes what is only in the file; leaves what is only here (it goes out)', () => {
    const r = plan({ people: [person('mine')] }, { people: [person('theirs')] });
    expect(r.puts.people).toEqual([person('theirs')]);
    expect(r.dels.people).toEqual([]);
    expect(r.changed).toBe(true);
  });
  it('the newer copy wins', () => {
    expect(plan({ people: [person('a', {}, t(1))] }, { people: [person('a', { note: 'n' }, t(2))] }).puts.people).toHaveLength(1);
    expect(plan({ people: [person('a', {}, t(3))] }, { people: [person('a', { note: 'n' }, t(2))] }).changed).toBe(false);
  });
  it('a deletion there after both copies deletes it here', () => {
    const r = plan({ moves: [person('m', {}, t(1))] }, { moves: [person('m', {}, t(2))], tombstones: [tomb('m', 'moves', t(3))] });
    expect(r.dels.moves).toEqual(['m']);
    expect(r.puts.moves).toEqual([]);
  });
  it("a newer copy there doesn't come in when deleted after it", () => {
    const r = plan({ messages: [person('thanks', {}, t(1)), person('hello', {}, t(1))], tombstones: [tomb('thanks', 'messages', t(4))] },
      { messages: [person('thanks', { text: 'x' }, t(2)), person('hello', { text: 'y' }, t(3))], tombstones: [tomb('hello', 'messages', t(2))] });
    expect(r.puts.messages.map((m) => m.id)).toEqual(['hello']);
    expect(r.dels.messages).toEqual([]);
  });
  it('only here and deleted there: deleted if after it, kept if changed since', () => {
    expect(plan({ moves: [person('m', {}, t(1))] }, { tombstones: [tomb('m', 'moves', t(2))] }).dels.moves).toEqual(['m']);
    expect(plan({ moves: [person('m', {}, t(3))] }, { tombstones: [tomb('m', 'moves', t(2))] }).dels.moves).toEqual([]);
  });
  it('only there and deleted here: comes back if changed after', () => {
    expect(plan({ tombstones: [tomb('m', 'moves', t(2))] }, { moves: [person('m', {}, t(3))] }).puts.moves).toHaveLength(1);
    expect(plan({ tombstones: [tomb('m', 'moves', t(2))] }, { moves: [person('m', {}, t(1))] }).puts.moves).toEqual([]);
  });
  it('only there, and deleted there after it: not taken', () => {
    expect(plan({}, { passed: [person('x', {}, t(1))], tombstones: [tomb('x', 'passed', t(2))] }).puts.passed).toEqual([]);
    expect(plan({}, { passed: [person('x', {}, t(3))], tombstones: [tomb('x', 'passed', t(2))] }).puts.passed).toHaveLength(1);
  });
});

describe('planMerge: from the last agreed copy', () => {
  const b = person('a', { note: '' }, t(1));
  it('changed there only: taken', () => {
    const r = plan({ people: [b] }, { people: [{ ...b, note: 'there', updatedAt: t(2) }] }, { people: [b] });
    expect(r.puts.people[0].note).toBe('there');
  });
  it('changed here only: nothing to take (it goes out)', () => {
    expect(plan({ people: [{ ...b, note: 'here', updatedAt: t(2) }] }, { people: [b] }, { people: [b] }).changed).toBe(false);
  });
  it('only the time differs: the newer time is taken', () => {
    expect(plan({ people: [b] }, { people: [{ ...b, updatedAt: t(5) }] }, { people: [b] }).puts.people[0].updatedAt).toBe(t(5));
    expect(plan({ people: [{ ...b, updatedAt: t(5) }] }, { people: [b] }, { people: [b] }).changed).toBe(false);
  });
  it('the same change on both: the newer copy', () => {
    const here = { ...b, note: 'same', updatedAt: t(2) };
    const there = { ...b, note: 'same', updatedAt: t(3) };
    expect(plan({ people: [here] }, { people: [there] }, { people: [b] }).puts.people).toEqual([there]);
    expect(plan({ people: [there] }, { people: [here] }, { people: [b] }).changed).toBe(false);
  });
  it('different fields on both: combined, out as the newest copy', () => {
    const r = plan({ people: [{ ...b, note: 'here', updatedAt: t(2) }] }, { people: [{ ...b, group: 'client', updatedAt: t(3) }] }, { people: [b] });
    expect(r.puts.people).toEqual([{ ...b, note: 'here', group: 'client', createdAt: t(0), updatedAt: NOW }]);
    expect(r.conflicts).toEqual([]);
  });
  it('a clash only in bookkeeping takes the newer side, without asking', () => {
    const r = plan({ people: [{ ...b, lastMove: '2026-11-10', note: 'x', updatedAt: t(4) }] }, { people: [{ ...b, lastMove: '2026-11-12', updatedAt: t(3) }] }, { people: [b] });
    expect(r.puts.people[0]).toMatchObject({ lastMove: '2026-11-10', note: 'x', updatedAt: NOW });
    const r2 = plan({ people: [{ ...b, lastMove: '2026-11-10', updatedAt: t(2) }] }, { people: [{ ...b, lastMove: '2026-11-12', note: 'y', updatedAt: t(3) }] }, { people: [b] });
    expect(r2.puts.people[0]).toMatchObject({ lastMove: '2026-11-12', note: 'y' });
  });
  it('the same field changed both ways: a conflict, held, nothing overwritten', () => {
    const mine = { ...b, note: 'here', updatedAt: t(2) };
    const theirs = { ...b, note: 'there', updatedAt: t(3) };
    const r = plan({ people: [mine] }, { people: [theirs] }, { people: [b] });
    expect(r.puts.people).toEqual([]);
    expect(r.conflicts).toEqual([expect.objectContaining({ kind: 'both', store: 'people', id: 'a', mine, theirs, base: b, clashes: ['note'], loud: ['note'] })]);
    expect([...r.held]).toEqual(['people/a']);
  });
  it('deleted there, untouched here: deleted here', () => {
    expect(plan({ moves: [b] }, { tombstones: [tomb('a', 'moves', t(2))] }, { moves: [b] }).dels.moves).toEqual(['a']);
  });
  it('deleted there, changed here: a conflict', () => {
    const r = plan({ moves: [{ ...b, note: 'x' }] }, { tombstones: [tomb('a', 'moves', t(2))] }, { moves: [b] });
    expect(r.conflicts[0]).toMatchObject({ kind: 'deletedThere', store: 'moves', id: 'a', theirs: null, tomb: tomb('a', 'moves', t(2)) });
    expect(r.dels.moves).toEqual([]);
    expect(r.puts.tombstones).toEqual([]); // the deletion is held too
  });
  it('deleted here, untouched there: stays deleted', () => {
    expect(plan({ tombstones: [tomb('a', 'moves', t(2))] }, { moves: [b] }, { moves: [b] }).changed).toBe(false);
  });
  it('deleted here, changed there: a conflict', () => {
    const r = plan({ tombstones: [tomb('a', 'messages', t(2))] }, { messages: [{ ...b, note: 'x' }] }, { messages: [b] });
    expect(r.conflicts[0]).toMatchObject({ kind: 'deletedHere', store: 'messages', id: 'a', mine: null });
    expect(r.puts.messages).toEqual([]);
  });
});

describe('planMerge: deletions', () => {
  it("takes the file's deletions it doesn't have, or has an older one of", () => {
    const r = plan({ tombstones: [tomb('x', 'moves', t(1)), tomb('y', 'moves', t(5))] },
      { tombstones: [tomb('x', 'moves', t(2)), tomb('y', 'moves', t(3)), tomb('z', 'moves', t(1)), { id: 'w', store: 'moves' }] });
    expect(r.puts.tombstones.map((x) => x.id)).toEqual(['x', 'z', 'w']);
  });
  it('the same deletion on both: nothing to do', () => {
    expect(plan({ tombstones: [tomb('x', 'moves', t(1))] }, { tombstones: [tomb('x', 'moves', t(1))] }).changed).toBe(false);
  });
  it('a missing store counts as empty; the default time is now', () => {
    const r = planMerge({ people: [person('a')] }, { people: [person('a', { note: 'n' }, t(2))], moves: [person('m')] }, null);
    expect(r.puts.moves).toHaveLength(1);
    expect(r.puts.people).toHaveLength(1);
    const b = person('a');
    const r2 = planMerge({ people: [{ ...b, note: 'x' }] }, { people: [{ ...b, group: 'client' }] }, { people: { a: b } });
    expect(r2.puts.people[0].updatedAt).toMatch(/^\d{4}-\d\d-\d\dT/);
  });
});

describe('fileData and nextBase', () => {
  const mine = data({ people: [person('b'), person('a', { note: 'here' })], tombstones: [tomb('m', 'moves', t(2))] });
  const theirs = data({ people: [person('a', { note: 'there' })], moves: [person('m')], tombstones: [tomb('a', 'people', t(9))] });
  it("the file gets this phone's data, sorted, held records as the file had them", () => {
    const out = fileData(mine, theirs, new Set(['people/a', 'moves/m']));
    expect(out.people.map((p) => [p.id, p.note])).toEqual([['a', 'there'], ['b', '']]);
    expect(out.moves.map((m) => m.id)).toEqual(['m']);
    expect(out.tombstones).toEqual([tomb('a', 'people', t(9))]);
  });
  it('with nothing held, just this phone\'s, every store there', () => {
    const out = fileData({ people: [person('b'), person('a')] }, {}, new Set());
    expect(out.people.map((p) => p.id)).toEqual(['a', 'b']);
    expect(Object.keys(out)).toEqual(STORES);
    expect(fileData(mine, {}, new Set(['people/a'])).people.map((p) => p.id)).toEqual(['b']);
  });
  it('the new agreed copy is what was written, held ones keeping their old base', () => {
    const written = data({ people: [person('a'), person('b')], moves: [person('m')] });
    const old = { people: { a: person('a', { note: 'base' }) } };
    const nb = nextBase(written, old, new Set(['people/a', 'moves/m']));
    expect(nb.people.a.note).toBe('base');
    expect(nb.people.b).toEqual(person('b'));
    expect(nb.moves).toEqual({});
    expect(Object.keys(nb)).toEqual(['people', 'moves', 'messages', 'settings', 'passed']);
    expect(nextBase({}, null, new Set()).people).toEqual({});
    expect(nextBase(written, null, new Set(['people/a'])).people.a).toBeUndefined();
  });
});

describe('records missing their times (older or hand-made files)', () => {
  it('a copy with a time is newer than one without', () => {
    const { updatedAt, ...bare } = person('a');
    expect(plan({ people: [bare] }, { people: [person('a', { note: 'n' })] }).puts.people).toHaveLength(1);
    expect(plan({ people: [person('a', { note: 'n' })] }, { people: [bare] }).changed).toBe(false);
  });
  it('a deletion with no time counts as before anything with one', () => {
    expect(plan({ moves: [person('m')] }, { tombstones: [{ id: 'm', store: 'moves' }] }).dels.moves).toEqual([]);
    const { updatedAt, ...bare } = person('m');
    expect(plan({ moves: [bare] }, { tombstones: [{ id: 'm', store: 'moves' }] }).dels.moves).toEqual(['m']);
    expect(plan({ tombstones: [{ id: 'x', store: 'moves' }] }, { tombstones: [tomb('x', 'moves', t(1))] }).puts.tombstones).toHaveLength(1);
    expect(plan({ tombstones: [tomb('x', 'moves', t(1))] }, { tombstones: [{ id: 'x', store: 'moves' }] }).puts.tombstones).toEqual([]);
  });
  it('a combined copy keeps the first time it was made, from either side', () => {
    const b = person('a');
    const { createdAt, ...here } = { ...b, note: 'x' };
    const r = plan({ people: [here] }, { people: [{ ...b, group: 'client' }] }, { people: [b] });
    expect(r.puts.people[0].createdAt).toBe(t(0));
  });
  it('two records with the same id still compare', () => {
    expect(dataKey({ people: [person('a'), person('a')] })).toBe(dataKey({ people: [person('a'), person('a')] }));
  });
});
