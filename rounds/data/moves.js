// Doing a move, from a Today card or a person's page: DONE (logged, and the
// next move planned), LATER (the same move tomorrow) and UNDO, with the
// day's pick kept in step. And the day's pick itself, saved for the day.
import { listPeople, savePerson, logMove, listMoves, dropMove, getSetting, setSetting } from './db.js';
import { pickFor, markPick, unmarkPick, doneOn, PER_DAY } from './today.js';
import { markDone, markLater } from './person.js';
import { dayOf } from './dates.js';
import { weekOf } from './work-days.js';
import { shelfItems } from './shelf-items.js';
import { uuid } from '../components/util.js';
import { withHowNote, HOWS, NOTE_HOWS_KEPT } from './done-notes.js';

// The work days and days off (Options): Monday to Friday, Sunday off, unless changed.
export const getWeek = async () => weekOf(...(await Promise.all([getSetting('workDays', null), getSetting('daysOff', null)])));

const loadAll = () => Promise.all([listPeople(), getSetting('pick', null), getSetting('perDay', PER_DAY), getWeek()]);
// The cards coming up, for the floating ! over Rounds on the shelf
// (data/shelf-items.js). The suite's shared files give DFWaiting.
const tellShelf = (people, pick, perDay, week) => window.DFWaiting?.publishWaiting('rounds', shelfItems(people, pick, dayOf(), perDay, week));
// After a move done, put off or undone (the pick already marked), or a
// moment that moved one (data/moment-store.js).
export const shelfAgain = () => loadAll().then(([people, pick, perDay, week]) => tellShelf(people, pick, perDay, week)).catch(() => {});

export async function loadToday() {
  const [people, saved, perDay, week] = await loadAll();
  const pick = pickFor(people, saved, dayOf(), perDay, week);
  if (JSON.stringify(pick) !== JSON.stringify(saved)) await setSetting('pick', pick);
  tellShelf(people, pick, perDay, week);
  return { people, pick, week };
}

export async function markInPick(id, how) {
  const pick = await getSetting('pick', null);
  if (!pick || pick.date !== dayOf() || !pick.ids.includes(id)) return;
  await setSetting('pick', how ? markPick(pick, id, how) : unmarkPick(pick, id));
}

// Gives back what UNDO needs. (at: when, for Done today's order.) said:
// what's in WHAT DID YOU SAY?, kept with it, and how and the note, from
// the one sheet (pages/one-sheet.js).
export async function doMove(person, said = '', { how, note } = {}) {
  const { person: after, log } = markDone(person, dayOf());
  const line = withHowNote({ id: uuid(), at: Date.now(), ...log }, { said, how, note });
  await savePerson(after);
  await logMove(line);
  await markInPick(person.id, 'done');
  shelfAgain();
  return { before: person, after, line };
}
// HOW, A NOTE and what you said, changed (the one sheet's EDIT, from What
// you said): kept with the move's line.
export async function saveHowNote(line, { how, note, said = line.said }) {
  const next = withHowNote(line, { how, note, said }, HOWS);
  await logMove(next);
  return next;
}
// From SO FAR on their page: a note on its own changed, deleted, or put
// back (Undo).
export async function saveNote(line, { how, note }) {
  const next = withHowNote(line, { how, note }, NOTE_HOWS_KEPT);
  await logMove(next);
  return next;
}
export const dropNote = (line) => dropMove(line.id);
export const putNoteBack = (line) => logMove(line);
export async function undoMove({ before, line }) {
  await savePerson(before);
  await dropMove(line.id);
  await markInPick(before.id, null);
  shelfAgain();
}
// DONE TODAY, from the log (each one's Delete, with Undo, is on What you
// said: data/one-move-store.js).
export async function loadDone() {
  const [lines, people] = await Promise.all([listMoves(), listPeople()]);
  return { lines, done: doneOn(lines, people, dayOf()) };
}
export async function laterMove(person) {
  const after = markLater(person, dayOf());
  await savePerson(after);
  await markInPick(person.id, 'later');
  shelfAgain();
  return after;
}

// The user's own fill-ins (Messages): [offer] and [city].
export async function getMe() {
  const [offer, city] = await Promise.all([getSetting('offer', ''), getSetting('city', '')]);
  return { offer, city };
}
