// What comes next for someone, by their group (rounds/NOTES.md): which move,
// and how long until it.
//   Regulars (repeat collaborators): no formal thank-yous, a check-in to
//     plan the next one every six weeks.
//   New (just met, or shot once): thanks after a shoot or hello for someone
//     just met, then a check-in every six weeks.
//   Clients (people who hired you): every three months a refresh offer or
//     ask for intros, in turn.
//   Prospects (brands, agencies): a pitch, a follow up a week later, another
//     two weeks after that, then Rounds lets them go quietly.
//   Event guests: one friendly move (send their photos), then the newsletter.
import { addDays, daysBetween, later } from './dates.js';

export const GROUPS = { regular: 'Regular', new: 'New', client: 'Client', prospect: 'Prospect', guest: 'Event guest' };
export const GROUP_KEYS = Object.keys(GROUPS);
// The gaps, in days.
export const GAP = { checkin: 42, client: 90, followup: [7, 14], fresh: 14 };
// New people become Regulars on their own after this many shoots together in The Eye.
export const REGULAR_AFTER = 3;
// The moves each group has: changing someone's group keeps a next move that's one of these.
// A thanks for a yes, and Your photos are up, belong to every group.
const ANY = ['yes', 'photos'];
const OWN = {
  regular: ['checkin', ...ANY],
  new: ['thanks', 'hello', 'checkin', ...ANY],
  client: ['thanks', 'intros', 'refresh', ...ANY],
  prospect: ['pitch', 'followup', 'hello', 'thanks', ...ANY],
  guest: ['hello', 'thanks', ...ANY],
};

// A group from how a person (or a file) writes it: "Client", "clients", "event guest".
export function groupFromName(text) {
  const t = String(text ?? '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/s$/, '');
  return GROUP_KEYS.find((k) => k === t || GROUPS[k].toLowerCase() === t) || null;
}

export const move = (kind, due, step = 0) => ({ kind, due, step });

// The first move for someone just added to a group.
export function firstMove(group, today) {
  if (group === 'regular') return move('checkin', today);
  if (group === 'prospect') return move('pitch', today);
  if (group === 'client') return move('intros', today);
  return move('hello', today); // New, and event guests (their photos)
}

// After a shoot together (from The Eye): thanks while it's fresh (two weeks),
// due the day after the shoot (a text the day after; one picked up late is
// overdue, not moved), except for Regulars, whose next check-in comes six
// weeks after. An older shoot leaves the next move as it was, or brings a
// check-in.
export function afterShoot(person, shotOn, today) {
  const checkin = move('checkin', later(today, addDays(shotOn, GAP.checkin)));
  if (person.group === 'regular') return checkin;
  if (daysBetween(shotOn, today) <= GAP.fresh) return move('thanks', addDays(shotOn, 1));
  return person.next || checkin;
}

// What comes after the next move is done (null: nothing more to do). Your
// photos are up, and A year since, stood in for the move they had next:
// that one comes back.
export function afterDone(person, today) {
  const done = person.next;
  if (done && (done.kind === 'photos' || done.year) && done.then) return done.then;
  if (!done || person.group === 'guest') return null;
  if (person.group === 'client') return move(done.kind === 'intros' ? 'refresh' : 'intros', addDays(today, GAP.client));
  if (person.group === 'prospect') {
    if (done.kind !== 'followup') return move('followup', addDays(today, GAP.followup[0]), 1);
    return done.step < 2 ? move('followup', addDays(today, GAP.followup[1]), 2) : null;
  }
  return move('checkin', addDays(today, GAP.checkin));
}

// Their next move once they're in another group: kept if it's one of the
// group's own (or A year since, which any group keeps), otherwise the group's first.
export function regroup(person, group, today) {
  if (person.next && (person.next.year || OWN[group].includes(person.next.kind))) return person.next;
  return firstMove(group, today);
}

// A New person, after enough shoots together, unless their group was picked by hand.
export const becomesRegular = (p) => p.group === 'new' && !p.groupPicked && p.shoots.length >= REGULAR_AFTER;
