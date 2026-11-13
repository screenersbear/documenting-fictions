// the-eye/components/stats-words.js: the sentence over each chart on Stats.
import { describe, it, expect, beforeAll, vi } from 'vitest';

let ed;
beforeAll(async () => {
  delete window.EyeParts;
  await import('../../../the-eye/components/stats-words.js');
  ed = {};
  window.EyeParts.addStatsWords(ed);
});
const row = (key, value, label = key, extra = {}) => ({ key, label, value, ...extra });

describe('addStatsWords', () => {
  it('adds the two helpers and nothing else', () => {
    expect(Object.keys(ed)).toEqual(['numberWord', 'statsSentence']);
  });
  it('keeps the parts already on window.EyeParts', async () => {
    window.EyeParts.other = 1;
    vi.resetModules();
    await import('../../../the-eye/components/stats-words.js');
    expect(window.EyeParts.other).toBe(1);
    expect(typeof window.EyeParts.addStatsWords).toBe('function');
  });
});

describe('numberWord', () => {
  it('writes zero to twenty in words', () => {
    expect(ed.numberWord(0)).toBe('zero');
    expect(ed.numberWord(9)).toBe('nine');
    expect(ed.numberWord(14)).toBe('fourteen');
    expect(ed.numberWord(20)).toBe('twenty');
  });
  it('has a word for every count up to twenty', () => {
    // A fresh copy, so its word list is made inside this test.
    const fresh = {};
    window.EyeParts.addStatsWords(fresh);
    expect(Array.from({ length: 21 }, (_, n) => fresh.numberWord(n)).join(' ')).toBe(
      'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty');
  });
  it('uses figures past twenty', () => {
    expect(ed.numberWord(21)).toBe('21');
    expect(ed.numberWord(1500)).toBe('1500');
  });
  it('uses figures for anything that is not a whole count', () => {
    expect(ed.numberWord(-1)).toBe('-1');
    expect(ed.numberWord(2.5)).toBe('2.5');
    expect(ed.numberWord('3')).toBe('3');
  });
});

describe('statsSentence', () => {
  it('says nothing for an empty chart, bad rows or an unknown one', () => {
    expect(ed.statsSentence('status', [])).toBe('');
    expect(ed.statsSentence('status', [row('delivered', 0)])).toBe('');
    expect(ed.statsSentence('status', null)).toBe('');
    expect(ed.statsSentence('nope', [row('a', 2)])).toBe('');
  });
});

describe('statsSentence: status', () => {
  it('says how many are delivered, and how many wait on the edit', () => {
    const rows = [row('delivered', 9), row('editing', 1), row('waiting_for_selects', 1), row('active_planning', 2), row('captured', 1)];
    expect(ed.statsSentence('status', rows)).toBe('Nine of fourteen shoots delivered. Two are waiting on your edit.');
  });
  it('counts every step of the edit, one as "is"', () => {
    expect(ed.statsSentence('status', [row('delivered', 2), row('rough_cut', 1)])).toBe('Two of three shoots delivered. One is waiting on your edit.');
    expect(ed.statsSentence('status', [row('client_review', 1), row('revisions', 1)])).toBe('None of two shoots delivered. Two are waiting on your edit.');
  });
  it('leaves the edit out when nothing waits on it', () => {
    expect(ed.statsSentence('status', [row('delivered', 3), row('prospect', 2)])).toBe('Three of five shoots delivered.');
  });
  it('words a single shoot on its own', () => {
    expect(ed.statsSentence('status', [row('delivered', 1)])).toBe('Your one shoot is delivered.');
    expect(ed.statsSentence('status', [row('prospect', 1)])).toBe("Your one shoot isn't delivered yet.");
    expect(ed.statsSentence('status', [row('editing', 1)])).toBe("Your one shoot isn't delivered yet. One is waiting on your edit.");
  });
});

describe('statsSentence: categories', () => {
  it('names the kind there is most of', () => {
    const rows = [row('wedding', 5, 'Wedding', { plural: 'wedding shoots' }), row('family', 2, 'Family', { plural: 'family shoots' })];
    expect(ed.statsSentence('shootCategory', rows)).toBe('More wedding shoots than anything else: five of seven.');
  });
  it('says when the top two are level', () => {
    const rows = [row('video', 3, 'Video', { plural: 'video shoots' }), row('event', 3, 'Event', { plural: 'event shoots' }), row('family', 1, 'Family')];
    expect(ed.statsSentence('shootCategory', rows)).toBe('Video shoots and event shoots are level, three each.');
  });
  it('says when the top two are level with one each', () => {
    const rows = [row('video', 1, 'Video', { plural: 'video shoots' }), row('event', 1, 'Event', { plural: 'event shoots' })];
    expect(ed.statsSentence('shootCategory', rows)).toBe('Video shoots and event shoots are level, one each.');
  });
  it('says when every shoot is the same kind', () => {
    expect(ed.statsSentence('shootCategory', [row('family', 4, 'Family', { plural: 'family shoots' })])).toBe('All four are family shoots.');
    expect(ed.statsSentence('shootCategory', [row('event', 1, 'Event', { plural: 'event shoots' })])).toBe('Your one shoot is an event shoot.');
    expect(ed.statsSentence('shootCategory', [row('family', 1, 'Family', { plural: 'family shoots' })])).toBe('Your one shoot is a family shoot.');
  });
  it('makes the words from the label when there is no plural', () => {
    expect(ed.statsSentence('shootCategory', [row('content_shoot', 2, 'Content shoot'), row('x', 1, 'Uncategorized')])).toBe('More content shoots than anything else: two of three.');
    expect(ed.statsSentence('shootCategory', [row('uncategorized', 2, 'Uncategorized')])).toBe('Both are uncategorized shoots.');
  });
});

describe('statsSentence: team', () => {
  it('names the role you work with most', () => {
    expect(ed.statsSentence('teamMembers', [row('__none__', 4, 'None'), row('makeup_artist', 3, 'Makeup artist')])).toBe('You work with a makeup artist most often.');
    expect(ed.statsSentence('teamMembers', [row('assistant', 2, 'Assistant')])).toBe('You work with an assistant most often.');
    expect(ed.statsSentence('teamMembers', [row('makeup_artist', 3, 'Makeup artist'), row('assistant', 1, 'Assistant')])).toBe('You work with a makeup artist most often.');
  });
  it('says when it has only ever been you', () => {
    expect(ed.statsSentence('teamMembers', [row('__none__', 5, 'None')])).toBe('Just you on every shoot so far.');
  });
  it('says so when most of the team is listed as Other', () => {
    expect(ed.statsSentence('teamMembers', [row('other', 3, 'Other'), row('assistant', 1, 'Assistant')])).toBe('Most of your team is listed as Other.');
  });
  it('names both roles when the top two are level', () => {
    expect(ed.statsSentence('teamMembers', [row('makeup_artist', 2, 'Makeup artist'), row('assistant', 2, 'Assistant'), row('stylist', 1, 'Stylist')])).toBe('You work with a makeup artist and an assistant most often.');
    expect(ed.statsSentence('teamMembers', [row('__none__', 6, 'None'), row('stylist', 1, 'Stylist'), row('assistant', 1, 'Assistant')])).toBe('You work with a stylist and an assistant most often.');
    expect(ed.statsSentence('teamMembers', [row('stylist', 2, 'Stylist'), row('other', 2, 'Other')])).toBe('You work with a stylist most often.');
  });
});

describe('statsSentence: locations', () => {
  it('names the place you shoot most', () => {
    expect(ed.statsSentence('location', [row('No location set', 5, 'No location set'), row('k1', 3, 'Rooftop'), row('k2', 1, 'Studio')])).toBe('Rooftop is where you shoot most: three shoots.');
  });
  it('says when every place has one shoot', () => {
    expect(ed.statsSentence('location', [row('k1', 1, 'Rooftop'), row('k2', 1, 'Studio'), row('__other_locations__', 4, 'Other')])).toBe('Two places, one shoot each.');
    expect(ed.statsSentence('location', [row('k1', 1, 'Rooftop')])).toBe('One shoot so far, at Rooftop.');
  });
  it('says when no place is set', () => {
    expect(ed.statsSentence('location', [row('No location set', 3, 'No location set')])).toBe('No locations set yet.');
  });
  it('says when the top two places are level', () => {
    expect(ed.statsSentence('location', [row('k1', 3, 'Rooftop'), row('k2', 3, 'Studio'), row('k3', 1, 'Beach')])).toBe('Rooftop and Studio are level, three shoots each.');
    expect(ed.statsSentence('location', [row('No location set', 9, 'No location set'), row('k1', 2, 'Rooftop'), row('k2', 2, 'Studio')])).toBe('Rooftop and Studio are level, two shoots each.');
  });
});

describe('statsSentence: visual languages and regions', () => {
  it('names the visual language that comes up most', () => {
    expect(ed.statsSentence('visualLanguage', [row('Noir', 4, 'Noir'), row('Pop', 1, 'Pop')])).toBe('Noir comes up most, on four shoots.');
    expect(ed.statsSentence('visualLanguage', [row('Noir', 1, 'Noir')])).toBe('Noir comes up most, on one shoot.');
  });
  it('names both visual languages when they are level', () => {
    expect(ed.statsSentence('visualLanguage', [row('Noir', 3, 'Noir'), row('Pop', 3, 'Pop'), row('Soft', 1, 'Soft')])).toBe('Noir and Pop come up most, on three shoots each.');
    expect(ed.statsSentence('visualLanguage', [row('Noir', 1, 'Noir'), row('Pop', 1, 'Pop')])).toBe('Noir and Pop come up most, on one shoot each.');
  });
  it('counts the countries, most first', () => {
    expect(ed.statsSentence('regions', [row('US', 6, 'United States'), row('PR', 2, 'Puerto Rico')])).toBe('Shot across two countries, most in United States.');
  });
  it('says when every shoot is in one country', () => {
    expect(ed.statsSentence('regions', [row('US', 6, 'United States')])).toBe('Every shoot so far is in United States.');
  });
  it('names no country as most when the top two are level', () => {
    expect(ed.statsSentence('regions', [row('US', 1, 'United States'), row('PR', 1, 'Puerto Rico')])).toBe('Shot across two countries.');
    expect(ed.statsSentence('regions', [row('US', 4, 'United States'), row('PR', 4, 'Puerto Rico'), row('MX', 1, 'Mexico')])).toBe('Shot across three countries.');
  });
});
