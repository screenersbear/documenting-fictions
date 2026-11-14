// rounds/data/plan.js: which move comes next for someone, by their group, and when.
import { describe, it, expect } from 'vitest';
import { GROUPS, GROUP_KEYS, GAP, REGULAR_AFTER, groupFromName, move, firstMove, afterShoot, afterDone, regroup, becomesRegular } from '../../../rounds/data/plan.js';

const T = '2026-11-14';
const who = (group, next = null, more = {}) => ({ group, next, shoots: [], groupPicked: false, ...more });

describe('the groups and gaps', () => {
  it('are the five groups, in the order Edit lists them', () => {
    expect(GROUP_KEYS).toEqual(['regular', 'new', 'client', 'prospect', 'guest']);
    expect(Object.values(GROUPS)).toEqual(['Regular', 'New', 'Client', 'Prospect', 'Event guest']);
  });
  it('wait six weeks to check in, three months for clients, a week then two for follow ups', () => {
    expect(GAP).toEqual({ checkin: 42, client: 90, followup: [7, 14], fresh: 14 });
    expect(REGULAR_AFTER).toBe(3);
  });
});

describe('groupFromName', () => {
  it('reads a group however it is written', () => {
    expect(groupFromName('Client')).toBe('client');
    expect(groupFromName(' clients ')).toBe('client');
    expect(groupFromName('Regulars')).toBe('regular');
    expect(groupFromName('NEW')).toBe('new');
    expect(groupFromName('prospects')).toBe('prospect');
    expect(groupFromName('Event  Guests')).toBe('guest');
    expect(groupFromName('guest')).toBe('guest');
  });
  it('gives null for anything else', () => {
    expect(groupFromName('')).toBe(null);
    expect(groupFromName(null)).toBe(null);
    expect(groupFromName('friend')).toBe(null);
  });
});

describe('move', () => {
  it('is a kind, a day and a step (0 unless said)', () => {
    expect(move('pitch', T)).toEqual({ kind: 'pitch', due: T, step: 0 });
    expect(move('followup', T, 2)).toEqual({ kind: 'followup', due: T, step: 2 });
  });
});

describe('firstMove', () => {
  it('starts each group with its own move, today', () => {
    expect(firstMove('regular', T)).toEqual(move('checkin', T));
    expect(firstMove('prospect', T)).toEqual(move('pitch', T));
    expect(firstMove('client', T)).toEqual(move('intros', T));
    expect(firstMove('new', T)).toEqual(move('hello', T));
    expect(firstMove('guest', T)).toEqual(move('hello', T));
  });
});

describe('afterShoot', () => {
  it('gives a Regular a check-in six weeks after the shoot, never a thank you', () => {
    expect(afterShoot(who('regular'), '2026-11-10', T)).toEqual(move('checkin', '2026-12-22'));
  });
  it('makes an old shoot\'s check-in due today, not in the past', () => {
    expect(afterShoot(who('regular'), '2026-08-01', T)).toEqual(move('checkin', T));
  });
  it('says thanks today for a shoot up to two weeks ago', () => {
    expect(afterShoot(who('new'), T, T)).toEqual(move('thanks', T));
    expect(afterShoot(who('client', move('intros', '2027-01-01')), '2026-10-31', T)).toEqual(move('thanks', T));
  });
  it('leaves an older shoot\'s next move as it was, or brings a check-in', () => {
    const next = move('pitch', '2026-11-20');
    expect(afterShoot(who('prospect', next), '2026-10-30', T)).toBe(next);
    expect(afterShoot(who('new'), '2026-10-30', T)).toEqual(move('checkin', '2026-12-11'));
  });
});

describe('afterDone', () => {
  it('has nothing after no move, or for an event guest (the newsletter instead)', () => {
    expect(afterDone(who('new'), T)).toBe(null);
    expect(afterDone(who('guest', move('hello', T)), T)).toBe(null);
  });
  it('checks in with Regulars and New people six weeks later', () => {
    expect(afterDone(who('regular', move('checkin', T)), T)).toEqual(move('checkin', '2026-12-26'));
    expect(afterDone(who('new', move('thanks', T)), T)).toEqual(move('checkin', '2026-12-26'));
  });
  it('turns Clients between asking for intros and a refresh offer, three months apart', () => {
    expect(afterDone(who('client', move('intros', T)), T)).toEqual(move('refresh', '2027-02-12'));
    expect(afterDone(who('client', move('refresh', T)), T)).toEqual(move('intros', '2027-02-12'));
    expect(afterDone(who('client', move('thanks', T)), T)).toEqual(move('intros', '2027-02-12'));
  });
  it('follows a pitch up a week later, then two weeks after, then lets it rest', () => {
    const one = afterDone(who('prospect', move('pitch', T)), T);
    expect(one).toEqual(move('followup', '2026-11-21', 1));
    const two = afterDone(who('prospect', one), '2026-11-21');
    expect(two).toEqual(move('followup', '2026-12-05', 2));
    expect(afterDone(who('prospect', two), '2026-12-05')).toBe(null);
  });
});

describe('regroup', () => {
  it('keeps a next move that belongs to the new group', () => {
    const next = move('followup', '2026-11-20', 1);
    expect(regroup(who('client', next), 'prospect', T)).toBe(next);
    const thanks = move('thanks', T);
    expect(regroup(who('new', thanks), 'client', T)).toBe(thanks);
  });
  it('gives the group\'s first move otherwise', () => {
    expect(regroup(who('new', move('thanks', T)), 'regular', T)).toEqual(move('checkin', T));
    expect(regroup(who('client', move('refresh', T)), 'new', T)).toEqual(move('hello', T));
    expect(regroup(who('prospect'), 'client', T)).toEqual(move('intros', T));
  });
});

describe('becomesRegular', () => {
  it('after three shoots together for someone New', () => {
    expect(becomesRegular(who('new', null, { shoots: ['a', 'b', 'c'] }))).toBe(true);
    expect(becomesRegular(who('new', null, { shoots: ['a', 'b'] }))).toBe(false);
  });
  it('never when their group was picked by hand, or they are not New', () => {
    expect(becomesRegular(who('new', null, { shoots: ['a', 'b', 'c'], groupPicked: true }))).toBe(false);
    expect(becomesRegular(who('client', null, { shoots: ['a', 'b', 'c', 'd'] }))).toBe(false);
  });
});
