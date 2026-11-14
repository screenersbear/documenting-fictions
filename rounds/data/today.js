// The day's moves (rounds/NOTES.md, Today): three a day (at most five), one
// card at a time. The day's pick holds for the day: what's done stays done,
// LATER moves a card to tomorrow, and anything that comes due in the day
// (a shoot just captured in The Eye) joins only while there's room.
import { KIND_KEYS } from './kinds.js';

export const PER_DAY = 3;
export const MOST = 5;
const rank = (k) => KIND_KEYS.indexOf(k);
export const perDayOf = (n) => Math.min(MOST, Math.max(1, Math.floor(Number(n)) || PER_DAY));

const isDue = (p, today) => !!p.next && !p.letGo && p.next.due <= today;

// Everyone with a move due, the most timely kind first, then the longest waiting.
export function dueOn(people, today) {
  return people.filter((p) => isDue(p, today)).sort((a, b) => rank(a.next.kind) - rank(b.next.kind)
    || a.next.due.localeCompare(b.next.due) || a.added.localeCompare(b.added) || a.name.localeCompare(b.name));
}

// The day's pick: { date, ids (in order), marks: { id: 'done' | 'later' } }.
export function pickFor(people, saved, today, perDay = PER_DAY) {
  const same = !!saved && saved.date === today;
  const marks = same ? { ...saved.marks } : {};
  const byId = new Map(people.map((p) => [p.id, p]));
  const keep = same ? saved.ids.filter((id) => byId.has(id) && (marks[id] || isDue(byId.get(id), today))) : [];
  const room = Math.max(0, perDayOf(perDay) - keep.length);
  const more = dueOn(people, today).map((p) => p.id).filter((id) => !keep.includes(id)).slice(0, room);
  return { date: today, ids: [...keep, ...more], marks };
}

export const waiting = (pick) => pick.ids.filter((id) => !pick.marks[id]);
export const markPick = (pick, id, how) => ({ ...pick, marks: { ...pick.marks, [id]: how } });
export function unmarkPick(pick, id) {
  const marks = { ...pick.marks };
  delete marks[id];
  return { ...pick, marks };
}

// Where the stops sit on Today's arc (centre 40, 40, radius 34, in an 80 x 44
// box): spread evenly from 135 to 45 degrees, one at the top.
export function stops(n) {
  return Array.from({ length: n }, (_, i) => {
    const a = ((n === 1 ? 90 : 135 - (90 * i) / (n - 1)) * Math.PI) / 180;
    return { x: Math.round((40 + 34 * Math.cos(a)) * 10) / 10, y: Math.round((40 - 34 * Math.sin(a)) * 10) / 10 };
  });
}
