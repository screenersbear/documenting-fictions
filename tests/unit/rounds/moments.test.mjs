// rounds/data/moments.js: moments (round 2, thanks/05): something done
// outside the planned moves, and what it moves when it counts as keeping in
// touch (a Check in, a Client's Refresh or Ask; never a Pitch or Follow up).
import { describe, it, expect } from 'vitest';
import { MOMENTS, MOMENT_KIND, momentChoices, momentWhat, momentLine, afterMoment, withoutMoment, keepWords } from '../../../rounds/data/moments.js';

const june = (next, o = {}) => ({ id: 'p', name: 'June Park', group: 'regular', lastMove: '2026-10-01', next, ...o });
const move = (kind, due) => ({ kind, due, step: 0 });

describe('the chips', () => {
  it('WHAT HAPPENED in order, their name where it needs it, and what each row says', () => {
    expect(Object.keys(MOMENTS)).toEqual(['photos', 'text', 'call', 'email', 'instagram', 'ran', 'met', 'comment', 'other']);
    expect(momentChoices('June Park').map((c) => c[1])).toEqual(['Sent photos', 'Texted', 'Called', 'Emailed', 'Messaged on Instagram', 'Ran into June', 'Met up', 'Commented on a post', 'Other']);
    expect(momentChoices('June Park').find((c) => c[0] === 'other')[2]).toBe('A moment');
    expect(momentChoices('').find((c) => c[0] === 'ran')[1]).toBe('Ran into them');
  });
  it('momentWhat: the row\'s words, A moment for Other or anything unknown', () => {
    expect(momentWhat('call', 'June')).toBe('Called');
    expect(momentWhat('ran', 'June Park')).toBe('Ran into June');
    expect(momentWhat('other', 'June')).toBe('A moment');
    expect(momentWhat('nope', 'June')).toBe('A moment');
  });
});

describe('momentLine', () => {
  it('a line for the log: counts unless switched off, the note cleaned, an unknown pick is Other', () => {
    expect(momentLine('p', { what: 'photos', day: '2026-11-16', note: '  Sent  5 teasers. ' }, 'm1', 5)).toEqual({ id: 'm1', at: 5, personId: 'p', kind: MOMENT_KIND, day: '2026-11-16', what: 'photos', keeps: true, note: 'Sent 5 teasers.' });
    expect(momentLine('p', { what: 'nope', day: '2026-11-16', keeps: false }, 'm2', 6)).toEqual({ id: 'm2', at: 6, personId: 'p', kind: 'moment', day: '2026-11-16', what: 'other', keeps: false });
  });
});

describe('afterMoment', () => {
  const at = (what, day, keeps = true) => momentLine('p', { what, day, keeps }, 'm', 1);
  it('a Check in moves out six weeks from that day; the line keeps what it moved', () => {
    const { person, line } = afterMoment(june(move('checkin', '2026-11-20')), at('photos', '2026-11-16'));
    expect(person.next.due).toBe('2026-12-28');
    expect(person.lastMove).toBe('2026-11-16');
    expect(line.moved).toEqual({ from: '2026-11-20', to: '2026-12-28' });
    expect(line.wasLast).toBe('2026-10-01');
  });
  it('a Client\'s Refresh or Ask moves out three months; never sooner than it was', () => {
    expect(afterMoment(june(move('refresh', '2026-11-20')), at('call', '2026-11-16')).person.next.due).toBe('2027-02-14');
    expect(afterMoment(june(move('intros', '2026-11-20')), at('call', '2026-11-16')).person.next.due).toBe('2027-02-14');
    const far = afterMoment(june(move('checkin', '2027-03-01')), at('call', '2026-11-16'));
    expect(far.person.next.due).toBe('2027-03-01');
    expect(far.line).not.toHaveProperty('moved');
  });
  it('a Pitch, a Follow up and the rest never move; their last move still does', () => {
    for (const kind of ['pitch', 'followup', 'thanks', 'hello', 'yes', 'photos']) {
      const { person, line } = afterMoment(june(move(kind, '2026-11-20')), at('met', '2026-11-16'));
      expect(person.next.due).toBe('2026-11-20');
      expect(person.lastMove).toBe('2026-11-16');
      expect(line).not.toHaveProperty('moved');
    }
  });
  it('someone let go, or with nothing planned: only the last move', () => {
    expect(afterMoment(june(move('checkin', '2026-11-20'), { letGo: true }), at('met', '2026-11-16')).person.next.due).toBe('2026-11-20');
    expect(afterMoment(june(null), at('met', '2026-11-16')).person).toEqual(june(null, { lastMove: '2026-11-16' }));
  });
  it('an older moment leaves a later last move as it is; none before counts as none', () => {
    expect(afterMoment(june(null, { lastMove: '2026-11-18' }), at('met', '2026-11-16')).person.lastMove).toBe('2026-11-18');
    const r = afterMoment(june(null, { lastMove: undefined }), at('met', '2026-11-16'));
    expect(r.person.lastMove).toBe('2026-11-16');
    expect(r.line.wasLast).toBe('');
  });
  it('one that doesn\'t count leaves them as they were', () => {
    const p = june(move('checkin', '2026-11-20'));
    const l = at('text', '2026-11-16', false);
    expect(afterMoment(p, l)).toEqual({ person: p, line: l });
  });
});

describe('withoutMoment', () => {
  it('puts the move and their last move back as they were', () => {
    const before = june(move('checkin', '2026-11-20'));
    const { person, line } = afterMoment(before, momentLine('p', { what: 'call', day: '2026-11-16' }, 'm', 1));
    expect(withoutMoment(person, line, [])).toEqual(before);
  });
  it('their last move: the latest of what it was and their other lines that count', () => {
    const { person, line } = afterMoment(june(null), momentLine('p', { what: 'call', day: '2026-11-16' }, 'm', 1));
    const lines = [
      { id: 'a', personId: 'p', kind: 'checkin', day: '2026-11-03' },
      { id: 'b', personId: 'p', kind: 'moment', day: '2026-11-10', keeps: false },
      { id: 'c', personId: 'q', kind: 'checkin', day: '2026-11-12' },
      { id: 'd', personId: 'p', kind: 'moment', day: '2026-11-05', keeps: true },
      { id: 'e', personId: 'p', kind: 'checkin', day: '' },
      line,
    ];
    expect(withoutMoment(person, line, lines).lastMove).toBe('2026-11-05');
    expect(withoutMoment(person, { ...line, wasLast: undefined }, []).lastMove).toBe('');
  });
  it('leaves what changed since: a move done or moved, a later last move', () => {
    const { person, line } = afterMoment(june(move('checkin', '2026-11-20')), momentLine('p', { what: 'call', day: '2026-11-16' }, 'm', 1));
    const since = { ...person, lastMove: '2026-11-18', next: move('checkin', '2027-01-01') };
    expect(withoutMoment(since, line, [])).toEqual(since);
    const none = { ...person, next: null };
    expect(withoutMoment(none, line, []).next).toBe(null);
  });
  it('one that didn\'t count changes nothing', () => {
    const p = june(move('checkin', '2026-11-20'), { lastMove: '2026-11-16' });
    expect(withoutMoment(p, momentLine('p', { what: 'call', day: '2026-11-16', keeps: false }, 'm', 1), [])).toEqual(p);
  });
});

describe('keepWords', () => {
  it('what counting as keeping in touch does for them', () => {
    expect(keepWords(june(move('checkin', '2026-11-20')), '2026-11-16', '2026-11-16')).toBe("June's next check-in moves out from today.");
    expect(keepWords(june(move('refresh', '2026-11-20')), '2026-11-10', '2026-11-16')).toBe("June's next refresh offer moves out from that day.");
    expect(keepWords(june(move('intros', '2026-11-20')), '2026-11-16', '2026-11-16')).toBe("June's next ask for intros moves out from today.");
    expect(keepWords(june(move('pitch', '2026-11-20')), '2026-11-16', '2026-11-16')).toBe("June's next move stays as it is.");
    expect(keepWords(june(move('checkin', '2026-11-20'), { letGo: true }), '2026-11-16', '2026-11-16')).toBe('Counts as the last time you were in touch.');
    expect(keepWords({ id: 'p', name: '', next: move('checkin', '2026-11-20') }, '2026-11-16', '2026-11-16')).toBe('Their next check-in moves out from today.');
  });
});
