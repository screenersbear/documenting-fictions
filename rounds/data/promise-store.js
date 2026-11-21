// Saving promises (data/promises.js): a change made to the person as saved
// now (not as a screen drew them a while ago), with what Undo needs, and
// Undo putting their promises back as they were.
import { getPerson, savePerson } from './db.js';

// change(person) gives the person changed. { before, after }, or null when they're gone.
export async function changeSaved(personId, change) {
  const before = await getPerson(personId);
  if (!before) return null;
  const after = change(before);
  if (after !== before) await savePerson(after);
  return { before, after };
}

// Undo: their promises as they were; anything else changed since stays. False when there's nothing to undo.
export async function undoChange(undo) {
  if (!undo || !undo.before) return false;
  const now = await getPerson(undo.before.id);
  if (!now) return false;
  await savePerson({ ...now, promises: Array.isArray(undo.before.promises) ? undo.before.promises : [] });
  return true;
}
