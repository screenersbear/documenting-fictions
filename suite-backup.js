// Documenting Fictions: what's behind "Back up all four" on the shelf
// (backup.js is its sheet). Kept apart from the sheet so it can be tested.
//
// One backup for all four notebooks, from the shelf.
//
// A zip (df-data.js's zipBackup), put together from what's stored so the
// phone never holds all four in memory: every notebook's database (Ref,
// Contact Sheet, Overthoughts, and The Eye's photos, starky-moodboards),
// df-links (the boards sent from Ref to The Eye's shoots) and df-stickers
// (the covers' stickers), plus from localStorage The Eye's shoots and
// journal (dailies_state_v1) and each notebook's cover colour. A notebook's
// own Restore takes its part out of this file too.
//
// Backups of all four made the first way (one .json, kind 'suite-backup':
//   { app: 'documenting-fictions', kind: 'suite-backup', version: 1, exportedAt,
//     notebooks: { ref, 'the-eye', 'contact-sheet', overthoughts, links, stickers } }, a part null
//   if that notebook had nothing; one from before the stickers has no stickers part, and leaves
//   them as they are) still go back in.
(function () {
  'use strict';
  const D = window.DFData;
  if (!D) return;

  const DBS = [
    { id: 'ref', db: 'ref-notebook', app: 'ref', book: 'ref-notebook-book' },
    { id: 'contact-sheet', db: 'contact-sheet', app: 'contact-sheet', book: 'contact-sheet-book' },
    { id: 'overthoughts', db: 'overthoughts', app: 'overthoughts', book: 'overthoughts-book' },
    { id: 'links', db: 'df-links', app: 'documenting-fictions', book: null }, // boards sent from Ref to The Eye's shoots
    { id: 'stickers', db: 'df-stickers', app: 'documenting-fictions', book: null }, // the stickers on the four covers (stickers.js)
  ];
  const EYE_STATE = 'dailies_state_v1';
  const EYE_LAST_BACKUP = 'dailies_last_backup_v1'; // The Eye's "Last backup", so its monthly reminder counts this one
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };

  // Which databases are there already. Opening one that isn't would make an
  // empty one, which its notebook would then trip over.
  async function existing() {
    if (!indexedDB.databases) return null; // can't tell: every one is tried
    return new Set((await indexedDB.databases()).map((d) => d.name));
  }

  const EYE_DB = 'starky-moodboards'; // The Eye's photos
  const DB_NAMES = [...DBS.map((n) => n.db), EYE_DB];

  // { parts, size, release, done } (df-data.js's zipBackup), or null with nothing to back up.
  async function makeBackup(onProgress) {
    const have = await existing();
    const eye = !!ls.get(EYE_STATE);
    const dbs = DBS.map((n) => n.db).filter((n) => !have || have.has(n));
    if (eye) dbs.push(EYE_DB);
    if (!dbs.length) return null;
    return D.zipBackup({
      app: 'documenting-fictions',
      kind: 'suite',
      databases: dbs,
      local: [...(eye ? [EYE_STATE] : []), ...DBS.filter((n) => n.book).map((n) => n.book)],
      filename: `documenting-fictions-backup-${D.todayStr()}.zip`,
      onProgress,
    });
  }

  // A backup zip of all four back in: the databases it has (each swapped for
  // its part), then the cover colours and The Eye's shoots and journal. The
  // Eye's part is checked before anything is changed.
  async function restoreZip(files, onProgress) {
    const r = await D.restoreZip(files, {
      kind: 'suite',
      databases: DB_NAMES,
      onProgress,
      check: async (local) => {
        const st = await local(EYE_STATE);
        if (st == null) return;
        let ok = false;
        try { ok = Array.isArray(JSON.parse(st).shoots); } catch (e) { /* not JSON */ }
        if (!ok) throw new Error("The Eye's part of that file isn't right. Nothing was changed.");
      },
    });
    for (const n of DBS) {
      const book = n.book ? await r.local(n.book) : null;
      if (book) ls.set(n.book, book);
    }
    const st = await r.local(EYE_STATE);
    if (st != null) {
      localStorage.setItem(EYE_STATE, st); // throws if it doesn't fit, and the restore says so
      const color = JSON.parse(st).presentation && JSON.parse(st).presentation.color;
      if (color) ls.set('df-app-color', color);
    }
  }

  // Puts one notebook's database back from its part, exactly as it was: its
  // stores are cleared first. The slow part (turning data URLs back into
  // photos) is done before the write opens, or the write would close on the
  // wait. A notebook never opened on this device gets its database made from
  // what the backup says it looked like.
  async function putBack(n, data, have) {
    const unpacked = {};
    for (const [name, s] of Object.entries(data.stores)) {
      unpacked[name] = [];
      for (const [k, v] of s.rows || []) unpacked[name].push([await unpack(k), await unpack(v)]);
    }
    const fresh = have ? !have.has(n.db) : false;
    const db = await D.open(n.db, fresh ? data.version : undefined, fresh ? (made) => {
      for (const [name, s] of Object.entries(data.stores)) {
        if (made.objectStoreNames.contains(name)) continue;
        const m = s.meta || {};
        const os = made.createObjectStore(name, m.keyPath == null ? { autoIncrement: !!m.autoIncrement } : { keyPath: m.keyPath, autoIncrement: !!m.autoIncrement });
        (m.indexes || []).forEach((ix) => os.createIndex(ix.name, ix.keyPath, { unique: !!ix.unique, multiEntry: !!ix.multiEntry }));
      }
    } : null);
    const names = Object.keys(unpacked).filter((s) => db.objectStoreNames.contains(s));
    if (names.length) {
      const tx = db.transaction(names, 'readwrite');
      names.forEach((s) => {
        const os = tx.objectStore(s);
        os.clear();
        unpacked[s].forEach(([k, v]) => { if (os.keyPath) os.put(v); else os.put(v, k); });
      });
      await new Promise((ok, no) => { tx.oncomplete = ok; tx.onabort = tx.onerror = () => no(tx.error || new Error("That wasn't restored.")); });
    }
    db.close();
    if (n.book && data.extra && data.extra.book) ls.set(n.book, data.extra.book);
  }

  // df-data.js keeps its unpacking to itself; this is the same thing.
  async function unpack(v) {
    if (Array.isArray(v)) { const out = []; for (const x of v) out.push(await unpack(x)); return out; }
    if (v && typeof v === 'object') {
      if (typeof v.__blob === 'string') {
        const b = await (await fetch(v.__blob)).blob();
        return v.name ? new File([b], v.name, { type: v.type || b.type, lastModified: v.lastModified || Date.now() }) : new Blob([b], { type: v.type || b.type });
      }
      if (typeof v.__buf === 'string') {
        const buf = await (await (await fetch(v.__buf)).blob()).arrayBuffer();
        return v.__view && typeof self[v.__view] === 'function' ? new self[v.__view](buf) : buf;
      }
      if (typeof v.__date === 'string') return new Date(v.__date);
      const out = {}; for (const k of Object.keys(v)) out[k] = await unpack(v[k]); return out;
    }
    return v;
  }

  // The Eye, the way its own Restore does it: the shoots and journal into
  // localStorage (it tidies them up as it opens), the photos into its
  // database, key by key.
  async function putBackEye(part) {
    if (!part || !part.state || !Array.isArray(part.state.shoots)) throw new Error("The Eye's part of that file isn't right.");
    const db = await D.open('starky-moodboards', 1, (made) => { if (!made.objectStoreNames.contains('images')) made.createObjectStore('images'); });
    const tx = db.transaction('images', 'readwrite');
    Object.entries(part.images || {}).forEach(([k, v]) => tx.objectStore('images').put(v, k));
    await new Promise((ok, no) => { tx.oncomplete = ok; tx.onabort = tx.onerror = () => no(tx.error || new Error("The Eye's photos weren't restored.")); });
    db.close();
    localStorage.setItem(EYE_STATE, JSON.stringify(part.state)); // throws if it doesn't fit, and the restore says so
    if (part.state.presentation && part.state.presentation.color) ls.set('df-app-color', part.state.presentation.color);
  }

  // A backup of all four made the first way (one .json).
  async function restoreJson(file) {
    let data;
    try { data = JSON.parse(await file.text()); } catch (e) { throw new Error("That file isn't a Documenting Fictions backup."); }
    if (!data || data.kind !== 'suite-backup' || !data.notebooks) throw new Error("That file isn't a backup of all four. A single notebook's backup goes back in from that notebook's options.");
    // Every part checked before anything is written.
    for (const n of DBS) {
      const part = data.notebooks[n.id];
      if (part && (!part.stores || part.database !== n.db)) throw new Error(`The ${n.id} part of that file isn't right. Nothing was changed.`);
    }
    const eye = data.notebooks['the-eye'];
    if (eye && (!eye.state || !Array.isArray(eye.state.shoots))) throw new Error("The Eye's part of that file isn't right. Nothing was changed.");
    const have = await existing();
    for (const n of DBS) if (data.notebooks[n.id]) await putBack(n, data.notebooks[n.id], have);
    if (data.notebooks['the-eye']) await putBackEye(data.notebooks['the-eye']);
  }

  window.DFSuiteBackup = { makeBackup, restoreZip, restoreJson, EYE_LAST_BACKUP };
})();
