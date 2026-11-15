// shared/data/year.js: each notebook's numbers for each year, for the year
// page on the shelf (round 2, connect/15; window.DFYear).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadDFData } from './_env.mjs';

let Y;
beforeEach(async () => {
  await loadDFData();
  Y = window.DFYear;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 11, 3, 10, 0, 0));
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('yearOf', () => {
  it('is the year of a day or a time', () => {
    expect(Y.yearOf('2026-11-15')).toBe('2026');
    expect(Y.yearOf('2025-12-31T23:59:00.000Z')).toBe('2025');
  });
  it('is empty for anything else', () => {
    for (const x of ['', '15/11/2026', '2026', undefined, null, 2026]) expect(Y.yearOf(x)).toBe('');
  });
});

describe('countByYear and byYear', () => {
  const boards = [{ createdAt: '2026-01-02T10:00:00Z' }, { createdAt: '2026-12-31T08:00:00Z' }, { createdAt: '2025-12-31T08:00:00Z' }, { createdAt: '' }, null, {}];
  it('counts the items in each year, by their day', () => {
    expect(Y.countByYear(boards, (b) => b.createdAt)).toEqual({ 2026: 2, 2025: 1 });
  });
  it('counts nothing for no items', () => {
    expect(Y.countByYear([], (b) => b.createdAt)).toEqual({});
    expect(Y.countByYear(undefined, (b) => b.createdAt)).toEqual({});
  });
  it('turns the counts round, by year', () => {
    expect(Y.byYear({ pitched: { 2026: 28, 2025: 3 }, yes: { 2026: 6 } })).toEqual({ 2026: { pitched: 28, yes: 6 }, 2025: { pitched: 3 } });
    expect(Y.byYear({})).toEqual({});
    expect(Y.byYear(undefined)).toEqual({});
    expect(Y.byYear({ boards: null })).toEqual({});
  });
});

describe('shootsByYear', () => {
  it('counts the shoots shot, photo or video, by their day', () => {
    const shoots = ['captured', 'waiting_for_selects', 'editing', 'rough_cut', 'client_review', 'revisions', 'delivered'].map((status) => ({ status, date: '2026-05-01' }));
    expect(Y.shootsByYear([...shoots, { status: 'delivered', date: '2025-03-01' }])).toEqual({ 2026: 7, 2025: 1 });
  });
  it('leaves out shoots not shot yet, postponed or canceled', () => {
    const shoots = ['prospect', 'planning', 'waiting_to_shoot', 'rescheduled', 'canceled', undefined].map((status) => ({ status, date: '2026-05-01' }));
    expect(Y.shootsByYear(shoots)).toEqual({});
  });
  it('leaves out shoots with no day, and counts nothing for none', () => {
    expect(Y.shootsByYear([{ status: 'delivered', date: '' }, null])).toEqual({});
    expect(Y.shootsByYear(undefined)).toEqual({});
  });
});

describe('publishYear and readYear', () => {
  const led = [{ title: ' Pitches ', line: '11 sent, 2 of the 6 yeses', bg: '#FF8A3D', icon: '<svg></svg>' }];
  it('keeps what a notebook writes, for the shelf to read back', () => {
    expect(Y.publishYear('rounds', { 2026: { pitched: 28, yes: 6, led } })).toEqual({ 2026: { pitched: 28, yes: 6, led: [{ ...led[0], title: 'Pitches' }] } });
    expect(Y.readYear('rounds')).toEqual({ 2026: { pitched: 28, yes: 6, led: [{ ...led[0], title: 'Pitches' }] } });
    expect(JSON.parse(localStorage.getItem('df-year-rounds')).at).toBe(new Date(2026, 11, 3, 10, 0, 0).toISOString());
  });
  it('keeps only real years, whole counts above nothing, and rows with a title', () => {
    const years = { 2026: { boards: 9, zero: 0, half: 1.5, minus: -2, word: '3', led: [null, { title: '' }, { title: 'Check ins' }, 'x'] }, '26': { boards: 1 }, 2025: 'nine', 2024: { led: 'x' } };
    expect(Y.publishYear('ref', years)).toEqual({ 2026: { boards: 9, led: [{ title: 'Check ins', line: '', bg: '', icon: '' }] }, 2024: { led: [] } });
    expect(Y.publishYear('ref', null)).toEqual({});
    expect(Y.publishYear('ref', [1, 2])).toEqual({});
  });
  it('reads nothing for a notebook that has written nothing, or something broken', () => {
    expect(Y.readYear('the-eye')).toEqual({});
    localStorage.setItem('df-year-the-eye', '{broken');
    expect(Y.readYear('the-eye')).toEqual({});
    localStorage.setItem('df-year-the-eye', JSON.stringify({ at: 'x', years: [1] }));
    expect(Y.readYear('the-eye')).toEqual({});
    localStorage.setItem('df-year-the-eye', 'null');
    expect(Y.readYear('the-eye')).toEqual({});
  });
  it('carries on when the phone has no room to keep it', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
    expect(Y.publishYear('ref', { 2026: { boards: 2 } })).toEqual({ 2026: { boards: 2 } });
    expect(Y.readYear('ref')).toEqual({});
  });
});

describe('yearView', () => {
  it("is the year's numbers in the loop's order, with Rounds' rows", () => {
    Y.publishYear('rounds', { 2026: { pitched: 28, yes: 1, led: [{ title: 'Pitches', line: '11 sent' }] } });
    Y.publishYear('ref', { 2026: { boards: 1 }, 2025: { boards: 4 } });
    Y.publishYear('the-eye', { 2026: { shoots: 14 } });
    Y.publishYear('contact-sheet', { 2026: { posts: 31 } });
    expect(Y.yearView(2026)).toEqual({
      year: '2026',
      rows: [
        { app: 'rounds', n: 28, words: 'people pitched' }, { app: 'rounds', n: 1, words: 'said yes' }, { app: 'ref', n: 1, words: 'board made' },
        { app: 'the-eye', n: 14, words: 'shoots' }, { app: 'contact-sheet', n: 31, words: 'posts' },
      ],
      led: [{ title: 'Pitches', line: '11 sent', bg: '', icon: '' }],
    });
  });
  it('is nothing for a notebook with nothing that year, or nothing written', () => {
    Y.publishYear('ref', { 2025: { boards: 4 } });
    const v = Y.yearView('2026');
    expect(v.rows.map((r) => r.n)).toEqual([0, 0, 0, 0, 0]);
    expect(v.rows.map((r) => r.words)).toEqual(['people pitched', 'said yes', 'boards made', 'shoots', 'posts']);
    expect(v.led).toEqual([]);
  });
  it('one of each reads as one', () => {
    for (const app of ['rounds', 'ref', 'the-eye', 'contact-sheet']) Y.publishYear(app, { 2026: { pitched: 1, yes: 1, boards: 1, shoots: 1, posts: 1 } });
    expect(Y.yearView(2026).rows.map((r) => r.words)).toEqual(['person pitched', 'said yes', 'board made', 'shoot', 'post']);
  });
});

describe('yearShown', () => {
  it('is this year in December', () => {
    expect(Y.yearShown('2026-12-01')).toBe(2026);
    expect(Y.yearShown('2027-12-31')).toBe(2027);
  });
  it("is last year's from January to November", () => {
    expect(Y.yearShown('2027-01-01')).toBe(2026);
    expect(Y.yearShown('2027-11-30')).toBe(2026);
  });
  it('is nothing before the first December, or for no day', () => {
    expect(Y.yearShown('2026-11-30')).toBe(null);
    expect(Y.yearShown('2026-01-15')).toBe(null);
    expect(Y.yearShown('')).toBe(null);
    expect(Y.yearShown(undefined)).toBe(null);
  });
});
