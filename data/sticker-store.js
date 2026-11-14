// Keeping the shelf's stickers: their own database (df-stickers), and the
// notebooks' old stickers copied in once. (Loaded before components/stickers.js.)
window.StickerParts = window.StickerParts || {};
window.StickerParts.addStickerStore = function addStickerStore(ed) {
  'use strict';
  Object.assign(ed, { write });
  // ---------- Keeping them ----------
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((ok, no) => {
    const r = indexedDB.open(ed.DB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(ed.STORE)) r.result.createObjectStore(ed.STORE, { keyPath: 'id' }); };
    r.onsuccess = () => {
      const d = r.result;
      d.onversionchange = () => { d.close(); dbp = null; }; // a restore from backup.js
      ok(d);
    };
    r.onerror = () => { dbp = null; no(r.error); };
  }));
  async function write(fn) {
    const d = await open();
    return new Promise((ok, no) => {
      const t = d.transaction(ed.STORE, 'readwrite');
      fn(t.objectStore(ed.STORE));
      t.oncomplete = () => ok();
      t.onerror = t.onabort = () => no(t.error || new Error("The sticker wasn't saved."));
    });
  }
  async function readAll() {
    const d = await open();
    return new Promise((ok, no) => {
      const q = d.transaction(ed.STORE).objectStore(ed.STORE).getAll();
      q.onsuccess = () => ok(q.result || []);
      q.onerror = () => no(q.error);
    });
  }

  ed.all = [];
  const listOf = (app) => ed.all.filter((s) => s.app === app).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))); ed.listOf = listOf;

  // ---------- The notebooks' own, copied in once ----------
  // Opens a notebook's database only if it's there: opening one that isn't
  // would make an empty one, which its notebook would then trip over.
  const openOld = (name) => new Promise((ok) => {
    let r;
    try { r = indexedDB.open(name); } catch (e) { ok(null); return; }
    r.onupgradeneeded = () => { try { r.transaction.abort(); } catch (e) { /* fine */ } };
    r.onsuccess = () => ok(r.result);
    r.onerror = (e) => { if (e && e.preventDefault) e.preventDefault(); ok(null); };
    r.onblocked = () => ok(null);
  });
  const get = (d, store, key) => new Promise((ok) => {
    try {
      if (!d.objectStoreNames.contains(store)) { ok(null); return; }
      const os = d.transaction(store).objectStore(store);
      const q = key === undefined ? os.getAll() : os.get(key);
      q.onsuccess = () => ok(q.result);
      q.onerror = () => ok(null);
    } catch (e) { ok(null); }
  });
  async function bytesOf(v) {
    if (!v) return null;
    if (v instanceof ArrayBuffer) return { bytes: v };
    if (ArrayBuffer.isView(v)) return { bytes: v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength) };
    if (v instanceof Blob) return { bytes: await v.arrayBuffer(), type: v.type };
    if (typeof v === 'string') { const b = await (await fetch(v)).blob(); return { bytes: await b.arrayBuffer(), type: b.type }; }
    return null;
  }
  async function moveIn() {
    let ls = null;
    try { ls = localStorage; if (ls.getItem(ed.MOVED)) return; } catch (e) { return; }
    const found = [];
    const add = async (app, s, photo, extra) => {
      try {
        const got = await bytesOf(photo);
        if (!got || !got.bytes || !got.bytes.byteLength) return;
        if (!['circle', 'square', 'rect'].includes(s.shape) || ![s.x, s.y, s.size].every(Number.isFinite)) return;
        found.push(Object.assign({
          id: `${app}-${s.id || ed.uid()}`, app, shape: s.shape, x: s.x, y: s.y, size: s.size,
          seed: Number.isFinite(s.seed) ? s.seed : undefined, bytes: got.bytes, type: got.type || 'image/jpeg',
          createdAt: s.createdAt || new Date(Date.now() - 1e6 + found.length * 1000).toISOString(),
        }, extra));
      } catch (e) { console.warn('A sticker could not be copied over', e); }
    };
    // Ref: its database's stickers store; the photo as bytes, rectangles 3:2.
    const ref = await openOld('ref-notebook');
    if (ref) {
      for (const s of (await get(ref, 'stickers')) || []) await add('ref', s, s.bytes, s.shape === 'rect' ? { ratio: 1.5 } : {});
      ref.close();
    }
    // Contact Sheet: printed pictures in its meta; the plain print (no creases), which has its own paper edge.
    const cs = await openOld('contact-sheet');
    if (cs) {
      const row = await get(cs, 'meta', 'stickers');
      for (const s of (row && Array.isArray(row.value) ? row.value : [])) await add('contact-sheet', s, s.plain || s.image, { ratio: s.ratio > 0 ? s.ratio : undefined, printed: true });
      cs.close();
    }
    // The Eye: with its shoots in localStorage, the photos in starky-moodboards.
    let eyeList = [];
    try { const st = JSON.parse(ls.getItem('dailies_state_v1') || 'null'); eyeList = (st && st.presentation && Array.isArray(st.presentation.stickers)) ? st.presentation.stickers : []; } catch (e) { /* none */ }
    if (eyeList.length) {
      const eye = await openOld('starky-moodboards');
      if (eye) {
        for (const s of eyeList) {
          const imgs = await get(eye, 'images', `${s.id}__sticker`);
          const first = Array.isArray(imgs) ? imgs[0] : null;
          await add('the-eye', s, first && (first.src || first.blob || first), s.shape === 'rect' && s.ratio > 0 ? { ratio: s.ratio } : {});
        }
        eye.close();
      }
    }
    if (found.length) await write((os) => found.forEach((s) => os.put(s)));
    ls.setItem(ed.MOVED, '1');
  }

  const ready = (async () => {
    try { await moveIn(); } catch (e) { console.warn('Stickers were not copied over', e); }
    try { ed.all = await readAll(); } catch (e) { console.warn('Stickers could not be read', e); ed.all = []; }
    return ed.all;
  })(); ed.ready = ready;
};
