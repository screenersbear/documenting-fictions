// What Rounds tells the shelf is waiting (round 2, connect/16 and 17): the
// cards that come up each day, so the shelf's ! shows over Rounds on a day
// with cards even before Rounds is opened that day. Today's are the cards
// still to do; each day after, the cards it would bring if nothing changed.
// Written for the shelf with DFWaiting.publishWaiting (data/waiting.js in
// the suite's shared files); the shelf shows today's.
import { pickFor, waiting } from './today.js';
import { addDays } from './dates.js';
import { moveName } from './kinds.js';

export const DAYS_AHEAD = 14;

// [{ title (who), line (the move), from, until (that day), params (Today) }].
export function shelfItems(people, saved, today, perDay, week, days = DAYS_AHEAD) {
  const byId = new Map(people.map((p) => [p.id, p]));
  const items = [];
  for (let n = 0; n < days; n++) {
    const day = addDays(today, n);
    const pick = pickFor(people, n === 0 ? saved : null, day, perDay, week);
    for (const id of waiting(pick)) {
      const p = byId.get(id);
      items.push({ title: p.name, line: moveName(p.next), from: day, until: day, params: { at: 'today' } });
    }
  }
  return items;
}
