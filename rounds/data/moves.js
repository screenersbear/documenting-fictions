// Doing a move, from a Today card or a person's page: DONE (logged, and the
// next move planned), LATER (the same move tomorrow) and UNDO, with the
// day's pick kept in step. And the day's pick itself, saved for the day.
import { listPeople, savePerson, logMove, listMoves, dropMove, getSetting, setSetting } from './db.js';
import { pickFor, markPick, unmarkPick, doneOn, PER_DAY } from './today.js';
import { markDone, markLater, undoDone as undoPerson } from './person.js';
import { dayOf } from './dates.js';
import { workDaysOf } from './work-days.js';
import { uuid } from '../components/util.js';

// The work days (Options), Monday to Friday unless changed.
export const getWorkDays = async () => workDaysOf(await getSetting('workDays', null));

export async function loadToday() {
  const [people, saved, perDay, days] = await Promise.all([listPeople(), getSetting('pick', null), getSetting('perDay', PER_DAY), getWorkDays()]);
  const pick = pickFor(people, saved, dayOf(), perDay, days);
  if (JSON.stringify(pick) !== JSON.stringify(saved)) await setSetting('pick', pick);
  return { people, pick, days };
}

async function markInPick(id, how) {
  const pick = await getSetting('pick', null);
  if (!pick || pick.date !== dayOf() || !pick.ids.includes(id)) return;
  await setSetting('pick', how ? markPick(pick, id, how) : unmarkPick(pick, id));
}

// Gives back what UNDO needs. (at: when, for Done today's order.)
export async function doMove(person) {
  const { person: after, log } = markDone(person, dayOf());
  const line = { id: uuid(), at: Date.now(), ...log };
  await savePerson(after);
  await logMove(line);
  await markInPick(person.id, 'done');
  return { before: person, after, line };
}
export async function undoMove({ before, line }) {
  await savePerson(before);
  await dropMove(line.id);
  await markInPick(before.id, null);
}
// Done today, from the log, and its Undo: the move back as it was, and its
// card back in the day's pick.
export async function loadDone() {
  const [lines, people] = await Promise.all([listMoves(), listPeople()]);
  return { lines, done: doneOn(lines, people, dayOf()) };
}
export async function undoDone({ line, person }, lines) {
  await savePerson(undoPerson(person, line, lines));
  await dropMove(line.id);
  await markInPick(person.id, null);
}
export async function laterMove(person) {
  const after = markLater(person, dayOf());
  await savePerson(after);
  await markInPick(person.id, 'later');
  return after;
}

// The user's own fill-ins (Messages): [offer] and [city].
export async function getMe() {
  const [offer, city] = await Promise.all([getSetting('offer', ''), getSetting('city', '')]);
  return { offer, city };
}
