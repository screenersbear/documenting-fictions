// rounds/data/move-promise.js: a promise made while logging a connection
// (21 Nov, as Callback's "Anything promised?"), tied to that move.
import { describe, it, expect } from 'vitest';
import {
  promiseFor, isKept, withoutPromise, withMovePromise, keptBy, promiseWho, tickWords, doneWords,
} from '../../../rounds/data/move-promise.js';

const TODAY = '2026-11-16';
const pr = (o) => ({ id: 'p1', mine: true, what: 'Send the selects', due: '', made: '2026-11-10', open: true, moveId: 'm1', ...o });
const june = (promises = []) => ({ id: 'j', name: 'June Park', promises });
let n = 0;
const makeId = () => `new${++n}`;

describe('promiseFor', () => {
  it('finds the one made with that move', () => {
    expect(promiseFor(june([pr({ id: 'a', moveId: 'm0' }), pr()]), 'm1')).toMatchObject({ id: 'p1' });
  });
  it('is null with none, no move id, or no person', () => {
    expect(promiseFor(june([pr()]), 'm2')).toBe(null);
    expect(promiseFor(june([pr()]), '')).toBe(null);
    expect(promiseFor(undefined, 'm1')).toBe(null);
    expect(promiseFor(june([{ id: 'x', moveId: 'm1' }]), 'm1')).toBe(null); // no words: not a promise
    expect(promiseFor(june([pr({ moveId: '' })]), '')).toBe(null); // one made on its own isn't any move's
  });
});

describe('isKept', () => {
  it('is true only when closed as kept', () => {
    expect(isKept(pr({ open: false, outcome: 'kept' }))).toBe(true);
    expect(isKept(pr())).toBe(false);
    expect(isKept(pr({ open: false, outcome: 'letGo' }))).toBe(false);
    expect(isKept(null)).toBe(false);
  });
});

describe('withoutPromise', () => {
  it('takes the one with that id off', () => {
    expect(withoutPromise(june([pr(), pr({ id: 'p2' })]), 'p1').promises.map((x) => x.id)).toEqual(['p2']);
  });
  it('gives the same person when there is none with it', () => {
    const p = june([pr()]);
    expect(withoutPromise(p, 'zz')).toBe(p);
    const none = june();
    expect(withoutPromise(none, 'p1')).toBe(none);
  });
});

describe('withMovePromise: a new one', () => {
  it('adds an open one tied to the move', () => {
    const after = withMovePromise(june(), 'm1', { what: ' Send the selects ', mine: true, due: '2026-11-20' }, () => 'n1', TODAY);
    expect(after.promises).toEqual([{ id: 'n1', mine: true, what: 'Send the selects', due: '2026-11-20', made: TODAY, open: true, moveId: 'm1' }]);
  });
  it('one of theirs, with no day, and keeps the others', () => {
    const after = withMovePromise(june([pr({ id: 'other', moveId: '' })]), 'm9', { what: 'Intro to Dev', mine: false, due: '' }, () => 'n2', TODAY);
    expect(after.promises.map((x) => [x.id, x.mine, x.due, x.moveId])).toEqual([['other', true, '', ''], ['n2', false, '', 'm9']]);
  });
  it('ticked already: closed as kept today', () => {
    const after = withMovePromise(june(), 'm1', { what: 'x', kept: true }, () => 'n3', TODAY);
    expect(after.promises[0]).toMatchObject({ open: false, outcome: 'kept', closed: TODAY });
  });
  it('nothing typed, null, or no move: the same person', () => {
    const p = june();
    expect(withMovePromise(p, 'm1', { what: '   ' }, makeId, TODAY)).toBe(p);
    expect(withMovePromise(p, 'm1', null, makeId, TODAY)).toBe(p);
    expect(withMovePromise(p, '', { what: 'x' }, makeId, TODAY)).toBe(p);
  });
});

describe('withMovePromise: the one it had', () => {
  it('changes its words, side and day, keeping its id and when it was made', () => {
    const after = withMovePromise(june([pr()]), 'm1', { what: 'Send ten selects', mine: false, due: '2026-12-01' }, makeId, TODAY);
    expect(after.promises).toEqual([pr({ what: 'Send ten selects', mine: false, due: '2026-12-01' })]);
  });
  it('any one of words, side or day changed alone is a change', () => {
    const p = june([pr({ due: '2026-11-20' })]);
    const was = { what: 'Send the selects', mine: true, due: '2026-11-20' };
    expect(withMovePromise(p, 'm1', { ...was, what: 'Send them' }, makeId, TODAY).promises[0].what).toBe('Send them');
    expect(withMovePromise(p, 'm1', { ...was, mine: false }, makeId, TODAY).promises[0].mine).toBe(false);
    expect(withMovePromise(p, 'm1', { ...was, due: '' }, makeId, TODAY).promises[0].due).toBe('');
  });
  it('the same as it was: the same person', () => {
    const p = june([pr()]);
    expect(withMovePromise(p, 'm1', { what: 'Send the selects', mine: true, due: '' }, makeId, TODAY)).toBe(p);
  });
  it('ticked: kept today; already kept: its day stays', () => {
    expect(withMovePromise(june([pr()]), 'm1', { what: 'Send the selects', kept: true }, makeId, TODAY).promises[0]).toMatchObject({ open: false, outcome: 'kept', closed: TODAY });
    const kept = june([pr({ open: false, outcome: 'kept', closed: '2026-11-12' })]);
    expect(withMovePromise(kept, 'm1', { what: 'Send the selects', kept: true }, makeId, TODAY)).toBe(kept);
  });
  it('unticked: open again', () => {
    const after = withMovePromise(june([pr({ open: false, outcome: 'kept', closed: '2026-11-12' })]), 'm1', { what: 'Send the selects', kept: false }, makeId, TODAY);
    expect(after.promises[0]).toMatchObject({ open: true, outcome: '', closed: '' });
  });
  it('let go and not ticked: stays let go', () => {
    const gone = june([pr({ open: false, outcome: 'letGo', closed: '2026-11-12' })]);
    expect(withMovePromise(gone, 'm1', { what: 'Send the selects', kept: false }, makeId, TODAY)).toBe(gone);
  });
  it('its words cleared (or null): taken off', () => {
    expect(withMovePromise(june([pr(), pr({ id: 'p2', moveId: 'm2' })]), 'm1', { what: '' }, makeId, TODAY).promises.map((x) => x.id)).toEqual(['p2']);
    expect(withMovePromise(june([pr()]), 'm1', null, makeId, TODAY).promises).toEqual([]);
  });
});

describe('keptBy', () => {
  it('closes it as kept, by the move that kept it', () => {
    expect(keptBy(june([pr({ moveId: '' })]), 'p1', 'm7', TODAY).promises[0]).toMatchObject({ open: false, outcome: 'kept', closed: TODAY, keptBy: 'm7' });
  });
  it('none with that id: the same person', () => {
    const p = june([pr()]);
    expect(keptBy(p, 'nope', 'm7', TODAY)).toBe(p);
    const none = june();
    expect(keptBy(none, 'p1', 'm7', TODAY)).toBe(none);
  });
});

describe('promiseWho and tickWords', () => {
  it('says whose it is', () => {
    expect(promiseWho(pr(), 'June Park')).toBe('You promised: Send the selects');
    expect(promiseWho(pr({ mine: false }), 'June Park')).toBe('June promised: Send the selects');
    expect(promiseWho(pr({ mine: false }), '')).toBe('They promised: Send the selects');
    expect(promiseWho(null, 'June')).toBe('You promised: ');
  });
  it('names the tick', () => {
    expect(tickWords(pr())).toBe('Promise kept');
    expect(tickWords(pr({ mine: false }))).toBe('They came through');
    expect(tickWords(null)).toBe('Promise kept');
  });
});

describe('doneWords', () => {
  it('says what was saved', () => {
    expect(doneWords({})).toBe('Done.');
    expect(doneWords()).toBe('Done.');
    expect(doneWords({ promised: true })).toBe('Done, with a promise.');
    expect(doneWords({ kept: true })).toBe('Done. Marked as kept.');
    expect(doneWords({ promised: true, kept: true })).toBe('Done. Marked as kept.');
  });
});
