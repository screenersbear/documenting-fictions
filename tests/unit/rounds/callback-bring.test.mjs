// rounds/data/callback-bring.js (ONE-TIME, Bring in from Callback): who's
// new, who Rounds has (their history goes on them), and what's saved.
import { describe, it, expect } from 'vitest';
import { bringPlan, bring, fromWords, touchCount } from '../../../rounds/data/callback-bring.js';

const TODAY = '2026-11-16';
const touch = (id, day, o = {}) => ({ id, day, at: 10, kind: 'moment', what: 'text', note: '', ...o });
const entry = (name, o = {}) => ({ row: { name, groups: ['prospect'], group: 'prospect', instagram: '', website: '', email: '', where: '', note: '' }, letGo: false, nextDay: '', touches: [], notes: null, ...o });
const withIg = (name, instagram, o = {}) => { const e = entry(name, o); e.row.instagram = instagram; return e; };

describe('bringPlan', () => {
  const june = { id: 'r1', name: 'June Park', instagram: 'june.p', lastMove: '2026-10-01' };
  const dana = { id: 'r2', name: 'Dana Ortiz', instagram: '' };
  it('new people, and people Rounds has by handle or by name, with their touchpoints and notes', () => {
    const notes = { id: 'c1-notes', day: '', kind: 'note', note: 'n', fromNotes: true };
    const { items, skipped } = bringPlan([
      withIg('June P.', 'june.p', { touches: [touch('a', '2026-10-02')], notes }),
      entry('dana ortiz', { touches: [touch('b', '2026-10-03')] }),
      entry('Maya Reyes', { letGo: true, nextDay: '2026-12-01' }),
    ], [june, dana], []);
    expect(skipped).toBe(0);
    expect(items.map((i) => [i.row.name, i.to && i.to.id, i.touches.map((t) => t.id)])).toEqual([['June P.', 'r1', ['a', 'c1-notes']], ['dana ortiz', 'r2', ['b']], ['Maya Reyes', null, []]]);
    expect(items[2]).toMatchObject({ letGo: true, nextDay: '2026-12-01' });
  });
  it('what the log has already stays out; someone Rounds has with nothing new is skipped and counted', () => {
    const { items, skipped } = bringPlan([
      withIg('June', 'june.p', { touches: [touch('a', '2026-10-02'), touch('b', '2026-10-05')] }),
      entry('Dana Ortiz', { touches: [touch('c', '2026-10-03')], notes: { id: 'd-notes', kind: 'note', note: 'x', fromNotes: true } }),
      entry('New Person', { touches: [touch('e', '2026-10-03')] }),
    ], [june, dana], [{ id: 'cb-a' }, { id: 'cb-c' }, { id: 'cb-d-notes' }, { id: 'cb-e' }]);
    expect(skipped).toBe(1);
    expect(items.map((i) => [i.row.name, i.touches.map((t) => t.id)])).toEqual([['June', ['b']], ['New Person', []]]);
  });
  it('two of Callback\'s that are one person come in as one', () => {
    const { items } = bringPlan([
      withIg('Lee', 'lee.k', { touches: [touch('a', '2026-10-02')] }),
      withIg('Lee K', 'lee.k', { touches: [touch('b', '2026-10-04')] }),
      entry('Sam', { touches: [touch('c', '2026-10-02')] }),
      entry('sam', { touches: [touch('d', '2026-10-02')] }),
      withIg('June two', 'june.p', { touches: [touch('e', '2026-10-02')] }),
    ], [june], []);
    expect(items.map((i) => [i.row.name, i.to && i.to.id, i.touches.map((t) => t.id)])).toEqual([['Lee', null, ['a', 'b']], ['Sam', null, ['c', 'd']], ['June two', 'r1', ['e']]]);
  });
});

describe('bringPlan with promises', () => {
  const pr = (id, o = {}) => ({ id, mine: true, what: `Promise ${id}`, due: '', made: '', open: true, ...o });
  const june = { id: 'r1', name: 'June Park', instagram: 'june.p', promises: [pr('cb-a')] };
  it('only the promises someone does not have yet come in', () => {
    const { items, skipped } = bringPlan([withIg('June', 'june.p', { promises: [pr('cb-a'), pr('cb-b')] })], [june], []);
    expect(skipped).toBe(0);
    expect(items[0].promises.map((x) => x.id)).toEqual(['cb-b']);
  });
  it('someone Rounds has, with only promises they have already, is skipped', () => {
    expect(bringPlan([withIg('June', 'june.p', { promises: [pr('cb-a')] })], [june], []).skipped).toBe(1);
    expect(bringPlan([withIg('June', 'june.p')], [june], []).skipped).toBe(1);
  });
  it('two of Callback\'s that are one person bring both their promises', () => {
    const { items } = bringPlan([entry('Maya Reyes', { promises: [pr('cb-x')] }), entry('maya reyes', { promises: [pr('cb-y')] })], [], []);
    expect(items).toHaveLength(1);
    expect(items[0].promises.map((x) => x.id)).toEqual(['cb-x', 'cb-y']);
  });
});

describe('fromWords and touchCount', () => {
  const item = (to, touches) => ({ to, touches });
  const notes = { id: 'n', fromNotes: true };
  it('counts touchpoints, not their notes', () => {
    expect(touchCount(item(null, [touch('a'), notes, touch('b')]))).toBe(2);
  });
  it('under each name', () => {
    expect(fromWords(item(null, []))).toBe('No touchpoints');
    expect(fromWords(item(null, [notes]))).toBe('No touchpoints');
    expect(fromWords(item(null, [touch('a')]))).toBe('1 touchpoint');
    expect(fromWords(item(null, [touch('a'), touch('b')]))).toBe('2 touchpoints');
    expect(fromWords({ ...item(null, [touch('a')]), letGo: true })).toBe('1 touchpoint · Let go');
    expect(fromWords({ ...item(null, []), letGo: true })).toBe('No touchpoints · Let go');
    expect(fromWords({ ...item({ id: 'r' }, [touch('a')]), letGo: true })).toBe('In Rounds already: 1 touchpoint goes on their page');
    expect(fromWords(item({ id: 'r' }, [notes]))).toBe('In Rounds already: a note goes on their page');
    expect(fromWords(item({ id: 'r' }, [touch('a'), notes]))).toBe('In Rounds already: 1 touchpoint goes on their page');
    expect(fromWords(item({ id: 'r' }, [touch('a'), touch('b')]))).toBe('In Rounds already: 2 touchpoints go on their page');
  });
  it('their promises too', () => {
    const p = (k) => Array.from({ length: k }, (_, i) => ({ id: `p${i}` }));
    expect(fromWords({ ...item(null, [touch('a')]), promises: p(1) })).toBe('1 touchpoint · 1 promise');
    expect(fromWords({ ...item(null, []), promises: p(2), letGo: true })).toBe('No touchpoints · 2 promises · Let go');
    expect(fromWords({ ...item({ id: 'r' }, []), promises: p(1) })).toBe('In Rounds already: 1 promise goes on their page');
    expect(fromWords({ ...item({ id: 'r' }, []), promises: p(3) })).toBe('In Rounds already: 3 promises go on their page');
    expect(fromWords({ ...item({ id: 'r' }, [touch('a')]), promises: p(2) })).toBe('In Rounds already: 1 touchpoint goes on their page · 2 promises');
  });
});

describe('bring', () => {
  let n = 0;
  const makeId = () => `id${++n}`;
  const item = (o) => ({ row: entry('X').row, to: null, letGo: false, nextDay: '', touches: [], ...o });
  const row = (name, group = 'prospect') => ({ ...entry(name).row, groups: [group], group });

  it('a new person: as an import, Let go kept, the next touchpoint a Check in due that day', () => {
    n = 0;
    const { people } = bring([item({ row: { ...row('Maya'), where: 'Met at a show', note: 'Editor at Acme' }, letGo: true, nextDay: '2026-11-02' })], TODAY, 3, makeId, 99);
    expect(people).toHaveLength(1);
    expect(people[0]).toMatchObject({ id: 'id1', name: 'Maya', source: 'import', letGo: true, where: 'Met at a show', note: 'Editor at Acme', added: TODAY, lastMove: '', next: { kind: 'checkin', due: '2026-11-02', step: 0 } });
  });
  it('without one, their group\'s first move, a few a day', () => {
    n = 0;
    const items = [item({ row: row('A') }), item({ row: row('B', 'regular'), nextDay: '2026-12-01' }), item({ row: row('C', 'client') }), item({ row: row('D', 'new') })];
    const { people } = bring(items, TODAY, 2, makeId, 99);
    expect(people.map((p) => [p.name, p.next.kind, p.next.due])).toEqual([['A', 'pitch', TODAY], ['B', 'checkin', '2026-12-01'], ['C', 'intros', TODAY], ['D', 'hello', '2026-11-17']]);
    expect(people.map((p) => p.letGo)).toEqual([false, false, false, false]);
  });
  it('touchpoints as moments that count, a project wrapped as a note; the last move from the latest moment up to today', () => {
    n = 0;
    const touches = [
      touch('a', '2026-10-02', { what: 'email', note: 'Sent rates. They replied.', at: 5 }),
      touch('w', '2026-10-20', { kind: 'note', what: '', note: 'Project wrapped' }),
      touch('f', '2026-12-24', { what: 'met' }),
      touch('b', '2026-11-01', { at: 0 }),
    ];
    const { people, lines } = bring([item({ row: row('Maya'), touches })], TODAY, 3, makeId, 99);
    expect(lines).toEqual([
      { id: 'cb-a', at: 5, personId: 'id1', kind: 'moment', day: '2026-10-02', what: 'email', keeps: true, note: 'Sent rates. They replied.', wasLast: '' },
      { id: 'cb-w', at: 10, personId: 'id1', kind: 'note', day: '2026-10-20', note: 'Project wrapped' },
      { id: 'cb-f', at: 10, personId: 'id1', kind: 'moment', day: '2026-12-24', what: 'met', keeps: true, wasLast: '' },
      { id: 'cb-b', at: 99, personId: 'id1', kind: 'moment', day: '2026-11-01', what: 'text', keeps: true, wasLast: '' },
    ]);
    expect(people[0].lastMove).toBe('2026-11-01');
    expect(people[0].next.kind).toBe('pitch');
  });
  it('a moment today counts as the last move; a note never does', () => {
    n = 0;
    const today = bring([item({ touches: [touch('a', TODAY)] })], TODAY, 3, makeId, 1).people[0];
    expect(today.lastMove).toBe(TODAY);
    const noted = bring([item({ touches: [touch('n', '2026-11-10', { kind: 'note', note: 'x' })] })], TODAY, 3, makeId, 1).people[0];
    expect(noted.lastMove).toBe('');
  });
  it('their notes from Callback on the day they were added there, or today', () => {
    n = 0;
    const { lines } = bring([item({ touches: [{ id: 'p1-notes', day: '', at: 0, kind: 'note', what: '', note: 'Shoots on film', fromNotes: true }] })], TODAY, 3, makeId, 7);
    expect(lines).toEqual([{ id: 'cb-p1-notes', at: 7, personId: 'id1', kind: 'note', day: TODAY, note: 'Shoots on film' }]);
  });
  it('a long note goes on in pieces: the rest as notes on the same day', () => {
    n = 0;
    const long = `${'a'.repeat(300)} ${'b'.repeat(300)} ${'c'.repeat(300)}`;
    const { lines } = bring([item({ touches: [touch('a', '2026-10-02', { note: long, at: 50 })] })], TODAY, 3, makeId, 1);
    expect(lines.map((l) => [l.id, l.kind, l.day, l.at, l.note.length])).toEqual([['cb-a', 'moment', '2026-10-02', 50, 300], ['cb-a-2', 'note', '2026-10-02', 51, 300], ['cb-a-3', 'note', '2026-10-02', 52, 300]]);
  });
  it('someone Rounds has: the history goes on them, their next move stays, the last move only moves later', () => {
    n = 0;
    const june = { id: 'r1', name: 'June', lastMove: '2026-10-10', letGo: false, next: { kind: 'checkin', due: '2026-11-20', step: 0 } };
    const both = bring([
      item({ to: june, touches: [touch('a', '2026-10-01')] }),
      item({ to: june, touches: [touch('b', '2026-11-03')], letGo: true, nextDay: '2026-11-17' }),
    ], TODAY, 3, makeId, 1);
    expect(both.people).toEqual([{ ...june, lastMove: '2026-11-03' }]);
    expect(both.lines.map((l) => [l.id, l.personId, l.wasLast])).toEqual([['cb-a', 'r1', '2026-10-10'], ['cb-b', 'r1', '2026-10-10']]);
    expect(n).toBe(0);
    const none = bring([item({ to: { id: 'r2', name: 'Lee' }, touches: [touch('c', '2026-10-01')] })], TODAY, 3, makeId, 1);
    expect(none.people[0].lastMove).toBe('2026-10-01');
    expect(none.lines[0].wasLast).toBe('');
  });
  it('promises go on the person, new or not, each once', () => {
    n = 0;
    const pr = (id) => ({ id, mine: true, what: `Promise ${id}`, due: '', made: '', open: true });
    const fresh = bring([item({ row: row('Maya'), promises: [pr('cb-a')] })], TODAY, 3, makeId, 1);
    expect(fresh.people[0].promises).toEqual([pr('cb-a')]);
    const june = { id: 'r1', name: 'June', promises: [pr('cb-a')] };
    const had = bring([item({ to: june, promises: [pr('cb-a'), pr('cb-b')] })], TODAY, 3, makeId, 1);
    expect(had.people[0].promises.map((x) => x.id)).toEqual(['cb-a', 'cb-b']);
    expect('promises' in bring([item({ row: row('Lee') })], TODAY, 3, makeId, 1).people[0]).toBe(false);
  });
});
