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
// Someone can be in more than one group (people/NOTES.md, 15 Nov: a makeup
// artist on the team who books you is Regular and Client). groups lists
// them; group is the one whose moves lead (Client's win), kept for what
// reads only that (older copies, the Monday task).
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

// ---------- More than one group ----------
// Someone's groups: their list, or (from before 15 Nov, or written by a copy
// that keeps only group) their one group.
export function groupsOf(p) {
  const list = Array.isArray(p.groups) ? p.groups.filter((g) => GROUPS[g]) : [];
  if (list.length && list.includes(p.group)) return GROUP_KEYS.filter((g) => list.includes(g));
  return [GROUPS[p.group] ? p.group : 'new'];
}
export const inGroup = (p, g) => groupsOf(p).includes(g);
// The group whose moves lead: Client, then the first in GROUPS' order.
export const leadGroup = (list) => (list.includes('client') ? 'client' : GROUP_KEYS.find((g) => list.includes(g)));
// A list of groups as kept: known ones in GROUPS' order, Prospect gone once
// Client is in, never none (New).
export function cleanGroups(list) {
  let g = GROUP_KEYS.filter((k) => (list || []).includes(k));
  if (g.includes('client')) g = g.filter((k) => k !== 'prospect');
  return g.length ? g : ['new'];
}
// Edit's chips: a group turned on or off. Client and Prospect are never on
// together (the one turned on stays), and the last one on stays on.
export function toggleGroup(list, g) {
  const on = cleanGroups(list);
  if (on.includes(g)) return on.length > 1 ? on.filter((k) => k !== g) : on;
  return cleanGroups([...on.filter((k) => !(g === 'prospect' && k === 'client')), g]);
}
// The person in these groups (their next move left as it is).
export function inGroups(p, list) {
  const groups = cleanGroups(list);
  return { ...p, groups, group: leadGroup(groups) };
}
// Groups in words, for a line: "Regular. Client".
export const groupWords = (p) => groupsOf(p).map((g) => GROUPS[g]).join('. ');

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
// weeks after. A Regular who's a Client too and booked this shoot (booked)
// gets the client's thanks. An older shoot leaves the next move as it was,
// or brings a check-in.
export function afterShoot(person, shotOn, today, booked = false) {
  const checkin = move('checkin', later(today, addDays(shotOn, GAP.checkin)));
  if (inGroup(person, 'regular') && !(booked && inGroup(person, 'client'))) return checkin;
  if (daysBetween(shotOn, today) <= GAP.fresh) return move('thanks', addDays(shotOn, 1));
  return person.next || checkin;
}

// What comes after the next move is done (null: nothing more to do). Your
// photos are up, and A year since, stood in for the move they had next:
// that one comes back. A Client who's a Regular too gets the light check-ins
// between the client's moves, one card at a time: the check-in carries the
// client's move that waits (waits), and when both are due the client's wins.
export function afterDone(person, today) {
  const done = person.next;
  if (done && (done.kind === 'photos' || done.year) && done.then) return done.then;
  if (!done || person.group === 'guest') return null;
  if (person.group === 'client') {
    const client = done.waits || move(done.kind === 'intros' ? 'refresh' : 'intros', addDays(today, GAP.client));
    if (!inGroup(person, 'regular')) return client;
    const checkin = move('checkin', addDays(today, GAP.checkin));
    return client.due <= checkin.due ? client : { ...checkin, waits: client };
  }
  if (person.group === 'prospect') {
    if (done.kind !== 'followup') return move('followup', addDays(today, GAP.followup[0]), 1);
    return done.step < 2 ? move('followup', addDays(today, GAP.followup[1]), 2) : null;
  }
  return move('checkin', addDays(today, GAP.checkin));
}

// Their next move once their groups change: kept if it's one of their
// groups' own (or A year since, which any group keeps), otherwise the
// leading group's first.
export function regroup(person, groups, today) {
  const list = cleanGroups(groups);
  if (person.next && (person.next.year || list.some((g) => OWN[g].includes(person.next.kind)))) return person.next;
  return firstMove(leadGroup(list), today);
}

// A New person, after enough shoots together, unless their group was picked by hand.
export const becomesRegular = (p) => inGroup(p, 'new') && !p.groupPicked && p.shoots.length >= REGULAR_AFTER;
// New made Regular (their other groups kept).
export const madeRegular = (p) => inGroups(p, [...groupsOf(p).filter((g) => g !== 'new'), 'regular']);
// Booked you for a shoot (The Eye's Booked me), or said yes to a pitch:
// Client is added, Prospect drops away, the rest stay.
export const madeClient = (p) => inGroups(p, [...groupsOf(p), 'client']);
