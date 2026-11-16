// The nine kinds of move (rounds/NOTES.md), in the order Today takes them
// when more are due than fit: a thank you while it's fresh first, a pitch
// last. Two are thank-yous of their own (round 2, connect): for a yes to a
// shoot, and "Your photos are up" when a post from Layouts tags them.
// Each has its name, its colour pair (the move's colour, then its
// mark's) and its mark, drawn in a 24 x 24 box from the suite's shapes
// (DESIGN.md 6), and the starter message Rounds ships with (05-messages).
export const MARKS = {
  sun: '<circle cx="12" cy="12" r="12"/>',
  rise: '<path d="M0 24 A12 12 0 0 1 24 24 Z"/>',
  ring: '<path fill-rule="evenodd" d="M12 0a12 12 0 1 0 0 24a12 12 0 1 0 0-24zm0 6a6 6 0 1 1 0 12a6 6 0 1 1 0-12z"/>',
  dots: '<circle cx="6" cy="6" r="6"/><circle cx="18" cy="18" r="6"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>',
  tag: '<path d="M0 4h16l8 8-8 8H0z"/>',
};

const kind = (name, bg, fg, mark, starter) => ({ name, bg, fg, mark, starter });
export const KINDS = {
  thanks: kind('Say thanks', '#FFD100', '#313D45', 'sun', 'Thank you for today, [name]! It was so good working with you.'),
  yes: kind('Say thanks for the yes', '#FFD100', '#313D45', 'sun', "Thank you for the yes, [name]! I can't wait. I'll send a few ideas for the shoot soon."),
  photos: kind('Your photos are up', '#FFD100', '#313D45', 'sun', 'The [shoot] set is up. Thank you again, feel free to share it.'),
  hello: kind('Say hello', '#13803F', '#FFD100', 'rise', "Great meeting you at [where]! I'd love to work together sometime."),
  checkin: kind('Check in', '#0A4FD6', '#FFAFAB', 'ring', "Hey [name], it's been a minute. Want to plan the next one?"),
  intros: kind('Ask for intros', '#CC2E8A', '#E2E600', 'dots', "Hi [name]! Hope you've been well since the session. I'm adding more people to my portfolio who do work like yours. Is there anyone you'd be happy to put me in touch with? No pressure at all."),
  refresh: kind('Refresh offer', '#CC2E8A', '#E2E600', 'dots', "It's been a while since your session. I'm offering past clients [offer]."),
  followup: kind('Follow up', '#FF8A3D', '#313D45', 'tag', 'Just following up on my note from [when]. Happy to send ideas.'),
  pitch: kind('Pitch', '#FF8A3D', '#313D45', 'tag', "Hi [name], I'm a portrait photographer in [city]. I'd love to make some pictures with you. Could I send a few ideas?"),
};
export const KIND_KEYS = Object.keys(KINDS);
// A move logged as Other on the one sheet (Tightening Rounds, 16 Nov:
// data/one-move.js). Rounds never plans one, so it isn't in KINDS, but it's
// drawn like the rest: a quiet grey, the tag mark. lookOf: any kind's look.
export const OTHER = 'other';
export const OTHER_LOOK = kind('Other', '#C8CBCA', '#313D45', 'tag', '');
export const lookOf = (key) => KINDS[key] || OTHER_LOOK;
// The order Messages lists them in (as 05-messages).
export const MESSAGE_ORDER = ['thanks', 'yes', 'photos', 'hello', 'checkin', 'refresh', 'intros', 'pitch', 'followup'];

export const isKind = (key) => KIND_KEYS.includes(key);

// What a kind's message is called, for USE YOUR THANK-YOU MESSAGE (thanks/04).
const MESSAGE_WORDS = { thanks: 'thank-you', yes: 'thank-you', photos: 'photos are up', hello: 'hello', checkin: 'check-in', intros: 'intros', refresh: 'refresh', followup: 'follow-up', pitch: 'pitch' };
export const messageWord = (key) => MESSAGE_WORDS[key] || 'own';

// A YEAR SINCE a shoot (round 2, connect/12; data/year-since.js) is a Check
// in with the shoot on it (next.year). Its tag says A year since, and it's
// drawn in the thank-yous' mango and sun, as its mockup has it. Every place
// that names or draws a move (or a done move's line) asks these.
export const YEAR_NAME = 'A year since';
export const moveName = (m) => (m.year ? YEAR_NAME : lookOf(m.kind).name);
export const moveLook = (m) => (m.year ? 'photos' : m.kind);

// A kind from how a person (or a file) writes it: "Say hello", "ask for intros", "checkin".
export function kindFromName(text) {
  const t = String(text ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  return KIND_KEYS.find((k) => KINDS[k].name.toLowerCase() === t || k === t.replace(/ /g, '')) || null;
}

// A kind's mark as an svg, size px square, in its mark colour.
export function markSvg(key, size) {
  const k = lookOf(key);
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${k.fg}" aria-hidden="true">${MARKS[k.mark]}</svg>`;
}
