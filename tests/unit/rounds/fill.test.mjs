// rounds/data/fill.js: a starter message filled in for one person.
import { describe, it, expect } from 'vitest';
import { FILLS, firstName, fillValues, fill } from '../../../rounds/data/fill.js';

const T = '2026-11-14';

describe('firstName', () => {
  it('is the first word of a name', () => {
    expect(firstName(' Dana   Ortiz ')).toBe('Dana');
    expect(firstName('Maya')).toBe('Maya');
    expect(firstName(null)).toBe('');
  });
});

describe('fillValues', () => {
  it('fills in a person by their first name, where you met and the user\'s own words', () => {
    const p = { name: 'Dana Ortiz', group: 'client', where: 'Portrait session in May', lastMove: '2026-11-10' };
    expect(fillValues(p, { offer: 'a free mini session', city: 'Hoboken' }, T)).toEqual({
      name: 'Dana', where: 'Portrait session in May', offer: 'a free mini session', brand: 'Dana Ortiz', when: 'Tuesday', city: 'Hoboken', shoot: '',
    });
  });
  it('fills in the shoot of a post from Layouts, for Your photos are up', () => {
    const p = { name: 'June Park', group: 'new', next: { kind: 'photos', due: T, step: 0, shoot: 'Rooftop portraits' } };
    expect(fillValues(p, {}, T).shoot).toBe('Rooftop portraits');
    expect(fill('The [shoot] set is up.', fillValues(p, {}, T))).toBe('The Rooftop portraits set is up.');
    expect(fillValues({ ...p, next: { kind: 'photos', due: T, step: 0 } }, {}, T).shoot).toBe('');
    expect(fillValues({ ...p, next: null }, {}, T).shoot).toBe('');
  });
  it('fills in the shoot a year since, for A year since', () => {
    const p = { name: 'June Park', group: 'regular', next: { kind: 'checkin', due: T, step: 0, year: { shootId: 's1', shoot: 'Rooftop portraits' } } };
    expect(fillValues(p, {}, T).shoot).toBe('Rooftop portraits');
    expect(fillValues({ ...p, next: { ...p.next, year: { shootId: 's1', shoot: '' } } }, {}, T).shoot).toBe('');
    expect(fillValues({ ...p, next: { ...p.next, year: null } }, {}, T).shoot).toBe('');
  });
  it('uses all of a prospect\'s name, a business usually', () => {
    expect(fillValues({ name: ' Hoboken Florist ', group: 'prospect' }, {}, T).name).toBe('Hoboken Florist');
  });
  it('leaves what it doesn\'t know empty', () => {
    expect(fillValues({ name: 'Maya', group: 'new' }, {}, T)).toEqual({ name: 'Maya', where: '', offer: '', brand: 'Maya', when: '', city: '', shoot: '' });
    expect(fillValues({ group: 'new' }, {}, T).brand).toBe('');
  });
});

describe('fill', () => {
  const values = { name: 'Dana', where: '', offer: 'a free mini session', brand: 'Dana Ortiz', when: 'Tuesday', city: 'Hoboken' };
  it('knows seven blanks', () => {
    expect(FILLS).toEqual(['name', 'where', 'offer', 'brand', 'when', 'city', 'shoot']);
  });
  it('fills each blank, however it is capitalised', () => {
    expect(fill('Hi [name]! I am offering [offer]. Since [WHEN], [Name].', values)).toBe('Hi Dana! I am offering a free mini session. Since Tuesday, Dana.');
    expect(fill('[city] [brand]', values)).toBe('Hoboken Dana Ortiz');
  });
  it('leaves a blank with nothing to fill it, and anything that isn\'t a blank', () => {
    expect(fill('Great meeting you at [where]!', values)).toBe('Great meeting you at [where]!');
    expect(fill('[constructor] [foo] [ name ]', values)).toBe('[constructor] [foo] [ name ]');
  });
  it('gives nothing for nothing', () => {
    expect(fill(null, values)).toBe('');
  });
});
