// Documenting Fictions: one backup for all four notebooks, from the shelf.
//
// The file holds each notebook's own backup, as that notebook makes it:
// Ref, Contact Sheet and Overthoughts as their databases (df-data.js's
// exportDb, with their cover colour), The Eye as its "Back up all data" file
// (its shoots and journal from localStorage, its photos from
// starky-moodboards). So a part can also be cut out and restored inside its
// own notebook if ever needed.
//
//   { app: 'documenting-fictions', kind: 'suite-backup', version: 1, exportedAt,
//     notebooks: { ref, 'the-eye', 'contact-sheet', overthoughts } }   (a part is null if that notebook has nothing yet)
//
// Built in pieces (Blobs), so a big library never has to be one string.
(function () {
  'use strict';
  const D = window.DFData;
  const btn = document.getElementById('backupBtn');
  if (!D || !btn) return;

  const DBS = [
    { id: 'ref', db: 'ref-notebook', app: 'ref', book: 'ref-notebook-book' },
    { id: 'contact-sheet', db: 'contact-sheet', app: 'contact-sheet', book: 'contact-sheet-book' },
    { id: 'overthoughts', db: 'overthoughts', app: 'overthoughts', book: 'overthoughts-book' },
  ];
  const EYE_STATE = 'dailies_state_v1';
  const EYE_LAST_BACKUP = 'dailies_last_backup_v1'; // The Eye's "Last backup", so its monthly reminder counts this one
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 8.5h15v11h-15zM3.5 4.5h17v4h-17zM12 11v6M9.5 14.5 12 17l2.5-2.5"/></svg>';

  // Which databases are there already. Opening one that isn't would make an
  // empty one, which its notebook would then trip over.
  async function existing() {
    if (!indexedDB.databases) return null; // can't tell: every one is tried
    return new Set((await indexedDB.databases()).map((d) => d.name));
  }

  async function makeBackup() {
    const have = await existing();
    const parts = [`{"app":"documenting-fictions","kind":"suite-backup","version":1,"exportedAt":${JSON.stringify(D.nowIso())},"notebooks":{`];
    const counts = [];
    for (const [i, n] of DBS.entries()) {
      let file = null;
      if (!have || have.has(n.db)) file = await D.exportDb(n.db, { app: n.app, extra: { book: ls.get(n.book) || '' } });
      parts.push(`${i ? ',' : ''}${JSON.stringify(n.id)}:`, file || 'null');
      if (file) counts.push(n.id);
    }
    const eye = ls.get(EYE_STATE) ? await D.eyeBackupFile() : null;
    parts.push(',"the-eye":', eye || 'null', '}}');
    if (eye) counts.push('the-eye');
    if (!counts.length) return null;
    return new File(parts, `documenting-fictions-backup-${D.todayStr()}.json`, { type: 'application/json' });
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
    if (data.extra && data.extra.book) ls.set(n.book, data.extra.book);
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

  async function restore(file) {
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

  // ---------- The sheet ----------
  function sheet(html) {
    const dim = document.createElement('div');
    dim.className = 'sheet-dim';
    dim.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(dim);
    requestAnimationFrame(() => dim.classList.add('in'));
    const close = () => { dim.classList.remove('in'); setTimeout(() => dim.remove(), 220); };
    dim.addEventListener('click', (e) => { if (e.target === dim || e.target.closest('[data-close]')) close(); });
    return { el: dim.firstElementChild, close };
  }
  const say = (s, text) => { const p = s.el.querySelector('.sheet-note'); p.textContent = text; p.hidden = !text; };

  btn.addEventListener('click', () => {
    const s = sheet(`
      <h2>Back up all four</h2>
      <p>One file with Ref, The Eye, Contact Sheet and Overthoughts, photos and all. Keep it somewhere safe, like Files or iCloud Drive.</p>
      <button type="button" class="sheet-btn primary" data-save>Save a backup</button>
      <button type="button" class="sheet-btn" data-restore>Restore from a backup</button>
      <p class="sheet-note" hidden></p>
      <button type="button" class="sheet-btn plain" data-close>Close</button>`);
    s.el.addEventListener('click', async (e) => {
      const save = e.target.closest('[data-save]');
      if (save) {
        save.disabled = true;
        save.textContent = 'Putting it together';
        try {
          const file = await makeBackup();
          if (!file) { say(s, 'There is nothing to back up yet.'); return; }
          const how = await D.saveFile(file);
          if (how !== 'cancelled') { ls.set(EYE_LAST_BACKUP, String(Date.now())); say(s, 'Backup saved.'); }
        } catch (err) {
          say(s, err.message || "The backup wasn't saved.");
        } finally {
          save.disabled = false;
          save.textContent = 'Save a backup';
        }
        return;
      }
      if (e.target.closest('[data-restore]')) {
        const file = await D.pickFile(); // straight from the tap, or iOS won't open the picker
        if (!file) return;
        const c = sheet(`
          <h2>Restore all four?</h2>
          <p>Everything in Ref, The Eye, Contact Sheet and Overthoughts on this device is swapped for what's in the file. This can't be undone, so save a backup first if you might want today's back.</p>
          <button type="button" class="sheet-btn primary danger" data-yes>Restore</button>
          <button type="button" class="sheet-btn plain" data-close>Cancel</button>
          <p class="sheet-note" hidden></p>`);
        c.el.querySelector('[data-yes]').addEventListener('click', async (ev) => {
          const yes = ev.currentTarget;
          yes.disabled = true;
          yes.textContent = 'Restoring';
          try {
            await restore(file);
            yes.textContent = 'Restored';
            say(c, 'All four are back as they were in the file.');
            setTimeout(() => location.reload(), 900);
          } catch (err) {
            yes.disabled = false;
            yes.textContent = 'Restore';
            say(c, err.message || "That backup couldn't be restored.");
          }
        });
      }
    });
  });
})();
