// Promises (user, 20 Nov: "missing the promise part of the callback app"),
// as Callback's open loops: something you promised someone, or something
// they promised you, with a day it's due by if there is one. Each person
// keeps theirs (person.promises): { id, mine, what, due ('' for none),
// made, open, outcome ('kept' or 'letGo' once closed), closed (its day) }.
// The Promises tab lists the open ones, yours first. Only words and lists
// (unit tested: tests/unit/rounds/promises.test.mjs).
import { isDay, addDays, later, daysBetween, dueWords } from './dates.js';

export const WHAT_MOST = 200;
const text = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, WHAT_MOST) : '');
const valid = (x) => !!x && typeof x === 'object' && typeof x.id === 'string' && x.id && !!text(x.what);

// A new one, open; null with nothing to say what it is.
export function newPromise({ mine = true, what, due = '' } = {}, id, today) {
  const words = text(what);
  if (!words || typeof id !== 'string' || !id) return null;
  return { id, mine: mine !== false, what: words, due: isDay(due) ? due : '', made: isDay(today) ? today : '', open: true };
}

// A person's promises (only well formed ones), and the open ones.
export const promisesOf = (p) => (p && Array.isArray(p.promises) ? p.promises.filter(valid) : []);
export const openOf = (p) => promisesOf(p).filter((x) => x.open);

// The person with this promise added, or put in place of the one with its id.
export function withPromise(person, promise) {
  if (!valid(promise)) return person;
  const list = promisesOf(person);
  const at = list.findIndex((x) => x.id === promise.id);
  return { ...person, promises: at < 0 ? [...list, promise] : list.map((x, i) => (i === at ? promise : x)) };
}

// One promise changed (the person as they were when there's none with that id).
export function changePromise(person, id, changes) {
  const list = promisesOf(person);
  if (!list.some((x) => x.id === id)) return person;
  return { ...person, promises: list.map((x) => (x.id === id ? { ...x, ...changes } : x)) };
}
// Kept it (yours) or Got it (theirs); Let it go; open again.
export const keepPromise = (person, id, today) => changePromise(person, id, { open: false, outcome: 'kept', closed: today });
export const letGoPromise = (person, id, today) => changePromise(person, id, { open: false, outcome: 'letGo', closed: today });
export const openAgain = (person, id) => changePromise(person, id, { open: true, outcome: '', closed: '' });
export const dueOn = (person, id, day) => changePromise(person, id, { due: isDay(day) ? day : '' });

// Another week: a week past its day, or past today if that's later (or it had none).
export function anotherWeek(due, today) {
  return addDays(later(isDay(due) ? due : '', today), 7);
}

export const isLate = (x, today) => !!x && x.open && isDay(x.due) && x.due < today;

// "Due Thursday", "Expected tomorrow", "3 days late", or '' with no day.
export function promiseWhen(x, today) {
  if (!x || !isDay(x.due) || !isDay(today)) return '';
  const n = daysBetween(today, x.due);
  if (n < 0) return `${-n} ${n === -1 ? 'day' : 'days'} late`;
  const lead = x.mine === false ? 'Expected' : 'Due';
  const w = dueWords(x.due, today);
  return `${lead} ${n < 2 ? w.toLowerCase() : w}`;
}

// The Promises tab: every open one, as { person, promise }, yours and
// theirs, each by the day it's due (none last), then the oldest made.
export function promiseList(people) {
  const all = (Array.isArray(people) ? people : []).flatMap((person) => openOf(person).map((promise) => ({ person, promise })));
  const order = (a, b) => (a.promise.due || '9999').localeCompare(b.promise.due || '9999')
    || (a.promise.made || '').localeCompare(b.promise.made || '') || a.promise.what.localeCompare(b.promise.what);
  return {
    mine: all.filter((x) => x.promise.mine !== false).sort(order),
    theirs: all.filter((x) => x.promise.mine === false).sort(order),
  };
}

// Two lists of promises as one (two people merged, or Callback's brought in): by id, the first's kept.
export function bothPromises(a, b) {
  const out = [...(Array.isArray(a) ? a : [])].filter(valid);
  for (const x of Array.isArray(b) ? b : []) if (valid(x) && !out.some((y) => y.id === x.id)) out.push(x);
  return out;
}

// "1 promise", "3 promises".
export const promiseCount = (n) => `${n} ${n === 1 ? 'promise' : 'promises'}`;
