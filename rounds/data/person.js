// A person as Rounds keeps them, and what happens to them (rounds/NOTES.md):
// a name and social handles, no phone numbers; an email only to pitch a
// business or for the email newsletter, an address only for the mail one.
import { addDays } from './dates.js';
import { cleanHandle, cleanSite } from './contact.js';
import { firstMove, afterDone, regroup, move, cleanGroups, leadGroup, groupsOf, inGroups } from './plan.js';
import { isKind } from './kinds.js';

const text = (v) => String(v ?? '').trim();

// f: { id, name, groups (or one group), instagram, tiktok, website, email,
// where, note, photoKey (a talent photo in The Eye), source ('added', 'eye',
// 'import'), next (leave it out for the leading group's first move) }.
export function newPerson(f, today) {
  const groups = cleanGroups(f.groups || [f.group || 'new']);
  const group = leadGroup(groups);
  return {
    id: f.id,
    name: text(f.name),
    group,
    groups,
    groupPicked: false,
    instagram: cleanHandle(f.instagram),
    tiktok: cleanHandle(f.tiktok),
    website: cleanSite(f.website),
    email: text(f.email),
    where: text(f.where),
    note: text(f.note),
    lists: { email: false, mail: false },
    address: '',
    shoots: [],
    lastShot: '',
    lastMove: '',
    photoKey: f.photoKey || '',
    source: f.source || 'added',
    letGo: false,
    added: today,
    next: f.next === undefined ? firstMove(group, today) : f.next,
  };
}

// People from an imported file (csv.js readPeople): their first moves join
// Today a few at a time, never more than the day's limit at once.
export function fromImport(rows, today, perDay, makeId) {
  return rows.map((r, i) => {
    const due = addDays(today, Math.floor(i / perDay));
    const next = isKind(r.firstMove) ? move(r.firstMove, due) : firstMove(leadGroup(cleanGroups(r.groups || [r.group])), due);
    return newPerson({ ...r, id: makeId(), source: 'import', next }, today);
  });
}

// The move is done: what comes next, and the line for the log, which keeps
// the move as it was (its due day and step, for Your photos are up its
// shoot and the move it stood in for, and a client's move waiting behind a
// check-in) so it can be put back. A draft Claude
// left for it is used up. A Pitch keeps its day (pitched, for HOW DID THE
// PITCH GO?), and an answer to an earlier pitch is cleared; the log keeps
// those as they were (was), for its undo.
export function markDone(person, today) {
  const { kind, due, step, shoot, year, then, waits } = person.next;
  const was = kind === 'pitch' ? { ...(person.pitched ? { pitched: person.pitched } : {}), ...(person.pitch ? { pitch: person.pitch } : {}) } : {};
  const log = { personId: person.id, kind, day: today, due, step, ...(shoot ? { shoot } : {}), ...(year ? { year } : {}), ...(then ? { then } : {}), ...(waits ? { waits } : {}), ...(Object.keys(was).length ? { was } : {}) };
  const { draft, ...rest } = person;
  const after = { ...rest, lastMove: today, next: afterDone(person, today) };
  if (kind === 'pitch') {
    after.pitched = today;
    delete after.pitch;
  }
  return { person: after, log };
}

// Claude drafted this move in Gmail (inbox.json): "Draft waiting in Gmail".
export const draftWaiting = (p) => !!(p.draft && p.next && p.draft.kind === p.next.kind);

// A move marked done by mistake (Today's Done today): the person as they
// were before it, from its line in the log. Lines from before 14 Nov keep
// only the kind and the day: the move was due that day, and a follow up was
// the step before the one planned now (a prospect's last one, step 2, plans
// nothing). Their last move goes back to the latest of their other lines,
// and an undone Pitch takes back its day and any earlier answer (its was).
function followupBefore(person) {
  const next = person.next;
  if (next && next.kind === 'followup') return Math.max(0, next.step - 1);
  return person.group === 'prospect' && !next ? 2 : 0;
}
export function undoDone(person, line, lines = []) {
  const guess = line.kind === 'followup' ? followupBefore(person) : 0;
  const step = Number.isInteger(line.step) ? line.step : guess;
  const lastMove = lines.filter((l) => l.personId === person.id && l.id !== line.id).map((l) => l.day).sort().pop() || '';
  const next = { ...move(line.kind, line.due || line.day, step), ...(line.shoot ? { shoot: line.shoot } : {}), ...(line.year ? { year: line.year } : {}), ...(line.then ? { then: line.then } : {}), ...(line.waits ? { waits: line.waits } : {}) };
  const back = { ...person, lastMove, next };
  if (line.kind === 'pitch') {
    const was = line.was || {};
    for (const k of ['pitched', 'pitch']) if (was[k]) back[k] = was[k]; else delete back[k];
  }
  return back;
}

// LATER: the same move, tomorrow.
export const markLater = (person, today) => ({ ...person, next: { ...person.next, due: addDays(today, 1) } });

// Edit's changes (only the fields given). New groups (groups, or one group)
// change the next move if it isn't one of theirs, and stop The Eye changing
// them on its own.
export function applyEdit(person, f, today) {
  const p = { ...person };
  if ('name' in f && text(f.name)) p.name = text(f.name);
  for (const k of ['instagram', 'tiktok']) if (k in f) p[k] = cleanHandle(f[k]);
  if ('website' in f) p.website = cleanSite(f.website);
  for (const k of ['email', 'where', 'note', 'address']) if (k in f) p[k] = text(f[k]);
  if ('lists' in f) p.lists = { email: !!f.lists.email, mail: !!f.lists.mail };
  const asked = 'groups' in f ? f.groups : 'group' in f ? [f.group] : null;
  if (asked && cleanGroups(asked).join() !== groupsOf(person).join()) {
    Object.assign(p, inGroups(p, asked), { groupPicked: true, next: regroup(person, asked, today) });
  }
  return p;
}

// Let go: off Today and People's list, everything kept. Brought back, they
// pick up with their group's first move if they had none.
export const letGo = (person) => ({ ...person, letGo: true });
export const bringBack = (person, today) => ({ ...person, letGo: false, next: person.next || firstMove(person.group, today) });
