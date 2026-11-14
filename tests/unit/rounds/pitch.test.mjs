// rounds/data/pitch.js: HOW DID THE PITCH GO? (connect/05), its answers and what a yes passes to Ref.
import { describe, it, expect } from 'vitest';
import { ANSWERS, pitchedOn, saidYes, asksAboutPitch, answerPitch, yesLine, clientFor } from '../../../rounds/data/pitch.js';
import { newPerson } from '../../../rounds/data/person.js';
import { move } from '../../../rounds/data/plan.js';

const T = '2026-11-14';
const dana = { ...newPerson({ id: 'd', name: 'Dana Ortiz', group: 'prospect', instagram: '@danaortiz.studio' }, '2026-11-01'), next: move('followup', '2026-11-10', 1), pitched: '2026-11-03' };

describe('ANSWERS', () => {
  it('are the three in the mockup, in order', () => {
    expect(ANSWERS.map((a) => a.label)).toEqual(['No reply yet', 'Not now', "Yes, let's shoot"]);
    expect(ANSWERS.map((a) => a.key)).toEqual(['waiting', 'no', 'yes']);
  });
});

describe('pitchedOn', () => {
  it('gives the day kept on them', () => {
    expect(pitchedOn(dana, [{ personId: 'd', kind: 'pitch', day: '2026-10-01' }])).toBe('2026-11-03');
  });
  it('finds the latest pitch in the log, for one from before', () => {
    const lines = [
      { personId: 'd', kind: 'pitch', day: '2026-10-01' },
      { personId: 'd', kind: 'pitch', day: '2026-10-20' },
      { personId: 'd', kind: 'followup', day: '2026-10-27' },
      { personId: 'x', kind: 'pitch', day: '2026-11-01' },
    ];
    expect(pitchedOn({ ...dana, pitched: '' }, lines)).toBe('2026-10-20');
  });
  it('is empty when they were never pitched', () => {
    expect(pitchedOn({ ...dana, pitched: undefined })).toBe('');
    expect(pitchedOn({ ...dana, pitched: '' }, [{ personId: 'd', kind: 'hello', day: T }])).toBe('');
  });
});

describe('asksAboutPitch', () => {
  it('asks a prospect once their pitch is done: a follow up next, or nothing', () => {
    expect(asksAboutPitch(dana, '2026-11-03')).toBe(true);
    expect(asksAboutPitch({ ...dana, next: null }, '2026-11-03')).toBe(true);
  });
  it('does not ask before the pitch, or while one is due again', () => {
    expect(asksAboutPitch(dana, '')).toBe(false);
    expect(asksAboutPitch({ ...dana, next: move('pitch', T) }, '2026-11-03')).toBe(false);
  });
  it('does not ask someone let go, or anyone but a prospect without a yes', () => {
    expect(asksAboutPitch({ ...dana, letGo: true }, '2026-11-03')).toBe(false);
    expect(asksAboutPitch({ ...dana, group: 'client' }, '2026-11-03')).toBe(false);
    expect(asksAboutPitch({ ...dana, group: 'new', next: null }, '2026-11-03')).toBe(false);
  });
  it('keeps asking after a yes until it is thanked for', () => {
    const yes = answerPitch(dana, 'yes', T);
    expect(asksAboutPitch(yes, '2026-11-03')).toBe(true);
    expect(asksAboutPitch(yes, '')).toBe(true); // someone who asked first
    expect(asksAboutPitch({ ...yes, next: move('intros', '2027-02-12') }, '2026-11-03')).toBe(false);
    expect(asksAboutPitch({ ...yes, next: null }, '2026-11-03')).toBe(false);
  });
});

describe('answerPitch', () => {
  it('Yes makes them a Client, with a thank-you for the yes today', () => {
    const yes = answerPitch(dana, 'yes', T);
    expect(yes).toMatchObject({ group: 'client', groupPicked: true, next: move('yes', T) });
    expect(yes.pitch).toEqual({ answer: 'yes', on: T, before: { group: 'prospect', groupPicked: false, next: dana.next } });
    expect(saidYes(yes)).toBe(true);
    expect(dana.group).toBe('prospect'); // the old one stays as it was
  });
  it('Not now lets them go quietly: nothing more planned', () => {
    const no = answerPitch(dana, 'no', T);
    expect(no).toMatchObject({ group: 'prospect', next: null, pitch: { answer: 'no', on: T } });
  });
  it('No reply yet keeps the follow ups as they were', () => {
    const wait = answerPitch(dana, 'waiting', T);
    expect(wait).toMatchObject({ group: 'prospect', next: dana.next, pitch: { answer: 'waiting' } });
  });
  it('can be changed: each answer starts from how they were before the first', () => {
    const yes = answerPitch(dana, 'yes', T);
    const back = answerPitch(yes, 'waiting', '2026-11-15');
    expect(back).toMatchObject({ group: 'prospect', groupPicked: false, next: dana.next, pitch: { answer: 'waiting', on: '2026-11-15', before: yes.pitch.before } });
    expect(saidYes(back)).toBe(false);
    const no = answerPitch(answerPitch(dana, 'no', T), 'yes', T);
    expect(no.pitch.before.next).toEqual(dana.next);
  });
  it('gives a yes to someone who asked first, whatever their group', () => {
    const ana = { ...newPerson({ id: 'a', name: 'Ana', group: 'new' }, T), groupPicked: true };
    const yes = answerPitch(ana, 'yes', T);
    expect(yes).toMatchObject({ group: 'client', next: move('yes', T) });
    expect(answerPitch(yes, 'waiting', T)).toMatchObject({ group: 'new', groupPicked: true, next: ana.next });
  });
  it('takes how they are now when an earlier answer kept nothing of before', () => {
    const odd = { ...dana, pitch: { answer: 'no', on: '2026-11-05' } };
    expect(answerPitch(odd, 'yes', T).pitch.before).toEqual({ group: 'prospect', groupPicked: false, next: dana.next });
    expect(answerPitch({ ...dana, next: undefined, groupPicked: undefined }, 'no', T).pitch.before).toEqual({ group: 'prospect', groupPicked: false, next: null });
  });
  it('leaves them as they are for an answer it does not know', () => {
    expect(answerPitch(dana, 'maybe', T)).toBe(dana);
    expect(answerPitch(dana, undefined, T)).toBe(dana);
  });
});

describe('saidYes', () => {
  it('is a yes still to be thanked for', () => {
    expect(saidYes(dana)).toBe(false);
    expect(saidYes({ ...dana, pitch: { answer: 'no' } })).toBe(false);
    expect(saidYes({ ...dana, pitch: { answer: 'yes' }, next: null })).toBe(false);
    expect(saidYes({ ...dana, pitch: { answer: 'yes' }, next: move('yes', T) })).toBe(true);
  });
});

describe('yesLine', () => {
  it('says they are a client now, and when they were pitched', () => {
    expect(yesLine('2026-11-03')).toBe('Client now. Pitched 3 Nov.');
  });
  it('says only that, for someone who asked first', () => {
    expect(yesLine('')).toBe('Client now.');
    expect(yesLine(undefined)).toBe('Client now.');
  });
});

describe('clientFor', () => {
  it('passes their name, Instagram handle and pitch day to Ref', () => {
    expect(clientFor({ ...dana, instagram: 'danaortiz.studio' }, '2026-11-03')).toEqual({ name: 'Dana Ortiz', handle: 'danaortiz.studio', pitched: '2026-11-03' });
  });
  it('leaves out what they do not have', () => {
    expect(clientFor({ name: 'Ana', instagram: '' }, '')).toEqual({ name: 'Ana', handle: '', pitched: '' });
    expect(clientFor({ name: 'Ana' })).toEqual({ name: 'Ana', handle: '', pitched: '' });
  });
});
