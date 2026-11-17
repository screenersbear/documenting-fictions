// One sheet for any move (Tightening Rounds, rounds/08, 16 Nov): WHAT KIND
// (Check in, Say thanks, Say hello, Ask, Pitch, Other), preset from the card
// or their next move. The kind a pick logs is the due move's own when the
// pick is its chip (Say thanks for a yes is still that yes), else the chip's
// own (Ask is Ask for intros, Other is 'other'). A move that isn't their due
// move is an extra line ({ extra: true, keeps: true }): it leaves the due
// move as it is but counts as keeping in touch, as a moment does
// (data/moments.js afterMoment). Here too: what What you said (rounds/09) is
// titled, and what deleting a move puts back.
import { firstName } from './fill.js';
import { withHowNote } from './done-notes.js';
import { afterMoment, withoutMoment, MOMENT_KIND } from './moments.js';
import { undoDone } from './person.js';
import { OTHER } from './kinds.js';

// The chips, in order, and the kinds each one is.
export const KIND_CHIPS = [['checkin', 'Check in'], ['thanks', 'Say thanks'], ['hello', 'Say hello'], ['ask', 'Ask'], ['pitch', 'Pitch'], [OTHER, 'Other']];
const CHIP_KINDS = { checkin: ['checkin'], thanks: ['thanks', 'yes', 'photos'], hello: ['hello'], ask: ['intros', 'refresh'], pitch: ['pitch', 'followup'], other: [OTHER] };

// The chip a kind is under (a kind it doesn't know: Other).
export const chipOf = (kind) => Object.keys(CHIP_KINDS).find((c) => CHIP_KINDS[c].includes(kind)) || OTHER;
// The chip the sheet starts on: the card's move, their next move, or Check in.
export const startChip = (person) => (person.next && !person.letGo ? chipOf(person.next.kind) : 'checkin');
// Whether picking this chip does their due move.
export const doesDue = (person, chip) => !!(person.next && !person.letGo && (CHIP_KINDS[chip] || []).includes(person.next.kind));
// The kind a chip logs for this person.
export const kindFor = (person, chip) => (doesDue(person, chip) ? person.next.kind : (CHIP_KINDS[chip] || [OTHER])[0]);

// A move that isn't the due one, for the log, and the person after it
// (it counts as keeping in touch). fields: { said, how, note }.
export function extraMove(person, kind, day, fields, id, at) {
  const line = withHowNote({ id, at, personId: person.id, kind, day, extra: true, keeps: true }, fields);
  return afterMoment(person, line);
}

// What you said's title: "Checked in with Lindsey". [who] is their first
// name (their whole name in DONE TODAY's rows: data/done-rows.js).
export const WITH = {
  thanks: 'Said thanks to [who]', yes: 'Said thanks to [who] for the yes', photos: 'Told [who] the photos were up',
  hello: 'Said hello to [who]', checkin: 'Checked in with [who]', intros: 'Asked [who] for intros',
  refresh: 'Offered [who] a refresh', followup: 'Followed up with [who]', pitch: 'Pitched [who]', other: 'Reached out to [who]',
};
export const YEAR_WITH = 'Sent [who] a final, a year on';
export const withWhat = (line) => (line.year ? YEAR_WITH : WITH[line.kind] || WITH.other);
export const withWords = (line, name) => withWhat(line).replace('[who]', firstName(name) || 'them');

// A move deleted (lines: the whole log). An extra one takes back what it
// moved, as a moment does. The due move done last, today, is undone: it's
// due again (as Done today's Undo). Any other is only taken out of the log,
// their last move going back to the latest of the rest.
export function afterDelete(person, line, lines, today) {
  if (line.extra) return withoutMoment(person, line, lines);
  const mine = lines.filter((l) => l.personId === person.id && !l.extra && l.kind !== MOMENT_KIND && l.kind !== 'note');
  const last = mine.reduce((a, b) => ((b.at || 0) > (a.at || 0) ? b : a), mine[0] || line);
  if (line.day === today && last.id === line.id) return undoDone(person, line, lines);
  const rest = lines.filter((l) => l.personId === person.id && l.id !== line.id && l.day && (l.kind !== MOMENT_KIND || l.keeps)).map((l) => l.day);
  return { ...person, lastMove: rest.sort().pop() || '' };
}
// Whether deleting it brings their card back on Today (the due move undone).
export const undoesDue = (person, line, lines, today) => !line.extra && afterDelete(person, line, lines, today).next !== person.next;
