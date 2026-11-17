// ONE-TIME (see data/callback-read.js): Starky's Callback people into
// Rounds. Who's new and who Rounds has already (the same Instagram handle,
// or the same name): their history goes on them, never a second copy, and
// close spellings get People's merge suggestion (data/look-alike.js). Then
// the people and the lines of the log to save. Touchpoints are moments (or
// notes) on their own days that count as keeping in touch, but don't move
// anyone's next move: only Callback's next touchpoint sets that, as a Check
// in due that day.
import { findMatch } from './match.js';
import { newPerson } from './person.js';
import { firstMove, move } from './plan.js';
import { addDays, later } from './dates.js';
import { momentLine } from './moments.js';
import { noteLine } from './done-notes.js';
import { pieces } from './callback-read.js';

// A touchpoint's line in the log, the same each time, so nothing comes in twice.
const lineId = (t) => `cb-${t.id}`;
// How many of Callback's touchpoints (not its notes) an item brings.
export const touchCount = (item) => item.touches.filter((t) => !t.fromNotes).length;

// entries: readCallback's people. people: Rounds'. lines: the moves log.
// { items: [{ row, to (who Rounds has, or null), letGo, nextDay, touches
// (those not in the log yet, and their notes) }], skipped (in Rounds
// already, with nothing new) }. Two of Callback's that are one person
// come in as one.
export function bringPlan(entries, people, lines) {
  const inLog = new Set(lines.map((l) => l.id));
  const items = [];
  let skipped = 0;
  for (const e of entries) {
    const touches = [...e.touches, ...(e.notes ? [e.notes] : [])].filter((t) => !inLog.has(lineId(t)));
    const to = findMatch(people, e.row);
    const same = to ? null : items.find((i) => !i.to && findMatch([i.row], e.row));
    if (same) same.touches.push(...touches);
    else if (to && !touches.length) skipped++;
    else items.push({ row: e.row, to, letGo: e.letGo, nextDay: e.nextDay, touches });
  }
  return { items, skipped };
}

// Under each name on the tick list (and Let go for someone Parked in Callback).
export function fromWords(item) {
  const n = touchCount(item);
  if (!item.to) return `${n === 1 ? '1 touchpoint' : `${n || 'No'} touchpoints`}${item.letGo ? ' · Let go' : ''}`;
  if (!n) return 'In Rounds already: a note goes on their page';
  return `In Rounds already: ${n === 1 ? '1 touchpoint goes' : `${n} touchpoints go`} on their page`;
}

// One touchpoint's lines: a moment (or note), and the rest of a note too
// long for one line as notes on the same day.
function linesOf(t, personId, day, at, wasLast) {
  const [first = '', ...more] = pieces(t.note);
  const id = lineId(t);
  const head = t.kind === 'note' ? noteLine(personId, day, { note: first }, id, at) : { ...momentLine(personId, { what: t.what, day, note: first }, id, at), wasLast };
  return [head, ...more.map((note, i) => noteLine(personId, day, { note }, `${id}-${i + 2}`, at + i + 1))];
}

// The ticked items: { people (new, and those Rounds had whose last move
// changed), lines }. New people with no next touchpoint start with their
// group's first move, a few a day (perDay), as an import's do.
export function bring(items, today, perDay, makeId, now) {
  const out = new Map();
  const lines = [];
  let spread = 0;
  for (const i of items) {
    let p = i.to && (out.get(i.to.id) || i.to);
    if (!p) {
      const next = i.nextDay ? move('checkin', i.nextDay) : firstMove(i.row.group, addDays(today, Math.floor(spread++ / perDay)));
      p = { ...newPerson({ ...i.row, id: makeId(), source: 'import', next }, today), letGo: !!i.letGo };
    }
    const wasLast = i.to ? i.to.lastMove || '' : '';
    let last = p.lastMove || '';
    for (const t of i.touches) {
      const day = t.day || today;
      lines.push(...linesOf(t, p.id, day, t.at || now, wasLast));
      if (t.kind === 'moment' && day <= today) last = later(last, day);
    }
    out.set(p.id, { ...p, lastMove: last });
  }
  return { people: [...out.values()], lines };
}
