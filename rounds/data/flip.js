// Flipping through Today's cards (rounds/NOTES.md, 18 Nov; Starky: "just
// so you can see what's on"). A swipe left shows the next card, right the
// one before; the card stays in the stack (the last one leads round to the
// first) and nothing is marked done. left: the ids still waiting, in order;
// at: where the one in front is among them (0 = the first, not flipping).

export const fresh = (day = '') => ({ day, id: '', at: 0 });

// Where the front is now. Its card gone (done, or LATER), the one after it
// comes up (after the last, the first); on another day it starts again at
// the first.
export function frontAt(left, flip, day) {
  if (!flip || flip.day !== day) return 0;
  const i = left.indexOf(flip.id);
  if (i >= 0) return i;
  return flip.at < left.length ? flip.at : 0;
}

// dir 1: the next card; -1: the one before.
export function flipTo(left, at, dir, day) {
  const n = left.length;
  const to = n ? (((at + dir) % n) + n) % n : 0;
  return { day, id: left[to] || '', at: to };
}

// The cards in the order the stack shows them: the front one first.
export const inFront = (list, at) => [...list.slice(at), ...list.slice(0, at)];

// The count while flipping (rounds/NOTES.md): the front card's place among
// the day's ("2 of 3"); null when not flipping, for the usual words.
export function flipWords(ids, left, at) {
  return at ? `${ids.indexOf(left[at]) + 1} of ${ids.length}` : null;
}
