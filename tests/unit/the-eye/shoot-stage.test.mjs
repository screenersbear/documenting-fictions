// the-eye/components/shoot-stage.js: what a shoot still needs at its stage.
import { describe, it, expect, beforeAll, vi } from 'vitest';

let ed;
beforeAll(async () => {
  delete window.EyeParts;
  await import('../../../the-eye/components/shoot-stage.js');
  ed = {};
  window.EyeParts.addShootStage(ed);
});

// Every part in, as the guide would leave it.
const FULL = {
  title: 'Rooftop portraits',
  date: '2026-11-21',
  location: { name: 'Rooftop' },
  teamMembers: [{ name: 'Ana' }],
  premise: 'A character waiting',
  shotList: [{ text: 'Wide' }],
  deadline: '2026-12-01',
};
const doneKeys = (shoot, counts) => ed.setupChapters(shoot, counts).filter(c => c.done).map(c => c.key);

describe('addShootStage', () => {
  it('adds the stage helpers and nothing else', () => {
    expect(Object.keys(ed)).toEqual(['SETUP_CHAPTERS', 'setupChapters', 'setupWords', 'listWords', 'hasReflection', 'nextStep', 'readyToComplete']);
  });
  it('keeps the parts already on window.EyeParts', async () => {
    window.EyeParts.other = 1;
    vi.resetModules();
    await import('../../../the-eye/components/shoot-stage.js');
    expect(window.EyeParts.other).toBe(1);
    expect(typeof window.EyeParts.addShootStage).toBe('function');
  });
  it('lists the seven parts in the guide order, each with its page', () => {
    expect(ed.SETUP_CHAPTERS.map(c => c.key)).toEqual(['basics', 'logistics', 'team', 'direction', 'visuals', 'shotList', 'deadline']);
    expect(ed.SETUP_CHAPTERS.map(c => c.page)).toEqual(['basicInfoHeading', 'logisticsHeading', 'teamHeading', 'directionHeading', 'visualsHeading', 'shotListHeading', 'logisticsHeading']);
    expect(ed.SETUP_CHAPTERS.map(c => c.label)).toEqual(['Basics', 'Logistics', 'Team', 'Direction', 'Visuals', 'Shot list', 'Deadline']);
    expect(ed.SETUP_CHAPTERS.map(c => c.add)).toEqual(['Add the basics', 'Add the logistics', 'Add the team', 'Add the direction', 'Add the visuals', 'Add the shot list', 'Add a deadline']);
  });
});

describe('setupChapters', () => {
  it('has nothing in for an empty shoot', () => {
    expect(doneKeys({})).toEqual([]);
    expect(doneKeys({}, { moodboard: 0, boards: 0 })).toEqual([]);
  });
  it('has everything in for a full one', () => {
    expect(doneKeys({ ...FULL, references: ['x'] })).toEqual(['basics', 'logistics', 'team', 'direction', 'visuals', 'shotList', 'deadline']);
  });
  it('keeps each part apart from its words', () => {
    const [basics] = ed.setupChapters(FULL);
    expect(basics).toMatchObject({ key: 'basics', label: 'Basics', done: true });
  });
  it('counts a name or a named talent as the basics', () => {
    expect(doneKeys({ title: 'X' })).toContain('basics');
    expect(doneKeys({ title: '  ' })).not.toContain('basics');
    expect(doneKeys({ talents: [{ name: 'June' }] })).toContain('basics');
    expect(doneKeys({ talents: [{ name: ' ' }] })).not.toContain('basics');
    expect(doneKeys({ talents: [] })).not.toContain('basics');
  });
  it('needs both a date and a place for logistics', () => {
    expect(doneKeys({ date: '2026-11-21', location: { name: 'Roof' } })).toContain('logistics');
    expect(doneKeys({ date: '2026-11-21', location: { street: '1 Main St' } })).toContain('logistics');
    expect(doneKeys({ date: '2026-11-21', location: { city: 'Newark' } })).toContain('logistics');
    expect(doneKeys({ date: '2026-11-21', location: { country: 'US' } })).not.toContain('logistics');
    expect(doneKeys({ date: '2026-11-21' })).not.toContain('logistics');
    expect(doneKeys({ location: { name: 'Roof' } })).not.toContain('logistics');
    expect(doneKeys({ date: '2026-11-21', location: null })).not.toContain('logistics');
  });
  it('counts "just me" or anyone on the team', () => {
    expect(doneKeys({ teamRequired: 'no' })).toContain('team');
    expect(doneKeys({ teamRequired: 'yes' })).not.toContain('team');
    expect(doneKeys({ teamRequired: 'yes', teamMembers: [{ name: 'Dev' }] })).toContain('team');
    expect(doneKeys({ teamMembers: [] })).not.toContain('team');
  });
  it('counts any of the direction fields', () => {
    ['shootGoals', 'premise', 'character', 'worldNotes', 'elevatorPitch', 'deliverables'].forEach((k) => {
      expect(doneKeys({ [k]: 'words' })).toContain('direction');
      expect(doneKeys({ [k]: ' ' })).not.toContain('direction');
    });
    expect(doneKeys({ shootingNotes: 'not direction' })).not.toContain('direction');
  });
  it('counts photos, a board, links or a lighting setup as the visuals', () => {
    expect(doneKeys({}, { moodboard: 1 })).toContain('visuals');
    expect(doneKeys({}, { boards: 1 })).toContain('visuals');
    expect(doneKeys({ references: ['https://x'] })).toContain('visuals');
    expect(doneKeys({ lightingSetups: [{ name: 'Key' }] })).toContain('visuals');
    expect(doneKeys({ references: [], lightingSetups: [] }, { moodboard: 0, boards: 0 })).not.toContain('visuals');
  });
  it('needs a shot with words in it', () => {
    expect(doneKeys({ shotList: [{ text: '' }, { text: 'Close' }] })).toContain('shotList');
    expect(doneKeys({ shotList: [{ text: ' ' }] })).not.toContain('shotList');
    expect(doneKeys({ shotList: [] })).not.toContain('shotList');
  });
  it('needs a deadline', () => {
    expect(doneKeys({ deadline: '2026-12-01' })).toContain('deadline');
    expect(doneKeys({ deadline: '' })).not.toContain('deadline');
  });
});

describe('listWords', () => {
  it('joins with commas and a last "and"', () => {
    expect(ed.listWords([])).toBe('');
    expect(ed.listWords(['team'])).toBe('team');
    expect(ed.listWords(['a', 'b'])).toBe('a and b');
    expect(ed.listWords(['a', 'b', 'c'])).toBe('a, b and c');
  });
});

describe('setupWords', () => {
  const chapters = done => ed.SETUP_CHAPTERS.map(c => ({ ...c, done: done.includes(c.key) }));
  it('says what is in and what is still to add', () => {
    expect(ed.setupWords(chapters(['basics', 'logistics', 'team'])))
      .toBe('Basics, logistics and team are in. Still to add: direction, visuals, shot list and a deadline.');
  });
  it('says only what is still to add when nothing is in', () => {
    expect(ed.setupWords(chapters([]))).toBe('Still to add: the basics, logistics, the team, direction, visuals, shot list and a deadline.');
  });
  it('says only what is in when everything is', () => {
    expect(ed.setupWords(chapters(ed.SETUP_CHAPTERS.map(c => c.key))))
      .toBe('Basics, logistics, team, direction, visuals, shot list and deadline are in.');
  });
  it('agrees with one part in', () => {
    expect(ed.setupWords(chapters(['team']))).toMatch(/^Team is in\./);
    expect(ed.setupWords(chapters(['deadline']))).toMatch(/^Deadline is in\./);
    expect(ed.setupWords(chapters(['basics']))).toMatch(/^Basics are in\./);
    expect(ed.setupWords(chapters(['logistics']))).toMatch(/^Logistics are in\./);
  });
  it('says "are" for two or more parts, whichever comes first', () => {
    expect(ed.setupWords(chapters(['team', 'deadline']))).toMatch(/^Team and deadline are in\./);
  });
  it('is empty with no parts', () => {
    expect(ed.setupWords([])).toBe('');
  });
});

describe('hasReflection', () => {
  it('counts any of the three answers', () => {
    expect(ed.hasReflection({})).toBe(false);
    expect(ed.hasReflection({ whatWentRight: 'Light' })).toBe(true);
    expect(ed.hasReflection({ couldBeBetter: 'Time' })).toBe(true);
    expect(ed.hasReflection({ lessonsLearned: 'Buffer day' })).toBe(true);
    expect(ed.hasReflection({ lessonsLearned: '  ', whatWentRight: '' })).toBe(false);
  });
});

describe('nextStep', () => {
  it('asks for the first part still missing while planning', () => {
    expect(ed.nextStep({ status: 'prospect' })).toEqual({ key: 'chapter', chapter: 'basics', label: 'Add the basics', hint: '' });
    expect(ed.nextStep({ status: 'planning', title: 'X' }).chapter).toBe('logistics');
    expect(ed.nextStep({ status: 'planning', ...FULL, teamMembers: [] }, { moodboard: 2 }))
      .toEqual({ key: 'chapter', chapter: 'team', label: 'Add the team', hint: 'Next step, then the shoot is ready' });
  });
  it('gives no hint while two or more parts are missing', () => {
    expect(ed.nextStep({ status: 'planning', ...FULL, teamMembers: [], deadline: '' }, { moodboard: 2 }).hint).toBe('');
  });
  it('marks a shoot with every part in as ready', () => {
    expect(ed.nextStep({ status: 'planning', ...FULL }, { boards: 1 }))
      .toEqual({ key: 'status', to: 'waiting_to_shoot', label: 'Mark shoot ready', hint: '' });
  });
  it('opens Shoot mode once ready', () => {
    expect(ed.nextStep({ status: 'waiting_to_shoot' })).toEqual({ key: 'shootMode', label: 'Shoot mode', hint: '' });
  });
  it('asks for the reflection once captured, then the proofs', () => {
    expect(ed.nextStep({ status: 'captured' })).toEqual({ key: 'reflect', label: 'Reflect now', hint: '' });
    expect(ed.nextStep({ status: 'captured', lessonsLearned: 'x' }))
      .toEqual({ key: 'status', to: 'waiting_for_selects', label: 'Mark proofs sent', hint: '' });
    expect(ed.nextStep({ status: 'captured', lessonsLearned: 'x' }, { video: true }))
      .toEqual({ key: 'status', to: 'rough_cut', label: 'Start the rough cut', hint: '' });
  });
  it('asks for the final images in the edit, then delivery', () => {
    ['waiting_for_selects', 'editing'].forEach((status) => {
      expect(ed.nextStep({ status })).toEqual({ key: 'finalImages', label: 'Add final images', hint: '' });
      expect(ed.nextStep({ status }, { finalImages: 3 })).toEqual({ key: 'status', to: 'delivered', label: 'Mark delivered', hint: '' });
    });
    ['rough_cut', 'client_review', 'revisions'].forEach((status) => {
      expect(ed.nextStep({ status }, { video: true })).toEqual({ key: 'status', to: 'delivered', label: 'Mark delivered', hint: '' });
    });
    expect(ed.nextStep({ status: 'editing' }, { finalImages: 0 }).key).toBe('finalImages');
  });
  it('finishes a delivered shoot: reflection, final images, then Complete', () => {
    expect(ed.nextStep({ status: 'delivered' }, { finalImages: 2 }))
      .toEqual({ key: 'reflect', label: 'Reflect now', hint: 'Then the shoot is complete' });
    expect(ed.nextStep({ status: 'delivered', whatWentRight: 'x' }))
      .toEqual({ key: 'finalImages', label: 'Add final images', hint: 'Then the shoot is complete' });
    expect(ed.nextStep({ status: 'delivered', whatWentRight: 'x' }, { finalImages: 1 }))
      .toEqual({ key: 'complete', label: 'Complete', hint: '' });
    expect(ed.nextStep({ status: 'delivered', whatWentRight: 'x' }, { video: true }).key).toBe('complete');
  });
  it('only says the shoot is complete next when the reflection is all that is left', () => {
    expect(ed.nextStep({ status: 'delivered' }, { finalImages: 0 }))
      .toEqual({ key: 'reflect', label: 'Reflect now', hint: '' });
    expect(ed.nextStep({ status: 'delivered' }))
      .toEqual({ key: 'reflect', label: 'Reflect now', hint: '' });
    expect(ed.nextStep({ status: 'delivered' }, { video: true }).hint).toBe('Then the shoot is complete');
  });
  it('asks for a new date when postponed, and nothing when canceled', () => {
    expect(ed.nextStep({ status: 'rescheduled' })).toEqual({ key: 'date', label: 'Set a new date', hint: '' });
    expect(ed.nextStep({ status: 'canceled' })).toBeNull();
  });
  it('offers Unarchive for a shoot in the archive, whatever its status', () => {
    expect(ed.nextStep({ status: 'delivered', archived: true })).toEqual({ key: 'unarchive', label: 'Unarchive', hint: '' });
    expect(ed.nextStep({ status: 'canceled', archived: true }).key).toBe('unarchive');
  });
});

describe('readyToComplete', () => {
  const done = { status: 'delivered', lessonsLearned: 'Buffer day' };
  it('is ready once delivered, reflected and with final images', () => {
    expect(ed.readyToComplete(done, { finalImages: 1 })).toBe(true);
  });
  it('lets a video through without final images', () => {
    expect(ed.readyToComplete(done, { video: true })).toBe(true);
  });
  it('waits for each of the three', () => {
    expect(ed.readyToComplete(done)).toBe(false);
    expect(ed.readyToComplete(done, { finalImages: 0 })).toBe(false);
    expect(ed.readyToComplete({ status: 'delivered' }, { finalImages: 1 })).toBe(false);
    expect(ed.readyToComplete({ ...done, status: 'editing' }, { finalImages: 1 })).toBe(false);
  });
  it('leaves a shoot already in the archive alone', () => {
    expect(ed.readyToComplete({ ...done, archived: true }, { finalImages: 1 })).toBe(false);
  });
});
