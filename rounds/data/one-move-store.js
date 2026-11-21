// Saving the one sheet (Tightening Rounds, rounds/08 and 09, 16 Nov): a move
// logged with what you said, how and a note, all at once, whether it's
// their due move (done, the next one planned: data/moves.js doMove) or
// another (an extra line that counts as keeping in touch: data/one-move.js),
// with a promise made with it or one of yours it kept (data/move-promise.js);
// its Undo; and a logged move deleted from What you said, with its Undo.
import { getPerson, savePerson, logMove, dropMove, listMoves } from './db.js';
import { doMove, undoMove, markInPick, shelfAgain } from './moves.js';
import { doesDue, kindFor, extraMove, afterDelete, undoesDue } from './one-move.js';
import { withMovePromise, keptBy, promiseFor } from './move-promise.js';
import { changeSaved } from './promise-store.js';
import { dayOf } from './dates.js';
import { uuid } from '../components/util.js';

// The person saved only when the line changed them.
async function keep(before, after) {
  if (JSON.stringify(after) === JSON.stringify(before)) return;
  await savePerson(after);
  shelfAgain();
}

const newId = () => `pr-${uuid()}`;

// chip: WHAT KIND's pick; fields: { said, how, note }; promise: what
// "Anything promised?" says ({ what, mine, due }, or null); keeps: one of
// your promises this move kept. Gives back what Undo needs (Undo puts the
// person back as they were, so the promise made or kept goes back too),
// with promised and kept for the toast.
export async function saveOneMove(person, chip, fields, { promise = null, keeps = null } = {}) {
  const done = await saveMove(person, chip, fields);
  const today = dayOf();
  const changed = await changeSaved(person.id, (p) => {
    const made = withMovePromise(p, done.line.id, promise, newId, today);
    return keeps ? keptBy(made, keeps.id, done.line.id, today) : made;
  });
  return { ...done, promised: !!changed && !!promiseFor(changed.after, done.line.id), kept: !!keeps };
}
async function saveMove(person, chip, fields) {
  if (doesDue(person, chip)) return doMove(person, fields.said, fields);
  const { person: after, line } = extraMove(person, kindFor(person, chip), dayOf(), fields, uuid(), Date.now());
  await logMove(line);
  await keep(person, after);
  return { before: person, after, line };
}
// Undo: the due move back as it was (and its card), or the other one gone.
export async function undoOneMove(done) {
  if (!done.line.extra) { await undoMove(done); return; }
  await dropMove(done.line.id);
  await keep(await getPerson(done.before.id), done.before);
}

// EDIT on a logged move: its promise as the sheet says (changed, ticked,
// unticked, or taken off with its words cleared). { undo (for
// data/promise-store.js undoChange), gone (it was taken off) }, or null when
// nothing changed.
export async function saveLinePromise(person, line, promise) {
  const changed = await changeSaved(person.id, (p) => withMovePromise(p, line.id, promise, newId, dayOf()));
  if (!changed || changed.after === changed.before) return null;
  return { undo: changed, gone: !promiseFor(changed.after, line.id) };
}

// DELETE on What you said: out of the log, the person put back as it says
// (data/one-move.js afterDelete); a due move done today comes back on Today.
export async function deleteLine(person, line) {
  const today = dayOf();
  const lines = await listMoves();
  const undone = undoesDue(person, line, lines, today);
  await dropMove(line.id);
  await keep(person, afterDelete(person, line, lines, today));
  if (undone) await markInPick(person.id, null);
  return { before: person, line, undone };
}
export async function undoDelete({ before, line, undone }) {
  await logMove(line);
  await keep(await getPerson(before.id), before);
  if (undone) await markInPick(before.id, 'done');
}
