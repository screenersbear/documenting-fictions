// rounds/data/done-rows.js: DONE TODAY's rows on Today (rounds/12): the
// words around the name, how, the first line of what you said, the mark.
import { describe, it, expect } from 'vitest';
import { doneRow } from '../../../rounds/data/done-rows.js';
import { MOMENTS, MOMENT_WITH } from '../../../rounds/data/moments.js';
import { KIND_KEYS } from '../../../rounds/data/kinds.js';

const maya = { id: 'm', name: 'Maya R.' };
const row = (line) => doneRow({ line: { id: 'l', personId: 'm', day: '2026-11-16', ...line }, person: maya });
const words = (r) => `${r.before}[${r.name}]${r.after}`;

describe('a move', () => {
  it('"Said thanks to Maya R. · text" and what you said, its first line', () => {
    expect(row({ kind: 'thanks', how: 'text', said: '\n  Thank you for today!  \nIt was so good.', note: 'Loved it' })).toEqual({
      look: 'thanks', mark: '', before: 'Said thanks to ', name: 'Maya R.', after: '', how: 'text', said: 'Thank you for today!', note: 'Loved it',
    });
  });
  it('each kind, the name where it goes; Other and anything unknown as Reached out', () => {
    const all = [...KIND_KEYS, 'other', 'odd'].map((kind) => words(row({ kind })));
    expect(all).toEqual(['Said thanks to [Maya R.]', 'Said thanks to [Maya R.] for the yes', 'Told [Maya R.] the photos were up', 'Said hello to [Maya R.]',
      'Checked in with [Maya R.]', 'Asked [Maya R.] for intros', 'Offered [Maya R.] a refresh', 'Followed up with [Maya R.]', 'Pitched [Maya R.]',
      'Reached out to [Maya R.]', 'Reached out to [Maya R.]']);
    expect(row({ kind: 'odd' }).look).toBe('odd');
  });
  it('A year since: its words and the thank-yous\' look', () => {
    const r = row({ kind: 'checkin', year: 2025 });
    expect(words(r)).toBe('Sent [Maya R.] a final, a year on');
    expect(r.look).toBe('photos');
  });
  it('how, short; none or unknown is nothing; nothing said is empty', () => {
    expect(['text', 'instagram', 'email', 'person', 'fax', undefined].map((how) => row({ kind: 'checkin', how }).how)).toEqual(['text', 'Instagram', 'email', 'in person', '', '']);
    expect(row({ kind: 'checkin' })).toMatchObject({ said: '', note: '' });
    expect(row({ kind: 'checkin', said: ' \n ' }).said).toBe('');
  });
});

describe('a moment', () => {
  it('Rounds\' mark, its words with the name, no how, its note', () => {
    expect(row({ kind: 'moment', what: 'photos', how: 'text', said: 'x', note: 'Sent 5 teasers.\nMore later' })).toEqual({
      look: '', mark: 'rounds', before: 'Sent photos to ', name: 'Maya R.', after: '', how: '', said: '', note: 'Sent 5 teasers.',
    });
  });
  it('every kind of moment has its words; an unknown one is A moment with', () => {
    expect(Object.keys(MOMENT_WITH)).toEqual(Object.keys(MOMENTS));
    expect(Object.keys(MOMENTS).map((what) => words(row({ kind: 'moment', what })))).toEqual(['Sent photos to [Maya R.]', 'Texted [Maya R.]', 'Called [Maya R.]',
      'Emailed [Maya R.]', 'Messaged [Maya R.] on Instagram', 'Ran into [Maya R.]', 'Met up with [Maya R.]', "Commented on [Maya R.]'s post", 'A moment with [Maya R.]']);
    expect(words(row({ kind: 'moment', what: 'odd' }))).toBe('A moment with [Maya R.]');
  });
});
