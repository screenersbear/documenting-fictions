// rounds/data/kinds.js: the nine kinds of move, their colour pairs, marks and starter messages.
import { describe, it, expect } from 'vitest';
import * as K from '../../../rounds/data/kinds.js';
import { KINDS, KIND_KEYS, MARKS, MESSAGE_ORDER, isKind, kindFromName, markSvg, moveName, moveLook, YEAR_NAME } from '../../../rounds/data/kinds.js';

describe('the kinds', () => {
  it('come in the order Today takes them, thanks first and a pitch last', () => {
    expect(KIND_KEYS).toEqual(['thanks', 'yes', 'photos', 'hello', 'checkin', 'intros', 'refresh', 'followup', 'pitch']);
  });
  it('each have a name, a colour pair and a mark (rounds/NOTES.md)', () => {
    const rows = KIND_KEYS.map((k) => [k, KINDS[k].name, KINDS[k].bg, KINDS[k].fg, KINDS[k].mark]);
    expect(rows).toEqual([
      ['thanks', 'Say thanks', '#FFD100', '#313D45', 'sun'],
      ['yes', 'Say thanks for the yes', '#FFD100', '#313D45', 'sun'],
      ['photos', 'Your photos are up', '#FFD100', '#313D45', 'sun'],
      ['hello', 'Say hello', '#13803F', '#FFD100', 'rise'],
      ['checkin', 'Check in', '#0A4FD6', '#FFAFAB', 'ring'],
      ['intros', 'Ask for intros', '#CC2E8A', '#E2E600', 'dots'],
      ['refresh', 'Refresh offer', '#CC2E8A', '#E2E600', 'dots'],
      ['followup', 'Follow up', '#FF8A3D', '#313D45', 'tag'],
      ['pitch', 'Pitch', '#FF8A3D', '#313D45', 'tag'],
    ]);
  });
  it('ship with the starter messages from the mockups', () => {
    expect(KINDS.thanks.starter).toBe('Thank you for today, [name]! It was so good working with you.');
    expect(KINDS.hello.starter).toBe("Great meeting you at [where]! I'd love to work together sometime.");
    expect(KINDS.checkin.starter).toBe("Hey [name], it's been a minute. Want to plan the next one?");
    expect(KINDS.intros.starter).toBe("Hi [name]! Hope you've been well since the session. I'm adding more people to my portfolio who do work like yours. Is there anyone you'd be happy to put me in touch with? No pressure at all.");
    expect(KINDS.refresh.starter).toBe("It's been a while since your session. I'm offering past clients [offer].");
    expect(KINDS.followup.starter).toBe('Just following up on my note from [when]. Happy to send ideas.');
    expect(KINDS.pitch.starter).toBe("Hi [name], I'm a portrait photographer in [city]. I'd love to make some pictures with you. Could I send a few ideas?");
  });
  it('have a thank-you for a yes, and Your photos are up with its starter from connect/NOTES.md', () => {
    expect(KINDS.yes.starter).toBe("Thank you for the yes, [name]! I can't wait. I'll send a few ideas for the shoot soon.");
    expect(KINDS.photos.starter).toBe('The [shoot] set is up. Thank you again, feel free to share it.');
  });
  it('are all listed on Messages, in the mockup order', () => {
    expect(MESSAGE_ORDER).toEqual(['thanks', 'yes', 'photos', 'hello', 'checkin', 'refresh', 'intros', 'pitch', 'followup']);
    expect([...MESSAGE_ORDER].sort()).toEqual([...KIND_KEYS].sort());
  });
  it('draw their marks from the suite shapes', () => {
    expect(MARKS).toEqual({
      sun: '<circle cx="12" cy="12" r="12"/>',
      rise: '<path d="M0 24 A12 12 0 0 1 24 24 Z"/>',
      ring: '<path fill-rule="evenodd" d="M12 0a12 12 0 1 0 0 24a12 12 0 1 0 0-24zm0 6a6 6 0 1 1 0 12a6 6 0 1 1 0-12z"/>',
      dots: '<circle cx="6" cy="6" r="6"/><circle cx="18" cy="18" r="6"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>',
      tag: '<path d="M0 4h16l8 8-8 8H0z"/>',
    });
  });
});

describe('isKind', () => {
  it('knows the nine and nothing else', () => {
    expect(KIND_KEYS).toHaveLength(9);
    expect(KIND_KEYS.every(isKind)).toBe(true);
    expect(isKind('toString')).toBe(false);
    expect(isKind('')).toBe(false);
    expect(isKind(undefined)).toBe(false);
  });
});

describe('kindFromName', () => {
  it('reads a kind however it is written', () => {
    expect(kindFromName('Say hello')).toBe('hello');
    expect(kindFromName('  ask   for INTROS ')).toBe('intros');
    expect(kindFromName('Check in')).toBe('checkin');
    expect(kindFromName('checkin')).toBe('checkin');
    expect(kindFromName('Follow up')).toBe('followup');
    expect(kindFromName('Refresh offer')).toBe('refresh');
    expect(kindFromName('Say thanks')).toBe('thanks');
    expect(kindFromName('thanks')).toBe('thanks');
    expect(kindFromName('PITCH')).toBe('pitch');
    expect(kindFromName('Your photos are up')).toBe('photos');
    expect(kindFromName('say thanks for the YES')).toBe('yes');
  });
  it('gives null for anything else', () => {
    expect(kindFromName('')).toBe(null);
    expect(kindFromName(null)).toBe(null);
    expect(kindFromName('Wave')).toBe(null);
    expect(kindFromName('say')).toBe(null);
  });
});

describe('markSvg', () => {
  it('draws a kind mark at a size, in its mark colour', () => {
    expect(markSvg('thanks', 10)).toBe('<svg viewBox="0 0 24 24" width="10" height="10" fill="#313D45" aria-hidden="true"><circle cx="12" cy="12" r="12"/></svg>');
    expect(markSvg('hello', 132)).toBe(`<svg viewBox="0 0 24 24" width="132" height="132" fill="#FFD100" aria-hidden="true">${MARKS.rise}</svg>`);
  });
});

describe('moveName and moveLook', () => {
  const year = { shootId: 's1', shoot: 'Rooftop portraits' };
  it("name a move by its kind, and draw it in its kind's colours", () => {
    expect(moveName({ kind: 'checkin' })).toBe('Check in');
    expect(moveName({ kind: 'photos', shoot: 'Rooftop portraits' })).toBe('Your photos are up');
    expect(moveLook({ kind: 'pitch' })).toBe('pitch');
  });
  it('call A year since by its own name, drawn in mango and the sun (as Your photos are up)', () => {
    expect(moveName({ kind: 'checkin', year })).toBe('A year since');
    expect(YEAR_NAME).toBe('A year since');
    expect(moveLook({ kind: 'checkin', year })).toBe('photos');
    expect(KINDS[moveLook({ kind: 'checkin', year })]).toMatchObject({ bg: '#FFD100', mark: 'sun' });
  });
  it('work for a done move\'s line too, and a year left empty', () => {
    expect(moveName({ personId: 'j', kind: 'checkin', day: '2026-11-15', year })).toBe('A year since');
    expect(moveName({ kind: 'checkin', year: null })).toBe('Check in');
    expect(moveLook({ kind: 'hello', year: undefined })).toBe('hello');
  });
});

describe('Other (the one sheet, 16 Nov)', () => {
  it('is no kind Rounds plans, but has a quiet look of its own', () => {
    expect(isKind('other')).toBe(false);
    expect(K.OTHER).toBe('other');
    expect(K.lookOf('other')).toBe(K.OTHER_LOOK);
    expect(K.lookOf('nonsense')).toBe(K.OTHER_LOOK);
    expect(K.lookOf('hello')).toBe(KINDS.hello);
    expect(moveName({ kind: 'other' })).toBe('Other');
    expect(markSvg('other', 10)).toBe(`<svg viewBox="0 0 24 24" width="10" height="10" fill="#313D45" aria-hidden="true">${MARKS.tag}</svg>`);
  });
});

describe('messageWord', () => {
  it('names a kind\'s message for USE YOUR ... MESSAGE', () => {
    expect(K.messageWord('thanks')).toBe('thank-you');
    expect(K.messageWord('yes')).toBe('thank-you');
    expect(K.messageWord('checkin')).toBe('check-in');
    expect(K.messageWord('followup')).toBe('follow-up');
  });
  it('every kind has one', () => {
    for (const k of K.KIND_KEYS) expect(K.messageWord(k)).not.toBe('own');
  });
  it('an unknown kind: your own message', () => {
    expect(K.messageWord('mystery')).toBe('own');
    expect(K.messageWord(undefined)).toBe('own');
  });
});
