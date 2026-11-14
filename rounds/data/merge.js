// How sync combines this phone's records with rounds.json's (Callback's
// design, its js/merge.js, for Rounds' own stores). Plain functions, no
// storage and no network.
//
// `base` is each record as it was at the last finished sync: the copy both
// sides agreed on. Comparing each side with it tells what changed where:
// - changed on one side only: that side's copy is taken;
// - changed on both, in different fields: both changes are kept, and the
//   result goes out as the newest copy;
// - the same field changed to different values on both, or deleted on one
//   side and changed on the other: a conflict. Nothing is overwritten; the
//   file keeps its copy, this phone keeps its own, and Rounds asks which to
//   keep ("Changed on two devices"). Until then the record is "held".
// Records with no base copy (the first sync, a device joining) fall back to
// the plain rule: the newer copy wins, and a deletion wins over anything
// saved before it. People are never deleted in Rounds (Let go keeps them).

export const STORES = ['people', 'moves', 'messages', 'settings', 'passed', 'tombstones'];
const RECORDS = STORES.filter((s) => s !== 'tombstones');
const STAMPS = new Set(['id', 'createdAt', 'updatedAt']);
// Taken whole, never field by field: a next move is its kind and day
// together, and an answer to a pitch is the answer with how they were before.
const WHOLE = new Set(['next', 'draft', 'pitch']);
// Bookkeeping nobody needs to be asked about (the newer copy's is taken):
// times, the day of the last move, and what The Eye brought in on this phone.
const QUIET = new Set(['lastMove', 'lastShot', 'shoots', 'photoKey', 'groupPicked']);

// The same data in the same order of keys, so copies can be compared.
export function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
  }
  return v === undefined ? 'null' : JSON.stringify(v);
}
const same = (a, b) => canonical(a) === canonical(b);
const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
// Whole data sets compared regardless of record order.
export const dataKey = (data) => canonical(STORES.map((s) => [...(data[s] || [])].sort(byId)));
export function content(r) {
  const { id, createdAt, updatedAt, ...rest } = r;
  return rest;
}
export const sameContent = (a, b) => same(content(a), content(b));
const newer = (a, b) => (a.updatedAt || '') > (b.updatedAt || '');
const isPlain = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const after = (t, r) => (t.deletedAt || '') >= (r.updatedAt || '');
export const keyOf = (store, id) => `${store}/${id}`;
const split = (key) => [key.slice(0, key.indexOf('/')), key.slice(key.indexOf('/') + 1)];

export const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
export function setPath(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) {
    if (!isPlain(o[k])) o[k] = {};
    o = o[k];
  }
  const last = keys[keys.length - 1];
  if (value === undefined) delete o[last];
  else o[last] = value;
}
export function quietField(path) {
  const last = path.split('.').pop();
  return last.endsWith('At') || QUIET.has(path.split('.')[0]);
}

// Three-way merge of one record's fields. Returns the combined record (this
// phone's value where they clash) and the paths of the fields that clash.
export function mergeFields(b, mine, theirs, prefix = '') {
  const merged = {};
  const clashes = [];
  const keys = new Set([...Object.keys(b || {}), ...Object.keys(mine), ...Object.keys(theirs)]);
  for (const k of keys) {
    if (!prefix && STAMPS.has(k)) continue;
    const [bv, mv, tv] = [b ? b[k] : undefined, mine[k], theirs[k]];
    if (same(mv, tv) || same(tv, bv)) merged[k] = mv;
    else if (same(mv, bv)) merged[k] = tv;
    else if (!WHOLE.has(prefix + k) && isPlain(mv) && isPlain(tv) && (bv === undefined || isPlain(bv))) {
      const sub = mergeFields(bv || {}, mv, tv, `${prefix}${k}.`);
      merged[k] = sub.merged;
      clashes.push(...sub.clashes);
    } else {
      merged[k] = mv;
      clashes.push(prefix + k);
    }
  }
  for (const k of Object.keys(merged)) if (merged[k] === undefined) delete merged[k];
  return { merged, clashes };
}

// The record a conflict ends up as when `side` ('mine' or 'theirs') is picked.
export function resolvedRecord(c, side) {
  const out = JSON.parse(JSON.stringify(c.merged));
  const src = side === 'mine' ? c.mine : c.theirs;
  for (const p of c.clashes) setPath(out, p, getPath(src, p));
  return { ...out, id: c.id, createdAt: c.mine.createdAt || c.theirs.createdAt };
}

// One record found on both sides: what to put here, or to delete, or a conflict.
function both(s, l, r, b, ltomb, rtomb, now) {
  if (same(l, r)) return {};
  if (!b) {
    // No shared starting point: the newer copy wins, unless deleted after it.
    const tomb = rtomb || ltomb;
    if (newer(r, l) && !(tomb && after(tomb, r))) return { put: r };
    return rtomb && after(rtomb, l) && after(rtomb, r) ? { del: true } : {};
  }
  const lc = !sameContent(l, b);
  const rc = !sameContent(r, b);
  if (!rc) return !lc && newer(r, l) ? { put: r } : {};
  if (!lc || sameContent(l, r)) return newer(r, l) || !lc ? { put: r } : {};
  const { merged, clashes } = mergeFields(b, l, r);
  const loud = clashes.filter((p) => !quietField(p));
  if (loud.length) return { conflict: { kind: 'both', store: s, id: l.id, mine: l, theirs: r, base: b, merged, clashes, loud } };
  const src = newer(r, l) ? r : l;
  for (const p of clashes) setPath(merged, p, getPath(src, p));
  return { put: { ...merged, id: l.id, createdAt: l.createdAt || r.createdAt, updatedAt: now } };
}

// local, remote: { store: [records] } (tombstones included).
// base: { store: { id: record } } or null.
// Returns what to change here (puts, dels), the conflicts, and `held`: the
// records whose copy in the file must stay as it is until a conflict is answered.
export function planMerge(local, remote, base, { now = new Date().toISOString() } = {}) {
  const puts = Object.fromEntries(STORES.map((s) => [s, []]));
  const dels = Object.fromEntries(STORES.map((s) => [s, []]));
  const conflicts = [];
  const held = new Set();
  const map = (side, s) => new Map((side[s] || []).map((r) => [r.id, r]));
  const lt = map(local, 'tombstones');
  const rt = map(remote, 'tombstones');
  const hold = (c) => { conflicts.push(c); held.add(keyOf(c.store, c.id)); };

  for (const s of RECORDS) {
    const L = map(local, s);
    const R = map(remote, s);
    for (const id of new Set([...L.keys(), ...R.keys()])) {
      const [l, r] = [L.get(id), R.get(id)];
      const b = (base && base[s] && base[s][id]) || null;
      const [ltomb, rtomb] = [lt.get(id), rt.get(id)];
      if (l && r) {
        const out = both(s, l, r, b, ltomb, rtomb, now);
        if (out.conflict) hold(out.conflict);
        else if (out.put) puts[s].push(out.put);
        else if (out.del) dels[s].push(id);
      } else if (l) {
        // Here, not in the file: new here (it goes out), or deleted there.
        if (!rtomb) continue;
        if (b && sameContent(l, b)) dels[s].push(id);
        else if (b) hold({ kind: 'deletedThere', store: s, id, mine: l, theirs: null, tomb: rtomb, base: b });
        else if (after(rtomb, l)) dels[s].push(id);
      } else if (!ltomb) {
        // Only in the file: new there (unless deleted after it there too).
        if (!(rtomb && after(rtomb, r))) puts[s].push(r);
      } else if (b && !sameContent(r, b)) {
        hold({ kind: 'deletedHere', store: s, id, mine: null, theirs: r, tomb: ltomb, base: b });
      } else if (!b && !after(ltomb, r)) {
        puts[s].push(r);
      }
    }
  }

  // Deletions from the other devices are kept here too, unless held. When
  // both have one for the same record, the later deletion is kept.
  for (const t of rt.values()) {
    if (held.has(keyOf(t.store, t.id))) continue;
    const mine = lt.get(t.id);
    if (!mine || (t.deletedAt || '') > (mine.deletedAt || '')) puts.tombstones.push(t);
  }
  const changed = STORES.some((s) => puts[s].length || dels[s].length);
  return { puts, dels, conflicts, held, changed };
}

// What the file should hold: this phone's data, except held records keep the
// file's own copy (and deletion) until their conflict is answered.
export function fileData(localAfter, remote, held) {
  const out = Object.fromEntries(STORES.map((s) => [s, [...(localAfter[s] || [])]]));
  for (const key of held) {
    const [s, id] = split(key);
    out[s] = out[s].filter((r) => r.id !== id);
    out.tombstones = out.tombstones.filter((t) => t.id !== id);
    const r = (remote[s] || []).find((x) => x.id === id);
    const t = (remote.tombstones || []).find((x) => x.id === id);
    if (r) out[s].push(r);
    if (t) out.tombstones.push(t);
  }
  for (const s of STORES) out[s].sort(byId);
  return out;
}

// The new "last agreed" copy: what was written (or read), except held
// records keep their old base, so the conflict is still seen next time.
export function nextBase(written, oldBase, held) {
  const out = {};
  for (const s of RECORDS) out[s] = Object.fromEntries((written[s] || []).map((r) => [r.id, r]));
  for (const key of held) {
    const [s, id] = split(key);
    const b = oldBase && oldBase[s] && oldBase[s][id];
    if (b) out[s][id] = b;
    else delete out[s][id];
  }
  return out;
}
