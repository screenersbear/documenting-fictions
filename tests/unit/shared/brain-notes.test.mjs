// shared/data/brain-notes.js: what a notebook writes down for shakusky's brain
// (window.DFBrainNotes). Only choices, only short plain values, a switch for
// every kind (all on until he turns one off), and a file for the brain's inbox.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

delete window.DFBrainNotes;
await import('../../../shared/data/brain-notes.js');
const N = window.DFBrainNotes;
const EYE = 'the-eye';
const AT = new Date('2026-11-28T03:00:00.000Z');
const STAMP = '2026-11-28T03:00:00Z';
const stored = () => JSON.parse(localStorage.getItem(N.key(EYE)));
const breakSaving = () => vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('short', () => {
  it('keeps true, false and plain numbers as they are', () => {
    expect(N.short(true)).toBe(true);
    expect(N.short(false)).toBe(false);
    expect(N.short(0)).toBe(0);
    expect(N.short(3.5)).toBe(3.5);
  });
  it('trims words and cuts them to MOST_ITEM', () => {
    expect(N.short('  booked  ')).toBe('booked');
    expect(N.short('x'.repeat(200))).toBe('x'.repeat(N.MOST_ITEM));
  });
  it('turns away anything that is not a short plain value', () => {
    for (const bad of [NaN, Infinity, '', '   ', 'a\nb', 'tab\there', null, undefined, {}, [], () => 1]) expect(N.short(bad)).toBeUndefined();
  });
});

describe('line', () => {
  it('makes one action line in the shared format', () => {
    expect(N.line(EYE, 'status', 'change', 'booked', { from: 'prospect', n: 2, ok: true }, AT)).toEqual({
      v: 1, at: STAMP, app: EYE, kind: 'status', action: 'change', item: 'booked', context: { from: 'prospect', n: 2, ok: true },
    });
  });
  it('drops context values that are not plain, and a context with nothing left or too long', () => {
    expect(N.line(EYE, 'status', 'change', 'booked', { gone: null, bad: 'a\nb', from: 'prospect' }, AT).context).toEqual({ from: 'prospect' });
    expect(N.line(EYE, 'status', 'change', 'booked', { gone: null }, AT)).not.toHaveProperty('context');
    expect(N.line(EYE, 'status', 'change', 'booked', 'not an object', AT)).not.toHaveProperty('context');
    expect(N.line(EYE, 'status', 'change', 'booked', ['a'], AT)).not.toHaveProperty('context');
    const long = Object.fromEntries([...Array(8)].map((_, i) => [`k${i}`, 'y'.repeat(80)]));
    expect(N.line(EYE, 'status', 'change', 'booked', long, AT)).not.toHaveProperty('context');
  });
  it('writes a number item as words and stamps now when no time is given', () => {
    expect(N.line(EYE, 'frameworks', 'pick', 3, undefined, AT).item).toBe('3');
    expect(N.line(EYE, 'frameworks', 'pick', 'x').at).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
  });
  it('gives null for a notebook, kind, action or item it cannot take', () => {
    expect(N.line('rounds', 'status', 'change', 'booked')).toBeNull();
    expect(N.line(EYE, 'footage', 'change', 'booked')).toBeNull();
    expect(N.line(EYE, 'status', null, 'booked')).toBeNull();
    expect(N.line(EYE, 'status', '', 'booked')).toBeNull();
    expect(N.line(EYE, 'status', 'change', '')).toBeNull();
    expect(N.line(EYE, 'status', 'change', null)).toBeNull();
  });
});

describe('read', () => {
  it('starts empty, with nothing kept or a spoilt store', () => {
    const empty = { off: {}, lines: [], saved: 0 };
    expect(N.read(EYE)).toEqual(empty);
    localStorage.setItem(N.key(EYE), '{not json');
    expect(N.read(EYE)).toEqual(empty);
    localStorage.setItem(N.key(EYE), '5');
    expect(N.read(EYE)).toEqual(empty);
    localStorage.setItem(N.key(EYE), JSON.stringify({ off: 'x', lines: 'x', saved: 'x' }));
    expect(N.read(EYE)).toEqual(empty);
  });
  it('keeps only whole lines, and a saved count inside them', () => {
    localStorage.setItem(N.key(EYE), JSON.stringify({ off: { status: true }, lines: [{ a: 1 }, 'x', null, { b: 2 }], saved: 9 }));
    expect(N.read(EYE)).toEqual({ off: { status: true }, lines: [{ a: 1 }, { b: 2 }], saved: 2 });
    localStorage.setItem(N.key(EYE), JSON.stringify({ lines: [{ a: 1 }], saved: -3 }));
    expect(N.read(EYE).saved).toBe(0);
    localStorage.setItem(N.key(EYE), JSON.stringify({ lines: [{ a: 1 }], saved: 1.5 }));
    expect(N.read(EYE).saved).toBe(0);
  });
});

describe('kinds and isOn', () => {
  it('lists every kind of The Eye, all on until he turns one off', () => {
    expect(N.kinds(EYE).map((k) => [k.id, k.on])).toEqual([['status', true], ['frameworks', true], ['selects', true]]);
    expect(N.kinds(EYE).every((k) => k.name && k.says)).toBe(true);
    N.flip(EYE, 'frameworks', false);
    expect(N.kinds(EYE).map((k) => k.on)).toEqual([true, false, true]);
  });
  it('is never on for a kind or notebook that has none', () => {
    expect(N.isOn(EYE, 'footage')).toBe(false);
    expect(N.isOn('rounds', 'status')).toBe(false);
    expect(N.kinds('rounds')).toEqual([]);
  });
  it('reads only a real off as off', () => {
    localStorage.setItem(N.key(EYE), JSON.stringify({ off: { status: 'yes', selects: true } }));
    expect(N.isOn(EYE, 'status')).toBe(true);
    expect(N.isOn(EYE, 'selects')).toBe(false);
  });
});

describe('note', () => {
  it('writes down a choice and gives its line (check 1: his actions land as lines)', () => {
    const row = N.note(EYE, 'status', 'change', 'editing', { from: 'waiting_for_selects' }, AT);
    expect(row).toEqual({ v: 1, at: STAMP, app: EYE, kind: 'status', action: 'change', item: 'editing', context: { from: 'waiting_for_selects' } });
    N.note(EYE, 'frameworks', 'pick', 'Visual Language: Warm', undefined, AT);
    expect(stored().lines.map((r) => r.item)).toEqual(['editing', 'Visual Language: Warm']);
    expect(N.note(EYE, 'selects', 'other', 'put off asking for selects').at).toMatch(/Z$/);
  });
  it('writes nothing for a kind he turned off (check 2: off stops it)', () => {
    N.flip(EYE, 'status', false);
    expect(N.note(EYE, 'status', 'change', 'booked')).toBeNull();
    expect(N.recent(EYE)).toEqual([]);
    N.flip(EYE, 'status', true);
    expect(N.note(EYE, 'status', 'change', 'booked')).not.toBeNull();
  });
  it('never throws and never gets in the way (check 3: the notebook works the same)', () => {
    expect(N.note(EYE, 'status', 'change', '')).toBeNull();
    expect(N.note(EYE, 'status', 'change', 'booked', { get boom() { throw new Error('bad'); } })).toBeNull();
    breakSaving();
    expect(N.note(EYE, 'status', 'change', 'booked')).toBeNull();
  });
  it('keeps at most MOST_KEPT lines, the oldest going first, and moves the saved count with them', () => {
    const lines = [...Array(N.MOST_KEPT)].map((_, i) => N.line(EYE, 'status', 'change', `s${i}`, undefined, AT));
    localStorage.setItem(N.key(EYE), JSON.stringify({ off: {}, lines, saved: 1 }));
    N.note(EYE, 'status', 'change', 'new', undefined, AT);
    N.note(EYE, 'status', 'change', 'newer', undefined, AT);
    const kept = stored();
    expect(kept.lines).toHaveLength(N.MOST_KEPT);
    expect(kept.lines[0].item).toBe('s2');
    expect(kept.lines.at(-1).item).toBe('newer');
    expect(kept.saved).toBe(0);
  });
});

describe('flip', () => {
  it('says what it saved', () => {
    expect(N.flip(EYE, 'selects', false)).toBe('Saved. Putting off selects: off, nothing of it is written.');
    expect(stored().off).toEqual({ selects: true });
    expect(N.flip(EYE, 'selects', true)).toBe('Saved. Putting off selects: on, it goes to the brain.');
    expect(stored().off).toEqual({});
  });
  it('takes anything but true as off', () => {
    N.flip(EYE, 'status', 'yes');
    expect(N.isOn(EYE, 'status')).toBe(false);
  });
  it('says so when it could not be saved, or the kind is not The Eye’s', () => {
    expect(N.flip(EYE, 'footage', false)).toBe('That couldn’t be saved. Try again.');
    expect(N.flip('rounds', 'status', false)).toBe('That couldn’t be saved. Try again.');
    breakSaving();
    expect(N.flip(EYE, 'status', false)).toBe('That couldn’t be saved. Try again.');
  });
});

describe('recent and waiting', () => {
  it('gives the newest lines first, RECENT by default', () => {
    for (let i = 0; i < 10; i++) N.note(EYE, 'status', 'change', `s${i}`, undefined, AT);
    expect(N.recent(EYE).map((r) => r.item)).toEqual(['s9', 's8', 's7', 's6', 's5', 's4', 's3', 's2']);
    expect(N.recent(EYE, 2).map((r) => r.item)).toEqual(['s9', 's8']);
    expect(N.waiting(EYE)).toBe(10);
  });
  it('is empty with nothing written', () => {
    expect(N.recent(EYE)).toEqual([]);
    expect(N.waiting(EYE)).toBe(0);
  });
});

describe('lessons', () => {
  const r = (kind, action, item) => N.line(EYE, kind, action, item, undefined, AT);
  it('makes one lesson a kind once he has done it three times: his most common choice', () => {
    const lines = [r('status', 'change', 'booked'), r('status', 'change', 'editing'), r('status', 'change', 'booked'), r('frameworks', 'pick', 'A: b')];
    expect(N.lessons(EYE, lines, AT)).toEqual([
      { v: 1, at: STAMP, kind: 'lesson', id: 'acts:status', text: 'Shoot steps: your most common is change booked (2 of 3).', topic: 'status' },
    ]);
  });
  it('breaks a tie by the words, and skips lines of other kinds', () => {
    const lines = [r('selects', 'other', 'b'), r('selects', 'other', 'a'), r('selects', 'other', 'c'), { kind: 'footage', action: 'x', item: 'y' }];
    const [lesson] = N.lessons(EYE, lines);
    expect(lesson.text).toBe('Putting off selects: your most common is other a (1 of 3).');
    expect(lesson.at).toMatch(/Z$/);
  });
  it('makes none with too little', () => {
    expect(N.lessons(EYE, [])).toEqual([]);
    expect(N.lessons(EYE, [r('status', 'change', 'booked')])).toEqual([]);
  });
});

describe('brainFile and markSaved', () => {
  it('gives the file for the brain’s inbox with the new lines, the lessons and who The Eye is', () => {
    N.flip(EYE, 'selects', false);
    for (const s of ['booked', 'booked', 'editing']) N.note(EYE, 'status', 'change', s, undefined, AT);
    const made = N.brainFile(EYE, AT);
    expect(made.name).toBe('the-eye.brain.json');
    expect(made.count).toBe(3);
    expect(made.upto).toBe(3);
    expect(made.text.endsWith('\n')).toBe(true);
    const body = JSON.parse(made.text);
    expect(body.v).toBe(1);
    expect(body.app).toEqual(N.appJson(EYE));
    expect(body.app.kinds.find((k) => k.id === 'selects').on).toBe(false);
    expect(body.app).toMatchObject({ id: EYE, name: 'The Eye', popups: 'none' });
    expect(body.notes.map((n) => n.id)).toEqual(['acts:status']);
    expect(body.actions.map((a) => a.item)).toEqual(['booked', 'booked', 'editing']);
  });
  it('puts only lines not saved before in the next file', () => {
    N.note(EYE, 'status', 'change', 'booked', undefined, AT);
    expect(N.markSaved(EYE, N.brainFile(EYE, AT).upto)).toBe(true);
    expect(N.brainFile(EYE)).toBeNull();
    expect(N.waiting(EYE)).toBe(0);
    N.note(EYE, 'status', 'change', 'shot', undefined, AT);
    expect(JSON.parse(N.brainFile(EYE).text).actions.map((a) => a.item)).toEqual(['shot']);
  });
  it('never moves the saved count back or past the lines', () => {
    N.note(EYE, 'status', 'change', 'booked', undefined, AT);
    N.markSaved(EYE, 1);
    N.markSaved(EYE, 'x');
    expect(stored().saved).toBe(1);
    N.markSaved(EYE, 99);
    expect(stored().saved).toBe(1);
    breakSaving();
    expect(N.markSaved(EYE, 1)).toBe(false);
  });
  it('gives no file for a notebook that tells the brain nothing, or with nothing new', () => {
    expect(N.brainFile('rounds')).toBeNull();
    expect(N.brainFile(EYE)).toBeNull();
  });
});
