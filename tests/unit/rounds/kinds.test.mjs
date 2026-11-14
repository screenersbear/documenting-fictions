// rounds/data/kinds.js: the seven kinds of move, their colour pairs, marks and starter messages.
import { describe, it, expect } from 'vitest';
import { KINDS, KIND_KEYS, MARKS, MESSAGE_ORDER, isKind, kindFromName, markSvg } from '../../../rounds/data/kinds.js';

describe('the kinds', () => {
  it('come in the order Today takes them, thanks first and a pitch last', () => {
    expect(KIND_KEYS).toEqual(['thanks', 'hello', 'checkin', 'intros', 'refresh', 'followup', 'pitch']);
  });
  it('each have a name, a colour pair and a mark (rounds/NOTES.md)', () => {
    const rows = KIND_KEYS.map((k) => [k, KINDS[k].name, KINDS[k].bg, KINDS[k].fg, KINDS[k].mark]);
    expect(rows).toEqual([
      ['thanks', 'Say thanks', '#FFD100', '#313D45', 'sun'],
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
  it('are all listed on Messages, in the mockup order', () => {
    expect(MESSAGE_ORDER).toEqual(['thanks', 'hello', 'checkin', 'refresh', 'intros', 'pitch', 'followup']);
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
  it('knows the seven and nothing else', () => {
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
