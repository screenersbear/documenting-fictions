// Saving the one sheet (Tightening Rounds, rounds/08 and 09, 16 Nov): a move
// logged with what you said, how and a note, all at once, whether it's
// their due move (done, the next one planned: data/moves.js doMove) or
// another (an extra line that counts as keeping in touch: data/one-move.js);
// its Undo; and a logged move deleted from What you said, with its Undo.
import { getPerson, savePerson, logMove, dropMove, listMoves } from './db.js';
import { doMove, undoMove, markInPick, shelfAgain } from './moves.js';
import { doesDue, kindFor, extraMove, afterDelete, undoesDue } from './one-move.js';
import { dayOf } from './dates.js';
import { uuid } from '../components/util.js';

// The person saved only when the line changed them.
async function keep(before, after) {
  if (JSON.stringify(after) === JSON.stringify(before)) return;
  await savePerson(after);
  shelfAgain();
}

// chip: WHAT KIND's pick; fields: { said, how, note }. Gives back what Undo needs.
export async function saveOneMove(person, chip, fields) {
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
