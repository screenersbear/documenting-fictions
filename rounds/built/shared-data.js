// Made by tools/join.mjs from the files listed in files.txt. Never edit it: change those files, then run node tools/join.mjs.

// ---- data/shared/basics.js ----
// Documenting Fictions: the data helpers every notebook shares. This file:
// IndexedDB made a little plainer, plus small helpers (dates, ids, where the
// notebooks are). Loaded first; the files after it are in df-data.js's list.
//
// The master copies are in shared/data/ in the suite; tools/sync.py copies
// them into each notebook's data/shared/ folder, so a notebook copied out on
// its own still has them. Edit those, then run the sync.
//
// Each notebook keeps its own database, named for it: ref-notebook,
// contact-sheet, the-eye's starky-moodboards (its photos; its shoots are in
// localStorage, dailies_state_v1) and overthoughts. What one notebook hands
// another (a Ref board sent to a shoot in The Eye) goes in a database of its
// own, df-links, as a link saying where it came from and where it went:
// { id, fromApp, fromId, toApp, toId, type, createdAt }.
//
// The files share their inner helpers through window.DFDataParts; what the
// notebooks use is window.DFData, put together last by df-data.js.
(function () {
  'use strict';
  const parts = (window.DFDataParts = {});

  // ---------- IndexedDB, a little plainer ----------
  const ask = (r) => new Promise((ok, no) => { r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
  const finish = (tx) => new Promise((ok, no) => {
    tx.oncomplete = () => ok();
    tx.onabort = tx.onerror = () => no(tx.error || new Error("That wasn't saved."));
  });
  function open(name, version, upgrade) {
    return new Promise((ok, no) => {
      const r = indexedDB.open(name, version);
      if (upgrade) r.onupgradeneeded = (e) => upgrade(r.result, e.oldVersion, r.transaction);
      r.onsuccess = () => { const db = r.result; db.onversionchange = () => db.close(); ok(db); };
      r.onerror = () => no(r.error);
      r.onblocked = () => no(new Error("Close this app's other tabs and try again."));
    });
  }
  // Every row of a store, with its key (stores with keys of their own and stores without).
  function rows(db, store) {
    return new Promise((ok, no) => {
      const out = [];
      const r = db.transaction(store).objectStore(store).openCursor();
      r.onsuccess = () => { const c = r.result; if (!c) { ok(out); return; } out.push([c.key, c.value]); c.continue(); };
      r.onerror = () => no(r.error);
    });
  }
  const getOne = (db, store, key) => ask(db.transaction(store).objectStore(store).get(key));
  async function putMany(db, store, list) { // list of values, or [key, value] pairs for stores without a keyPath
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    list.forEach((v) => { if (os.keyPath) os.put(v); else os.put(v[1], v[0]); });
    return finish(tx);
  }
  async function deleteOne(db, store, key) { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).delete(key); return finish(tx); }
  const hasText = (v) => typeof v === 'string' && v.trim() !== '';
  const nowIso = () => new Date().toISOString();
  const pad = (n) => String(n).padStart(2, '0');
  const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };
  // ---------- Where the notebooks are ----------
  const inSuite = () => !!window.DF_SUITE;
  // A link into another notebook of the suite (null on its own).
  const notebookUrl = (id, params) => (inSuite() ? `../${id}/${params ? `?${new URLSearchParams(params)}` : ''}` : null);

  Object.assign(parts, {
    ask, finish, open, rows, getOne, putMany, deleteOne, hasText, nowIso, todayStr, uid, store,
    inSuite, notebookUrl
  });
})();
;

// ---- data/shared/links.js ----
// Links between notebooks: a Ref board sent to a shoot in The Eye, and the
// board file that carries it.
(function () {
  'use strict';
  const parts = window.DFDataParts;
  const { finish, open, rows, getOne, hasText, nowIso, uid, blobToDataUrl } = parts;

  // ---------- Links: a Ref board sent to a shoot in The Eye ----------
  // Its own database, df-links, so neither notebook writes into the other's:
  //   links     { id, fromApp, fromId, toApp, toId, type, createdAt, updatedAt,
  //               name, pageCount, photoCount, drawnAt, drawnOf, frozenAt, importedAt, pending }
  //   pictures  (key: the link's id) { cover, pages: [...] }, each { type, bytes }
  // A board on a shoot: type 'moodboard', from 'ref' (the board's id) to
  // 'the-eye' (the shoot's id). Its pages are kept as pictures (drawnAt: when
  // they were made). Ref draws them again while the shoot is still to come;
  // once the shoot is shot The Eye sets frozenAt and they never change again.
  // A board that came in as a file (importedAt) is fixed from the start.
  // drawnOf: a key of how the board looked when drawn (Ref's to compare);
  // pending: Ref's + New shoot from this board, until The Eye makes the shoot.
  // Pictures are kept as bytes, not Blobs: Safari's stored Blobs break when
  // a record is saved again.
  const LINKS = 'df-links';
  // Version 1: the upgrade only runs when the database is first made, so the stores are always new.
  const openLinks = () => open(LINKS, 1, (db) => {
    db.createObjectStore('links', { keyPath: 'id' });
    db.createObjectStore('pictures');
  });
  async function withLinks(fn) {
    const db = await openLinks();
    try { return await fn(db); } finally { db.close(); }
  }
  // Every link matching all of the fields given, e.g. { toApp: 'the-eye', toId }.
  const linksWhere = (match = {}) => withLinks(async (db) => (await rows(db, 'links'))
    .map(([, l]) => l)
    .filter((l) => Object.keys(match).every((k) => l[k] === match[k]))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
  const getLink = (id) => withLinks((db) => getOne(db, 'links', id));
  // Saves a link (made or changed), and its pictures with it when given.
  const saveLink = (link, pictures) => withLinks((db) => {
    const now = nowIso();
    const l = { ...link, id: link.id || uid(), createdAt: link.createdAt || now, updatedAt: now };
    const tx = db.transaction(['links', 'pictures'], 'readwrite');
    tx.objectStore('links').put(l);
    if (pictures) tx.objectStore('pictures').put(pictures, l.id);
    return finish(tx).then(() => l);
  });
  const linkPictures = (id) => withLinks((db) => getOne(db, 'pictures', id));
  const dropLinks = (ids) => withLinks((db) => {
    const tx = db.transaction(['links', 'pictures'], 'readwrite');
    ids.forEach((id) => { tx.objectStore('links').delete(id); tx.objectStore('pictures').delete(id); });
    return finish(tx);
  });
  const pictureUrl = (p) => (p && p.bytes ? URL.createObjectURL(new Blob([p.bytes], { type: p.type || 'image/jpeg' })) : '');
  // A board as one file, for a Ref and a The Eye that don't share a phone's
  // storage (each installed on its own): the same pictures, in a versioned
  // JSON file. Built in pieces, so a big board is never one string.
  const BOARD_FILE = { app: 'ref', kind: 'ref-board', version: 1 };
  async function boardFile(about, pictures) {
    const url = (p) => blobToDataUrl(new Blob([p.bytes], { type: p.type || 'image/jpeg' }));
    const head = { ...BOARD_FILE, exportedAt: nowIso(), board: { id: about.id, name: about.name, pageCount: about.pageCount, photoCount: about.photoCount, updatedAt: about.updatedAt } };
    const parts = [JSON.stringify(head).slice(0, -1), ',"cover":', JSON.stringify(pictures.cover ? await url(pictures.cover) : null), ',"pages":['];
    for (const [i, p] of pictures.pages.entries()) parts.push(i ? ',' : '', JSON.stringify(await url(p)));
    parts.push(']}');
    const safe = String(about.name || 'Mood board').replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'Mood board';
    return new File(parts, `${safe} (board).json`, { type: 'application/json' });
  }
  // Reads a board file back: { board, pictures }, or throws saying what's wrong.
  async function readBoardFile(file) {
    let data;
    try { data = JSON.parse(await file.text()); } catch (e) { throw new Error("That file isn't a board from Ref."); }
    if (!data || data.kind !== BOARD_FILE.kind || !Array.isArray(data.pages)) throw new Error("That file isn't a board from Ref.");
    if (data.version > BOARD_FILE.version) throw new Error('That board was made by a newer Ref. Update this app and try again.');
    const picture = async (u) => {
      if (typeof u !== 'string' || !u.startsWith('data:image/')) return null;
      const b = await (await fetch(u)).blob();
      return { type: b.type || 'image/jpeg', bytes: await b.arrayBuffer() };
    };
    const pages = (await Promise.all(data.pages.map(picture))).filter(Boolean);
    if (!pages.length) throw new Error('That board has no pages in it.');
    const b = data.board || {};
    return {
      board: { id: typeof b.id === 'string' ? b.id : null, name: hasText(b.name) ? b.name : 'Mood board', pageCount: pages.length, photoCount: Number(b.photoCount) || 0 },
      pictures: { cover: (await picture(data.cover)) || pages[0], pages },
    };
  }

  Object.assign(parts, {
    linksWhere, getLink, saveLink, linkPictures, dropLinks, pictureUrl, boardFile,
    readBoardFile
  });
})();
;

// ---- data/shared/connect.js ----
// How the notebooks connect (round 2, connect/NOTES.md): each notebook hands
// one thing to the next and the work goes round: Ref to The Eye (a mood
// board), The Eye to Layouts (the finals) and to Rounds (the shoot's people),
// Layouts to Rounds (the people in a post), Rounds to Ref (a new client).
// Every hand-off is a link in df-links (links.js), so no notebook writes
// into another's database. One that arrives shows once, as a slip at the top
// of the receiving list, until it's opened or tucked away (NOT NOW); while
// it waits, the notebook has a slip on its cover on the shelf. Each hand-off
// has a switch (the shelf's Options, HOW THEY CONNECT), all on unless turned
// off; off, it simply doesn't happen. window.DFConnect.
(function () {
  'use strict';
  const parts = window.DFDataParts;
  const { linksWhere, saveLink, nowIso } = parts;

  // The hand-offs in the loop's order. type: the link's type in df-links;
  // waiting: what a slip on the shelf says is there.
  const HANDOFFS = [
    { key: 'moodboards', from: 'ref', to: 'the-eye', type: 'moodboard', name: 'Mood boards', line: "A board sent to a shoot stays live until it's shot." },
    { key: 'finals', from: 'the-eye', to: 'contact-sheet', type: 'finals', name: 'Final images', line: 'Delivered finals arrive, with two posts made.', waiting: 'finals from The Eye' },
    { key: 'people', from: 'the-eye', to: 'rounds', type: 'people', name: "The shoot's people", line: 'Talent and team come in with a thank-you ready.' },
    { key: 'posts', from: 'contact-sheet', to: 'rounds', type: 'post-people', name: 'New posts', line: 'When a post goes up, a nudge for the people in it.', waiting: 'a new post from Layouts' },
    { key: 'clients', from: 'rounds', to: 'ref', type: 'new-client', name: 'New clients', line: 'A yes, or someone asking to shoot, starts a board.', waiting: 'a new client from Rounds' },
  ];
  const handoff = (type) => HANDOFFS.find((h) => h.type === type) || null;

  // Each notebook's own pair of colours and its small mark (24 x 24), as the
  // slips and the HOW THEY CONNECT rows show them.
  const NOTEBOOKS = {
    ref: { name: 'Ref', bg: '#0A4FD6', fg: '#FFAFAB' },
    'the-eye': { name: 'The Eye', bg: '#FFD100', fg: '#313D45' },
    'contact-sheet': { name: 'Layouts', bg: '#CC2E8A', fg: '#E2E600' },
    rounds: { name: 'Rounds', bg: '#313D45', fg: '#FFD100' },
  };
  const MARKS = {
    ref: '<g transform="translate(12 12) rotate(45) translate(-6 -6)"><rect width="6" height="6" fill="#FFAFAB"/><rect x="6" width="6" height="6" fill="#FFFFFF"/><rect y="6" width="6" height="6" fill="#FFFFFF"/><rect x="6" y="6" width="6" height="6" fill="#FFAFAB"/></g>',
    'the-eye': '<circle cx="12" cy="12" r="6.5" fill="none" stroke="#313D45" stroke-width="3"/>',
    'contact-sheet': '<rect x="5" y="6" width="3.6" height="12" fill="#E2E600"/><rect x="10.2" y="8.4" width="3.6" height="9.6" fill="#FFFFFF"/><rect x="15.4" y="10.3" width="3.6" height="7.7" fill="#E2E600"/>',
    rounds: '<path d="M5 17 A7 7 0 0 1 19 17" fill="none" stroke="#FFD100" stroke-width="2.2"/><circle cx="6" cy="13.2" r="2" fill="#14BFA0"/><circle cx="12" cy="10" r="1.6" fill="#FFFFFF"/><circle cx="18" cy="13.2" r="1.3" fill="#14BFA0"/>',
  };
  const markSvg = (app, size = 20) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${MARKS[app] || ''}</svg>`;
  // A notebook's mark on its colour, 20 px square.
  const miniHtml = (app) => `<span class="df-mini" style="background:${(NOTEBOOKS[app] || {}).bg || '#E1E1DC'}" aria-hidden="true">${markSvg(app)}</span>`;
  // From one notebook to another: the two minis with an arrow between.
  const ARROW = '<svg class="df-arrow" viewBox="0 0 16 10" width="16" height="10" aria-hidden="true"><path d="M1 5h12M9 1.5 13 5 9 8.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const pairHtml = (from, to) => `<span class="df-pair">${miniHtml(from)}${ARROW}${miniHtml(to)}</span>`;

  // ---------- The switches ----------
  // Kept on this phone for every notebook in the suite (they share its storage).
  const SWITCHES = 'df-connect';
  function switches() {
    try {
      const v = JSON.parse(localStorage.getItem(SWITCHES));
      return v && typeof v === 'object' ? v : {};
    } catch (e) { return {}; }
  }
  const connectOn = (key) => switches()[key] !== false;
  function setConnect(key, on) {
    try { localStorage.setItem(SWITCHES, JSON.stringify({ ...switches(), [key]: !!on })); } catch (e) { /* storage blocked: stays as it was */ }
  }

  // ---------- Slips ----------
  const isWaiting = (l) => !!handoff(l.type) && !!handoff(l.type).waiting && !l.openedAt && !l.tuckedAt;
  // The hand-offs waiting in a notebook, newest first.
  const slipsFor = async (app) => (await linksWhere({ toApp: app })).filter(isWaiting).reverse();
  // Its main button pressed (openedAt) or NOT NOW (tuckedAt): it doesn't show again.
  const openSlip = (l) => saveLink({ ...l, openedAt: nowIso() });
  const tuckSlip = (l) => saveLink({ ...l, tuckedAt: nowIso() });
  // For the shelf: what's waiting in each notebook, newest first,
  // { app: [{ from, what }, ...] }.
  async function waitingByApp() {
    const out = {};
    for (const l of (await linksWhere()).filter(isWaiting).reverse()) (out[l.toApp] = out[l.toApp] || []).push({ from: l.fromApp, what: handoff(l.type).waiting });
    return out;
  }

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // TODAY, or the day it came ('14 Nov'), as the slip's corner says it.
  function whenWords(iso, now = new Date()) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const same = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    return same ? 'Today' : `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  }

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // A slip, the same in every notebook: FROM <NOTEBOOK> in the sender's
  // colours, the day, a title, one dim line, what it brought (body, markup),
  // then one main button in the receiving notebook's colour and NOT NOW.
  const sender = (app) => NOTEBOOKS[app] || { name: app, bg: '#E1E1DC', fg: '#313D45' };
  // The notched tag, FROM <NOTEBOOK> in the sender's colours with its mark.
  const tagHtml = (app) => `<span class="df-slip-tag" style="background:${sender(app).bg};color:${sender(app).fg}">${markSvg(app, 18)}From ${esc(sender(app).name)}</span>`;
  function slipHtml({ link, title, line, body = '', main, mainClass = '' }) {
    return `<section class="df-slip" data-slip="${esc(link.id)}" aria-label="From ${esc(sender(link.fromApp).name)}">
      <div class="df-slip-head">${tagHtml(link.fromApp)}<span class="df-slip-when">${esc(whenWords(link.createdAt))}</span></div>
      <p class="df-slip-title">${esc(title)}</p>
      ${line ? `<p class="df-slip-line">${esc(line)}</p>` : ''}${body}
      <div class="df-slip-actions"><button type="button" class="df-slip-main ${mainClass}" data-slip-open>${esc(main)}</button><button type="button" class="df-slip-later" data-slip-later>Not now</button></div>
    </section>`;
  }

  // ---------- What passes ----------
  // An Instagram handle as typed (@name, a profile address, or the name), cleaned.
  function cleanHandle(v) {
    const t = String(v ?? '').trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[/?#].*$/, '').replace(/^@+/, '');
    return /^[A-Za-z0-9._]{1,30}$/.test(t) ? t : '';
  }
  const named = (x) => !!x && typeof x.name === 'string' && x.name.trim() !== '';
  // A shoot's credits from The Eye, for a caption: its talent and team, each
  // with an Instagram handle when there is one.
  function shootCredits(shoot) {
    const insta = (list) => cleanHandle(((list || []).find((h) => h && h.platform === 'instagram') || {}).handle);
    return {
      talent: ((shoot && shoot.talents) || []).filter(named).map((t) => ({ name: t.name.trim(), handle: insta(t.socialHandles) })),
      team: ((shoot && shoot.teamMembers) || []).filter(named).map((m) => ({
        role: String(m.role || '').trim(), name: m.name.trim(),
        handle: (m.socialPlatform || 'instagram') === 'instagram' ? cleanHandle(m.socialHandle) : '',
      })),
    };
  }
  const listWords = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
  // A post's caption: the shoot's title, then the credits ("Rooftop portraits
  // with June Park @junepark.jpg. Hair and makeup @iryna.hmua.").
  function captionFor(title, credits) {
    const c = credits || {};
    const who = (c.talent || []).map((t) => (t.handle ? `${t.name} @${t.handle}` : t.name));
    const head = `${String(title || '').trim() || 'New work'}${who.length ? ` with ${listWords(who)}` : ''}.`;
    const team = (c.team || []).map((m) => `${m.role || 'With'} ${m.handle ? `@${m.handle}` : m.name}.`);
    return [head, ...team].join(' ');
  }
  // Everyone tagged in a caption, each once, as typed.
  const handlesIn = (text) => [...new Set((String(text || '').match(/(^|[^\w.@])@([A-Za-z0-9._]{1,30})/g) || []).map((m) => m.replace(/^[^@]*@/, '').replace(/\.+$/, '')))].filter(Boolean);

  const DAY = (iso) => { if (!iso) return ''; const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  // A shoot's record in The Eye (connect/02): what it passed on (its finals
  // to Layouts, its people to Rounds) and what came in (a board from Ref).
  // Each row opens the thing in the other notebook: { app, params }.
  function passedOnRows(links, shootId) {
    const passed = [];
    const came = [];
    for (const l of links) {
      if (l.fromApp === 'the-eye' && l.fromId === shootId && l.type === 'finals') {
        passed.push({ from: 'the-eye', to: 'contact-sheet', title: `${plural(l.count || 0, 'final', 'finals')} to Layouts`, line: l.madeAt ? `${postsWord((l.postIds || []).length || 2)} made, waiting there.` : 'Waiting there.', app: 'contact-sheet', params: { posts: l.id } });
      } else if (l.fromApp === 'the-eye' && l.fromId === shootId && l.type === 'people') {
        const names = l.names || [];
        passed.push({ from: 'the-eye', to: 'rounds', title: `${plural(names.length, 'person', 'people')} to Rounds`, line: `${names.join(', ').replace(/\.$/, '')}. ${names.length === 1 ? 'A thank-you' : 'Thank-yous'} ready.`, app: 'rounds', params: { at: 'people' } });
      } else if (l.toApp === 'the-eye' && l.toId === shootId && l.type === 'moodboard') {
        const when = DAY(l.frozenAt || l.drawnAt || l.importedAt || l.updatedAt);
        came.push({ from: 'ref', to: 'the-eye', title: l.name || 'Mood board', line: `Mood board from Ref${when ? `, as of ${when}` : ''}.`, app: 'ref', params: l.importedAt ? null : { board: l.fromId } });
      }
    }
    // The finals first, then the people (as in connect/02), whichever passed first.
    const order = (r) => (r.to === 'contact-sheet' ? 0 : 1);
    return { passed: passed.sort((a, b) => order(a) - order(b)), came };
  }

  // ---------- Finals into posts (Layouts, connect/03) ----------
  // Which finals go in the two posts, by their place in The Eye's list (the
  // order they were added): a carousel of up to 5 starting with the first
  // (the cover), the rest spread through the set so it isn't five of one
  // look; the single is the first one left over. One final makes only the
  // single; up to five make only the carousel.
  function pickPosts(n) {
    const count = Math.max(0, Math.floor(Number(n) || 0));
    if (count === 0) return { carousel: [], single: null };
    if (count === 1) return { carousel: [], single: 0 };
    if (count <= 5) return { carousel: [...Array(count).keys()], single: null };
    const carousel = [0, 1, 2, 3, 4].map((i) => Math.round((i * count) / 5));
    return { carousel, single: [...Array(count).keys()].find((i) => !carousel.includes(i)) };
  }
  const postsWord = (n) => (n === 1 ? 'A post' : n === 2 ? 'Two posts' : `${n} posts`);
  // The slip's line: "12 finals. Two posts made from them, ready to look over."
  const postsLine = (finals, posts) => `${plural(finals, 'final', 'finals')}. ${postsWord(posts)} made from ${finals === 1 ? 'it' : 'them'}, ready to look over.`;
  // The page's title: "Two posts from Rooftop portraits".
  const postsTitle = (posts, title) => `${postsWord(posts)} from ${String(title || '').trim() || 'the shoot'}`;

  // The rows of a record (passedOnRows), each a link to the other notebook
  // when it has an address (row.href), a plain row when it hasn't.
  const CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
  function recordHtml(rows) {
    const row = (r) => {
      const inner = `${pairHtml(r.from, r.to)}<span class="df-record-words"><span class="df-record-title">${esc(r.title)}</span><span class="df-record-line">${esc(r.line)}</span></span>`;
      return r.href
        ? `<a class="df-record-row" href="${esc(r.href)}">${inner}<span class="df-record-chev">${CHEV}</span></a>`
        : `<div class="df-record-row">${inner}</div>`;
    };
    return `<div class="df-record">${rows.map(row).join('')}</div>`;
  }

  window.DFConnect = {
    HANDOFFS, NOTEBOOKS, handoff, connectOn, setConnect, slipsFor, openSlip, tuckSlip, waitingByApp,
    whenWords, slipHtml, tagHtml, markSvg, miniHtml, pairHtml, cleanHandle, shootCredits, captionFor, handlesIn, passedOnRows, recordHtml, pickPosts, postsLine, postsTitle,
  };
})();
;

// ---- data/shared/waiting.js ----
// What's waiting in each notebook, for the shelf's floating ! and its
// preview (round 2, connect/16 and 17): the hand-offs not yet opened or
// tucked away (df-links, connect.js), then the notebook's own items. Each
// notebook writes its own items for itself (Rounds: the day's cards; The
// Eye: its Today items), with the days each is for, so the shelf knows what
// today holds without opening it. Nothing here writes into a notebook's
// database. window.DFWaiting.
(function () {
  'use strict';
  const { nowIso, todayStr } = window.DFDataParts;
  const C = window.DFConnect;

  // ---------- A notebook's own items ----------
  // Kept on this phone, one key per notebook, written only by that notebook:
  // { at, items: [{ title, line, from, until, params }] }. from and until are
  // days ('2026-11-15'); without until, an item stays from its day on (a
  // deadline gone by stays until it's dealt with). params open it there.
  const KEY = (app) => `df-waiting-${app}`;
  const isDay = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const text = (s) => String(s ?? '').trim();
  function cleanItem(x) {
    if (!x || !text(x.title) || !isDay(x.from)) return null;
    const item = { title: text(x.title), line: text(x.line), from: x.from };
    if (isDay(x.until)) item.until = x.until;
    if (x.params && typeof x.params === 'object') item.params = x.params;
    return item;
  }
  function publishWaiting(app, items) {
    const clean = (Array.isArray(items) ? items : []).map(cleanItem).filter(Boolean);
    try { localStorage.setItem(KEY(app), JSON.stringify({ at: nowIso(), items: clean })); } catch (e) { /* storage full or blocked: the shelf just doesn't know */ }
    return clean;
  }
  function readOwn(app) {
    try {
      const v = JSON.parse(localStorage.getItem(KEY(app)));
      return v && Array.isArray(v.items) ? v.items.map(cleanItem).filter(Boolean) : [];
    } catch (e) { return []; }
  }
  // Its items for today (or the day given), in the order it wrote them.
  const ownWaiting = (app, today = todayStr()) => readOwn(app).filter((x) => x.from <= today && (!x.until || today <= x.until));

  // ---------- Rows for the preview ----------
  // A hand-off: the two minis with an arrow, what it is, who sent it and
  // when ("From The Eye, today"). It opens the notebook, where its slip is.
  function handoffTitle(l) {
    if (l.type === 'finals') return C.postsTitle(((l.postIds || []).length) || 2, l.title);
    if (l.type === 'new-client') return `${text(l.name) || 'Someone'} said yes`;
    return text(l.title) || C.handoff(l.type).waiting;
  }
  function handoffRow(l) {
    const when = C.whenWords(l.createdAt);
    const sender = (C.NOTEBOOKS[l.fromApp] || { name: l.fromApp }).name;
    return { kind: 'handoff', from: l.fromApp, to: l.toApp, title: handoffTitle(l), line: `From ${sender}${when ? `, ${when === 'Today' ? 'today' : when}` : ''}`, params: null };
  }
  const ownRow = (app, x) => ({ kind: 'own', from: app, to: app, title: x.title, line: x.line, params: x.params || null });

  // Everything waiting in a notebook: its hand-offs, newest first, then its
  // own items for today.
  async function waitingIn(app, today = todayStr()) {
    const links = await C.slipsFor(app);
    return [...links.map(handoffRow), ...ownWaiting(app, today).map((x) => ownRow(app, x))];
  }
  // The same for every notebook: { app: rows }.
  async function waitingAll(apps, today = todayStr()) {
    const out = {};
    for (const app of apps) out[app] = await waitingIn(app, today);
    return out;
  }
  // What the ! says to a screen reader: "Layouts: 2 things waiting".
  const waitingLabel = (name, n) => `${name}: ${n} ${n === 1 ? 'thing' : 'things'} waiting`;

  window.DFWaiting = { publishWaiting, ownWaiting, handoffTitle, handoffRow, waitingIn, waitingAll, waitingLabel };
})();
;

// ---- data/shared/df-data.js ----
// window.DFData: everything the notebooks use from the shared data files,
// put together. Loaded last, after the other files in data/shared/.
(function () {
  'use strict';
  const parts = window.DFDataParts;
  const {
    open, rows, getOne, putMany, deleteOne, hasText, nowIso, todayStr, uid, overthoughts,
    linkId, reflectionId, saveReflections, dropReflections, reflections, eyeState,
    eyeShootName, eyeBackupFile, readEyeFile, journalMoved, somethingToMove, moveJournal,
    exportDb, importDb, sizeText, zipBackup, backupSteps, isZipFile, restoreZip, linksWhere,
    getLink, saveLink, linkPictures, dropLinks, pictureUrl, boardFile, readBoardFile, saveFile,
    pickFiles, pickFile, inSuite, notebookUrl
  } = parts;

  window.DFData = {
    open, rows, getOne, putMany, deleteOne, hasText, todayStr, uid, nowIso,
    overthoughts, reflectionId, linkId, saveReflections, dropReflections, reflections,
    eyeState, eyeShootName, eyeBackupFile, readEyeFile,
    journalMoved, somethingToMove, moveJournal,
    exportDb, importDb, saveFile, pickFile, pickFiles,
    zipBackup, backupSteps, isZipFile, restoreZip, sizeText,
    inSuite, notebookUrl,
    linksWhere, getLink, saveLink, linkPictures, dropLinks, pictureUrl, boardFile, readBoardFile,
  };
})();
;
