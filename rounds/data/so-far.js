// SO FAR on a person's page (round 2, thanks/06, 16 Nov): everything done
// with them, newest first. The moves done, with how and the note ("Said
// thanks · by text"), their answer to a pitch, notes on their own, moments
// (data/moments.js), and their shoots in The Eye ("Shot in The Eye."). Each
// row is { id (its line in the log, '' when it isn't one), day, kind
// ('move', 'answer', 'note', 'moment' or 'shoot'), look (a move's kind, for
// its mark), mark (a notebook's own mark instead: 'rounds' for notes and
// moments, 'the-eye' for shoots), what, how, howWords, note, noteOnly }.
// Rounds tells the one list of people the same rows (people-out.js), and
// the person page on the shelf shows the latest.
import { firstName } from './fill.js';
import { howWords, NOTE_KIND } from './done-notes.js';
import { MOMENT_KIND, momentWhat } from './moments.js';
import { isDay } from './dates.js';

// What was done, by the move's kind. [who] is their first name.
const WHAT = {
  thanks: 'Said thanks', yes: 'Said thanks for the yes', photos: 'Told [who] the photos were up',
  hello: 'Said hello', checkin: 'Checked in', intros: 'Asked [who] for intros',
  refresh: 'Offered [who] a refresh', followup: 'Followed up', pitch: 'Pitched [who]', other: 'Reached out',
};
const YEAR = 'Sent a final, a year on';
const ANSWERED = { yes: '[who] said yes', no: '[who] said not now' };
const SHOT = 'Shot in The Eye.';

const row = (o) => ({ id: '', at: 0, look: '', mark: '', how: '', howWords: '', note: '', noteOnly: false, ...o });

function lineRow(l, fill, name) {
  if (l.kind === NOTE_KIND) return row({ id: l.id, day: l.day, at: l.at || 0, kind: 'note', look: 'note', mark: 'rounds', what: 'Note', how: l.how || '', howWords: howWords(l), note: l.note || '', noteOnly: true });
  if (l.kind === MOMENT_KIND) return row({ id: l.id, day: l.day, at: l.at || 0, kind: 'moment', look: 'moment', mark: 'rounds', what: momentWhat(l.what, name), how: l.what || 'other', note: l.note || '' });
  return row({ id: l.id, day: l.day, at: l.at || 0, kind: 'move', look: l.year ? 'photos' : l.kind, what: l.year ? YEAR : fill(WHAT[l.kind]), how: l.how || '', howWords: howWords(l), note: l.note || '' });
}

// What a line of the log says was done ("Checked in", "Sent photos"), for
// People's last thing and Reach out to (data/people-find.js).
export const whatDone = (l, name) => lineRow(l, (s) => s.replace('[who]', firstName(name) || 'them'), name).what;

// person: as Rounds keeps them; lines: the moves log; shoots: The Eye's
// (data/eye.js eyeShoots), for theirs.
export function doneSoFar(person, lines = [], shoots = []) {
  const fill = (s) => s.replace('[who]', firstName(person.name) || 'them');
  const rows = lines.filter((l) => l.personId === person.id && l.day && (WHAT[l.kind] || l.kind === NOTE_KIND || l.kind === MOMENT_KIND))
    .map((l) => lineRow(l, fill, person.name));
  const pitch = person.pitch || {};
  if (ANSWERED[pitch.answer] && pitch.on) rows.push(row({ day: pitch.on, at: Infinity, kind: 'answer', look: 'pitch', what: fill(ANSWERED[pitch.answer]).replace(/^them/, 'They') }));
  const theirs = new Set(person.shoots || []);
  for (const s of shoots || []) {
    if (s && theirs.has(s.id) && isDay(s.date)) rows.push(row({ day: s.date, at: -1, kind: 'shoot', look: 'shoot', mark: 'the-eye', what: s.title || 'A shoot', note: SHOT }));
  }
  return rows.sort((a, b) => b.day.localeCompare(a.day) || b.at - a.at).map(({ at, ...r }) => r);
}
