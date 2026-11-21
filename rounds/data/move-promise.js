// A promise made with a connection (21 Nov, as Callback's log sheet:
// "Anything promised?"). It's one of the person's promises (data/promises.js)
// with the move it was made with (moveId). Their page shows it beside that
// move with a tick; editing the move changes it, ticks it kept, unticks it
// (open again) or, with its words cleared, takes it off. KEPT IT on one of
// yours can log a connection too: the promise closed by that move (keptBy).
// Only words and lists (unit tested: tests/unit/rounds/move-promise.test.mjs).
import { newPromise, promisesOf, changePromise, keepPromise, openAgain } from './promises.js';
import { firstName } from './fill.js';

// The promise made with this move, or null.
export const promiseFor = (person, moveId) => (moveId ? promisesOf(person).find((x) => x.moveId === moveId) || null : null);

// Kept, as the tick shows it (a promise let go is unticked).
export const isKept = (x) => !!x && !x.open && x.outcome === 'kept';

// The person without the promise with this id (as they were when there's none).
export function withoutPromise(person, id) {
  const list = promisesOf(person);
  return list.some((x) => x.id === id) ? { ...person, promises: list.filter((x) => x.id !== id) } : person;
}

// Kept or unticked: closed as kept today (kept already: as it was), or open again.
function ticked(person, x, kept, today) {
  if (kept && !isKept(x)) return keepPromise(person, x.id, today);
  if (!kept && isKept(x)) return openAgain(person, x.id);
  return person;
}

// The person once the move's promise is as the sheet says. entry:
// { what, mine, due, kept } (null or no words: none, so the one made with it
// goes). makeId() gives a new one its id. Unchanged, the same person.
export function withMovePromise(person, moveId, entry, makeId, today) {
  if (!moveId) return person;
  const had = promiseFor(person, moveId);
  const made = entry ? newPromise(entry, had ? had.id : makeId(), today) : null;
  if (!made) return had ? withoutPromise(person, had.id) : person;
  if (!had) return ticked({ ...person, promises: [...promisesOf(person), { ...made, moveId }] }, { ...made, moveId }, !!entry.kept, today);
  const same = had.what === made.what && had.mine === made.mine && had.due === made.due;
  const now = same ? person : changePromise(person, had.id, { what: made.what, mine: made.mine, due: made.due });
  return ticked(now, had, !!entry.kept, today);
}

// KEPT IT, logged: the promise closed by the move (moveId) that kept it.
export const keptBy = (person, id, moveId, today) => changePromise(person, id, { open: false, outcome: 'kept', closed: today, keptBy: moveId });

// Beside the move on their page: "You promised: Send the selects", or
// "June promised: Intro to Dev".
export const promiseWho = (x, name) => `${x && x.mine === false ? `${firstName(name) || 'They'} promised` : 'You promised'}: ${x ? x.what : ''}`;
// Its tick's words: "Promise kept" or "They came through" (yours or theirs).
export const tickWords = (x) => (x && x.mine === false ? 'They came through' : 'Promise kept');

// The toast once a connection is logged: "Done.", "Done, with a promise.",
// "Done. Marked as kept." (KEPT IT, logged).
export function doneWords({ promised = false, kept = false } = {}) {
  if (kept) return 'Done. Marked as kept.';
  return promised ? 'Done, with a promise.' : 'Done.';
}
