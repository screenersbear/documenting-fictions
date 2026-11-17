// Moments (round 2, thanks/05, 16 Nov): something done with someone outside
// the planned moves: sent photos, a call, ran into them. A moment is a line
// of kind 'moment' in the moves log ({ what, day, note, keeps }), so it
// syncs in rounds.json like a note. When it COUNTS AS KEEPING IN TOUCH (on
// unless switched off), their next Check in, and a Client's Refresh offer or
// Ask for intros, moves out from that day, so Rounds doesn't ask again too
// soon; a Pitch, a Follow up and the rest never move. The line keeps what it
// moved (moved: the due before and after, wasLast: the last move before),
// so deleting it puts things back.
import { addDays, later } from './dates.js';
import { GAP } from './plan.js';
import { cleanNote } from './done-notes.js';
import { firstName } from './fill.js';

export const MOMENT_KIND = 'moment';
// WHAT HAPPENED: the chips, in order. [who] is their first name (Rounds
// keeps no pronouns).
// Emailed came with Bring in from Callback (16 Nov), and stays.
export const MOMENTS = {
  photos: 'Sent photos', text: 'Texted', call: 'Called', email: 'Emailed', instagram: 'Messaged on Instagram',
  ran: 'Ran into [who]', met: 'Met up', comment: 'Commented on a post', other: 'Other',
};
// How far out each move goes from the moment's day; the others stay.
const MOVES_OUT = { checkin: GAP.checkin, refresh: GAP.client, intros: GAP.client };
const NEXT_WORDS = { checkin: 'next check-in', refresh: 'next refresh offer', intros: 'next ask for intros' };

// With their whole name, for DONE TODAY's rows on Today (data/done-rows.js).
export const MOMENT_WITH = {
  photos: 'Sent photos to [who]', text: 'Texted [who]', call: 'Called [who]', email: 'Emailed [who]', instagram: 'Messaged [who] on Instagram',
  ran: 'Ran into [who]', met: 'Met up with [who]', comment: "Commented on [who]'s post", other: 'A moment with [who]',
};

const who = (s, name) => s.replace('[who]', firstName(name) || 'them');
// The chips for this person, and what a row says for each: [key, chip, row].
export const momentChoices = (name) => Object.keys(MOMENTS).map((k) => [k, who(MOMENTS[k], name), k === 'other' ? 'A moment' : who(MOMENTS[k], name)]);
// What a moment's row says: "Sent photos", "Ran into June", "A moment".
export const momentWhat = (what, name) => (MOMENTS[what] && what !== 'other' ? who(MOMENTS[what], name) : 'A moment');

// The line for the log, as given (an unknown pick is Other).
export function momentLine(personId, { what, day, note, keeps = true }, id, at) {
  const line = { id, at, personId, kind: MOMENT_KIND, day, what: MOMENTS[what] ? what : 'other', keeps: keeps !== false };
  const n = cleanNote(note);
  if (n) line.note = n;
  return line;
}

// The person after a moment (the line from momentLine), and the line with
// what it moved. One that doesn't count leaves them as they were.
export function afterMoment(person, line) {
  if (!line.keeps) return { person, line };
  const out = { ...person, lastMove: later(person.lastMove || '', line.day) };
  const kept = { ...line, wasLast: person.lastMove || '' };
  const next = person.next;
  if (next && !person.letGo && MOVES_OUT[next.kind]) {
    const due = later(next.due, addDays(line.day, MOVES_OUT[next.kind]));
    if (due !== next.due) {
      out.next = { ...next, due };
      kept.moved = { from: next.due, to: due };
    }
  }
  return { person: out, line: kept };
}

// The person with a moment taken back out (lines: the rest of the log). Its
// move comes back in, unless it's been done or moved since; their last move
// goes back to the latest of what it was and their other lines that count.
export function withoutMoment(person, line, lines = []) {
  const out = { ...person };
  const m = line.moved;
  if (m && person.next && person.next.due === m.to) out.next = { ...person.next, due: m.from };
  if (line.keeps && person.lastMove === line.day) {
    const counts = (l) => l.personId === person.id && l.id !== line.id && l.day && (l.kind !== MOMENT_KIND || l.keeps);
    out.lastMove = [line.wasLast || '', ...lines.filter(counts).map((l) => l.day)].sort().pop();
  }
  return out;
}

// Under COUNTS AS KEEPING IN TOUCH: what it does for this person.
export function keepWords(person, day, today) {
  const whose = firstName(person.name) ? `${firstName(person.name)}'s` : 'Their';
  const when = day === today ? 'today' : 'that day';
  const next = person.next && !person.letGo ? person.next : null;
  if (next && NEXT_WORDS[next.kind]) return `${whose} ${NEXT_WORDS[next.kind]} moves out from ${when}.`;
  return next ? `${whose} next move stays as it is.` : 'Counts as the last time you were in touch.';
}

