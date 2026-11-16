// What's happened with someone in Rounds, for The Eye's talent card (round 2,
// connect/09: "Since then: June said yes (14 Nov). You checked in (12 Nov).").
// The moves done (from the log) and their answer to a pitch, newest first, at
// most five, each { day, words }. Rounds tells the one list of people
// (people-out.js); The Eye picks those since its last shoot with them.
import { firstName } from './fill.js';

// [who] is their first name (or "they"), [whom] the same (or "them").
const DONE = {
  thanks: 'you said thanks', yes: 'you said thanks for the yes', photos: 'you let [whom] know the photos were up',
  hello: 'you said hello', checkin: 'you checked in', intros: 'you asked [whom] for intros',
  refresh: 'you offered [whom] a refresh', followup: 'you followed up', pitch: 'you pitched [whom]', other: 'you reached out',
};
const ANSWERED = { yes: '[who] said yes', no: '[who] said not now' };
const MOST = 5;

export function happened(person, lines = []) {
  const first = firstName(person.name);
  const fill = (s) => s.replace('[who]', first || 'they').replace('[whom]', first || 'them');
  const done = lines.filter((l) => l.personId === person.id && DONE[l.kind] && l.day)
    .map((l) => ({ day: l.day, at: l.at || 0, words: fill(DONE[l.kind]) }));
  const pitch = person.pitch || {};
  const answer = ANSWERED[pitch.answer] && pitch.on ? [{ day: pitch.on, at: Infinity, words: fill(ANSWERED[pitch.answer]) }] : [];
  return [...done, ...answer].sort((a, b) => b.day.localeCompare(a.day) || b.at - a.at).slice(0, MOST).map(({ day, words }) => ({ day, words }));
}
