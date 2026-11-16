// rounds/data/one-move.js: the one sheet for any move (Tightening Rounds,
// rounds/08): which chip it starts on, which kind a chip logs, an extra
// move (not the due one) that counts as keeping in touch, What you said's
// title (rounds/09), and what deleting a move puts back.
import { describe, it, expect } from 'vitest';
import * as O from '../../../rounds/data/one-move.js';

const TODAY = '2026-11-16';
const lindsey = (o) => ({ id: 'l', name: 'Lindsey Tran', group: 'client', letGo: false, lastMove: '2026-10-01', next: { kind: 'checkin', due: '2026-11-20', step: 0 }, ...o });

describe('the chips', () => {
  it('are Check in, Say thanks, Say hello, Ask, Pitch and Other, in that order', () => {
    expect(O.KIND_CHIPS.map(([, n]) => n)).toEqual(['Check in', 'Say thanks', 'Say hello', 'Ask', 'Pitch', 'Other']);
  });
  it('put each kind under its chip, and one it does not know under Other', () => {
    expect(['checkin', 'thanks', 'yes', 'photos', 'hello', 'intros', 'refresh', 'pitch', 'followup', 'other', 'odd'].map(O.chipOf))
      .toEqual(['checkin', 'thanks', 'thanks', 'thanks', 'hello', 'ask', 'ask', 'pitch', 'pitch', 'other', 'other']);
  });
  it('start on their next move, or Check in when there is none (or they were let go)', () => {
    expect(O.startChip(lindsey({ next: { kind: 'yes', due: TODAY } }))).toBe('thanks');
    expect(O.startChip(lindsey({ next: null }))).toBe('checkin');
    expect(O.startChip(lindsey({ letGo: true }))).toBe('checkin');
  });
});

describe('doesDue and kindFor', () => {
  it('do the due move when its chip is picked, logging its own kind', () => {
    const p = lindsey({ next: { kind: 'yes', due: TODAY } });
    expect(O.doesDue(p, 'thanks')).toBe(true);
    expect(O.kindFor(p, 'thanks')).toBe('yes');
  });
  it('log the chip\'s own kind for any other pick', () => {
    const p = lindsey();
    expect(O.doesDue(p, 'pitch')).toBe(false);
    expect(O.kindFor(p, 'pitch')).toBe('pitch');
    expect(O.kindFor(p, 'ask')).toBe('intros');
    expect(O.kindFor(p, 'other')).toBe('other');
    expect(O.kindFor(p, 'nonsense')).toBe('other');
    expect(O.doesDue(p, 'nonsense')).toBe(false);
  });
  it('never do a due move for someone with none, or let go', () => {
    expect(O.doesDue(lindsey({ next: null }), 'checkin')).toBe(false);
    expect(O.doesDue(lindsey({ letGo: true }), 'checkin')).toBe(false);
    expect(O.kindFor(lindsey({ next: null }), 'checkin')).toBe('checkin');
  });
});

describe('extraMove', () => {
  it('is a line of its own that counts as keeping in touch: their check-in moves out', () => {
    const { person, line } = O.extraMove(lindsey(), 'pitch', TODAY, { said: ' Hi! ', how: 'text', note: 'Liked it' }, 'x1', 5);
    expect(line).toEqual({ id: 'x1', at: 5, personId: 'l', kind: 'pitch', day: TODAY, extra: true, keeps: true, said: 'Hi!', how: 'text', note: 'Liked it', wasLast: '2026-10-01', moved: { from: '2026-11-20', to: '2026-12-28' } });
    expect(person.lastMove).toBe(TODAY);
    expect(person.next.due).toBe('2026-12-28');
  });
  it('leaves out what was left empty', () => {
    const { line } = O.extraMove(lindsey({ next: { kind: 'pitch', due: TODAY } }), 'other', TODAY, {}, 'x2', 6);
    expect(line).toEqual({ id: 'x2', at: 6, personId: 'l', kind: 'other', day: TODAY, extra: true, keeps: true, wasLast: '2026-10-01' });
  });
});

describe('withWords', () => {
  it('says what was done, with their first name', () => {
    expect(O.withWords({ kind: 'checkin' }, 'Lindsey Tran')).toBe('Checked in with Lindsey');
    expect(O.withWords({ kind: 'yes' }, 'Lindsey Tran')).toBe('Said thanks to Lindsey for the yes');
    expect(O.withWords({ kind: 'other' }, 'Lindsey')).toBe('Reached out to Lindsey');
    expect(O.withWords({ kind: 'odd' }, '')).toBe('Reached out to them');
    expect(O.withWords({ kind: 'checkin', year: { shootId: 's' } }, 'June')).toBe('Sent June a final, a year on');
  });
});

describe('afterDelete', () => {
  const done = { id: 'd', at: 9, personId: 'l', kind: 'checkin', day: TODAY, due: TODAY, step: 0 };
  const older = { id: 'o', at: 1, personId: 'l', kind: 'hello', day: '2026-10-01', due: '2026-10-01', step: 0 };
  it('takes an extra move back out, as a moment', () => {
    const { person, line } = O.extraMove(lindsey(), 'pitch', TODAY, {}, 'x', 10);
    const back = O.afterDelete(person, line, [older, line], TODAY);
    expect(back.next.due).toBe('2026-11-20');
    expect(back.lastMove).toBe('2026-10-01');
    expect(O.undoesDue(person, line, [older, line], TODAY)).toBe(false);
  });
  it('makes the due move done last today due again', () => {
    const after = lindsey({ lastMove: TODAY, next: { kind: 'checkin', due: '2026-12-28', step: 0 } });
    const back = O.afterDelete(after, done, [older, done], TODAY);
    expect(back.next).toEqual({ kind: 'checkin', due: TODAY, step: 0 });
    expect(back.lastMove).toBe('2026-10-01');
    expect(O.undoesDue(after, done, [older, done], TODAY)).toBe(true);
  });
  it('only takes an older move out of the log, their last move the latest of the rest', () => {
    const after = lindsey({ lastMove: TODAY });
    const moment = { id: 'm', personId: 'l', kind: 'moment', day: '2026-10-05', keeps: false };
    const note = { id: 'n', personId: 'l', kind: 'note', day: '2026-09-01' };
    const back = O.afterDelete(after, older, [older, done, moment, note], TODAY);
    expect(back).toEqual({ ...after, lastMove: TODAY });
    expect(O.undoesDue(after, older, [older, done], TODAY)).toBe(false);
    expect(O.afterDelete(after, done, [done], '2026-11-17').lastMove).toBe('');
  });
  it('finds the latest with no times given', () => {
    const a = { id: 'a', personId: 'l', kind: 'hello', day: TODAY };
    const b = { id: 'b', personId: 'l', kind: 'checkin', day: TODAY };
    const p = lindsey();
    expect(O.afterDelete(p, b, [a, b], TODAY).next).toBe(p.next); // the first of the two counts as the latest
    expect(O.afterDelete(p, a, [a, b], TODAY).next).toEqual({ kind: 'hello', due: TODAY, step: 0 });
    expect(O.afterDelete(lindsey(), a, [], TODAY).next).toEqual({ kind: 'hello', due: TODAY, step: 0 });
  });
});
