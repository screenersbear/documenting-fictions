// How a move was done, and a note with it (round 2, thanks/02 and 03).
// Right after DONE a small sheet asks HOW (Text, Instagram, Email, In
// person) and for A NOTE (OPTIONAL); both are kept on the move's line in
// the log, which syncs in rounds.json. A note can also stand on its own
// (ADD A NOTE on the person page: a call, a text, in person, an email, or
// nothing), as a line of kind 'note'. SO FAR on their page lists them
// (data/so-far.js).
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
export const NOTE_MOST = 500; // letters in a note
// The chips as other notebooks show them (the person page, shared/data/asks.js): [key, label, words].
export const HOW_CHOICES = {
  move: Object.keys(HOWS).map((k) => [k, HOWS[k], HOW_WORDS[k]]),
  note: Object.keys(NOTE_HOWS).map((k) => [k, NOTE_HOWS[k], NOTE_WORDS[k]]),
};

// The how picked already when you came back from the move's button: where
// COPY AND OPEN went (data/contact.js contactFor's how), or Gmail.
export function howFromGo(went) {
  const w = String(went ?? '').toLowerCase();
  if (w === 'instagram') return 'instagram';
  if (w === 'email' || w === 'gmail') return 'email';
  return '';
}

export const cleanNote = (v) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, NOTE_MOST);

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
