// rounds/data/clash.js: how "Changed on two devices" reads.
import { describe, it, expect } from 'vitest';
import { valueWords, subjectOf, clashRows, newerSide } from '../../../rounds/data/clash.js';

describe('valueWords', () => {
  it('nothing, yes and no, a group', () => {
    for (const v of [undefined, null, '']) expect(valueWords('note', v)).toBe('Nothing');
    expect(valueWords('letGo', true)).toBe('Yes');
    expect(valueWords('lists.email', false)).toBe('No');
    expect(valueWords('group', 'guest')).toBe('Event guest');
    expect(valueWords('group', 'other')).toBe('other');
    expect(valueWords('groups', ['regular', 'client'])).toBe('Regular, Client'); // more than one group (people/NOTES.md)
    expect(valueWords('groups', ['other'])).toBe('other');
    expect(valueWords('groups', [])).toBe('Nothing');
  });
  it('a next move or a draft, by name and day', () => {
    expect(valueWords('next', { kind: 'pitch', due: '2026-11-16', step: 0 })).toBe('Pitch, due 2026-11-16');
    expect(valueWords('draft', { kind: 'followup', where: 'Gmail' })).toBe('Follow up');
    expect(valueWords('next', { kind: 'wave' })).toBe('Nothing');
  });
  it('work days by name, Monday first', () => {
    expect(valueWords('value', [0, 1, 5], 'workDays')).toBe('Mon, Fri, Sun');
    expect(valueWords('value', [9], 'workDays')).toBe('Nothing');
    expect(valueWords('value', [6, 0], 'daysOff')).toBe('Sat, Sun');
    expect(valueWords('value', [], 'daysOff')).toBe('Nothing');
    expect(valueWords('value', 4, 'perDay')).toBe('4');
  });
  it('anything else as it is', () => {
    expect(valueWords('note', 'Hi')).toBe('Hi');
    expect(valueWords('shoots', ['s1'])).toBe('["s1"]');
    expect(valueWords('x', 0)).toBe('0');
  });
});

describe('subjectOf', () => {
  it('someone by name; a message by its kind; a setting by its name', () => {
    expect(subjectOf({ store: 'people', mine: { name: 'Ana' } })).toBe('Ana');
    expect(subjectOf({ store: 'people', mine: null, theirs: { name: 'Bo' } })).toBe('Bo');
    expect(subjectOf({ store: 'people', mine: null, theirs: null })).toBe('Someone');
    expect(subjectOf({ store: 'messages', id: 'thanks' })).toBe('The Say thanks message');
    expect(subjectOf({ store: 'messages', id: 'odd' })).toBe('The odd message');
    expect(subjectOf({ store: 'settings', id: 'workDays' })).toBe('Work days');
    expect(subjectOf({ store: 'settings', id: 'daysOff' })).toBe('Days off');
    expect(subjectOf({ store: 'settings', id: 'other' })).toBe('A setting');
  });
  it('a move, or a lead passed on', () => {
    expect(subjectOf({ store: 'moves' })).toBe('A move marked done');
    expect(subjectOf({ store: 'passed' })).toBe('A lead passed on');
  });
});

describe('clashRows', () => {
  it('each field that differs, the other device then this one', () => {
    const c = { store: 'people', id: 'a', loud: ['note', 'lists.email', 'odd'], mine: { note: 'here', lists: { email: true } }, theirs: { note: 'there', lists: { email: false }, odd: 1 } };
    expect(clashRows(c)).toEqual([
      { label: 'Note', theirs: 'there', mine: 'here' },
      { label: 'Email newsletter', theirs: 'No', mine: 'Yes' },
      { label: 'odd', theirs: '1', mine: 'Nothing' },
    ]);
  });
  it('a setting is named by what it is', () => {
    expect(clashRows({ store: 'settings', id: 'city', loud: ['value'], mine: { value: 'Hoboken' }, theirs: { value: 'NYC' } })).toEqual([{ label: 'Your city', theirs: 'NYC', mine: 'Hoboken' }]);
    expect(clashRows({ store: 'settings', id: 'x', loud: ['value'], mine: { value: 1 }, theirs: { value: 2 } })[0].label).toBe('Setting');
    expect(clashRows({ store: 'messages', id: 'pitch', loud: ['text'], mine: { text: 'a' }, theirs: { text: 'b' } })[0].label).toBe('Message');
  });
  it('no clashes listed: none', () => {
    expect(clashRows({ store: 'people' })).toEqual([]);
  });
});

describe('newerSide', () => {
  it('the side changed last; this one when the same or unknown', () => {
    expect(newerSide({ mine: { updatedAt: '2026-11-14T10' }, theirs: { updatedAt: '2026-11-14T11' } })).toBe('theirs');
    expect(newerSide({ mine: { updatedAt: '2026-11-14T12' }, theirs: { updatedAt: '2026-11-14T11' } })).toBe('mine');
    expect(newerSide({ mine: { updatedAt: 'x' }, theirs: { updatedAt: 'x' } })).toBe('mine');
    expect(newerSide({ mine: null, theirs: { updatedAt: 'x' } })).toBe('theirs');
    expect(newerSide({ mine: {}, theirs: null })).toBe('mine');
  });
});
