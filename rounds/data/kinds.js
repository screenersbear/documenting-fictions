// The seven kinds of move (rounds/NOTES.md), in the order Today takes them
// when more are due than fit: a thank you while it's fresh first, a pitch
// last. Each has its name, its colour pair (the move's colour, then its
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
  hello: kind('Say hello', '#13803F', '#FFD100', 'rise', "Great meeting you at [where]! I'd love to work together sometime."),
  checkin: kind('Check in', '#0A4FD6', '#FFAFAB', 'ring', "Hey [name], it's been a minute. Want to plan the next one?"),
  intros: kind('Ask for intros', '#CC2E8A', '#E2E600', 'dots', "Hi [name]! Hope you've been well since the session. I'm adding more people to my portfolio who do work like yours. Is there anyone you'd be happy to put me in touch with? No pressure at all."),
  refresh: kind('Refresh offer', '#CC2E8A', '#E2E600', 'dots', "It's been a while since your session. I'm offering past clients [offer]."),
  followup: kind('Follow up', '#FF8A3D', '#313D45', 'tag', 'Just following up on my note from [when]. Happy to send ideas.'),
  pitch: kind('Pitch', '#FF8A3D', '#313D45', 'tag', "Hi [name], I'm a portrait photographer in [city]. I'd love to make some pictures with you. Could I send a few ideas?"),
};
export const KIND_KEYS = Object.keys(KINDS);
// The order Messages lists them in (as 05-messages).
export const MESSAGE_ORDER = ['thanks', 'hello', 'checkin', 'refresh', 'intros', 'pitch', 'followup'];

export const isKind = (key) => KIND_KEYS.includes(key);

// A kind from how a person (or a file) writes it: "Say hello", "ask for intros", "checkin".
export function kindFromName(text) {
  const t = String(text ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  return KIND_KEYS.find((k) => KINDS[k].name.toLowerCase() === t || k === t.replace(/ /g, '')) || null;
}

// A kind's mark as an svg, size px square, in its mark colour.
export function markSvg(key, size) {
  const k = KINDS[key];
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${k.fg}" aria-hidden="true">${MARKS[k.mark]}</svg>`;
}
