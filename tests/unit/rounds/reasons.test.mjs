// rounds/data/reasons.js: the one line on a Today card, and a move as a person's page names it.
import { describe, it, expect } from 'vitest';
import { reasonFor, phrase } from '../../../rounds/data/reasons.js';

const T = '2026-11-14';
const p = (kind, more = {}, step = 0) => ({ name: 'Dana Ortiz', group: 'new', note: '', lastShot: '', lastMove: '', next: kind ? { kind, due: T, step } : null, ...more });

describe('reasonFor', () => {
  it('is empty with no move', () => {
    expect(reasonFor(p(null), T)).toBe('');
  });
  it('says when you shot together, for a thank you', () => {
    expect(reasonFor(p('thanks', { lastShot: '2026-11-10' }), T)).toBe("You shot together on Tuesday. A quick thank you while it's fresh.");
    expect(reasonFor(p('thanks', { lastShot: '2026-11-13' }), T)).toBe("You shot together yesterday. A quick thank you while it's fresh.");
    expect(reasonFor(p('thanks', { lastShot: T }), T)).toBe("You shot together today. A quick thank you while it's fresh.");
    expect(reasonFor(p('thanks'), T)).toBe("A quick thank you while it's fresh.");
  });
  it('says hello, or sends an event guest their photos', () => {
    expect(reasonFor(p('hello'), T)).toBe("You just met. A quick hello while it's fresh.");
    expect(reasonFor(p('hello', { note: 'Loved the gallery wall.' }), T)).toBe('Loved the gallery wall.');
    expect(reasonFor(p('hello', { group: 'guest', note: 'x' }), T)).toBe('One friendly note: send them their photos.');
  });
  it('says how long it has been, for a check-in or a refresh offer', () => {
    expect(reasonFor(p('checkin', { lastShot: '2026-10-01' }), T)).toBe("It's been 6 weeks. Time to plan the next one?");
    expect(reasonFor(p('checkin', { lastShot: '2026-06-01', lastMove: '2026-10-03' }), T)).toBe("It's been 6 weeks. Time to plan the next one?");
    expect(reasonFor(p('checkin', { lastMove: '2026-11-10' }), T)).toBe('Time to plan the next one?');
    expect(reasonFor(p('checkin'), T)).toBe('Time to plan the next one?');
    expect(reasonFor(p('refresh', { lastShot: '2026-08-14' }), T)).toBe("It's been 3 months. Time for a refresh offer?");
    expect(reasonFor(p('refresh'), T)).toBe('Time for a refresh offer?');
  });
  it('asks a client who they know', () => {
    expect(reasonFor(p('intros'), T)).toBe('Happy clients know people like them. Ask who Dana knows.');
  });
  it('gives a pitch its note, why they are a fit', () => {
    expect(reasonFor(p('pitch', { note: 'A bright storefront.' }), T)).toBe('A bright storefront.');
    expect(reasonFor(p('pitch'), T)).toBe('Someone new to pitch.');
  });
  it('follows up once, then one last time', () => {
    expect(reasonFor(p('followup', {}, 1), T)).toBe('No answer yet. One friendly follow up.');
    expect(reasonFor(p('followup', {}, 2), T)).toBe('One last follow up, then Rounds lets it rest.');
  });
});

describe('phrase', () => {
  it('names a move on a person\'s page', () => {
    expect(phrase('intros', 'Dana Ortiz')).toBe('Ask who Dana knows');
    expect(phrase('refresh', 'Dana')).toBe('Offer a refresh');
    expect(phrase('thanks', 'Dana')).toBe('Say thanks');
    expect(phrase('followup', 'Dana')).toBe('Follow up');
  });
});
