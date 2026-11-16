// Two people merged into one, and someone deleted (Tightening Rounds,
// rounds/11, 16 Nov), saved so sync carries them: the one that goes is
// deleted with a tombstone, and its lines are saved again as the kept one's.
// A photo of its own comes along when the one kept had none. Merge gives
// back what Undo needs; once Undo's gone, the one list of people makes their
// two records one (joinShared), so The Eye's shoots and Ref's boards with
// either are with the one kept. Deleting takes everything logged with them
// (it can't be undone), and the list forgets them unless another notebook
// still has them.
import { listMoves, savePerson, logMoves, dropPerson, dropMoves, getPhoto, savePhoto, dropPhoto } from './db.js';
import { mergePeople, movedLines } from './merge-people.js';
import { listedAs } from './people-out.js';
import { shelfAgain } from './moves.js';

const D = () => window.DFData;
const bytesOf = async (blob) => (blob ? { bytes: await blob.arrayBuffer(), type: blob.type } : null);
const linesOf = async (id) => (await listMoves()).filter((l) => l.personId === id);

export async function mergeInto(keep, other) {
  const [lines, mine, theirs] = await Promise.all([linesOf(other.id), getPhoto(keep.id).then(bytesOf), getPhoto(other.id).then(bytesOf)]);
  const photo = !!theirs && !mine && !keep.photoKey;
  await savePerson(mergePeople(keep, other));
  if (lines.length) await logMoves(movedLines(lines, other.id, keep.id));
  if (photo) await savePhoto(keep.id, theirs.bytes, theirs.type);
  if (theirs) await dropPhoto(other.id);
  await dropPerson(other.id);
  shelfAgain();
  return { keep, other, lines, theirs, photo };
}
export async function undoMerge({ keep, other, lines, theirs, photo }) {
  await savePerson(other);
  await savePerson(keep);
  if (lines.length) await logMoves(lines);
  if (theirs) await savePhoto(other.id, theirs.bytes, theirs.type);
  if (photo) await dropPhoto(keep.id);
  shelfAgain();
}
export async function joinShared({ keep, other }) {
  if (!D() || !D().answerSame) return;
  const [a, b] = await Promise.all([D().personFor(listedAs(keep)), D().personFor(listedAs(other))]);
  if (a && b && a.id !== b.id) await D().answerSame(a.id, b.id, true);
}

export async function deletePerson(p) {
  const ids = (await linesOf(p.id)).map((l) => l.id);
  if (ids.length) await dropMoves(ids);
  await dropPhoto(p.id);
  await dropPerson(p.id);
  shelfAgain();
  if (D() && D().forgetPerson) await D().forgetPerson('rounds', listedAs(p));
}
