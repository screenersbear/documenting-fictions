// rounds/data/csv.js: reading and writing CSV, and Import people's file (rounds/NOTES.md).
import { describe, it, expect } from 'vitest';
import { parseCsv, toCsv, readPeople, newOnes } from '../../../rounds/data/csv.js';

describe('parseCsv', () => {
  it('reads rows and fields', () => {
    expect(parseCsv('a,b,c\n1,2,3\n')).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
    expect(parseCsv('a,b\r\n1,2')).toEqual([['a', 'b'], ['1', '2']]);
    expect(parseCsv('a\r1\r')).toEqual([['a'], ['1']]);
  });
  it('keeps commas, quotes and line breaks inside quotes', () => {
    expect(parseCsv('"Ortiz, Dana","She said ""hi""","line one\nline two"')).toEqual([['Ortiz, Dana', 'She said "hi"', 'line one\nline two']]);
    expect(parseCsv('"",x')).toEqual([['', 'x']]);
    expect(parseCsv('""""')).toEqual([['"']]);
  });
  it('takes a quote in the middle of a field as it is', () => {
    expect(parseCsv('5" print,x')).toEqual([['5" print', 'x']]);
  });
  it('drops the BOM and empty lines, keeps empty fields', () => {
    expect(parseCsv('﻿name,group\n\n , \nAna,,\n')).toEqual([['name', 'group'], ['Ana', '', '']]);
    expect(parseCsv('a,')).toEqual([['a', '']]);
  });
  it('gives nothing for nothing', () => {
    expect(parseCsv('')).toEqual([]);
    expect(parseCsv(null)).toEqual([]);
  });
});

describe('toCsv', () => {
  it('quotes only what needs it, with Windows line ends', () => {
    expect(toCsv([['name', 'address'], ['Dana Ortiz', '1 Main St, Apt 2'], ['Ana "A"', 'Line\nTwo'], ['Bo', 'a\rb'], ['', null]])).toBe(
      'name,address\r\nDana Ortiz,"1 Main St, Apt 2"\r\n"Ana ""A""","Line\nTwo"\r\nBo,"a\rb"\r\n,\r\n');
  });
  it('reads back what it wrote', () => {
    const rows = [['a, b', '"q"', 'x\ny']];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});

describe('readPeople', () => {
  const head = 'name,group,instagram,website,email,where_met,note,first_move\n';
  it('reads each person in the file\'s columns, cleaned', () => {
    const { rows, bad } = readPeople(`${head}Hoboken Florist,Prospect,@hobokenflorist,hobokenflowers.com,hi@hf.com,"Found by Claude, Nov 2026",A bright storefront,Say hello\n`);
    expect(bad).toBe(0);
    expect(rows).toEqual([{ name: 'Hoboken Florist', group: 'prospect', instagram: 'hobokenflorist', website: 'https://hobokenflowers.com', email: 'hi@hf.com', where: 'Found by Claude, Nov 2026', note: 'A bright storefront', firstMove: 'hello' }]);
  });
  it('takes the columns in any order and case, and fills in the rest', () => {
    const { rows } = readPeople('Instagram , NAME,Where Met,First-Move\nmaya.rr,Maya,Meetup,\n');
    expect(rows).toEqual([{ name: 'Maya', group: 'prospect', instagram: 'maya.rr', website: '', email: '', where: 'Meetup', note: '', firstMove: null }]);
  });
  it('reads a group, Prospect when it\'s missing or unknown', () => {
    const { rows } = readPeople('name,group\nA,client\nB,\nC,friends\nD,Regular\n');
    expect(rows.map((r) => r.group)).toEqual(['client', 'prospect', 'prospect', 'regular']);
  });
  it('skips rows with no name and counts them, never stopping', () => {
    const { rows, bad } = readPeople('name,instagram\n,@ghost\nAna,ana\n  ,x\nBo\n');
    expect(rows.map((r) => r.name)).toEqual(['Ana', 'Bo']);
    expect(bad).toBe(2);
  });
  it('says plainly when a file has no name column', () => {
    expect(() => readPeople('who,instagram\nAna,ana\n')).toThrow('This file has no name column. Its first row should name the columns: name, group, instagram and the rest.');
    expect(() => readPeople('')).toThrow('no name column');
  });
});

describe('newOnes', () => {
  const people = [{ name: 'Maya R.', instagram: 'maya.rr' }, { name: 'Dana Ortiz', instagram: '' }];
  it('skips anyone Rounds has, by handle or (with no handle) by name', () => {
    const rows = [{ name: 'Maya', instagram: 'MAYA.RR' }, { name: 'dana  ortiz', instagram: '' }, { name: 'Maya R.', instagram: 'other' }, { name: 'Jules', instagram: '' }, { name: 'Dana Ortiz', instagram: 'dana' }];
    const { fresh, skipped } = newOnes(rows, people);
    expect(fresh.map((r) => r.name)).toEqual(['Maya R.', 'Jules']);
    expect(skipped).toBe(3);
  });
  it('skips someone twice in the same file', () => {
    const rows = [{ name: 'Jules', instagram: 'jules' }, { name: 'Jules M', instagram: 'jules' }, { name: 'Jules', instagram: '' }, { name: 'Bo', instagram: '' }, { name: 'bo', instagram: '' }];
    const { fresh, skipped } = newOnes(rows, []);
    expect(fresh.map((r) => r.name)).toEqual(['Jules', 'Bo']);
    expect(skipped).toBe(3);
  });
});
