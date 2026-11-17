// The day's moves (rounds/NOTES.md, Today): three a day (at most five), one
// card at a time. The day's pick holds for the day: what's done stays done,
// LATER moves a card to tomorrow, and anything that comes due in the day
// (a shoot just captured in The Eye) joins only while there's room. A Pitch
// or Follow up waits for a work day, and nothing comes up on a day off
// (data/work-days.js): week, the work days and days off.
import { KIND_KEYS, OTHER } from './kinds.js';
import { comesUp, ANY_DAY } from './work-days.js';
import { MOMENT_KIND } from './moments.js';

export const PER_DAY = 3;
export const MOST = 5;
const rank = (k) => KIND_KEYS.indexOf(k);
export const perDayOf = (n) => Math.min(MOST, Math.max(1, Math.floor(Number(n)) || PER_DAY));

const isDue = (p, today, week) => !p.letGo && comesUp(p.next, today, week);

// Everyone with a move due, the most timely kind first, then the longest waiting.
export function dueOn(people, today, week = ANY_DAY) {
  return people.filter((p) => isDue(p, today, week)).sort((a, b) => rank(a.next.kind) - rank(b.next.kind)
    || a.next.due.localeCompare(b.next.due) || a.added.localeCompare(b.added) || a.name.localeCompare(b.name));
}

// The day's pick: { date, ids (in order), marks: { id: 'done' | 'later' } }.
export function pickFor(people, saved, today, perDay = PER_DAY, week = ANY_DAY) {
  const same = !!saved && saved.date === today;
  const marks = same ? { ...saved.marks } : {};
  const byId = new Map(people.map((p) => [p.id, p]));
  const keep = same ? saved.ids.filter((id) => byId.has(id) && (marks[id] || isDue(byId.get(id), today, week))) : [];
  const room = Math.max(0, perDayOf(perDay) - keep.length);
  const more = dueOn(people, today, week).map((p) => p.id).filter((id) => !keep.includes(id)).slice(0, room);
  return { date: today, ids: [...keep, ...more], marks };
}

export const waiting = (pick) => pick.ids.filter((id) => !pick.marks[id]);

// DONE TODAY on Today (rounds/12, 16 Nov): from the log, every move done
// that day (one that wasn't the due one too: Other and the rest) and every
// moment, the newest first; notes aren't. Anyone let go or no longer here
// is left out.
const DONE_KINDS = [...KIND_KEYS, OTHER, MOMENT_KIND];
export function doneOn(lines, people, day) {
  const byId = new Map(people.filter((p) => !p.letGo).map((p) => [p.id, p]));
  return lines.filter((l) => l.day === day && byId.has(l.personId) && DONE_KINDS.includes(l.kind))
    .map((line) => ({ line, person: byId.get(line.personId) }))
    .sort((a, b) => (b.line.at || 0) - (a.line.at || 0) || a.person.name.localeCompare(b.person.name));
}
export const markPick = (pick, id, how) => ({ ...pick, marks: { ...pick.marks, [id]: how } });
export function unmarkPick(pick, id) {
  const marks = { ...pick.marks };
  delete marks[id];
  return { ...pick, marks };
}

// Today's count (progress/NOTES.md, 15 Nov): how many on the first card
// ("3 today"), then what's left ("2 to go", "Last one"). n: the day's
// cards; left: the ones not done yet, this one too.
export function countWords(n, left) {
  if (left >= n) return `${n} today`;
  return left === 1 ? 'Last one' : `${left} to go`;
}

// Where the stops sit on Today's arc (centre 40, 40, radius 34, in an 80 x 44
// box): spread evenly from 135 to 45 degrees, one at the top.
export function stops(n) {
  return Array.from({ length: n }, (_, i) => {
    const a = ((n === 1 ? 90 : 135 - (90 * i) / (n - 1)) * Math.PI) / 180;
    return { x: Math.round((40 + 34 * Math.cos(a)) * 10) / 10, y: Math.round((40 - 34 * Math.sin(a)) * 10) / 10 };
  });
}
