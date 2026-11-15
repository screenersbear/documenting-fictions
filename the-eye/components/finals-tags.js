// What finals sent to Ref are tagged with (round 2, connect/18), and the
// sheet's words. TAGS starts with My work, the shoot's kind and its people
// on, then up to two suggestions from the shoot's details (its framework
// tags, its place, its lighting setups) off; + Tag adds your own. Ref files
// each sent final under every tag that's on, using its own tag of that name
// or making one (ref/data/finals-in.js).
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addFinalsTags = function addFinalsTags(ed) {
  const MY_WORK = 'My work';
  const SUGGEST = 2;
  const NO_KIND = ['', 'other', 'uncategorized'];
  const clean = v => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, 40) : '');
  const same = (a, b) => a.toLowerCase() === b.toLowerCase();

  // The shoot's tags: [{ name, on }], each name once (whatever its case).
  function finalsTags(s) {
    const out = [];
    const add = (name, on) => {
      const n = clean(name);
      if (!n || out.some(t => same(t.name, n))) return false;
      out.push({ name: n, on });
      return true;
    };
    [MY_WORK, NO_KIND.includes(s.category || '') ? '' : ed.CATEGORY_LABELS[s.category], ...(s.talents || []).map(t => t && t.name)].forEach(n => add(n, true));
    let left = SUGGEST;
    for (const n of [...(s.frameworkTags || []).map(t => t && t.tag), s.location && s.location.name, ...(s.lightingSetups || []).map(l => l && l.name)]) {
      if (left && add(n, false)) left--;
    }
    return out;
  }
  // A tag typed in: added at the end, on; one already there is switched on.
  function withTag(tags, name) {
    const n = clean(name);
    if (!n) return tags;
    return tags.some(t => same(t.name, n)) ? tags.map(t => (same(t.name, n) ? { ...t, on: true } : t)) : [...tags, { name: n, on: true }];
  }
  const tagsOn = tags => tags.filter(t => t.on).map(t => t.name);
  // "Tap the ones you want as references. 3 of 12 picked."
  const finalsLine = (n, total) => `Tap the ones you want as references. ${n} of ${total} picked.`;
  const sendFinalsWords = n => (n ? `Send ${n} to Ref` : 'Send to Ref');
  Object.assign(ed, { finalsTags, withTag, tagsOn, finalsLine, sendFinalsWords }); // after the consts above
};
