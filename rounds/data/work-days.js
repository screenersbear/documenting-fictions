// Work days and days off (Options, rounds/NOTES.md): a Pitch or a Follow up
// only comes up on a work day, and one due on another day waits for the next
// work day. Say thanks, Say hello, Check in and Ask come up any day (they're
// about timing), except a day off: on those nothing comes up at all, and
// anything due waits for the next day that isn't off. A Say thanks after a
// shoot ignores days off too: it's about timing (thanks/NOTES.md). Days as the phone
// counts them, 0 Sunday to 6 Saturday; Monday to Friday to work and Sunday
// off unless changed. A week: { work, off }.
import { addDays, dateOf } from './dates.js';

export const WORK_DAYS = [1, 2, 3, 4, 5];
export const DAYS_OFF = [0];
export const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
// Every day a work day and none off: moves come up when they're due.
export const ANY_DAY = { work: EVERY_DAY, off: [] };
export const WORK_ONLY = ['pitch', 'followup'];
// The chips, Monday first.
export const WEEK = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun']];

const byNumber = (a, b) => a - b;
const clean = (v) => [...new Set(v.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort(byNumber);

// The work days as saved, cleaned up (repeats and anything else left out); none at all is the default.
export function workDaysOf(v) {
  const days = Array.isArray(v) ? clean(v) : [];
  return days.length ? days : [...WORK_DAYS];
}
// The days off as saved, cleaned up; none at all is allowed, never saved is Sunday.
export const daysOffOf = (v) => (Array.isArray(v) ? clean(v) : [...DAYS_OFF]);
export const weekOf = (work, off) => ({ work: workDaysOf(work), off: daysOffOf(off) });

// Some work day that isn't a day off, so a pitch always has a day to come up.
const usable = (work, off) => work.some((d) => !off.includes(d));

// A work day chip tapped: the day on, or off (the last work day that isn't
// also a day off stays on).
export function toggleDay(v, day, off = []) {
  const on = workDaysOf(v);
  if (!on.includes(day)) return [...on, day].sort(byNumber);
  const left = on.filter((d) => d !== day);
  return left.length && usable(left, daysOffOf(off)) ? left : on;
}
// A day off chip tapped: the day off, or back (never the last work day left).
export function toggleOff(v, day, work) {
  const off = daysOffOf(v);
  if (off.includes(day)) return off.filter((d) => d !== day);
  const more = [...off, day].sort(byNumber);
  return usable(workDaysOf(work), more) ? more : off;
}

// The day a move really comes up ('' for no move): the first day from when
// it's due that isn't off (and for a Pitch or Follow up, is a work day, from
// today if it's waiting). Say thanks and the others keep their day when it
// has passed, so they read as overdue, unless today is off.
export function whenDue(next, week, today = '') {
  if (!next) return '';
  const work = WORK_ONLY.includes(next.kind);
  const fits = (iso) => {
    const d = dateOf(iso).getDay();
    return (!week.off.includes(d) || next.kind === 'thanks') && (!work || week.work.includes(d));
  };
  if (!work && next.due < today && fits(today)) return next.due;
  const from = next.due > today ? next.due : today;
  let day = from;
  for (let i = 0; i < 7; i++, day = addDays(day, 1)) if (fits(day)) return day;
  return from; // no day fits (a week saved on another device): due as it is
}

// Does the move come up on this day? (A Pitch or Follow up waiting since a
// work day still waits for the next one.)
export const comesUp = (next, today, week) => !!next && whenDue(next, week, today) <= today;
