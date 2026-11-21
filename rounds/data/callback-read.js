// ONE-TIME (rounds/NOTES.md, Bring in from Callback, 16 Nov): Starky's own
// move from Callback to Rounds, not for other users. Take this file,
// data/callback-bring.js, pages/from-callback.js and the row in Options out
// again when he says the move is done.
//
// Reading a Callback backup (Callback's Export backup, a .json file). It's
// only read: Callback itself never changes. Each of its people becomes what
// Rounds needs: the row the tick list shows, Let go or not, the day of
// their next Check in, their touchpoints (moments, or a note for a project
// wrapped), their notes, and their open loops still open, as promises (21
// Nov). Left out: warmth levels (Parked is Let go), interest,
// organizations as records (the name goes in the note), news, closed loops
// and weekly data.
import { isDay } from './dates.js';
import { cleanGroups, leadGroup } from './plan.js';
import { cleanHandle, cleanSite } from './contact.js';
import { NOTE_MOST } from './done-notes.js';
import { WHAT_MOST } from './promises.js';

export const NOT_CALLBACK = "This file isn't a Callback backup. In Callback's Settings, Export backup makes one.";
// Callback's relationship types as Rounds' groups (its Other has none: New).
const GROUP_OF = { pastClient: 'client', collaborator: 'regular', prospect: 'prospect', industry: 'new' };
// Callback's touchpoint types that are a moment of their own.
const MOMENT_OF = { text: 'text', dm: 'instagram', call: 'call', meeting: 'met', event: 'met', sent_work: 'photos', comment: 'comment', email: 'email' };
// The rest are Other, with the type's words first in the note (Other's own needs none).
const TYPE_WORDS = { idea: 'Idea', followed: 'Followed', gift: 'Gift or card', other: '' };

const text = (v) => (typeof v === 'string' ? v.trim() : '');
const dayFrom = (v) => {
  const d = text(v).slice(0, 10);
  return isDay(d) ? d : '';
};

// Sentences one after another: "Gift or card. Sent a print. They replied."
export const sentences = (parts) => parts.map(text).filter(Boolean)
  .reduce((all, s) => (all ? `${all}${/[.!?:]$/.test(all) ? '' : '.'} ${s}` : s), '');

// A note too long for one line of the log, in pieces that fit (cut between
// words), so none of it is lost.
export function pieces(note) {
  const out = [];
  let rest = String(note ?? '').replace(/\s+/g, ' ').trim();
  while (rest.length > NOTE_MOST) {
    const cut = rest.lastIndexOf(' ', NOTE_MOST);
    const at = cut > 0 ? cut : NOTE_MOST;
    out.push(rest.slice(0, at));
    rest = rest.slice(at).trim();
  }
  return rest ? [...out, rest] : out;
}

// One touchpoint: { id, day, at, kind ('moment' or 'note'), what, note }, or
// null with no day. A reply ("They replied.") goes at the note's end.
export function touchOf(tp) {
  const day = dayFrom(tp.date) || dayFrom(tp.createdAt);
  if (!day) return null;
  const replied = text(tp.replyNote) ? `They replied: ${text(tp.replyNote)}` : 'They replied.';
  const reply = tp.responded === 'yes' ? replied : '';
  const at = Date.parse(tp.createdAt) || 0;
  if (tp.type === 'project_wrapped') return { id: tp.id, day, at, kind: 'note', what: '', note: sentences(['Project wrapped', tp.note, reply]) };
  const what = MOMENT_OF[tp.type] || 'other';
  const first = what === 'other' ? TYPE_WORDS[tp.type] ?? text(tp.type) : '';
  return { id: tp.id, day, at, kind: 'moment', what, note: sentences([first, tp.note, reply]) };
}

// One of Callback's open loops still open, as a promise (data/promises.js):
// on your side is yours, on their side theirs. The same id each time
// (cb-<its id>), so it never comes in twice. Null for a closed one, or one
// with no words.
export function loopOf(l) {
  const what = text(l.description).replace(/\s+/g, ' ').slice(0, WHAT_MOST);
  if (!what || l.status === 'closed') return null;
  return { id: `cb-${l.id}`, mine: l.direction !== 'theyOwe', what, due: dayFrom(l.dueDate), made: dayFrom(l.createdAt), open: true };
}

// One person: { row (as the tick list and newPerson take it), letGo,
// nextDay, touches (oldest first), notes (their Callback notes, as a note
// on the day they were added there, or null), promises (their open loops) }.
export function personOf(p, orgName, touches = [], promises = []) {
  const types = Array.isArray(p.relationshipTypes) && p.relationshipTypes.length ? p.relationshipTypes : [p.relationshipType || 'prospect'];
  const groups = cleanGroups(types.map((t) => GROUP_OF[t]));
  const role = text(p.role);
  const org = text(orgName);
  const notes = text(p.notes);
  return {
    row: {
      name: text(p.name), groups, group: leadGroup(groups),
      instagram: cleanHandle(text(p.instagram)), website: cleanSite(text(p.website)), email: text(p.email),
      where: text(p.howWeMet), note: role && org ? `${role} at ${org}` : role || org,
    },
    letGo: p.warmth === 'parked',
    nextDay: dayFrom(p.nextTouchpointDate),
    touches: [...touches].sort((a, b) => a.day.localeCompare(b.day) || a.at - b.at),
    notes: notes ? { id: `${p.id}-notes`, day: dayFrom(p.createdAt), at: Date.parse(p.createdAt) || 0, kind: 'note', what: '', note: notes, fromNotes: true } : null,
    promises: [...promises],
  };
}

// The whole backup: { people, bad } (bad: people with no name, left out and
// counted). Anything that isn't a Callback backup throws, in plain words.
export function readCallback(payload) {
  if (!payload || payload.app !== 'callback' || !payload.data || typeof payload.data !== 'object') throw new Error(NOT_CALLBACK);
  const list = (k) => (Array.isArray(payload.data[k]) ? payload.data[k] : []).filter((r) => r && typeof r === 'object' && typeof r.id === 'string');
  const orgs = new Map(list('organizations').map((o) => [o.id, o.name]));
  const touches = new Map();
  for (const tp of list('touchpoints')) {
    const t = touchOf(tp);
    if (t) touches.set(tp.personId, [...(touches.get(tp.personId) || []), t]);
  }
  const loops = new Map();
  for (const l of list('openLoops')) {
    const x = loopOf(l);
    if (x) loops.set(l.personId, [...(loops.get(l.personId) || []), x]);
  }
  const people = [];
  let bad = 0;
  for (const p of list('people')) {
    const one = personOf(p, orgs.get(p.organizationId), touches.get(p.id), loops.get(p.id));
    if (one.row.name) people.push(one);
    else bad++;
  }
  return { people, bad };
}
