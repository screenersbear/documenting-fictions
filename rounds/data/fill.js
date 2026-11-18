// A starter message, filled in for one person (rounds/NOTES.md, Messages):
// [name], [where], [offer], [brand], [when], [city] and [shoot] (the shoot a
// post from Layouts came from, for Your photos are up, or the one a year
// since, for A year since). A blank with nothing
// to fill it stays as it is, to be written in by hand before sending.
import { whenWords } from './dates.js';

export const FILLS = ['name', 'where', 'offer', 'brand', 'when', 'city', 'shoot'];
export const firstName = (name) => String(name ?? '').trim().split(/\s+/)[0];

// What each blank stands for. me: the user's own words (their offer and city).
// A prospect is usually a business, so [name] is all of it.
export function fillValues(person, me, today) {
  const whole = String(person.name ?? '').trim();
  return {
    name: person.group === 'prospect' ? whole : firstName(whole),
    where: person.where || '',
    offer: me.offer || '',
    brand: whole,
    when: person.lastMove ? whenWords(person.lastMove, today) : '',
    city: me.city || '',
    shoot: (person.next && (person.next.shoot || (person.next.year && person.next.year.shoot))) || '',
  };
}

export function fill(text, values) {
  return String(text ?? '').replace(/\[(\w+)\]/g, (all, key) => {
    const k = key.toLowerCase();
    return FILLS.includes(k) && values[k] ? values[k] : all;
  });
}

// Back the other way (rounds/14, 18 Nov): a message changed for one person,
// saved as the starter for next time, their details turned back into
// blanks wherever they appear. The longest first (their whole name before
// their first name); two blanks with the same words (a prospect's name and
// brand) take the one the message had. Whole words only ("Al" stays in
// "Also"), and blanks already in the message stay as they are. had: the
// message as it was before, blanks and all.
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function unfill(text, values, had = '') {
  const used = (k) => new RegExp(`\\[${k}\\]`, 'i').test(had);
  const words = (k) => String(values[k] ?? '').trim();
  const keys = FILLS.filter(words).sort((a, b) => words(b).length - words(a).length || used(b) - used(a));
  const seen = new Set();
  let out = String(text ?? '');
  for (const k of keys) {
    const v = words(k).toLowerCase();
    if (seen.has(v)) continue;
    seen.add(v);
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(words(k))}(?![\\p{L}\\p{N}])`, 'giu');
    out = out.split(/(\[\w+\])/).map((part, i) => (i % 2 ? part : part.replace(re, `[${k}]`))).join('');
  }
  return out;
}
