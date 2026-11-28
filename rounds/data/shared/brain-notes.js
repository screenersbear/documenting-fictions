// Notes for shakusky's brain (Starky's own AI, on his Mac only): what he does
// in a notebook, written down as he works, so the brain learns from his own
// choices. Each choice is one short line (a step, a tag, never a name, a note's
// words or a photo); a kind's most common choice becomes a lesson. Every kind
// is on until he turns it off in Options > For the brain. The lines stay in
// this browser until he saves them as one file for the brain's inbox
// (<app>.brain.json: { v, app, notes, actions }, the shared format in the
// brain's docs/lesson-format.md). Nothing here ever throws or waits: a line
// that can't be kept is simply left out, and the notebook works the same.
// This is the master copy: tools/sync.py shared copies it into each notebook.
(function () {
  'use strict';
  const FORMAT = 1;
  const MOST_ITEM = 80;
  const MOST_CONTEXT = 400;
  const MOST_KEPT = 500; // lines kept in the browser; the oldest go first
  const MIN_FOR_A_LESSON = 3;
  const RECENT = 8;

  // The kinds each notebook tells the brain, in the order the sheet lists them.
  const BOOKS = {
    'the-eye': {
      name: 'The Eye',
      blurb: 'Your shoots: the steps they move through, the framework tags you pick, the selects you put off.',
      kinds: [
        { id: 'status', name: 'Shoot steps', says: 'Each step a shoot moves to (booked, shot, waiting on selects, editing, delivered), and the step it left. Never the shoot or who was in it.' },
        { id: 'frameworks', name: 'Framework tags', says: 'The framework tags you tick or untick on a shoot: the framework and the tag.' },
        { id: 'selects', name: 'Putting off selects', says: 'That you put off asking for selects. Never who, or what you’d say.' },
      ],
    },
  };

  const key = (app) => `df-brain-notes-${app}`;
  const isObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
  const stamp = (at) => at.toISOString().replace(/\.\d{3}Z$/, 'Z');
  const kindIds = (app) => (BOOKS[app] ? BOOKS[app].kinds.map((k) => k.id) : []);

  /** A plain value cut to MOST_ITEM, or undefined when it isn't a short plain value. */
  function short(value) {
    if (typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return value;
    if (typeof value !== 'string' || !value.trim() || /[\u0000-\u001f]/.test(value)) return undefined;
    return value.trim().slice(0, MOST_ITEM);
  }

  /** One action line, or null when it isn't a kind of this notebook or carries anything but short plain values. */
  function line(app, kind, action, item, context, at = new Date()) {
    const what = short(item);
    if (!kindIds(app).includes(kind) || typeof action !== 'string' || !action || what === undefined) return null;
    const kept = {};
    if (isObject(context)) for (const [k, v] of Object.entries(context)) if (short(v) !== undefined) kept[k] = short(v);
    const row = { v: FORMAT, at: stamp(at), app, kind, action, item: String(what) };
    if (Object.keys(kept).length && JSON.stringify(kept).length <= MOST_CONTEXT) row.context = kept;
    return row;
  }

  /** What's kept for a notebook: { off: {kind: true}, lines, saved (how many lines are in a saved file) }. */
  function read(app) {
    let got = null;
    try { got = JSON.parse(localStorage.getItem(key(app))); } catch (e) { got = null; }
    const off = isObject(got) && isObject(got.off) ? got.off : {};
    const lines = isObject(got) && Array.isArray(got.lines) ? got.lines.filter(isObject) : [];
    const saved = isObject(got) && Number.isInteger(got.saved) ? Math.min(Math.max(got.saved, 0), lines.length) : 0;
    return { off, lines, saved };
  }

  function write(app, store) {
    try { localStorage.setItem(key(app), JSON.stringify(store)); return true; } catch (e) { return false; }
  }

  /** His switch for a kind: on unless he turned it off, and never for a kind the notebook doesn't have. */
  function isOn(app, kind, store = read(app)) {
    return kindIds(app).includes(kind) && store.off[kind] !== true;
  }

  /** Every kind of a notebook with its switch ([] for a notebook that tells the brain nothing). */
  function kinds(app) {
    const store = read(app);
    return BOOKS[app] ? BOOKS[app].kinds.map((k) => ({ ...k, on: isOn(app, k.id, store) })) : [];
  }

  /** Writes down one choice (when its kind is on): → the line, or null. Never throws. */
  function note(app, kind, action, item, context, at = new Date()) {
    try {
      const store = read(app);
      const row = isOn(app, kind, store) ? line(app, kind, action, item, context, at) : null;
      if (!row) return null;
      store.lines.push(row);
      const over = Math.max(store.lines.length - MOST_KEPT, 0);
      store.lines = store.lines.slice(over);
      store.saved = Math.max(store.saved - over, 0);
      return write(app, store) ? row : null;
    } catch (e) {
      return null;
    }
  }

  /** Turns one kind on or off: → the words for under it. */
  function flip(app, kind, on) {
    if (!kindIds(app).includes(kind)) return 'That couldn’t be saved. Try again.';
    const store = read(app);
    if (on === true) delete store.off[kind];
    else store.off[kind] = true;
    if (!write(app, store)) return 'That couldn’t be saved. Try again.';
    const name = BOOKS[app].kinds.find((k) => k.id === kind).name;
    return on === true ? `Saved. ${name}: on, it goes to the brain.` : `Saved. ${name}: off, nothing of it is written.`;
  }

  /** The newest lines, newest first. */
  function recent(app, howMany = RECENT) {
    return read(app).lines.slice(-howMany).reverse();
  }

  /** One lesson a kind he's done enough of: his most common choice there (format v1 notes). */
  function lessons(app, lines, at = new Date()) {
    const counts = {};
    for (const row of lines) {
      if (!kindIds(app).includes(row.kind)) continue;
      const seen = (counts[row.kind] = counts[row.kind] || {});
      const what = `${row.action} ${row.item}`;
      seen[what] = (seen[what] || 0) + 1;
    }
    return kindIds(app).filter((kind) => counts[kind]).map((kind) => {
      const seen = Object.entries(counts[kind]);
      const total = seen.reduce((sum, [, n]) => sum + n, 0);
      if (total < MIN_FOR_A_LESSON) return null;
      const [top, times] = seen.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
      const name = BOOKS[app].kinds.find((k) => k.id === kind).name;
      return { v: FORMAT, at: stamp(at), kind: 'lesson', id: `acts:${kind}`, text: `${name}: your most common is ${top} (${times} of ${total}).`.slice(0, 240), topic: kind };
    }).filter(Boolean);
  }

  /** Who the notebook is, for the file (the brain's app.json), with his switches. */
  function appJson(app) {
    const book = BOOKS[app];
    return { id: app, name: book.name, blurb: book.blurb, popups: 'none', kinds: kinds(app) };
  }

  /**
   * The file for the brain's inbox: { name, text, count } with the lines not yet in a saved file and every lesson so
   * far, or null when there's nothing new (or the notebook tells the brain nothing).
   */
  function brainFile(app, at = new Date()) {
    if (!BOOKS[app]) return null;
    const store = read(app);
    const fresh = store.lines.slice(store.saved);
    if (!fresh.length) return null;
    const body = { v: FORMAT, app: appJson(app), notes: lessons(app, store.lines, at), actions: fresh };
    return { name: `${app}.brain.json`, text: `${JSON.stringify(body, null, 2)}\n`, count: fresh.length, upto: store.lines.length };
  }

  /** After his file is saved: the lines in it aren't put in the next one. */
  function markSaved(app, upto) {
    const store = read(app);
    store.saved = Math.min(Math.max(Number.isInteger(upto) ? upto : 0, store.saved), store.lines.length);
    return write(app, store);
  }

  /** How many lines wait for the next file. */
  function waiting(app) {
    const store = read(app);
    return store.lines.length - store.saved;
  }

  window.DFBrainNotes = {
    BOOKS, MOST_ITEM, MOST_KEPT, RECENT, key, short, line, read, isOn, kinds, note, flip, recent, lessons, appJson, brainFile, markSaved, waiting,
  };
})();
