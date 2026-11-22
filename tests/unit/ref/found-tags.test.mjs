// ref/data/found-tags.js: what Ref found in the photos, as tags of their own
// on the Tags screen (Starky, 21 Nov).
import { describe, it, expect } from 'vitest';
import { FOUND, isFound, labelOf, foundId, foundName, withLabel, foundTags, foundFolder, withoutLabel } from '../../../ref/data/found-tags.js';

const a = { id: 'a', tags: ['dog', 'park'] };
const b = { id: 'b', tags: ['dog', 'dog'] };
const c = { id: 'c', tags: ['cat'] };
const d = { id: 'd' };
const e = { id: 'e', tags: ['', 3, null] };

describe('ids and names', () => {
  it('knows a found id', () => {
    expect(FOUND).toBe('found:');
    expect(isFound('found:dog')).toBe(true);
    expect(isFound('found:')).toBe(false);
    expect(isFound('f1')).toBe(false);
    expect(isFound(undefined)).toBe(false);
  });
  it('reads and makes them', () => {
    expect(labelOf('found:sea shell')).toBe('sea shell');
    expect(labelOf('f1')).toBe('');
    expect(foundId('dog')).toBe('found:dog');
    expect(foundName('sea shell')).toBe('Sea shell');
    expect(foundName('')).toBe('');
  });
});

describe('withLabel', () => {
  it('finds the photos with it', () => {
    expect(withLabel([a, b, c, d, e], 'dog')).toEqual([a, b]);
    expect(withLabel(null, 'dog')).toEqual([]);
  });
});

describe('foundTags', () => {
  it('counts each photo once, most first, then A to Z', () => {
    expect(foundTags([a, b, c, d, e])).toEqual([
      { id: 'found:dog', name: 'Dog', label: 'dog', count: 2 },
      { id: 'found:cat', name: 'Cat', label: 'cat', count: 1 },
      { id: 'found:park', name: 'Park', label: 'park', count: 1 },
    ]);
  });
  it('is empty with no photos', () => {
    expect(foundTags([])).toEqual([]);
    expect(foundTags(undefined)).toEqual([]);
  });
});

describe('foundFolder', () => {
  it('is the tag while a photo has it', () => {
    expect(foundFolder([a, c], 'found:cat')).toEqual({ id: 'found:cat', name: 'Cat', label: 'cat', found: true });
  });
  it('is null when none has it, or it is not a found id', () => {
    expect(foundFolder([a], 'found:cat')).toBeNull();
    expect(foundFolder([a], 'f1')).toBeNull();
  });
});

describe('withoutLabel', () => {
  it("is a photo's found tags without that one", () => {
    expect(withoutLabel(a, 'dog')).toEqual(['park']);
    expect(withoutLabel(b, 'dog')).toEqual([]);
    expect(withoutLabel(d, 'dog')).toEqual([]);
    expect(withoutLabel(null, 'dog')).toEqual([]);
  });
});
