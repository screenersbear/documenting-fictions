// rounds/data/so-far.js: SO FAR on a person's page (round 2, thanks/06):
// the moves done, their answer to a pitch, notes, moments and their shoots
// in The Eye, newest first.
import { describe, it, expect } from 'vitest';
import { doneSoFar } from '../../../rounds/data/so-far.js';

const line = (o) => ({ id: 'l1', at: 1, personId: 'p', kind: 'thanks', day: '2026-11-15', due: '2026-11-15', step: 0, ...o });
const lindsey = { id: 'p', name: 'Lindsey Tran' };
const row = (o) => ({ id: '', look: '', mark: '', how: '', howWords: '', note: '', noteOnly: false, ...o });

describe('doneSoFar', () => {
  it('each move, note and moment, newest first, with what and how and the note', () => {
    const lines = [
      line({ id: 'a', day: '2026-11-15', how: 'text', note: 'She reached out first.' }),
      { id: 'm', at: 3, personId: 'p', kind: 'moment', day: '2026-11-16', what: 'photos', keeps: true, note: 'Sent her 5 teasers.' },
      { id: 'b', at: 2, personId: 'p', kind: 'note', day: '2026-11-02', how: 'call', note: 'Booked.' },
      line({ id: 'c', kind: 'pitch', day: '2026-10-01', how: 'email' }),
      line({ id: 'x', personId: 'someone else' }),
    ];
    expect(doneSoFar(lindsey, lines)).toEqual([
      row({ id: 'm', day: '2026-11-16', kind: 'moment', look: 'moment', mark: 'rounds', what: 'Sent photos', how: 'photos', note: 'Sent her 5 teasers.' }),
      row({ id: 'a', day: '2026-11-15', kind: 'move', look: 'thanks', what: 'Said thanks', how: 'text', howWords: 'by text', note: 'She reached out first.' }),
      row({ id: 'b', day: '2026-11-02', kind: 'note', look: 'note', mark: 'rounds', what: 'Note', how: 'call', howWords: 'a call', note: 'Booked.', noteOnly: true }),
      row({ id: 'c', day: '2026-10-01', kind: 'move', look: 'pitch', what: 'Pitched Lindsey', how: 'email', howWords: 'by email' }),
    ]);
  });
  it('a note with only its words, or only how, and no time kept', () => {
    const lines = [
      { id: 'n1', personId: 'p', kind: 'note', day: '2026-11-03', note: 'Hi.' },
      { id: 'n2', personId: 'p', kind: 'note', day: '2026-11-04', how: 'text' },
      { id: 'm1', personId: 'p', kind: 'moment', day: '2026-11-04', what: 'met', keeps: true },
    ];
    expect(doneSoFar(lindsey, lines)).toEqual([
      row({ id: 'n2', day: '2026-11-04', kind: 'note', look: 'note', mark: 'rounds', what: 'Note', how: 'text', howWords: 'a text', noteOnly: true }),
      row({ id: 'm1', day: '2026-11-04', kind: 'moment', look: 'moment', mark: 'rounds', what: 'Met up', how: 'met' }),
      row({ id: 'n1', day: '2026-11-03', kind: 'note', look: 'note', mark: 'rounds', what: 'Note', note: 'Hi.', noteOnly: true }),
    ]);
  });
  it('a moment says what happened, with their name where it needs it; Other is A moment', () => {
    const m = (what, i) => ({ id: what || 'none', at: i, personId: 'p', kind: 'moment', day: '2026-11-16', what, keeps: false });
    expect(doneSoFar(lindsey, ['ran', 'other', 'nope', undefined].map(m)).map((r) => [r.what, r.how])).toEqual([['A moment', 'other'], ['A moment', 'nope'], ['A moment', 'other'], ['Ran into Lindsey', 'ran']]);
    expect(doneSoFar({ id: 'p' }, [m('ran', 1)])[0].what).toBe('Ran into them');
  });
  it('the same day: the latest first; A year since as itself; unknown kinds and lines with no day left out', () => {
    const lines = [line({ id: 'a', at: 1, kind: 'checkin' }), line({ id: 'b', at: 9, kind: 'checkin', year: { shoot: 'R' } }), line({ id: 'c', kind: 'mystery' }), line({ id: 'd', day: '' }), line({ id: 'e', at: undefined, kind: 'hello', day: '2026-11-15' })];
    expect(doneSoFar(lindsey, lines).map((r) => [r.id, r.look, r.what])).toEqual([['b', 'photos', 'Sent a final, a year on'], ['a', 'checkin', 'Checked in'], ['e', 'hello', 'Said hello']]);
  });
  it('their answer to a pitch, as a row with no id', () => {
    const p = { ...lindsey, pitch: { answer: 'yes', on: '2026-11-20' } };
    expect(doneSoFar(p, [])).toEqual([row({ day: '2026-11-20', kind: 'answer', look: 'pitch', what: 'Lindsey said yes' })]);
    expect(doneSoFar({ id: 'p', name: '', pitch: { answer: 'no', on: '2026-11-20' } })[0].what).toBe('They said not now');
    expect(doneSoFar({ ...lindsey, pitch: { answer: 'maybe', on: '2026-11-20' } })).toEqual([]);
    expect(doneSoFar({ ...lindsey, pitch: { answer: 'yes' } })).toEqual([]);
  });
  it('names them in the words that need it', () => {
    const lines = ['photos', 'intros', 'refresh', 'yes', 'hello', 'followup'].map((kind, i) => line({ id: kind, at: i, kind }));
    expect(doneSoFar(lindsey, lines).map((r) => r.what)).toEqual(['Followed up', 'Said hello', 'Said thanks for the yes', 'Offered Lindsey a refresh', 'Asked Lindsey for intros', 'Told Lindsey the photos were up']);
    expect(doneSoFar({ id: 'p' }, [line({ kind: 'pitch' })])[0].what).toBe('Pitched them');
  });
  it('their shoots in The Eye, under what was done the same day, with The Eye\'s mark', () => {
    const p = { ...lindsey, shoots: ['s1', 's2', 's3'] };
    const shoots = [
      { id: 's1', title: 'Portrait session', date: '2026-11-14' },
      { id: 's2', title: '', date: '2026-10-01' },
      { id: 's3', title: 'No date yet', date: '' },
      { id: 's4', title: 'Not theirs', date: '2026-11-14' },
      null,
    ];
    expect(doneSoFar(p, [line({ id: 'a', day: '2026-11-14' })], shoots)).toEqual([
      row({ id: 'a', day: '2026-11-14', kind: 'move', look: 'thanks', what: 'Said thanks' }),
      row({ day: '2026-11-14', kind: 'shoot', look: 'shoot', mark: 'the-eye', what: 'Portrait session', note: 'Shot in The Eye.' }),
      row({ day: '2026-10-01', kind: 'shoot', look: 'shoot', mark: 'the-eye', what: 'A shoot', note: 'Shot in The Eye.' }),
    ]);
    expect(doneSoFar(lindsey, [], shoots)).toEqual([]);
    expect(doneSoFar(p, [], null)).toEqual([]);
  });
});
