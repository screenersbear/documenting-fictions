// Reading and writing CSV files: comma separated, quotes around any field
// with a comma, a quote or a line break in it, "" for a quote inside one.
// And Import people's file (rounds/NOTES.md): a header row, then
//   name, group, instagram, website, email, where_met, note, first_move
import { groupFromName } from './plan.js';
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

// The people in an import file: { rows, bad } (bad: rows with no name,
// skipped and counted). A file with no name column throws, in plain words.
export function readPeople(text) {
  const [head = [], ...body] = parseCsv(text);
  const col = new Map(head.map((h, i) => [h.trim().toLowerCase().replace(/[\s-]+/g, '_'), i]));
  if (!col.has('name')) throw new Error('This file has no name column. Its first row should name the columns: name, group, instagram and the rest.');
  const get = (r, k) => (col.has(k) ? String(r[col.get(k)] ?? '').trim() : '');
  const rows = [];
  let bad = 0;
  for (const r of body) {
    const name = get(r, 'name');
    if (!name) { bad++; continue; }
    rows.push({
      name,
      group: groupFromName(get(r, 'group')) || 'prospect',
      instagram: cleanHandle(get(r, 'instagram')),
      website: cleanSite(get(r, 'website')),
      email: get(r, 'email'),
      where: get(r, 'where_met'),
      note: get(r, 'note'),
      firstMove: kindFromName(get(r, 'first_move')),
    });
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
