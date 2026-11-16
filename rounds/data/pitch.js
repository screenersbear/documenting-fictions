// HOW DID THE PITCH GO? (round 2, connect/05). Once a Pitch is done, a
// prospect's page asks, with three answers:
//   No reply yet: the follow ups carry on as they were.
//   Not now: Rounds lets them go quietly (nothing more planned, as after
//     the last follow up).
//   Yes, let's shoot: they're a Client now, with a thank-you for the yes
//     today, and they pass to Ref for a mood board (data/to-ref.js).
// Someone who asks to shoot first gets the same Yes from their page's menu.
// An answer can be changed: each starts from how they were before the first.
import { move, groupsOf, madeClient } from './plan.js';
import { shortDay } from './dates.js';

export const ANSWERS = [
  { key: 'waiting', label: 'No reply yet' },
  { key: 'no', label: 'Not now' },
  { key: 'yes', label: "Yes, let's shoot" },
];
const KEYS = ANSWERS.map((a) => a.key);

// The day they were pitched ('' for never): kept on them since the pitch
// question came in (person.pitched), else their latest Pitch in the log.
export function pitchedOn(person, lines = []) {
  if (person.pitched) return person.pitched;
  return lines.filter((l) => l.personId === person.id && l.kind === 'pitch').map((l) => l.day).sort().pop() || '';
}

// A yes still to be thanked for.
export const saidYes = (person) => !!person.pitch && person.pitch.answer === 'yes' && !!person.next && person.next.kind === 'yes';

// Does their page ask? A prospect once their pitch is done (a follow up is
// next, or nothing is), and anyone whose yes is still to be thanked for.
export function asksAboutPitch(person, pitched) {
  if (person.letGo) return false;
  if (person.pitch && person.pitch.answer === 'yes') return saidYes(person);
  const next = person.next;
  return person.group === 'prospect' && !!pitched && (!next || next.kind === 'followup');
}

// The person after their answer (as they were, for one Rounds doesn't know).
export function answerPitch(person, answer, today) {
  if (!KEYS.includes(answer)) return person;
  const before = (person.pitch && person.pitch.before) || { group: person.group, groups: groupsOf(person), groupPicked: !!person.groupPicked, next: person.next || null };
  const pitch = { answer, on: today, before };
  if (answer === 'yes') return { ...madeClient(person), groupPicked: true, next: move('yes', today), pitch };
  const was = { group: before.group, groups: before.groups || [before.group], groupPicked: before.groupPicked };
  return { ...person, ...was, next: answer === 'no' ? null : before.next, pitch };
}

// The line under their name after a yes: "Client now. Pitched 3 Nov."
export const yesLine = (pitched) => (shortDay(pitched) ? `Client now. Pitched ${shortDay(pitched)}.` : 'Client now.');

// What passes to Ref with a yes (a 'new-client' link): who, their handle
// (Instagram's, for the board), and when they were pitched ('' when they
// asked first).
export const clientFor = (person, pitched) => ({ name: person.name, handle: person.instagram || '', pitched: pitched || '' });
