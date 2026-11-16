// Reading and writing CSV files: comma separated, quotes around any field
// with a comma, a quote or a line break in it, "" for a quote inside one.
// And Import people's file (rounds/NOTES.md): a header row, then
//   name, group, instagram, website, email, where_met, note, first_move
import { groupFromName, cleanGroups, leadGroup } from './plan.js';
import { kindFromName } from './kinds.js';
import { cleanHandle, cleanSite } from './contact.js';
import { findMatch } from './match.js';

export function parseCsv(text) {
  const s = String(text ?? '').replace(/^﻿/, '');
  const rows = [];
  let row = [], field = '', quoted = false;
  const endRow = () => { row.push(field); rows.push(row); row = []; field = ''; };
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c !== '"') field += c;
      else if (s[i + 1] === '"') { field += '"'; i++; } else quoted = false;
    } else if (c === '"' && field === '') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') endRow();
    else if (c === '\r') { if (s[i + 1] === '\n') i++; endRow(); }
    else field += c;
  }
  if (field !== '' || row.length) endRow();
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

const cell = (v) => {
  const t = String(v ?? '');
  return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};
export const toCsv = (rows) => rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';

// One person from a file's row or one of Claude's leads (data/inbox.js),
// cleaned up: f has the file's columns (name, group, instagram, website,
// email, where_met, note, first_move). A prospect unless said otherwise;
// a group cell can name more than one ("Regular, Client", "Regular and Client").
export function rowOf(f) {
  const text = (k) => String(f[k] ?? '').trim();
  const named = text('group').split(/\s*(?:[,;/&+]|\band\b)\s*/i).map(groupFromName).filter(Boolean);
  const groups = named.length ? cleanGroups(named) : ['prospect'];
  return {
    name: text('name'),
    group: leadGroup(groups),
    groups,
    instagram: cleanHandle(text('instagram')),
    website: cleanSite(text('website')),
    email: text('email'),
    where: text('where_met'),
    note: text('note'),
    firstMove: kindFromName(text('first_move')),
  };
}

// The people in an import file: { rows, bad } (bad: rows with no name,
// skipped and counted). A file with no name column throws, in plain words.
export function readPeople(text) {
  const [head = [], ...body] = parseCsv(text);
  const col = new Map(head.map((h, i) => [h.trim().toLowerCase().replace(/[\s-]+/g, '_'), i]));
  if (!col.has('name')) throw new Error('This file has no name column. Its first row should name the columns: name, group, instagram and the rest.');
  const rows = [];
  let bad = 0;
  for (const r of body) {
    const row = rowOf(Object.fromEntries([...col].map(([k, i]) => [k, r[i]])));
    if (row.name) rows.push(row);
    else bad++;
  }
  return { rows, bad };
}

// The rows not in Rounds already (nor earlier in the same file), and how many were.
export function newOnes(rows, people) {
  const known = [...people];
  const fresh = [];
  let skipped = 0;
  for (const r of rows) {
    if (findMatch(known, r)) { skipped++; continue; }
    known.push(r);
    fresh.push(r);
  }
  return { fresh, skipped };
}
