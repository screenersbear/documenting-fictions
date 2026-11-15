// the-eye/components/finals-tags.js: the tags finals go to Ref with
// (round 2, connect/18), and the Send finals to Ref? sheet's words.
import { describe, it, expect, beforeEach } from 'vitest';

let ed;
beforeEach(async () => {
  delete window.EyeParts;
  await import('../../../the-eye/components/finals-tags.js?' + Math.random());
  ed = { CATEGORY_LABELS: { headshot: 'Headshot', editorial: 'Editorial', other: 'Other', uncategorized: 'Uncategorized' } };
  window.EyeParts.addFinalsTags(ed);
});

const june = { name: 'June Park' };

describe('finalsTags', () => {
  it('My work, the kind and the people on; up to two suggestions off', () => {
    const s = { category: 'headshot', talents: [june, { name: 'Leo Grant' }], frameworkTags: [{ frameworkId: 'f', tag: 'Golden hour' }],
      location: { name: 'Rooftop' }, lightingSetups: [{ name: 'Window light' }] };
    expect(ed.finalsTags(s)).toEqual([
      { name: 'My work', on: true }, { name: 'Headshot', on: true }, { name: 'June Park', on: true }, { name: 'Leo Grant', on: true },
      { name: 'Golden hour', on: false }, { name: 'Rooftop', on: false },
    ]);
  });
  it('takes the place and a lighting setup when there are no framework tags', () => {
    const s = { category: 'editorial', talents: [], location: { name: 'Studio B' }, lightingSetups: [{ name: '' }, { name: 'Clamshell' }, { name: 'Rim' }] };
    expect(ed.finalsTags(s).filter(t => !t.on).map(t => t.name)).toEqual(['Studio B', 'Clamshell']);
  });
  it('no kind for Other, Uncategorized or none; nothing else when the shoot has no details', () => {
    for (const category of ['other', 'uncategorized', '', undefined]) expect(ed.finalsTags({ category })).toEqual([{ name: 'My work', on: true }]);
  });
  it('an unknown kind is left out', () => {
    expect(ed.finalsTags({ category: 'mystery' })).toEqual([{ name: 'My work', on: true }]);
  });
  it('each name once, whatever its case or spacing; a suggestion that is already on is skipped', () => {
    const s = { category: 'headshot', talents: [june, { name: ' june   park ' }, null, { name: '' }], frameworkTags: [{ tag: 'headshot' }, null, { tag: 'Moody' }],
      location: { name: 'my work' }, lightingSetups: [null, { name: 'Moody' }, { name: 'Soft' }] };
    expect(ed.finalsTags(s)).toEqual([
      { name: 'My work', on: true }, { name: 'Headshot', on: true }, { name: 'June Park', on: true },
      { name: 'Moody', on: false }, { name: 'Soft', on: false },
    ]);
  });
  it('a very long name is cut to 40 characters', () => {
    expect(ed.finalsTags({ talents: [{ name: 'x'.repeat(60) }] })[1].name).toHaveLength(40);
  });
  it('a place with no name, or not text, gives nothing', () => {
    expect(ed.finalsTags({ location: { name: 42 }, frameworkTags: [{ tag: {} }] })).toEqual([{ name: 'My work', on: true }]);
    expect(ed.finalsTags({ location: null })).toEqual([{ name: 'My work', on: true }]);
  });
});

describe('withTag', () => {
  const tags = [{ name: 'My work', on: true }, { name: 'Rooftop', on: false }];
  it('adds a new tag at the end, on', () => {
    expect(ed.withTag(tags, '  Winter  ')).toEqual([...tags, { name: 'Winter', on: true }]);
  });
  it('switches on a tag that is already there, whatever its case', () => {
    expect(ed.withTag(tags, 'rooftop')).toEqual([{ name: 'My work', on: true }, { name: 'Rooftop', on: true }]);
  });
  it('leaves the tags as they are for nothing typed', () => {
    expect(ed.withTag(tags, '   ')).toBe(tags);
    expect(ed.withTag(tags, undefined)).toBe(tags);
  });
});

describe('tagsOn', () => {
  it('is the names of the tags that are on, in order', () => {
    expect(ed.tagsOn([{ name: 'A', on: true }, { name: 'B', on: false }, { name: 'C', on: true }])).toEqual(['A', 'C']);
  });
  it('is empty when none are on, or there are none', () => {
    expect(ed.tagsOn([{ name: 'A', on: false }])).toEqual([]);
    expect(ed.tagsOn([])).toEqual([]);
  });
});

describe('the words', () => {
  it('says how many are picked of how many', () => {
    expect(ed.finalsLine(3, 12)).toBe('Tap the ones you want as references. 3 of 12 picked.');
    expect(ed.finalsLine(0, 1)).toBe('Tap the ones you want as references. 0 of 1 picked.');
  });
  it('the button says how many go', () => {
    expect(ed.sendFinalsWords(3)).toBe('Send 3 to Ref');
    expect(ed.sendFinalsWords(1)).toBe('Send 1 to Ref');
    expect(ed.sendFinalsWords(0)).toBe('Send to Ref');
  });
});
