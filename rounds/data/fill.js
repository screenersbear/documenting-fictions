// A starter message, filled in for one person (rounds/NOTES.md, Messages):
// [name], [where], [offer], [brand], [when] and [city]. A blank with nothing
// to fill it stays as it is, to be written in by hand before sending.
import { whenWords } from './dates.js';

export const FILLS = ['name', 'where', 'offer', 'brand', 'when', 'city'];
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
  };
}

export function fill(text, values) {
  return String(text ?? '').replace(/\[(\w+)\]/g, (all, key) => {
    const k = key.toLowerCase();
    return FILLS.includes(k) && values[k] ? values[k] : all;
  });
}
