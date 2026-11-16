// A year since (round 2, connect/12). A year after a shoot in The Eye was
// delivered, its Regulars and Clients get one move, A YEAR SINCE: a Check
// in, with the shoot's name for its reason ("A year since Rooftop
// portraits. Send June one of the finals.") and one of its finals ready to
// share with the message (pages/move.js). Once per shoot. It counts toward
// Today's limit like any move, and stands in for the move they had next,
// which comes back once it's done (data/plan.js afterDone). Coming late
// (Rounds wasn't opened on the day), it still comes for a month; a shoot
// older than that is passed by. Rounds only reads The Eye's shoots.
import { move, inGroup } from './plan.js';
import { isDay, dayOf, dateOf, daysBetween } from './dates.js';

export const LATE = 30; // days after the day it can still come
export const YEAR_GROUPS = ['regular', 'client'];

// The day a year on (28 Feb for 29 Feb, in a year without one).
export function yearAfter(day) {
  const d = dateOf(day);
  const on = new Date(d.getFullYear() + 1, d.getMonth(), d.getDate());
  return dayOf(on.getMonth() === d.getMonth() ? on : new Date(d.getFullYear() + 1, d.getMonth() + 1, 0));
}

// The delivered shoots whose year came today, or up to a month ago, and
// haven't had their move (seen: their ids), oldest first.
export function yearsDue(shoots, today, seen = []) {
  return (shoots || [])
    .filter((s) => s && s.id && s.status === 'delivered' && isDay(s.date) && !seen.includes(s.id))
    .filter((s) => { const gap = daysBetween(yearAfter(s.date), today); return gap >= 0 && gap <= LATE; })
    .sort((a, b) => a.date.localeCompare(b.date));
}

// The person with A YEAR SINCE next. The move they had comes back after it
// (another A YEAR SINCE gives back what it stood in for).
export function yearSince(person, shoot, today) {
  const had = person.next;
  const then = had && had.year ? had.then || null : had || null;
  const title = String(shoot.title ?? '').trim();
  return { ...person, next: { ...move('checkin', today), year: { shootId: shoot.id, shoot: title }, ...(then ? { then } : {}) } };
}

// The shoots due, taken: { changed (each person once, as they are after
// every shoot), seen (seen, with the shoots taken) }. Only the shoot's
// Regulars and Clients; anyone let go is left alone.
export function takeYears(people, shoots, today, seen = []) {
  const now = new Map(people.map((p) => [p.id, p]));
  const changed = new Map();
  const due = yearsDue(shoots, today, seen);
  for (const s of due) {
    for (const p of [...now.values()].filter((x) => !x.letGo && YEAR_GROUPS.some((g) => inGroup(x, g)) && (x.shoots || []).includes(s.id))) {
      const q = yearSince(p, s, today);
      now.set(p.id, q);
      changed.set(p.id, q);
    }
  }
  return { changed: [...changed.values()], seen: [...seen, ...due.map((s) => s.id)] };
}
