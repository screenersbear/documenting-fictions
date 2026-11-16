// rounds/data/done-notes.js: how a move was done and a note with it
// (round 2, thanks/02), notes on their own, and DONE SO FAR (thanks/03).
import { describe, it, expect } from 'vitest';
import { HOWS, NOTE_HOWS, NOTE_KIND, HOW_CHOICES, howWords, howFromGo, cleanNote, quickTaps, addTap, withHowNote, noteLine, doneSoFar } from '../../../rounds/data/done-notes.js';

const line = (o) => ({ id: 'l1', at: 1, personId: 'p', kind: 'thanks', day: '2026-11-15', due: '2026-11-15', step: 0, ...o });
const lindsey = { id: 'p', name: 'Lindsey Tran' };

describe('the chips', () => {
  it('HOW is Text, Instagram, Email, In person; a note on its own has its own', () => {
    expect(Object.values(HOWS)).toEqual(['Text', 'Instagram', 'Email', 'In person']);
    expect(Object.values(NOTE_HOWS)).toEqual(['A call', 'A text', 'In person', 'An email']);
    expect(NOTE_KIND).toBe('note');
  });
  it('HOW_CHOICES gives each as [key, label, words] for the person page', () => {
    expect(HOW_CHOICES.move[0]).toEqual(['text', 'Text', 'by text']);
    expect(HOW_CHOICES.move[1]).toEqual(['instagram', 'Instagram', 'on Instagram']);
    expect(HOW_CHOICES.note[0]).toEqual(['call', 'A call', 'a call']);
    expect(HOW_CHOICES.note.map((c) => c[2])).toEqual(['a call', 'a text', 'in person', 'an email']);
  });
});

describe('howWords', () => {
  it('a move says how after what was done', () => {
    expect(howWords(line({ how: 'text' }))).toBe('by text');
    expect(howWords(line({ how: 'email' }))).toBe('by email');
    expect(howWords(line({ how: 'person' }))).toBe('in person');
  });
  it('a note says what it was', () => {
    expect(howWords({ kind: 'note', how: 'call' })).toBe('a call');
    expect(howWords({ kind: 'note', how: 'email' })).toBe('an email');
  });
  it('nothing for no how, or one from the other list', () => {
    expect(howWords(line())).toBe('');
    expect(howWords(line({ how: 'call' }))).toBe('');
    expect(howWords({ kind: 'note', how: 'instagram' })).toBe('');
  });
});

describe('howFromGo', () => {
  it('Instagram, and email (or Gmail), are picked for you', () => {
    expect(howFromGo('Instagram')).toBe('instagram');
    expect(howFromGo('email')).toBe('email');
    expect(howFromGo('gmail')).toBe('email');
  });
  it('a website, TikTok or nowhere picks nothing', () => {
    expect(howFromGo('website')).toBe('');
    expect(howFromGo('TikTok')).toBe('');
    expect(howFromGo('')).toBe('');
    expect(howFromGo(undefined)).toBe('');
  });
});

describe('cleanNote', () => {
  it('trims and folds spaces and line breaks', () => {
    expect(cleanNote('  Wants a second\n look  ')).toBe('Wants a second look');
  });
  it('empty for nothing', () => {
    expect(cleanNote('')).toBe('');
    expect(cleanNote(null)).toBe('');
    expect(cleanNote('   ')).toBe('');
  });
  it('keeps at most 500 letters', () => {
    expect(cleanNote('a'.repeat(900))).toHaveLength(500);
  });
});

describe('quickTaps', () => {
  it('names them in the first tap', () => {
    expect(quickTaps('Lindsey Tran')).toEqual(['Lindsey reached out first', 'Wants to shoot again', 'No reply yet']);
  });
  it('They, with no name', () => {
    expect(quickTaps('')[0]).toBe('They reached out first');
    expect(quickTaps(undefined)[0]).toBe('They reached out first');
  });
});

describe('addTap', () => {
  it('starts an empty note', () => {
    expect(addTap('', 'No reply yet')).toBe('No reply yet.');
    expect(addTap(null, 'No reply yet')).toBe('No reply yet.');
  });
  it('adds a sentence after what is there', () => {
    expect(addTap('Lovely day', 'Wants to shoot again')).toBe('Lovely day. Wants to shoot again.');
    expect(addTap('Lovely day!', 'Wants to shoot again')).toBe('Lovely day! Wants to shoot again.');
    expect(addTap('Lovely day.  ', 'No reply yet')).toBe('Lovely day. No reply yet.');
  });
  it('only once', () => {
    expect(addTap('No reply yet.', 'No reply yet')).toBe('No reply yet.');
    expect(addTap('no reply yet', 'No reply yet')).toBe('no reply yet');
  });
});

describe('withHowNote', () => {
  it('keeps how, the note and what you said on the line', () => {
    expect(withHowNote(line(), { how: 'text', note: ' Booked! ', said: ' Thanks so much ' })).toEqual(line({ how: 'text', note: 'Booked!', said: 'Thanks so much' }));
  });
  it('leaves off empty ones and an unknown how, and takes out old ones', () => {
    expect(withHowNote(line({ how: 'text', note: 'x', said: 'y' }), { how: 'fax', note: '  ', said: '' })).toEqual(line());
    expect(withHowNote(line(), {})).toEqual(line());
    expect(withHowNote(line())).toEqual(line());
  });
  it('a note on its own takes its own hows', () => {
    expect(withHowNote(line({ kind: 'note' }), { how: 'call' }, NOTE_HOWS).how).toBe('call');
    expect(withHowNote(line({ kind: 'note' }), { how: 'instagram' }, NOTE_HOWS).how).toBeUndefined();
  });
});

describe('noteLine', () => {
  it('a line of its own in the log', () => {
    expect(noteLine('p', '2026-11-02', { how: 'call', note: 'Booked for the 14th.' }, 'n1', 5)).toEqual({ id: 'n1', at: 5, personId: 'p', kind: 'note', day: '2026-11-02', how: 'call', note: 'Booked for the 14th.' });
  });
  it('words only, or what it was only', () => {
    expect(noteLine('p', '2026-11-02', { how: '', note: 'Hi' }, 'n', 1)).not.toHaveProperty('how');
    expect(noteLine('p', '2026-11-02', { how: 'text', note: '' }, 'n', 1)).not.toHaveProperty('note');
  });
  it('a move\'s how is not a note\'s', () => {
    expect(noteLine('p', '2026-11-02', { how: 'instagram', note: 'x' }, 'n', 1)).not.toHaveProperty('how');
  });
});

describe('doneSoFar', () => {
  it('each move and note, newest first, with what and how and the note', () => {
    const lines = [
      line({ id: 'a', day: '2026-11-15', how: 'text', note: 'She reached out first.' }),
      { id: 'b', at: 2, personId: 'p', kind: 'note', day: '2026-11-02', how: 'call', note: 'Booked.' },
      line({ id: 'c', kind: 'pitch', day: '2026-10-01', how: 'email' }),
      line({ id: 'x', personId: 'someone else' }),
    ];
    expect(doneSoFar(lindsey, lines)).toEqual([
      { id: 'a', day: '2026-11-15', look: 'thanks', what: 'Said thanks', how: 'text', howWords: 'by text', note: 'She reached out first.', noteOnly: false },
      { id: 'b', day: '2026-11-02', look: 'note', what: 'Note', how: 'call', howWords: 'a call', note: 'Booked.', noteOnly: true },
      { id: 'c', day: '2026-10-01', look: 'pitch', what: 'Pitched Lindsey', how: 'email', howWords: 'by email', note: '', noteOnly: false },
    ]);
  });
  it('the same day: the latest first; A year since as itself; unknown kinds and lines with no day left out', () => {
    const lines = [line({ id: 'a', at: 1, kind: 'checkin' }), line({ id: 'b', at: 9, kind: 'checkin', year: { shoot: 'R' } }), line({ id: 'c', kind: 'mystery' }), line({ id: 'd', day: '' })];
    expect(doneSoFar(lindsey, lines).map((r) => [r.id, r.look, r.what])).toEqual([['b', 'photos', 'Sent a final, a year on'], ['a', 'checkin', 'Checked in']]);
  });
  it('their answer to a pitch, as a row with no id', () => {
    const p = { ...lindsey, pitch: { answer: 'yes', on: '2026-11-20' } };
    expect(doneSoFar(p, [])).toEqual([{ id: '', day: '2026-11-20', look: 'pitch', what: 'Lindsey said yes', how: '', howWords: '', note: '', noteOnly: false }]);
    expect(doneSoFar({ id: 'p', name: '', pitch: { answer: 'no', on: '2026-11-20' } })[0].what).toBe('They said not now');
    expect(doneSoFar({ ...lindsey, pitch: { answer: 'maybe', on: '2026-11-20' } })).toEqual([]);
    expect(doneSoFar({ ...lindsey, pitch: { answer: 'yes' } })).toEqual([]);
  });
  it('names them in the words that need it', () => {
    const lines = ['photos', 'intros', 'refresh', 'yes', 'hello', 'followup'].map((kind, i) => line({ id: kind, at: i, kind }));
    expect(doneSoFar(lindsey, lines).map((r) => r.what)).toEqual(['Followed up', 'Said hello', 'Said thanks for the yes', 'Offered Lindsey a refresh', 'Asked Lindsey for intros', 'Told Lindsey the photos were up']);
    expect(doneSoFar({ id: 'p' }, [line({ kind: 'pitch' })])[0].what).toBe('Pitched them');
  });
});
