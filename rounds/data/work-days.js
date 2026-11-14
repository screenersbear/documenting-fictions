// Work days (Options, rounds/NOTES.md): a Pitch or a Follow up only comes up
// on a work day, and one due on a day off waits for the next work day. Say
// thanks, Say hello, Check in and Ask come up any day (they're about timing).
// Days as the phone counts them, 0 Sunday to 6 Saturday; Monday to Friday
// unless changed.
import { addDays, dateOf } from './dates.js';

export const WORK_DAYS = [1, 2, 3, 4, 5];
export const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
export const WORK_ONLY = ['pitch', 'followup'];
// The chips, Monday first.
export const WEEK = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun']];

const byNumber = (a, b) => a - b;

// The days as saved, cleaned up (repeats and anything else left out); none at all is the default.
export function workDaysOf(v) {
  const days = Array.isArray(v) ? [...new Set(v.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort(byNumber) : [];
  return days.length ? days : [...WORK_DAYS];
}

// A chip tapped: the day on, or off (the last one on stays on).
export function toggleDay(v, day) {
  const on = workDaysOf(v);
  if (!on.includes(day)) return [...on, day].sort(byNumber);
  return on.length > 1 ? on.filter((d) => d !== day) : on;
}

// The day a move really comes up ('' for no move). A Pitch or Follow up:
// the first work day from when it's due, or from today if it's waiting.
export function whenDue(next, v, today = '') {
  if (!next) return '';
  if (!WORK_ONLY.includes(next.kind)) return next.due;
  const on = workDaysOf(v);
  let day = next.due > today ? next.due : today;
  while (!on.includes(dateOf(day).getDay())) day = addDays(day, 1);
  return day;
}

// Does the move come up on this day? (A Pitch or Follow up waiting since a
// work day still waits for the next one.)
export const comesUp = (next, today, v) => !!next && whenDue(next, v, today) <= today;
