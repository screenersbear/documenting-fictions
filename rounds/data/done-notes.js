// How a move was done, and a note with it (round 2, thanks/02 and 03).
// Right after DONE a small sheet asks HOW (Text, Instagram, Email, In
// person) and for A NOTE (OPTIONAL); both are kept on the move's line in
// the log, which syncs in rounds.json. A note can also stand on its own
// (ADD A NOTE on the person page: a call, a text, in person, an email, or
// nothing), as a line of kind 'note'. DONE SO FAR lists them all, newest
// first: what was done and how ("Said thanks", "by text"), and the note.
import { firstName } from './fill.js';

// HOW, after a move: the chips, in order.
export const HOWS = { text: 'Text', instagram: 'Instagram', email: 'Email', person: 'In person' };
// What a note on its own was: the chips, in order ('' is nothing).
export const NOTE_HOWS = { call: 'A call', text: 'A text', person: 'In person', email: 'An email' };
// What a note can be kept as: those, and Instagram, which only The Eye's
// selects reminder sends (16 Nov), so it has no chip.
export const NOTE_HOWS_KEPT = { ...NOTE_HOWS, instagram: 'Instagram' };
export const NOTE_KIND = 'note';
// How, as DONE SO FAR says it after what was done: "Said thanks · by text", "Note · a call".
const HOW_WORDS = { text: 'by text', instagram: 'on Instagram', email: 'by email', person: 'in person' };
const NOTE_WORDS = { call: 'a call', text: 'a text', person: 'in person', email: 'an email', instagram: 'on Instagram' };
export const howWords = (line) => ((line.kind === NOTE_KIND ? NOTE_WORDS : HOW_WORDS)[line.how] || '');
const MOST = 500; // letters in a note
// The chips as other notebooks show them (the person page, shared/data/asks.js): [key, label, words].
export const HOW_CHOICES = {
  move: Object.keys(HOWS).map((k) => [k, HOWS[k], HOW_WORDS[k]]),
  note: Object.keys(NOTE_HOWS).map((k) => [k, NOTE_HOWS[k], NOTE_WORDS[k]]),
};

// What was done, by the move's kind. [who] is their first name.
const WHAT = {
  thanks: 'Said thanks', yes: 'Said thanks for the yes', photos: 'Told [who] the photos were up',
  hello: 'Said hello', checkin: 'Checked in', intros: 'Asked [who] for intros',
  refresh: 'Offered [who] a refresh', followup: 'Followed up', pitch: 'Pitched [who]',
};
const YEAR = 'Sent a final, a year on';
const ANSWERED = { yes: '[who] said yes', no: '[who] said not now' };

// The how picked already when you came back from the move's button: where
// COPY AND OPEN went (data/contact.js contactFor's how), or Gmail.
export function howFromGo(went) {
  const w = String(went ?? '').toLowerCase();
  if (w === 'instagram') return 'instagram';
  if (w === 'email' || w === 'gmail') return 'email';
  return '';
}

export const cleanNote = (v) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, MOST);

// The quick taps under the note, for this person.
export const quickTaps = (name) => [`${firstName(name) || 'They'} reached out first`, 'Wants to shoot again', 'No reply yet'];

// A quick tap added to the note as a sentence of its own (once).
export function addTap(note, tap) {
  const n = String(note ?? '').trim();
  if (n.toLowerCase().includes(tap.toLowerCase())) return n;
  if (!n) return `${tap}.`;
  return `${n}${/[.!?]$/.test(n) ? '' : '.'} ${tap}.`;
}

// A line of the log with its how and note (and what you said, from the
// move's box) as given: an empty one is left off, an unknown how too.
export function withHowNote(line, { how, note, said } = {}, hows = HOWS) {
  const out = { ...line };
  for (const k of ['how', 'note', 'said']) delete out[k];
  if (how && hows[how]) out.how = how;
  const n = cleanNote(note);
  if (n) out.note = n;
  const s = String(said ?? '').trim();
  if (s) out.said = s;
  return out;
}

// A note on its own, for the log.
export const noteLine = (personId, day, { how, note }, id, at) => withHowNote({ id, at, personId, kind: NOTE_KIND, day }, { how, note }, NOTE_HOWS_KEPT);

// DONE SO FAR: each move done with them (and each note), newest first,
// as { id, day, look (the move's kind for its mark, or 'note'), what, how
// (its key), howWords, note, noteOnly }, and their answer to a pitch (no id).
export function doneSoFar(person, lines = []) {
  const fill = (s) => s.replace('[who]', firstName(person.name) || 'them');
  const rows = lines.filter((l) => l.personId === person.id && l.day && (WHAT[l.kind] || l.kind === NOTE_KIND)).map((l) => ({
    id: l.id, day: l.day, at: l.at || 0,
    look: l.kind === NOTE_KIND ? 'note' : l.year ? 'photos' : l.kind,
    what: l.kind === NOTE_KIND ? 'Note' : l.year ? YEAR : fill(WHAT[l.kind]),
    how: l.how || '', howWords: howWords(l), note: l.note || '', noteOnly: l.kind === NOTE_KIND,
  }));
  const pitch = person.pitch || {};
  if (ANSWERED[pitch.answer] && pitch.on) rows.push({ id: '', day: pitch.on, at: Infinity, look: 'pitch', what: fill(ANSWERED[pitch.answer]).replace(/^them/, 'They'), how: '', howWords: '', note: '', noteOnly: false });
  return rows.sort((a, b) => b.day.localeCompare(a.day) || b.at - a.at).map(({ at, ...r }) => r);
}
