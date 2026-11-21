// One sync (rounds/NOTES.md, Sync and the Claude inbox; Callback's design).
// rounds.json: read, combined with this phone's records field by field
// (data/merge.js), and written back only when this phone has something new,
// on top of the version read; GitHub refuses a write on an older version, so
// it reads again and tries again, up to 4 times. Then inbox.json: drafts
// marked on their people, leads kept here to look at (Today), and entries
// handled taken off the file.
// This phone's own values (data/device.js): 'sync' (repository, key, how it
// went), 'syncBase' (each record as last agreed), 'syncConflicts', 'leads'
// (from Claude, waiting) and 'inboxHandled' (entries to take off the inbox).
import * as db from './db.js';
import { getMeta, setMeta } from './device.js';
import { readFile as fetchFile, writeFile, SyncError } from './github.js';
import { STORES, dataKey, planMerge, fileData, nextBase, resolvedRecord, keyOf } from './merge.js';
import { FILE, fileText, readFile } from './sync-file.js';
import { INBOX, parseInbox, inboxText, planInbox } from './inbox.js';
import { nowISO } from '../components/util.js';

const TRIES = 4;
const empty = () => Object.fromEntries(STORES.map((s) => [s, []]));

export async function syncConfig() {
  const cfg = await getMeta('sync');
  return cfg && cfg.repo && cfg.token ? cfg : null;
}

// rounds.json. A phone joining (or moving to another repository) starts afresh.
async function syncData(cfg) {
  const oldBase = cfg.joined ? await getMeta('syncBase') : null;
  let changedHere = false;
  for (let tries = 0; tries < TRIES; tries++) {
    const remote = await fetchFile(cfg, FILE);
    const read = remote.text == null ? null : readFile(remote.text, cfg.repo);
    const theirs = read ? read.data : empty();
    let held = new Set();
    let conflicts = [];
    if (read) {
      const plan = planMerge(await db.exportData(), theirs, oldBase, { now: nowISO() });
      if (await db.applySync(plan.puts, plan.dels)) changedHere = true;
      held = plan.held;
      const from = read.syncedFrom && read.syncedFrom !== cfg.device ? read.syncedFrom : null;
      conflicts = plan.conflicts.map((c) => ({ ...c, from, foundAt: nowISO() }));
    }
    const out = fileData(await db.exportData(), theirs, held);
    const done = (read && dataKey(out) === dataKey(theirs)) || !!(await writeFile(cfg, FILE, fileText(out, { device: cfg.device, now: nowISO() }), remote.sha));
    if (done) return { changedHere, conflicts, base: nextBase(out, oldBase, held) };
  }
  throw new SyncError('Another device kept syncing at the same moment. Rounds tries again shortly.', 'busy');
}

// inbox.json: Claude adds, Rounds takes off what it has handled. A missing
// file is no entries; one Rounds can't read is left alone.
async function syncInbox(cfg) {
  let changedHere = false;
  for (let tries = 0; tries < TRIES; tries++) {
    const remote = await fetchFile(cfg, INBOX);
    const entries = remote.text == null ? [] : parseInbox(remote.text);
    if (!entries) return { changedHere };
    const [people, passed, handled] = await Promise.all([db.listPeople(), db.listPassed(), getMeta('inboxHandled', [])]);
    const plan = planInbox(entries, people, passed, handled);
    const byId = new Map(people.map((p) => [p.id, p]));
    const marked = plan.drafts.filter((d) => byId.get(d.personId).next?.kind === d.draft.kind).map((d) => ({ ...byId.get(d.personId), draft: d.draft }));
    if (marked.length) { await db.savePeople(marked); changedHere = true; }
    await setMeta('leads', plan.leads);
    if (!plan.drop.length || (await writeFile(cfg, INBOX, inboxText(entries, plan.drop), remote.sha))) {
      await setMeta('inboxHandled', handled.filter((id) => !plan.drop.includes(id)));
      return { changedHere };
    }
  }
  // On its own (rounds/STANDALONE.md) Rounds' words never mention Claude.
  // (globalThis is window in the browser.)
  throw new SyncError(`${globalThis.DF_SUITE ? 'Claude was' : 'Something else was'} adding to the inbox at the same moment. Rounds tries again shortly.`, 'busy');
}

// One sync. Pass cfg to try a new repository or key before keeping it.
// Returns { changedHere (the other side's changes came in), conflicts, newConflicts }.
export async function syncNow(newCfg = null) {
  const cfg = newCfg || (await syncConfig());
  if (!cfg) return { off: true };
  let data;
  let inbox;
  try {
    data = await syncData(cfg);
    inbox = await syncInbox(cfg);
  } catch (err) {
    const e = err instanceof SyncError ? err : new SyncError(err && err.message ? err.message : 'Sync stopped partway. Rounds tries again shortly.', 'server');
    if (!newCfg) await setMeta('sync', { ...cfg, lastError: e.message, lastErrorKind: e.kind, lastErrorAt: nowISO() });
    throw e;
  }
  const before = new Set((await getConflicts()).map((c) => keyOf(c.store, c.id)));
  await setMeta('syncBase', data.base);
  await setMeta('syncConflicts', data.conflicts);
  await setMeta('sync', { ...cfg, joined: true, lastSyncAt: nowISO(), lastError: null, lastErrorKind: null });
  const fresh = data.conflicts.filter((c) => !before.has(keyOf(c.store, c.id))).length;
  return { changedHere: data.changedHere || inbox.changedHere, conflicts: data.conflicts.length, newConflicts: fresh, leads: (await waitingLeads()).length };
}

export async function turnOff() {
  for (const k of ['sync', 'syncBase', 'syncConflicts', 'leads', 'inboxHandled']) await setMeta(k, null);
}

export const getConflicts = () => getMeta('syncConflicts', []);

// ---- Claude's leads ----
export const waitingLeads = () => getMeta('leads', []);
// Looked at (added, passed on, or left out): off the inbox at the next sync.
export async function leadsHandled(ids) {
  const [leads, handled] = await Promise.all([waitingLeads(), getMeta('inboxHandled', [])]);
  await setMeta('leads', leads.filter((e) => !ids.includes(e.id)));
  await setMeta('inboxHandled', [...new Set([...handled, ...ids])]);
}

// ---- Answering a conflict ----
// side: 'mine' or 'theirs' for a record changed on both; 'keep' or 'delete'
// when one side deleted it. The answer is saved here as the newest copy and
// the last-agreed copy moves on, so the next sync sends it out. Returns
// { stale } when it changed here again since (asked afresh next sync).
export async function answer(c, side) {
  const base = (await getMeta('syncBase')) || {};
  base[c.store] = base[c.store] || {};
  const here = await db.exportData();
  const mine = here[c.store].find((r) => r.id === c.id) || null;
  const puts = empty();
  const dels = empty();
  const now = nowISO();
  const tomb = { id: c.id, store: c.store, deletedAt: now, createdAt: now, updatedAt: now };
  let stale = false;
  if (c.kind === 'both') {
    if (!mine || mine.updatedAt !== c.mine.updatedAt) stale = true;
    else {
      puts[c.store].push({ ...resolvedRecord(c, side), updatedAt: now });
      base[c.store][c.id] = c.theirs;
    }
  } else if (c.kind === 'deletedThere') {
    if (side === 'keep') { if (mine) puts[c.store].push({ ...mine, updatedAt: now }); } else {
      if (mine) dels[c.store].push(c.id);
      puts.tombstones.push(tomb);
    }
    delete base[c.store][c.id];
  } else {
    if (side === 'keep') {
      puts[c.store].push(c.theirs);
      dels.tombstones.push(c.id);
    } else if (!here.tombstones.some((t) => t.id === c.id)) puts.tombstones.push(tomb);
    base[c.store][c.id] = c.theirs;
  }
  await db.applySync(puts, dels);
  await setMeta('syncBase', base);
  await setMeta('syncConflicts', (await getConflicts()).filter((x) => keyOf(x.store, x.id) !== keyOf(c.store, c.id)));
  return { stale };
}
