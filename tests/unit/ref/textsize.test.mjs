// ref/components/textsize.js: page title / page text / text box sizes, stepped from 60%
// to 400%, kept per page, with a saved default per kind of text.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  KEYS, TEXT_STEPS, savedDefaults, defaultSize, sizeOf, setSize, stepSize,
  useDefault, saveDefault, isDefault, withTextDefaults,
} from '../../../ref/components/textsize.js';

const STORE = 'ref-notebook-text-defaults';
const store = (v) => localStorage.setItem(STORE, typeof v === 'string' ? v : JSON.stringify(v));

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('KEYS and TEXT_STEPS', () => {
  it('name the stored field and built-in size of each kind of text', () => {
    expect(KEYS).toEqual({ title: { size: 'titleSize', def: 1.5 }, body: { size: 'textSize', def: 1 }, note: { size: 'size', def: 1.6 } });
  });
  it('step from 60% to 400% in rising order', () => {
    expect(TEXT_STEPS).toEqual([0.6, 0.75, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2, 2.5, 3, 4]);
    for (let i = 1; i < TEXT_STEPS.length; i++) expect(TEXT_STEPS[i]).toBeGreaterThan(TEXT_STEPS[i - 1]);
  });
  it('include 100% as a step', () => {
    expect(TEXT_STEPS).toContain(1);
  });
});

describe('savedDefaults', () => {
  it('is an empty object when nothing is saved', () => {
    expect(savedDefaults()).toEqual({});
  });
  it('reads what was saved', () => {
    store({ title: 2, body: 1.3 });
    expect(savedDefaults()).toEqual({ title: 2, body: 1.3 });
  });
  it('is empty when the saved text is broken', () => {
    store('{not json');
    expect(savedDefaults()).toEqual({});
  });
  it('is empty when the saved value is null', () => {
    store('null');
    expect(savedDefaults()).toEqual({});
  });
  it('is empty when storage cannot be read (private mode)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    expect(savedDefaults()).toEqual({});
  });
});

describe('defaultSize', () => {
  it('is 100% when nothing is saved', () => {
    expect(defaultSize('title')).toBe(1);
    expect(defaultSize('body')).toBe(1);
  });
  it('is the saved size for that kind only', () => {
    store({ body: 1.3 });
    expect(defaultSize('body')).toBe(1.3);
    expect(defaultSize('title')).toBe(1);
  });
  it('reads a size saved as text', () => {
    store({ title: '2.5' });
    expect(defaultSize('title')).toBe(2.5);
  });
  it('ignores a zero, negative or non-number size', () => {
    store({ title: 0, body: -1, note: 'big' });
    expect(defaultSize('title')).toBe(1);
    expect(defaultSize('body')).toBe(1);
    expect(defaultSize('note')).toBe(1);
  });
  it('accepts a very small positive size', () => {
    store({ body: 0.01 });
    expect(defaultSize('body')).toBe(0.01);
  });
});

describe('sizeOf', () => {
  it('is 100% for a page with no size set', () => {
    expect(sizeOf({}, 'title')).toBe(1);
    expect(sizeOf({}, 'body')).toBe(1);
    expect(sizeOf({}, 'note')).toBe(1);
  });
  it('is 100% when there is no page', () => {
    expect(sizeOf(undefined, 'title')).toBe(1);
    expect(sizeOf(null, 'body')).toBe(1);
  });
  it('is the stored size as a share of the built-in size', () => {
    expect(sizeOf({ titleSize: 3 }, 'title')).toBe(2);
    expect(sizeOf({ textSize: 1.5 }, 'body')).toBe(1.5);
    expect(sizeOf({ size: 0.8 }, 'note')).toBe(0.5);
  });
  it('reads only its own field', () => {
    expect(sizeOf({ textSize: 2, size: 3.2 }, 'title')).toBe(1);
  });
  it('treats a stored null as unset but keeps a stored zero', () => {
    expect(sizeOf({ titleSize: null }, 'title')).toBe(1);
    expect(sizeOf({ titleSize: 0 }, 'title')).toBe(0);
  });
  it('throws for an unknown kind', () => {
    expect(() => sizeOf({}, 'caption')).toThrow(TypeError);
  });
});

describe('setSize', () => {
  it('stores the size in the kind\'s own units', () => {
    const page = {};
    setSize(page, 'title', 2);
    setSize(page, 'body', 1.15);
    setSize(page, 'note', 0.75);
    expect(page).toEqual({ titleSize: 3, textSize: 1.15, size: 1.2 });
  });
  it('removes the field when set back to 100%', () => {
    const page = { titleSize: 3, textSize: 2, other: 'kept' };
    setSize(page, 'title', 1);
    setSize(page, 'body', 1);
    expect(page).toEqual({ other: 'kept' });
    expect('titleSize' in page).toBe(false);
  });
  it('rounds to three decimals', () => {
    const page = {};
    setSize(page, 'body', 0.1234567);
    setSize(page, 'title', 1 / 3);
    expect(page.textSize).toBe(0.123);
    expect(page.titleSize).toBe(0.5);
  });
  it('counts a size that rounds to 100% as 100%', () => {
    const page = { textSize: 2 };
    setSize(page, 'body', 1.0004);
    expect(page).toEqual({});
  });
  it('keeps a size just past rounding', () => {
    const page = {};
    setSize(page, 'body', 1.0006);
    expect(page.textSize).toBe(1.001);
  });
  it('stores a zero size', () => {
    const page = {};
    setSize(page, 'body', 0);
    expect(page.textSize).toBe(0);
  });
  it('throws for an unknown kind', () => {
    expect(() => setSize({}, 'caption', 2)).toThrow(TypeError);
  });
});

describe('stepSize on a step', () => {
  it('goes one step up and one step down from 100%', () => {
    const up = {}, down = {};
    stepSize(up, 'body', 1);
    stepSize(down, 'body', -1);
    expect(up.textSize).toBe(1.15);
    expect(down.textSize).toBe(0.9);
  });
  it('steps a title in its own units', () => {
    const up = {}, down = {};
    stepSize(up, 'title', 1);
    stepSize(down, 'title', -1);
    expect(up.titleSize).toBe(1.725);
    expect(down.titleSize).toBe(1.35);
  });
  it('walks up through every step and stops at 400%', () => {
    const page = { textSize: 0.6 };
    const seen = [];
    for (let i = 0; i < 13; i++) { stepSize(page, 'body', 1); seen.push(sizeOf(page, 'body')); }
    expect(seen).toEqual([0.75, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2, 2.5, 3, 4, 4, 4]);
  });
  it('walks down through every step and stops at 60%', () => {
    const page = { textSize: 4 };
    const seen = [];
    for (let i = 0; i < 13; i++) { stepSize(page, 'body', -1); seen.push(sizeOf(page, 'body')); }
    expect(seen).toEqual([3, 2.5, 2, 1.75, 1.5, 1.3, 1.15, 1, 0.9, 0.75, 0.6, 0.6, 0.6]);
  });
  it('a zero step leaves a size on a step alone', () => {
    const page = { textSize: 1.3 };
    stepSize(page, 'body', 0);
    expect(page.textSize).toBe(1.3);
  });
  it('a big jump is held to the ends', () => {
    const big = {}, small = {};
    stepSize(big, 'body', 50);
    stepSize(small, 'body', -50);
    expect(big.textSize).toBe(4);
    expect(small.textSize).toBe(0.6);
  });
  it('treats a size a hair under a step as on the step', () => {
    const page = { textSize: 1.3 - 1e-9 };
    stepSize(page, 'body', 1);
    expect(page.textSize).toBe(1.5);
  });
  it('treats a size a hair over a step as just past it', () => {
    const up = { textSize: 1.3 + 1e-6 }, down = { textSize: 1.3 + 1e-6 };
    stepSize(up, 'body', 1);
    stepSize(down, 'body', -1);
    expect(up.textSize).toBe(1.5);
    expect(down.textSize).toBe(1.3);
  });
  it('a two-step jump down from above 400% lands on 300%', () => {
    const page = { textSize: 5 };
    stepSize(page, 'body', -2);
    expect(page.textSize).toBe(3);
  });
  it('brings a size above 400% back to 400% either way', () => {
    const up = { textSize: 5 }, down = { textSize: 5 };
    stepSize(up, 'body', 1);
    stepSize(down, 'body', -1);
    expect(up.textSize).toBe(4);
    expect(down.textSize).toBe(4);
  });
});

// A size between two steps goes to the next step in the tap's direction:
// smaller to the step below, bigger to the step above. Sizes are stored
// rounded, so one that reads back a hair off its step (a title at 115%, a text
// box at 75%, 90%, 150%, 175% or 300%) counts as on it.
describe('stepSize between steps', () => {
  it('smaller from 105% goes down to 100%', () => {
    const page = { textSize: 1.05 };
    stepSize(page, 'body', -1);
    expect(page.textSize).toBeUndefined(); // 100% is the built-in size: nothing stored
  });
  it('bigger from 105% goes up to 115%, the next step', () => {
    const page = { textSize: 1.05 };
    stepSize(page, 'body', 1);
    expect(page.textSize).toBe(1.15);
  });
  it('two steps smaller from 105% go to 90%', () => {
    const page = { textSize: 1.05 };
    stepSize(page, 'body', -2);
    expect(page.textSize).toBe(0.9);
  });
  it('a zero step from 105% snaps up to 115%', () => {
    const page = { textSize: 1.05 };
    stepSize(page, 'body', 0);
    expect(page.textSize).toBe(1.15);
  });
  it('steps a title at 115% down to 100%, then 90%', () => {
    const page = {};
    setSize(page, 'title', 1.15);
    expect(page.titleSize).toBe(1.725);
    stepSize(page, 'title', -1);
    expect(page.titleSize).toBeUndefined();
    stepSize(page, 'title', -1);
    expect(page.titleSize).toBe(1.35);
  });
  it('steps every text box size down and up by one step', () => {
    TEXT_STEPS.forEach((v, i) => {
      const down = {}, up = {};
      setSize(down, 'note', v);
      setSize(up, 'note', v);
      stepSize(down, 'note', -1);
      stepSize(up, 'note', 1);
      expect(sizeOf(down, 'note')).toBeCloseTo(TEXT_STEPS[Math.max(0, i - 1)], 6);
      expect(sizeOf(up, 'note')).toBeCloseTo(TEXT_STEPS[Math.min(TEXT_STEPS.length - 1, i + 1)], 6);
    });
  });
  it('below 60%, either way goes to 60%', () => {
    const down = { textSize: 0.5 }, up = { textSize: 0.5 };
    stepSize(down, 'body', -1);
    stepSize(up, 'body', 1);
    expect(down.textSize).toBe(0.6);
    expect(up.textSize).toBe(0.6);
  });
});

describe('useDefault', () => {
  it('puts a page back to 100% when no default is saved', () => {
    const page = { titleSize: 3, textSize: 2 };
    useDefault(page, 'title');
    expect(page).toEqual({ textSize: 2 });
  });
  it('puts a page to the saved default', () => {
    store({ body: 1.3, title: 2 });
    const page = { textSize: 4 };
    useDefault(page, 'body');
    useDefault(page, 'title');
    expect(page).toEqual({ textSize: 1.3, titleSize: 3 });
  });
  it('ignores a broken saved default', () => {
    store({ body: -2 });
    const page = { textSize: 2 };
    useDefault(page, 'body');
    expect(page).toEqual({});
  });
});

describe('saveDefault', () => {
  it('saves the page\'s size for that kind', () => {
    saveDefault({ titleSize: 3 }, 'title');
    expect(JSON.parse(localStorage.getItem(STORE))).toEqual({ title: 2 });
    expect(defaultSize('title')).toBe(2);
  });
  it('keeps the other kinds already saved', () => {
    store({ body: 1.3 });
    saveDefault({ size: 3.2 }, 'note');
    expect(JSON.parse(localStorage.getItem(STORE))).toEqual({ body: 1.3, note: 2 });
  });
  it('saves 100% for a page at the built-in size', () => {
    store({ body: 1.3 });
    saveDefault({}, 'body');
    expect(JSON.parse(localStorage.getItem(STORE))).toEqual({ body: 1 });
  });
  it('does not throw when storage is full', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
    expect(() => saveDefault({ textSize: 2 }, 'body')).not.toThrow();
  });
});

describe('isDefault', () => {
  it('is true for a page at 100% with nothing saved', () => {
    expect(isDefault({}, 'body')).toBe(true);
  });
  it('is false for a page at another size', () => {
    expect(isDefault({ textSize: 1.15 }, 'body')).toBe(false);
    expect(isDefault({ textSize: 0.9 }, 'body')).toBe(false);
  });
  it('compares with the saved default', () => {
    store({ title: 2 });
    expect(isDefault({ titleSize: 3 }, 'title')).toBe(true);
    expect(isDefault({}, 'title')).toBe(false);
  });
  it('counts a difference of exactly one millionth as different', () => {
    store({ body: 1e-6 });
    expect(isDefault({ textSize: 0 }, 'body')).toBe(false);
    expect(isDefault({ textSize: 1e-6 }, 'body')).toBe(true);
  });
  it('allows for rounding noise but not a real difference', () => {
    expect(isDefault({ textSize: 1 + 1e-7 }, 'body')).toBe(true);
    expect(isDefault({ textSize: 1 - 1e-7 }, 'body')).toBe(true);
    expect(isDefault({ textSize: 1 + 1e-5 }, 'body')).toBe(false);
    expect(isDefault({ textSize: 1 - 1e-5 }, 'body')).toBe(false);
  });
});

describe('withTextDefaults', () => {
  it('leaves a new page alone when no defaults are saved', () => {
    const page = { template: 'lp-grid-4' };
    expect(withTextDefaults(page)).toBe(page);
    expect(page).toEqual({ template: 'lp-grid-4' });
  });
  it('does not touch the page\'s fields when the defaults are 100%', () => {
    store({ title: 1, body: 1 });
    const page = { textSize: undefined };
    withTextDefaults(page);
    expect(Object.keys(page)).toEqual(['textSize']);
  });
  it('gives a new page the saved title and text sizes', () => {
    store({ title: 2, body: 1.3 });
    expect(withTextDefaults({ template: 'x' })).toEqual({ template: 'x', titleSize: 3, textSize: 1.3 });
  });
  it('keeps a size the page already has (a cover\'s big title)', () => {
    store({ title: 2, body: 1.3 });
    expect(withTextDefaults({ titleSize: 4.5 })).toEqual({ titleSize: 4.5, textSize: 1.3 });
  });
  it('keeps a size of zero the page already has', () => {
    store({ body: 2 });
    expect(withTextDefaults({ textSize: 0 })).toEqual({ textSize: 0 });
  });
  it('does not apply the text box default to the page', () => {
    store({ note: 2 });
    expect(withTextDefaults({})).toEqual({});
  });
  it('treats a field set to undefined as not set', () => {
    store({ body: 1.5 });
    expect(withTextDefaults({ textSize: undefined })).toEqual({ textSize: 1.5 });
  });
});
