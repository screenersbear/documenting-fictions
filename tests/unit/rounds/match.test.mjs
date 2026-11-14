// rounds/data/match.js: is this someone Rounds already has? By Instagram handle, or by name with none.
import { describe, it, expect } from 'vitest';
import { nameKey, handleKey, matchKey, keysOf, findMatch } from '../../../rounds/data/match.js';

const maya = { id: 'a', name: 'Maya R.', instagram: 'maya.rr' };
const dana = { id: 'b', name: 'Dana Ortiz', instagram: '' };

describe('the keys', () => {
  it('make names and handles the same however they are typed', () => {
    expect(nameKey('  Maya   R. ')).toBe('name:maya r.');
    expect(nameKey(null)).toBe('name:');
    expect(handleKey('Maya.RR')).toBe('ig:maya.rr');
  });
  it('match by handle when there is one, else by name', () => {
    expect(matchKey(maya)).toBe('ig:maya.rr');
    expect(matchKey(dana)).toBe('name:dana ortiz');
    expect(keysOf(maya)).toEqual(['ig:maya.rr', 'name:maya r.']);
    expect(keysOf(dana)).toEqual(['name:dana ortiz']);
  });
});

describe('findMatch', () => {
  it('finds someone by their handle, whatever the name', () => {
    expect(findMatch([dana, maya], { name: 'Maya Reyes', instagram: 'MAYA.RR' })).toBe(maya);
  });
  it('finds someone by name when there is no handle', () => {
    expect(findMatch([maya, dana], { name: 'dana ortiz', instagram: '' })).toBe(dana);
    expect(findMatch([maya], { name: 'maya r.' })).toBe(maya);
  });
  it('finds someone with no handle yet by name, from a handle', () => {
    expect(findMatch([maya, dana], { name: ' Dana Ortiz', instagram: 'dana.o' })).toBe(dana);
  });
  it('never matches a different handle by name', () => {
    expect(findMatch([maya], { name: 'Maya R.', instagram: 'other' })).toBe(null);
  });
  it('gives null for no one', () => {
    expect(findMatch([], { name: 'Ana' })).toBe(null);
  });
});
