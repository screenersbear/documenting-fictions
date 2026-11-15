// ref/data/next-time.js: a board for someone (connect/10 and 11): their next
// shoot, their next-time notes from The Eye, the notes as the board's first
// page, and the people to pick from.
import { describe, it, expect, beforeEach } from 'vitest';
import { nextShootFor, notesFor, noteSource, notesPage, peopleMatching } from '../../../ref/data/next-time.js';
import { withTextDefaults } from '../../../ref/components/textsize.js';

beforeEach(() => localStorage.clear());

// Who's on each shoot, by the ids given on it.
const on = (s) => s.who || [];
const nameOf = (s) => s.title;
const shoot = (o) => ({ id: o.id, title: o.id, status: 'planning', who: ['june'], archived: false, ...o });
const TODAY = '2026-11-15';

describe('nextShootFor', () => {
  it('is their soonest shoot from today on', () => {
    const shoots = [shoot({ id: 'later', date: '2027-01-09' }), shoot({ id: 'soon', date: '2026-11-20' }), shoot({ id: 'gone', date: '2026-11-01' })];
    expect(nextShootFor(shoots, on, 'june', TODAY).id).toBe('soon');
  });
  it('counts a shoot on today itself', () => {
    expect(nextShootFor([shoot({ id: 'today', date: TODAY }), shoot({ id: 'next', date: '2026-11-16' })], on, 'june', TODAY).id).toBe('today');
  });
  it('takes one with no date yet when none is dated', () => {
    expect(nextShootFor([shoot({ id: 'past', date: '2026-10-01' }), shoot({ id: 'undated', date: '' })], on, 'june', TODAY).id).toBe('undated');
  });
  it('prefers a dated one over one with no date', () => {
    expect(nextShootFor([shoot({ id: 'undated' }), shoot({ id: 'dated', date: '2027-03-01' })], on, 'june', TODAY).id).toBe('dated');
  });
  it('only counts shoots still to come: prospect, planning, ready and postponed', () => {
    const kinds = ['prospect', 'planning', 'waiting_to_shoot', 'rescheduled', 'captured', 'delivered', 'canceled'];
    const got = kinds.map((status) => nextShootFor([shoot({ id: status, status, date: '2026-12-01' })], on, 'june', TODAY));
    expect(got.map((s) => s && s.id)).toEqual(['prospect', 'planning', 'waiting_to_shoot', 'rescheduled', null, null, null]);
  });
  it('reads a shoot with no status as a prospect', () => {
    expect(nextShootFor([shoot({ id: 'new', status: undefined, date: '2026-12-01' })], on, 'june', TODAY).id).toBe('new');
  });
  it('leaves out archived shoots, shoots without them, and shoots without an id', () => {
    const shoots = [shoot({ id: 'old', archived: true, date: '2026-12-01' }), shoot({ id: 'other', who: ['maya'], date: '2026-12-02' }), { ...shoot({ date: '2026-12-03' }), id: '' }, null];
    expect(nextShootFor(shoots, on, 'june', TODAY)).toBeNull();
  });
  it('is null with no shoots at all', () => {
    expect(nextShootFor([], on, 'june', TODAY)).toBeNull();
    expect(nextShootFor(undefined, on, 'june', TODAY)).toBeNull();
  });
});

describe('notesFor', () => {
  const shot = (o) => shoot({ status: 'delivered', lessonsLearned: `Lesson from ${o.id}`, ...o });
  it('is their latest shot shoot with lessons, with its name and day', () => {
    const shoots = [shot({ id: 'Garden test', date: '2026-08-12' }), shot({ id: 'Rooftop portraits', date: '2026-11-07', lessonsLearned: '  Bring a reflector.  ' })];
    expect(notesFor(shoots, on, 'june', '', nameOf)).toEqual([{ shootId: 'Rooftop portraits', title: 'Rooftop portraits', day: '2026-11-07', text: 'Bring a reflector.' }]);
  });
  it('adds the latest from another shoot of the kind the board goes to', () => {
    const shoots = [shot({ id: 'mine', date: '2026-11-07', category: 'editorial' }), shot({ id: 'theirs', who: ['maya'], date: '2026-10-01', category: 'headshot' }), shot({ id: 'older', who: ['maya'], date: '2026-09-01', category: 'headshot' })];
    expect(notesFor(shoots, on, 'june', 'headshot', nameOf).map((n) => n.shootId)).toEqual(['mine', 'theirs']);
  });
  it('gives their shoot once when it is the latest of that kind too', () => {
    const shoots = [shot({ id: 'mine', date: '2026-11-07', category: 'headshot' }), shot({ id: 'old', who: ['maya'], date: '2026-01-01', category: 'headshot' })];
    expect(notesFor(shoots, on, 'june', 'headshot', nameOf).map((n) => n.shootId)).toEqual(['mine', 'old']);
  });
  it('gives only the kind when they have no lessons of their own', () => {
    const shoots = [shot({ id: 'k', who: ['maya'], date: '2026-10-01', category: 'headshot' })];
    expect(notesFor(shoots, on, 'june', 'headshot', nameOf).map((n) => n.shootId)).toEqual(['k']);
  });
  it('leaves out shoots kept to themselves, not shot yet, or with no lessons', () => {
    const shoots = [shot({ id: 'kept', date: '2026-11-07', lessonsToRef: false }), shot({ id: 'coming', status: 'planning', date: '2026-11-20' }),
      shot({ id: 'blank', date: '2026-11-08', lessonsLearned: '   ' }), shot({ id: 'none', date: '2026-11-09', lessonsLearned: undefined }), null];
    expect(notesFor(shoots, on, 'june', '', nameOf)).toEqual([]);
  });
  it('counts every shot status from captured to delivered', () => {
    for (const status of ['captured', 'waiting_for_selects', 'editing', 'rough_cut', 'client_review', 'revisions', 'delivered']) {
      expect(notesFor([shot({ id: status, status, date: '2026-11-01' })], on, 'june', '', nameOf)).toHaveLength(1);
    }
  });
  it('puts a shoot with no day after the dated ones', () => {
    const shoots = [shot({ id: 'undated' }), shot({ id: 'dated', date: '2026-01-01' })];
    expect(notesFor(shoots, on, 'june', '', nameOf)[0]).toMatchObject({ shootId: 'dated' });
    expect(notesFor([shot({ id: 'dated', date: '2026-01-01' }), shot({ id: 'a' }), shot({ id: 'b' })], on, 'june', '', nameOf)[0]).toMatchObject({ shootId: 'dated' });
    expect(notesFor([shot({ id: 'undated' })], on, 'june', '', nameOf)[0].day).toBe('');
  });
  it('is empty with no shoots', () => {
    expect(notesFor(undefined, on, 'june', 'headshot', nameOf)).toEqual([]);
  });
});

describe('noteSource', () => {
  it('is the shoot and its day', () => {
    expect(noteSource({ title: 'Rooftop portraits', day: '2026-11-07' })).toBe('Rooftop portraits, 7 Nov');
  });
  it('is the shoot alone with no day', () => {
    expect(noteSource({ title: 'Rooftop portraits', day: '' })).toBe('Rooftop portraits');
  });
  it('is the day alone with no name', () => {
    expect(noteSource({ title: '', day: '2026-11-07' })).toBe('7 Nov');
  });
});

describe('notesPage', () => {
  const notes = [{ title: 'Rooftop portraits', day: '2026-11-07', text: 'Bring a reflector.' }, { title: 'Studio', day: '', text: 'Warm up first.' }];
  it('is a tall page with room for words: NEXT TIME, each note with where it came from', () => {
    expect(notesPage(notes, 'letter-portrait')).toEqual(withTextDefaults({
      template: 'lp-text', images: [], nextTime: true, title: 'Next time', text: 'Bring a reflector. (Rooftop portraits, 7 Nov)\n\nWarm up first. (Studio)',
    }));
  });
  it('is the wide page with words beside on a wide board', () => {
    expect(notesPage(notes.slice(0, 1), 'wide-16x9')).toMatchObject({ template: 'w-single-text', text: 'Bring a reflector. (Rooftop portraits, 7 Nov)' });
  });
  it('takes the text sizes set as the defaults', () => {
    localStorage.setItem('ref-notebook-text-defaults', JSON.stringify({ title: 2 }));
    const plain = notesPage([], 'letter-portrait');
    expect(plain).toEqual(withTextDefaults({ template: 'lp-text', images: [], nextTime: true, title: 'Next time', text: '' }));
  });
});

describe('peopleMatching', () => {
  const people = [{ id: 'z', name: 'zoe Li', instagram: '' }, { id: 'j', name: 'June Park', instagram: 'junepark.jpg' }, { id: 'h', name: '', instagram: 'anon.handle' }, { id: 't', name: 'Ana Ruiz', tiktok: 'anaruiz' }];
  it('is everyone, by name (a handle for someone with no name), ignoring case', () => {
    expect(peopleMatching(people, '').map((r) => r.id)).toEqual(['t', 'h', 'j', 'z']);
  });
  it('finds a name or a handle, with or without the @', () => {
    expect(peopleMatching(people, 'park').map((r) => r.id)).toEqual(['j']);
    expect(peopleMatching(people, '@JUNEPARK').map((r) => r.id)).toEqual(['j']);
    expect(peopleMatching(people, 'anaruiz').map((r) => r.id)).toEqual(['t']);
    expect(peopleMatching(people, '  li ').map((r) => r.id)).toEqual(['z']);
  });
  it('is empty when no one matches', () => {
    expect(peopleMatching(people, 'nobody')).toEqual([]);
  });
  it('leaves out records with nothing to call them by', () => {
    expect(peopleMatching([{ id: 'x', name: '', instagram: '', tiktok: '' }, null], null)).toEqual([]);
    expect(peopleMatching(undefined, 'a')).toEqual([]);
  });
});
