// Saving moments (data/moments.js), from a person's page and Done today:
// added, changed (what happened, when, the note, whether it counts) and
// deleted, each with what Undo needs. A moment that moves their next move
// tells the shelf's waiting list again, as a move done does.
import { getPerson, savePerson, logMove, dropMove, listMoves } from './db.js';
import { momentLine, afterMoment, withoutMoment } from './moments.js';
import { shelfAgain } from './moves.js';
import { uuid } from '../components/util.js';

// The person saved only when the moment changed them.
async function keep(before, after) {
  if (JSON.stringify(after) === JSON.stringify(before)) return;
  await savePerson(after);
  shelfAgain();
}

// fields: { what, day, note, keeps }. Gives back what Undo needs.
export async function addMoment(person, fields) {
  const { person: after, line } = afterMoment(person, momentLine(person.id, fields, uuid(), Date.now()));
  await logMove(line);
  await keep(person, after);
  return { before: person, line };
}

// Changed: taken out as it was, then in again as it is now (the same line).
export async function changeMoment(person, old, fields) {
  const rest = (await listMoves()).filter((l) => l.id !== old.id);
  const { person: after, line } = afterMoment(withoutMoment(person, old, rest), momentLine(person.id, fields, old.id, old.at));
  await logMove(line);
  await keep(person, after);
  return line;
}

export async function dropMoment(person, line) {
  const rest = (await listMoves()).filter((l) => l.id !== line.id);
  await dropMove(line.id);
  await keep(person, withoutMoment(person, line, rest));
  return { before: person, line };
}

// Undo: a deleted moment back, or an added one gone, the person as before.
export async function undoMomentDrop({ before, line }) {
  await logMove(line);
  await keep(await getPerson(before.id), before);
}
export async function undoMomentAdd({ before, line }) {
  await dropMove(line.id);
  await keep(await getPerson(before.id), before);
}
