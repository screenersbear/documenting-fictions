// rounds/data/promises.js: promises (user, 20 Nov), as Callback's open loops.
import { describe, it, expect } from 'vitest';
import {
  WHAT_MOST, newPromise, promisesOf, openOf, withPromise, changePromise, keepPromise, letGoPromise, openAgain, dueOn,
  anotherWeek, isLate, promiseWhen, promiseList, bothPromises, promiseCount,
} from '../../../rounds/data/promises.js';

const TODAY = '2026-11-16'; // a Monday
const pr = (o) => ({ id: 'a', mine: true, what: 'Send the selects', due: '', made: '2026-11-10', open: true, ...o });
const june = (o) => ({ id: 'j', name: 'June Park', ...o });

describe('newPromise', () => {
  it('makes an open one of yours, with its day', () => {
    expect(newPromise({ what: ' Send  the selects ', due: '2026-11-20' }, 'p1', TODAY)).toEqual({ id: 'p1', mine: true, what: 'Send the selects', due: '2026-11-20', made: TODAY, open: true });
  });
  it('makes one of theirs, and drops a day that is not one', () => {
    expect(newPromise({ mine: false, what: 'Intro to Dev', due: '2026-02-30' }, 'p2', TODAY)).toMatchObject({ mine: false, due: '' });
    expect(newPromise({ what: 'x', due: undefined }, 'p3', 'nope')).toMatchObject({ due: '', made: '' });
  });
  it('cuts long words down', () => {
    expect(newPromise({ what: 'w'.repeat(500) }, 'p', TODAY).what).toHaveLength(WHAT_MOST);
  });
  it('is null with nothing said, no id, or nothing at all', () => {
    expect(newPromise({ what: '   ' }, 'p', TODAY)).toBe(null);
    expect(newPromise({ what: 5 }, 'p', TODAY)).toBe(null);
    expect(newPromise({ what: 'x' }, '', TODAY)).toBe(null);
    expect(newPromise({ what: 'x' }, 7, TODAY)).toBe(null);
    expect(newPromise(undefined, 'p', TODAY)).toBe(null);
  });
});

describe('promisesOf and openOf', () => {
  it('lists a person\'s promises, and the open ones', () => {
    const p = june({ promises: [pr(), pr({ id: 'b', open: false, outcome: 'kept' })] });
    expect(promisesOf(p).map((x) => x.id)).toEqual(['a', 'b']);
    expect(openOf(p).map((x) => x.id)).toEqual(['a']);
  });
  it('leaves out anything not well formed', () => {
    expect(promisesOf(june({ promises: [null, 'x', { id: '' , what: 'a' }, { id: 'c', what: ' ' }, { what: 'no id' }, pr()] })).map((x) => x.id)).toEqual(['a']);
  });
  it('is empty for no person or no list', () => {
    expect(promisesOf(null)).toEqual([]);
    expect(promisesOf(june())).toEqual([]);
    expect(openOf(june({ promises: 'x' }))).toEqual([]);
  });
});

describe('withPromise', () => {
  it('adds one', () => {
    expect(withPromise(june(), pr()).promises).toEqual([pr()]);
  });
  it('puts one in place of the one with its id', () => {
    const p = june({ promises: [pr(), pr({ id: 'b' })] });
    expect(withPromise(p, pr({ what: 'Send the prints' })).promises.map((x) => x.what)).toEqual(['Send the prints', 'Send the selects']);
  });
  it('leaves the person as they were for a bad one', () => {
    const p = june();
    expect(withPromise(p, null)).toBe(p);
    expect(withPromise(p, { id: 'x', what: '' })).toBe(p);
  });
});

describe('changing one', () => {
  const p = june({ promises: [pr(), pr({ id: 'b', mine: false })] });
  it('keeps it, closed today', () => {
    expect(keepPromise(p, 'a', TODAY).promises[0]).toEqual(pr({ open: false, outcome: 'kept', closed: TODAY }));
    expect(keepPromise(p, 'a', TODAY).promises[1]).toEqual(p.promises[1]);
  });
  it('lets it go, and opens it again', () => {
    const gone = letGoPromise(p, 'b', TODAY);
    expect(gone.promises[1]).toMatchObject({ open: false, outcome: 'letGo', closed: TODAY });
    expect(openAgain(gone, 'b').promises[1]).toMatchObject({ open: true, outcome: '', closed: '' });
  });
  it('moves its day, or takes it off', () => {
    expect(dueOn(p, 'a', '2026-12-01').promises[0].due).toBe('2026-12-01');
    expect(dueOn(p, 'a', 'soon').promises[0].due).toBe('');
  });
  it('leaves the person alone for an id they don\'t have', () => {
    expect(changePromise(p, 'zz', { open: false })).toBe(p);
    expect(keepPromise(june(), 'a', TODAY)).toEqual(june());
  });
});

describe('anotherWeek', () => {
  it('is a week past its day', () => { expect(anotherWeek('2026-11-20', TODAY)).toBe('2026-11-27'); });
  it('is a week past today when its day has gone or there is none', () => {
    expect(anotherWeek('2026-11-01', TODAY)).toBe('2026-11-23');
    expect(anotherWeek('', TODAY)).toBe('2026-11-23');
    expect(anotherWeek(undefined, TODAY)).toBe('2026-11-23');
  });
  it('crosses the month and the year', () => {
    expect(anotherWeek('2026-12-28', TODAY)).toBe('2027-01-04');
  });
});

describe('isLate', () => {
  it('is late when its day has gone', () => { expect(isLate(pr({ due: '2026-11-15' }), TODAY)).toBe(true); });
  it('is not late on its day, after it, closed, or with no day', () => {
    expect(isLate(pr({ due: TODAY }), TODAY)).toBe(false);
    expect(isLate(pr({ due: '2026-11-15', open: false }), TODAY)).toBe(false);
    expect(isLate(pr({ due: '' }), TODAY)).toBe(false);
  });
  it('is not late for nothing', () => { expect(isLate(null, TODAY)).toBe(false); });
});

describe('promiseWhen', () => {
  it('says when yours is due', () => {
    expect(promiseWhen(pr({ due: TODAY }), TODAY)).toBe('Due today');
    expect(promiseWhen(pr({ due: '2026-11-17' }), TODAY)).toBe('Due tomorrow');
    expect(promiseWhen(pr({ due: '2026-11-19' }), TODAY)).toBe('Due Thursday');
    expect(promiseWhen(pr({ due: '2026-12-03' }), TODAY)).toBe('Due 3 Dec');
  });
  it('says Expected for theirs, and how late a late one is', () => {
    expect(promiseWhen(pr({ mine: false, due: '2026-11-17' }), TODAY)).toBe('Expected tomorrow');
    expect(promiseWhen(pr({ due: '2026-11-15' }), TODAY)).toBe('1 day late');
    expect(promiseWhen(pr({ mine: false, due: '2026-11-06' }), TODAY)).toBe('10 days late');
  });
  it('is empty with no day, a bad day, or nothing', () => {
    expect(promiseWhen(pr(), TODAY)).toBe('');
    expect(promiseWhen(pr({ due: '2026-11-20' }), 'today')).toBe('');
    expect(promiseWhen(null, TODAY)).toBe('');
  });
});

describe('promiseList', () => {
  const ana = { id: 'n', name: 'Ana', promises: [pr({ id: 'n1', due: '2026-11-30' }), pr({ id: 'n2', mine: false, due: '2026-11-18' }), pr({ id: 'n3', open: false })] };
  const jo = june({ promises: [pr({ id: 'j1', due: '2026-11-17' }), pr({ id: 'j2' }), pr({ id: 'j3', mine: false, made: '2026-11-01' })] });
  it('puts yours and theirs apart, each by its day, with none last', () => {
    const l = promiseList([ana, jo]);
    expect(l.mine.map((x) => x.promise.id)).toEqual(['j1', 'n1', 'j2']);
    expect(l.theirs.map((x) => x.promise.id)).toEqual(['n2', 'j3']);
    expect(l.mine[0].person).toBe(jo);
  });
  it('orders the same day by when it was made, then by what it is', () => {
    const p = june({ promises: [pr({ id: 'x', what: 'B', made: '2026-11-02' }), pr({ id: 'y', what: 'A', made: '2026-11-02' }), pr({ id: 'z', what: 'C', made: '2026-11-01' }), pr({ id: 'w', what: 'D', made: undefined })] });
    expect(promiseList([p]).mine.map((x) => x.promise.id)).toEqual(['w', 'z', 'y', 'x']);
  });
  it('copes with ones that have no day made at all', () => {
    const p = june({ promises: [pr({ id: 'x', what: 'B', made: undefined }), pr({ id: 'y', what: 'A', made: undefined }), pr({ id: 'z', what: 'C', made: '2026-11-01' })] });
    expect(promiseList([p]).mine.map((x) => x.promise.id)).toEqual(['y', 'x', 'z']);
    expect(promiseList([june({ promises: [...p.promises].reverse() })]).mine.map((x) => x.promise.id)).toEqual(['y', 'x', 'z']);
  });
  it('is empty for no one or bad input', () => {
    expect(promiseList([])).toEqual({ mine: [], theirs: [] });
    expect(promiseList(null)).toEqual({ mine: [], theirs: [] });
    expect(promiseList([june(), null])).toEqual({ mine: [], theirs: [] });
  });
});

describe('bothPromises', () => {
  it('puts two lists together by id, the first one\'s kept', () => {
    expect(bothPromises([pr()], [pr({ what: 'Other words' }), pr({ id: 'b' })]).map((x) => [x.id, x.what])).toEqual([['a', 'Send the selects'], ['b', 'Send the selects']]);
  });
  it('takes either alone', () => {
    expect(bothPromises(undefined, [pr()])).toEqual([pr()]);
    expect(bothPromises([pr()], null)).toEqual([pr()]);
  });
  it('drops what isn\'t well formed', () => {
    expect(bothPromises([null, pr()], [{ id: 'q' }])).toEqual([pr()]);
  });
});

describe('promiseCount', () => {
  it('says one', () => { expect(promiseCount(1)).toBe('1 promise'); });
  it('says more', () => { expect(promiseCount(3)).toBe('3 promises'); });
  it('says none', () => { expect(promiseCount(0)).toBe('0 promises'); });
});
