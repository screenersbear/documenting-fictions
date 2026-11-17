// When the day's cards are all done (rounds/13, 16 Nov): who's next, as one
// dim line under "That's today.": "Next up tomorrow: a check-in with Ana L."
// or, with nothing in the coming week, "Nothing due this week." The next
// one is the first move to come up after today (work days and days off
// counted, data/work-days.js), the most timely kind first, as Today picks.
import { addDays, later, daysBetween, dueWords } from './dates.js';
import { whenDue } from './work-days.js';
import { KIND_KEYS } from './kinds.js';

// [who] is their name as Rounds has it.
const NEXT = {
  thanks: 'a thank-you to [who]', yes: 'a thank-you for the yes to [who]', photos: 'telling [who] the photos are up',
  hello: 'a hello to [who]', checkin: 'a check-in with [who]', intros: 'asking [who] for intros',
  refresh: 'a refresh offer to [who]', followup: 'a follow-up with [who]', pitch: 'a pitch to [who]',
};
const YEAR = 'a final for [who], a year on';
export const NOTHING_SOON = 'Nothing due this week.';
const rank = (k) => KIND_KEYS.indexOf(k);

// The first move after today: { person, day }, or null.
export function nextUp(people, week, today) {
  const from = addDays(today, 1);
  const list = people.filter((p) => !p.letGo && p.next).map((p) => ({ person: p, day: later(whenDue(p.next, week, from), from) }));
  list.sort((a, b) => a.day.localeCompare(b.day) || rank(a.person.next.kind) - rank(b.person.next.kind)
    || a.person.next.due.localeCompare(b.person.next.due) || a.person.name.localeCompare(b.person.name));
  return list[0] || null;
}

export function nextUpWords(people, week, today) {
  const up = nextUp(people, week, today);
  if (!up || daysBetween(today, up.day) >= 7) return NOTHING_SOON;
  const { kind, year } = up.person.next;
  const what = (year ? YEAR : NEXT[kind] || 'a move with [who]').replace('[who]', up.person.name);
  return `Next up ${dueWords(up.day, today).replace('Tomorrow', 'tomorrow')}: ${what}${what.endsWith('.') ? '' : '.'}`;
}
