// inbox.json, in the sync repository (rounds/NOTES.md): Claude adds to it,
// Rounds takes entries off once it has handled them. A JSON array of
//   leads:   { id, type: 'lead', added, found_by, name, group, instagram,
//              website, email, where_met, note, first_move }
//   drafted: { id, type: 'drafted', added, match (an Instagram handle or a
//              name), kind: 'Pitch' | 'Follow up', where }
// Leads are looked at on Today ("N new leads from Claude"); a lead left
// unticked goes on the passed list and is never offered again. A draft
// marks that person's move "Draft waiting in Gmail".
import { rowOf } from './csv.js';
import { kindFromName } from './kinds.js';
import { findMatch } from './match.js';
import { cleanHandle } from './contact.js';

export const INBOX = 'inbox.json';
const DRAFTED = ['pitch', 'followup'];

// The entries in the file's text, or null when it isn't a list (Rounds then
// leaves the file alone). An empty file counts as no entries.
export function parseInbox(text) {
  if (!String(text ?? '').trim()) return [];
  try {
    const v = JSON.parse(text);
    return Array.isArray(v) ? v.filter((e) => e && typeof e === 'object' && e.id != null) : null;
  } catch {
    return null;
  }
}
// The file as written, without the entries handled.
export const inboxText = (entries, handled) => JSON.stringify(entries.filter((e) => !handled.includes(e.id)), null, 2);

// A lead as a person to add, with what Claude noted about where it came from.
export const leadOf = (e) => ({ id: e.id, row: rowOf(e), foundBy: String(e.found_by ?? '').trim() });

// The leads to look at: new to Rounds (fresh), and how many are here already
// or have no name. Each counts once, even if the inbox has it twice.
export function reviewLeads(entries, people) {
  const known = [...people];
  const fresh = [];
  let skipped = 0;
  let bad = 0;
  for (const lead of entries.map(leadOf)) {
    if (!lead.row.name) bad++;
    else if (findMatch(known, lead.row)) skipped++;
    else {
      known.push(lead.row);
      fresh.push(lead);
    }
  }
  return { fresh, skipped, bad };
}

// What a sync does with the inbox: drafts to mark on their people, entries
// to take off now (handled earlier, drafts dealt with, leads passed on, or
// leads with nothing new), and the leads left waiting to be looked at.
export function planInbox(entries, people, passed, handled = []) {
  const drafts = [];
  const drop = [];
  const waiting = [];
  for (const e of entries) {
    if (handled.includes(e.id)) drop.push(e.id);
    else if (e.type === 'drafted') {
      const kind = kindFromName(e.kind);
      const match = String(e.match ?? '').trim();
      const handle = match.startsWith('@') || !match.includes(' ') ? cleanHandle(match) : '';
      const person = DRAFTED.includes(kind) && match ? findMatch(people, { name: match, instagram: handle }) || findMatch(people, { name: match, instagram: '' }) : null;
      if (person) drafts.push({ personId: person.id, draft: { kind, where: String(e.where ?? '').trim(), added: String(e.added ?? '') } });
      drop.push(e.id);
    } else if (e.type === 'lead') {
      if (findMatch(passed, rowOf(e))) drop.push(e.id);
      else waiting.push(e);
    }
  }
  // Nothing new among them (all here already, or nameless): off the inbox too.
  if (waiting.length && !reviewLeads(waiting, people).fresh.length) {
    drop.push(...waiting.map((e) => e.id));
    return { drafts, drop, leads: [] };
  }
  return { drafts, drop, leads: waiting };
}

// A lead passed on, for the passed list: what it's matched by.
export const passedOf = (lead) => ({ id: lead.id, name: lead.row.name, instagram: lead.row.instagram });
