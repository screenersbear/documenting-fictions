// Finding people (Tightening Rounds, rounds/10 and 07, 16 Nov): SEARCH (a
// name, a handle, or words in their note), People's filter chips (All, Due,
// Regulars, Clients, New, Prospects: one at a time), SORT (A to Z, so no one
// sinks; Next move; Recently in touch), and the one dim line under each card:
// the last thing done when it was this past week ("Last: sent photos,
// today"), else when they're due ("Due Fri"). Reach out to lists the most
// recently in touch first, each with their group and the last thing done.
import { groupsOf, GROUPS } from './plan.js';
import { whenDue } from './work-days.js';
import { dueWords, whenWords, daysBetween } from './dates.js';
import { NOTE_KIND } from './done-notes.js';
import { whatDone } from './so-far.js';

// When the move's due, as the person page says it: Due today, Due tomorrow,
// Due Thursday, Due 2 Dec.
export function dueLine(next, week, today) {
  const w = dueWords(whenDue(next, week, today), today);
  return `Due ${w === 'Today' || w === 'Tomorrow' ? w.toLowerCase() : w}`;
}

// Lower case, no accents, no @: "José" and "jose", "@maya.rr" and "maya.rr".
const fold = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/^@/, '');
export function matches(p, q) {
  const t = fold(q);
  return !t || [p.name, p.instagram, p.tiktok, p.email, p.note, p.where].some((v) => fold(v).includes(t));
}

export const FILTERS = [['all', 'All'], ['due', 'Due'], ['regular', 'Regulars'], ['client', 'Clients'], ['new', 'New'], ['prospect', 'Prospects']];
// Due: their move is due today, or was before.
export const dueNow = (p, week, today) => !!(p.next && !p.letGo && whenDue(p.next, week, today) <= today);
export function inFilter(p, f, week, today) {
  if (f === 'due') return dueNow(p, week, today);
  return !GROUPS[f] || groupsOf(p).includes(f);
}

// Each person's last thing done (a move or a moment, not a note on its
// own), from the log: id -> line.
export function lastLines(lines) {
  const out = new Map();
  for (const l of lines) {
    if (!l.day || l.kind === NOTE_KIND) continue;
    const had = out.get(l.personId);
    if (!had || l.day > had.day || (l.day === had.day && (l.at || 0) > (had.at || 0))) out.set(l.personId, l);
  }
  return out;
}
// "sent photos, today", "checked in, 2 Oct".
export function lastWords(p, line, today) {
  const what = whatDone(line, p.name);
  return `${what[0].toLowerCase()}${what.slice(1)}, ${whenWords(line.day, today)}`;
}

export const SORTS = [['az', 'A to Z'], ['next', 'Next move'], ['recent', 'Recently in touch']];
const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
const byDay = (x, y) => (x < y ? -1 : x > y ? 1 : 0); // days as written ('~' after them all)
// last: lastLines' map.
export function sortPeople(list, sort, last, week, today) {
  const due = (p) => (p.next && !p.letGo ? whenDue(p.next, week, today) : '~');
  const when = (p) => last.get(p.id)?.day || '';
  const order = {
    next: (a, b) => byDay(due(a), due(b)) || byName(a, b),
    recent: (a, b) => byDay(when(b), when(a)) || byName(a, b),
  }[sort] || byName;
  return [...list].sort(order);
}

// The dim line under a card on People.
export function cardLine(p, line, week, today) {
  const lastly = line ? `Last: ${lastWords(p, line, today)}` : '';
  if (line && daysBetween(line.day, today) <= 7) return lastly;
  return p.next && !p.letGo ? dueLine(p.next, week, today) : lastly;
}
// A row on Reach out to: "Client · last: sent photos, 16 Nov".
export const pickLine = (p, line, today) => [GROUPS[p.group] || GROUPS.new, line ? `last: ${lastWords(p, line, today)}` : ''].filter(Boolean).join(' · ');
// + CONNECTION's SOMEONE NEW (20 Nov): its line under the words, with the
// name typed in the search ("Add "Rita"") or, with none, what it does.
export const newLine = (typed) => {
  const t = String(typed ?? '').trim();
  return t ? `Add "${t}"` : 'Add them, then write';
};
