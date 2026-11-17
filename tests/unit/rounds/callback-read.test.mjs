// rounds/data/callback-read.js (ONE-TIME, Bring in from Callback): a
// Callback backup read into what Rounds needs. Callback's own words for its
// types: text, dm, call, meeting, event, sent_work, comment, email, idea,
// followed, gift, project_wrapped, other.
import { describe, it, expect } from 'vitest';
import { readCallback, personOf, touchOf, sentences, pieces, NOT_CALLBACK } from '../../../rounds/data/callback-read.js';

const tp = (o) => ({ id: 't', personId: 'p', date: '2026-10-02', type: 'text', note: '', responded: 'pending', createdAt: '2026-10-02T15:00:00.000Z', ...o });
const at = Date.parse('2026-10-02T15:00:00.000Z');

describe('sentences', () => {
  it('one after another, a full stop between unless one is there, blanks left out', () => {
    expect(sentences(['Gift or card', 'Sent a print', 'They replied.'])).toBe('Gift or card. Sent a print. They replied.');
    expect(sentences(['Done!', 'Next?', 'Really.', 'Said:', 'yes'])).toBe('Done! Next? Really. Said: yes');
    expect(sentences(['', '  ', null, ' Sent a print ', undefined, 5])).toBe('Sent a print');
    expect(sentences([])).toBe('');
  });
});

describe('pieces', () => {
  it('a short note is one piece, spaces tidied; nothing is none', () => {
    expect(pieces('  Loved  the\nshoot ')).toEqual(['Loved the shoot']);
    expect(pieces('')).toEqual([]);
    expect(pieces(undefined)).toEqual([]);
  });
  it('a long one is cut between words, 500 letters at most, nothing lost', () => {
    const words = Array.from({ length: 120 }, (_, i) => `word${i}`).join(' ');
    const out = pieces(words);
    expect(out.length).toBe(2);
    expect(out.every((p) => p.length <= 500)).toBe(true);
    expect(out[0].endsWith(' ')).toBe(false);
    expect(out[1].startsWith(' ')).toBe(false);
    expect(out.join(' ')).toBe(words);
    expect(out[0]).toBe(words.slice(0, words.lastIndexOf(' ', 500)));
  });
  it('exactly 500 letters is one piece; one word longer than that is cut at 500', () => {
    expect(pieces('a'.repeat(500))).toEqual(['a'.repeat(500)]);
    expect(pieces('b'.repeat(1001))).toEqual(['b'.repeat(500), 'b'.repeat(500), 'b']);
  });
});

describe('touchOf', () => {
  it('each type as Rounds keeps it', () => {
    const what = (type) => touchOf(tp({ type })).what;
    expect(['text', 'dm', 'call', 'meeting', 'event', 'sent_work', 'comment', 'email'].map(what))
      .toEqual(['text', 'instagram', 'call', 'met', 'met', 'photos', 'comment', 'email']);
    expect(['idea', 'followed', 'gift', 'other', 'odd', undefined].map(what)).toEqual(['other', 'other', 'other', 'other', 'other', 'other']);
  });
  it('a moment with its day, when it was written, and the note', () => {
    expect(touchOf(tp({ note: 'Asked about the zine.' }))).toEqual({ id: 't', day: '2026-10-02', at, kind: 'moment', what: 'text', note: 'Asked about the zine.' });
  });
  it('Other types put their words first; Other itself and no type put nothing; an unknown one its own word', () => {
    expect(touchOf(tp({ type: 'gift', note: 'Sent a print' })).note).toBe('Gift or card. Sent a print');
    expect(touchOf(tp({ type: 'followed' })).note).toBe('Followed');
    expect(touchOf(tp({ type: 'idea', note: 'Share a BTS clip' })).note).toBe('Idea. Share a BTS clip');
    expect(touchOf(tp({ type: 'other', note: 'Coffee' })).note).toBe('Coffee');
    expect(touchOf(tp({ type: undefined, note: 'Coffee' })).note).toBe('Coffee');
    expect(touchOf(tp({ type: 'postcard', note: 'Hi' })).note).toBe('postcard. Hi');
    expect(touchOf(tp({ type: 'email', note: 'Sent rates' })).note).toBe('Sent rates');
  });
  it('a reply goes at the end, with what they said if Callback kept it', () => {
    expect(touchOf(tp({ note: 'Sent rates', responded: 'yes' })).note).toBe('Sent rates. They replied.');
    expect(touchOf(tp({ responded: 'yes', replyNote: ' Loved it ' })).note).toBe('They replied: Loved it');
    expect(touchOf(tp({ note: 'Hi', responded: 'no', replyNote: 'x' })).note).toBe('Hi');
  });
  it('a project wrapped is a note', () => {
    expect(touchOf(tp({ type: 'project_wrapped', note: 'Spring lookbook', responded: 'yes' }))).toEqual({ id: 't', day: '2026-10-02', at, kind: 'note', what: '', note: 'Project wrapped. Spring lookbook. They replied.' });
  });
  it('the day from the date, else from when it was written; none is no touchpoint', () => {
    expect(touchOf(tp({ date: '2026-09-30T10:00:00Z' })).day).toBe('2026-09-30');
    expect(touchOf(tp({ date: '' })).day).toBe('2026-10-02');
    expect(touchOf(tp({ date: '2026-02-31', createdAt: '' }))).toBe(null);
    expect(touchOf(tp({ date: 7, createdAt: undefined }))).toBe(null);
    expect(touchOf(tp({ createdAt: 'later' })).at).toBe(0);
  });
});

describe('personOf', () => {
  const base = { id: 'p1', name: ' June Park ', relationshipTypes: ['prospect'], warmth: 'warm' };
  it('the row: name, handles, where met, role and organization in the note', () => {
    const p = personOf({ ...base, instagram: '@june.p', website: 'junepark.com', email: ' june@x.com ', howWeMet: 'Rialto screening', role: 'Casting director' }, 'Acme');
    expect(p.row).toEqual({ name: 'June Park', groups: ['prospect'], group: 'prospect', instagram: 'june.p', website: 'https://junepark.com', email: 'june@x.com', where: 'Rialto screening', note: 'Casting director at Acme' });
    expect(personOf({ ...base, role: 'Producer' }).row.note).toBe('Producer');
    expect(personOf(base, ' Acme ').row.note).toBe('Acme');
    expect(personOf(base).row.note).toBe('');
    expect(personOf({ ...base, name: 5 }).row.name).toBe('');
  });
  it('relationship types as groups, several give several, Client leads', () => {
    const groups = (relationshipTypes, relationshipType) => personOf({ ...base, relationshipTypes, relationshipType }).row;
    expect(groups(['pastClient', 'collaborator']).groups).toEqual(['regular', 'client']);
    expect(groups(['pastClient', 'collaborator']).group).toBe('client');
    expect(groups(['collaborator']).groups).toEqual(['regular']);
    expect(groups(['industry']).groups).toEqual(['new']);
    expect(groups(['other']).groups).toEqual(['new']);
    expect(groups(['prospect', 'pastClient']).groups).toEqual(['client']);
    expect(groups([], 'collaborator').groups).toEqual(['regular']);
    expect(groups(undefined, undefined).groups).toEqual(['prospect']);
    expect(groups('pastClient', 'industry').groups).toEqual(['new']);
  });
  it('Parked is Let go; the next touchpoint is a day or nothing', () => {
    expect(personOf({ ...base, warmth: 'parked' }).letGo).toBe(true);
    expect(personOf(base).letGo).toBe(false);
    expect(personOf({ ...base, nextTouchpointDate: '2026-12-01' }).nextDay).toBe('2026-12-01');
    expect(personOf({ ...base, nextTouchpointDate: null }).nextDay).toBe('');
  });
  it('touchpoints oldest first (the same day by when written); their notes a note of their own', () => {
    const t = (id, day, n) => ({ id, day, at: n, kind: 'moment', what: 'text', note: '' });
    const p = personOf({ ...base, notes: ' Shoots on film. ', createdAt: '2026-09-01T09:00:00Z' }, '', [t('b', '2026-10-05', 2), t('a', '2026-10-05', 1), t('c', '2026-09-20', 9)]);
    expect(p.touches.map((x) => x.id)).toEqual(['c', 'a', 'b']);
    expect(p.notes).toEqual({ id: 'p1-notes', day: '2026-09-01', at: Date.parse('2026-09-01T09:00:00Z'), kind: 'note', what: '', note: 'Shoots on film.', fromNotes: true });
    expect(personOf({ ...base, notes: 'x' }).notes.day).toBe('');
    expect(personOf({ ...base, notes: 'x' }).notes.at).toBe(0);
    expect(personOf({ ...base, notes: '  ' }).notes).toBe(null);
    expect(personOf(base).touches).toEqual([]);
  });
});

describe('readCallback', () => {
  const backup = (data) => ({ app: 'callback', version: 1, exportedAt: '2026-11-16T10:00:00Z', data });
  it('anything else throws, in plain words', () => {
    for (const bad of [null, {}, { app: 'rounds', data: {} }, { app: 'callback' }, { app: 'callback', data: 'x' }]) {
      expect(() => readCallback(bad)).toThrow(NOT_CALLBACK);
    }
    expect(NOT_CALLBACK).toBe("This file isn't a Callback backup. In Callback's Settings, Export backup makes one.");
  });
  it('people with their organization and touchpoints; nameless ones counted; broken records skipped', () => {
    const out = readCallback(backup({
      organizations: [{ id: 'o1', name: 'Acme' }, null],
      people: [
        { id: 'p1', name: 'June Park', organizationId: 'o1', role: 'Editor', relationshipTypes: ['industry'] },
        { id: 'p2', name: '  ', relationshipTypes: ['prospect'] },
        { id: 'p3', name: 'Dana', relationshipTypes: ['prospect'] },
        { name: 'No id' }, 'junk',
      ],
      touchpoints: [tp({ id: 't1', personId: 'p1' }), tp({ id: 't2', personId: 'p1', date: '2026-09-01' }), tp({ id: 't3', personId: 'p1', date: 'x', createdAt: '' }), tp({ id: 't4', personId: 'zz' }), { personId: 'p1' }],
    }));
    expect(out.bad).toBe(1);
    expect(out.people.map((p) => p.row.name)).toEqual(['June Park', 'Dana']);
    expect(out.people[0].row.note).toBe('Editor at Acme');
    expect(out.people[0].touches.map((t) => t.id)).toEqual(['t2', 't1']);
    expect(out.people[1].touches).toEqual([]);
  });
  it('stores that are missing or not lists are empty', () => {
    expect(readCallback(backup({}))).toEqual({ people: [], bad: 0 });
    expect(readCallback(backup({ people: 'x', touchpoints: {}, organizations: 3 }))).toEqual({ people: [], bad: 0 });
  });
});
