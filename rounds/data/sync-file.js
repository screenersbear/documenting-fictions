// rounds.json, in the sync repository (rounds/NOTES.md, Sync and the Claude
// inbox): Rounds writes it; Claude's tasks only read it. Rounds' own data,
// never The Eye's and never photos: people, the moves done, the messages
// rewritten, the settings that sync (Work days among them), the passed list,
// and what was deleted. Each person also carries a plain nextMove
// { kind: 'Pitch', due: 'YYYY-MM-DD' } so Claude can read who's due without
// Rounds' logic (null once they're let go or nothing's planned).
import { KINDS } from './kinds.js';
import { STORES } from './merge.js';

export const FILE = 'rounds.json';
export const VERSION = 1;

const plainNext = (p) => (p.next && !p.letGo && KINDS[p.next.kind] ? { kind: KINDS[p.next.kind].name, due: p.next.due } : null);

// The file as written: { app, version, exportedAt, syncedFrom, data }, pretty.
export function fileText(data, { device = null, now }) {
  const out = Object.fromEntries(STORES.map((s) => [s, data[s] || []]));
  out.people = out.people.map((p) => ({ ...p, nextMove: plainNext(p) }));
  return JSON.stringify({ app: 'rounds', version: VERSION, exportedAt: now, syncedFrom: device, data: out }, null, 2);
}

// The data in a file read back (nextMove left out: Rounds works it out
// again). Anything else in the repository's rounds.json throws, in plain words.
export function readFile(text, repo) {
  let payload;
  try { payload = JSON.parse(text); } catch { payload = null; }
  if (!payload || payload.app !== 'rounds' || !payload.data || typeof payload.data !== 'object') {
    throw new Error(`${FILE} in ${repo} isn't a Rounds file. Use a repository just for Rounds.`);
  }
  const data = Object.fromEntries(STORES.map((s) => [s, Array.isArray(payload.data[s]) ? payload.data[s] : []]));
  data.people = data.people.map(({ nextMove, ...p }) => p);
  return { data, syncedFrom: payload.syncedFrom || null };
}

// Which device wrote the file, in its commit and for "Changed on two devices".
export function deviceLabel(ua) {
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android phone';
  if (/Macintosh/.test(ua)) return 'Mac';
  return 'browser';
}
