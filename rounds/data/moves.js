// Doing a move, from a Today card or a person's page: DONE (logged, and the
// next move planned), LATER (the same move tomorrow) and UNDO, with the
// day's pick kept in step. And the day's pick itself, saved for the day.
import { listPeople, savePerson, logMove, dropMove, getSetting, setSetting } from './db.js';
import { pickFor, markPick, unmarkPick, PER_DAY } from './today.js';
import { markDone, markLater } from './person.js';
import { dayOf } from './dates.js';
import { uuid } from '../components/util.js';

export async function loadToday() {
  const [people, saved, perDay] = await Promise.all([listPeople(), getSetting('pick', null), getSetting('perDay', PER_DAY)]);
  const pick = pickFor(people, saved, dayOf(), perDay);
  if (JSON.stringify(pick) !== JSON.stringify(saved)) await setSetting('pick', pick);
  return { people, pick };
}

async function markInPick(id, how) {
  const pick = await getSetting('pick', null);
  if (!pick || pick.date !== dayOf() || !pick.ids.includes(id)) return;
  await setSetting('pick', how ? markPick(pick, id, how) : unmarkPick(pick, id));
}

// Gives back what UNDO needs.
export async function doMove(person) {
  const { person: after, log } = markDone(person, dayOf());
  const line = { id: uuid(), ...log };
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
