// rounds/data/happened.js: what's happened with someone, for The Eye's
// talent card (round 2, connect/09).
import { describe, it, expect } from 'vitest';
import { happened } from '../../../rounds/data/happened.js';

const june = { id: 'r1', name: 'June Park' };
const line = (kind, day, o) => ({ id: `${kind}${day}`, personId: 'r1', kind, day, at: 1, ...o });

describe('happened', () => {
  it('gives the moves done with them, newest first, in words', () => {
    expect(happened(june, [line('checkin', '2026-11-12'), line('photos', '2026-11-20'), line('hello', '2026-10-01')])).toEqual([
      { day: '2026-11-20', words: 'you let June know the photos were up' },
      { day: '2026-11-12', words: 'you checked in' },
      { day: '2026-10-01', words: 'you said hello' },
    ]);
  });
  it('words every kind of move', () => {
    const kinds = ['thanks', 'yes', 'photos', 'hello', 'checkin', 'intros', 'refresh', 'followup', 'pitch'];
    expect(happened(june, kinds.map((k, i) => line(k, `2026-01-${String(20 - i).padStart(2, '0')}`))).map((h) => h.words)).toEqual([
      'you said thanks', 'you said thanks for the yes', 'you let June know the photos were up', 'you said hello', 'you checked in',
    ]);
    expect(happened(june, kinds.slice(5).map((k, i) => line(k, `2026-01-0${i + 1}`))).map((h) => h.words)).toEqual([
      'you pitched June', 'you followed up', 'you offered June a refresh', 'you asked June for intros',
    ]);
  });
  it('words a move logged as Other', () => {
    expect(happened(june, [line('other', '2026-11-16')])).toEqual([{ day: '2026-11-16', words: 'you reached out' }]);
  });
  it('adds their answer to a pitch: yes or not now, not "no reply yet"', () => {
    const yes = { ...june, pitch: { answer: 'yes', on: '2026-11-14' } };
    expect(happened(yes, [line('pitch', '2026-11-14'), line('pitch', '2026-11-02')])).toEqual([
      { day: '2026-11-14', words: 'June said yes' },
      { day: '2026-11-14', words: 'you pitched June' },
      { day: '2026-11-02', words: 'you pitched June' },
    ]);
    expect(happened({ ...june, pitch: { answer: 'no', on: '2026-11-03' } })).toEqual([{ day: '2026-11-03', words: 'June said not now' }]);
    expect(happened({ ...june, pitch: { answer: 'waiting', on: '2026-11-03' } })).toEqual([]);
    expect(happened({ ...june, pitch: { answer: 'yes' } })).toEqual([]);
  });
  it('the same day: the later move first', () => {
    expect(happened(june, [line('hello', '2026-11-12', { at: 5 }), line('checkin', '2026-11-12', { at: 9 }), line('thanks', '2026-11-12', { at: undefined })]).map((h) => h.words))
      .toEqual(['you checked in', 'you said hello', 'you said thanks']);
  });
  it('only theirs, only moves Rounds knows with a day, at most five', () => {
    const lines = [line('checkin', '2026-11-12', { personId: 'r2' }), line('mystery', '2026-11-12'), line('checkin', ''), ...[1, 2, 3, 4, 5, 6].map((d) => line('hello', `2026-11-0${d}`))];
    expect(happened(june, lines).map((h) => h.day)).toEqual(['2026-11-06', '2026-11-05', '2026-11-04', '2026-11-03', '2026-11-02']);
    expect(happened(june)).toEqual([]);
  });
  it('without a name: they and them', () => {
    const noName = { id: 'r1', name: '', pitch: { answer: 'yes', on: '2026-11-14' } };
    expect(happened(noName, [line('intros', '2026-11-01')]).map((h) => h.words)).toEqual(['they said yes', 'you asked them for intros']);
  });
});
