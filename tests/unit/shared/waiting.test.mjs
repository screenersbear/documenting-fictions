// shared/data/waiting.js: what's waiting in each notebook, for the shelf's
// floating ! and its preview (window.DFWaiting).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadDFData } from './_env.mjs';

let D;
let W;
const NOW = new Date(2026, 10, 15, 15, 0, 0).getTime();
beforeEach(async () => {
  D = await loadDFData();
  W = window.DFWaiting;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

const link = (id, type, toApp, more = {}) => D.saveLink({ id, type, toApp, fromApp: 'the-eye', createdAt: new Date(NOW).toISOString(), ...more });

describe("a notebook's own items", () => {
  it('are written by that notebook and read back for the day', () => {
    const items = [
      { title: 'June Park', line: 'Say thanks', from: '2026-11-15', until: '2026-11-15', params: { at: 'today' } },
      { title: 'Ana Lima', line: 'Check in', from: '2026-11-16', until: '2026-11-16' },
      { title: 'Rooftop portraits', line: 'Deadline gone by', from: '2026-11-10' },
    ];
    expect(W.publishWaiting('rounds', items)).toEqual(items);
    expect(JSON.parse(localStorage.getItem('df-waiting-rounds'))).toEqual({ at: new Date(NOW).toISOString(), items });
    expect(W.ownWaiting('rounds')).toEqual([items[0], items[2]]);
    expect(W.ownWaiting('rounds', '2026-11-16')).toEqual([items[1], items[2]]);
    expect(W.ownWaiting('rounds', '2026-11-09')).toEqual([]);
    expect(W.ownWaiting('the-eye')).toEqual([]);
  });
  it('keep only what makes sense: a title and a day; trimmed; until and params only when right', () => {
    const kept = W.publishWaiting('the-eye', [
      null, 'x', { line: 'no title', from: '2026-11-15' }, { title: '  ', from: '2026-11-15' }, { title: 'No day' }, { title: 'Bad day', from: '15 Nov' },
      { title: '  Shoot day  ', line: '  Rooftop  ', from: '2026-11-15', until: 'soon', params: 'x' },
      { title: 'Late', from: '2026-11-14', until: '2026-11-20', params: { shoot: 's1' } },
    ]);
    expect(kept).toEqual([
      { title: 'Shoot day', line: 'Rooftop', from: '2026-11-15' },
      { title: 'Late', line: '', from: '2026-11-14', until: '2026-11-20', params: { shoot: 's1' } },
    ]);
    expect(W.publishWaiting('the-eye', 'nothing')).toEqual([]);
    expect(W.ownWaiting('the-eye')).toEqual([]);
  });
  it('read as nothing when what is kept is broken, or storage fails', () => {
    localStorage.setItem('df-waiting-rounds', '{not json');
    expect(W.ownWaiting('rounds')).toEqual([]);
    localStorage.setItem('df-waiting-rounds', JSON.stringify({ items: 'x' }));
    expect(W.ownWaiting('rounds')).toEqual([]);
    localStorage.setItem('df-waiting-rounds', 'null');
    expect(W.ownWaiting('rounds')).toEqual([]);
    localStorage.setItem('df-waiting-rounds', JSON.stringify({ items: [{ title: 'Kept', from: '2026-11-15' }, { title: 'Dropped' }] }));
    expect(W.ownWaiting('rounds')).toEqual([{ title: 'Kept', line: '', from: '2026-11-15' }]);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
    expect(W.publishWaiting('rounds', [{ title: 'A', from: '2026-11-15' }])).toEqual([{ title: 'A', line: '', from: '2026-11-15' }]);
  });
});

describe('hand-off rows', () => {
  it('say what came, from whom and when', () => {
    expect(W.handoffRow({ type: 'finals', fromApp: 'the-eye', toApp: 'contact-sheet', title: 'Rooftop portraits', postIds: ['a', 'b'], createdAt: new Date(NOW).toISOString() }))
      .toEqual({ kind: 'handoff', from: 'the-eye', to: 'contact-sheet', title: 'Two posts from Rooftop portraits', line: 'From The Eye, today', params: null });
    expect(W.handoffRow({ type: 'new-client', fromApp: 'rounds', toApp: 'ref', name: 'Dana Ortiz', createdAt: '2026-11-09T12:00:00.000Z' }))
      .toMatchObject({ title: 'Dana Ortiz said yes', line: 'From Rounds, 9 Nov' });
    expect(W.handoffRow({ type: 'post-people', fromApp: 'contact-sheet', toApp: 'rounds', title: ' Rooftop portraits ', createdAt: 'never' }))
      .toMatchObject({ title: 'Rooftop portraits', line: 'From Layouts' });
    expect(W.handoffRow({ type: 'post-people', fromApp: 'elsewhere', toApp: 'rounds', createdAt: new Date(NOW).toISOString() }))
      .toMatchObject({ title: 'a new post from Layouts', line: 'From elsewhere, today' });
  });
  it('fill in what a hand-off left out', () => {
    expect(W.handoffTitle({ type: 'finals', postIds: [] })).toBe('Two posts from the shoot');
    expect(W.handoffTitle({ type: 'finals', postIds: ['a'], title: 'Garden' })).toBe('A post from Garden');
    expect(W.handoffTitle({ type: 'finals', title: 'Garden' })).toBe('Two posts from Garden');
    expect(W.handoffTitle({ type: 'new-client', name: ' ' })).toBe('Someone said yes');
  });
});

describe("what's waiting", () => {
  it("in a notebook: its hand-offs, newest first, then its own items for today", async () => {
    await link('1', 'finals', 'contact-sheet', { title: 'Garden', postIds: ['a'], createdAt: '2026-11-14T10:00:00.000Z' });
    await link('2', 'finals', 'contact-sheet', { title: 'Rooftop', postIds: ['a', 'b'] });
    await link('3', 'finals', 'contact-sheet', { title: 'Seen', openedAt: 'x' });
    W.publishWaiting('contact-sheet', [{ title: 'Holiday prints', line: 'Not finished', from: '2026-11-01', params: { at: 'contents' } }]);
    expect(await W.waitingIn('contact-sheet')).toEqual([
      { kind: 'handoff', from: 'the-eye', to: 'contact-sheet', title: 'Two posts from Rooftop', line: 'From The Eye, today', params: null },
      { kind: 'handoff', from: 'the-eye', to: 'contact-sheet', title: 'A post from Garden', line: 'From The Eye, 14 Nov', params: null },
      { kind: 'own', from: 'contact-sheet', to: 'contact-sheet', title: 'Holiday prints', line: 'Not finished', params: { at: 'contents' } },
    ]);
    expect(await W.waitingIn('contact-sheet', '2026-10-31')).toHaveLength(2);
    expect(await W.waitingIn('ref')).toEqual([]);
  });
  it('in every notebook at once, and an own item without params opens the notebook', async () => {
    await link('1', 'new-client', 'ref', { fromApp: 'rounds', name: 'Dana Ortiz' });
    W.publishWaiting('rounds', [{ title: 'June Park', line: 'Say hello', from: '2026-11-15', until: '2026-11-15' }]);
    const all = await W.waitingAll(['ref', 'rounds', 'the-eye']);
    expect(Object.keys(all)).toEqual(['ref', 'rounds', 'the-eye']);
    expect(all.ref.map((r) => r.title)).toEqual(['Dana Ortiz said yes']);
    expect(all.rounds).toEqual([{ kind: 'own', from: 'rounds', to: 'rounds', title: 'June Park', line: 'Say hello', params: null }]);
    expect(all['the-eye']).toEqual([]);
    expect((await W.waitingAll(['rounds'], '2026-11-16')).rounds).toEqual([]);
  });
  it('as the ! says it to a screen reader', () => {
    expect(W.waitingLabel('Layouts', 1)).toBe('Layouts: 1 thing waiting');
    expect(W.waitingLabel('Rounds', 3)).toBe('Rounds: 3 things waiting');
  });
});
