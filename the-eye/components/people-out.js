// What The Eye tells the one list of people (round 2, connect/08): each shoot
// and who was on it (its talent and team), for the person page and search on
// the shelf (shared/data/people-things.js). And the other way: a person
// changed on their page comes back into The Eye's own copies, its talent and
// team taking the new name and handles. Only names and handles change, and
// only on the people the list says are that person.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addPeopleOut = function addPeopleOut(ed) {
  Object.assign(ed, { peopleThings, tellPeople, takePeopleEdits });
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const D = () => window.DFData;
  // "7 Nov" for 2026-11-07 ('' for no day).
  const dayWords = (day) => { const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(day || ''); return m ? `${Number(m[2])} ${MONTHS[Number(m[1]) - 1]}` : ''; };
  ed.dayWords = dayWords; // the talent card's LAST TIME says it too (talent-since.js)
  // A picture's key, to tell when it changed without reading it.
  const coverKey = (url) => (url ? `${url.length}:${url.slice(-24)}` : '');

  // Each shoot as the list keeps it: its title, "7 Nov · Delivered", who was
  // on it, and its cover. Opens at the shoot.
  function peopleThings(shoots = ed.state.shoots) {
    return shoots.filter(s => s && s.id).map(s => ({
      id: s.id,
      kind: 'shoot',
      title: D().eyeShootName(s, 'title'),
      line: [dayWords(s.date), ed.STATUS_LABELS[s.status] || ''].filter(Boolean).join(' · '),
      day: s.date || '',
      people: D().shootPeople(s),
      params: { shoot: s.id },
      coverKey: coverKey(s.projectPhoto),
      covers: () => [D().pictureOf(s.projectPhoto)].filter(Boolean),
    }));
  }
  // Tells the list, a moment after the last change (every save asks).
  let soon = null;
  function tellPeople(wait = 1500) {
    if (!D() || !D().publishThings) return;
    clearTimeout(soon);
    soon = setTimeout(() => D().publishThings('the-eye', peopleThings()).catch(() => {}), wait);
  }

  // ---------- Changed on the person page ----------
  const TAKEN = 'df-people-taken-the-eye'; // the newest change already taken
  const read = () => { try { return localStorage.getItem(TAKEN) || ''; } catch (e) { return ''; } };
  // Each talent or team member the list says is someone changed since: the
  // new name and handles. Returns how many changed (and saves when any did).
  async function takePeopleEdits() {
    if (!D() || !D().peopleAll) return 0;
    const taken = read();
    const records = await D().peopleAll();
    const edited = records.filter(r => r.editedAt && r.editedAt > taken);
    if (!edited.length) return 0;
    let n = 0;
    const take = (who, set) => {
      const r = D().findPerson(records, who);
      if (r && edited.includes(r) && set(r)) n += 1;
    };
    ed.state.shoots.forEach((s) => {
      (s.talents || []).forEach((t) => {
        const hs = Array.isArray(t.socialHandles) ? t.socialHandles : [];
        const on = p => (hs.find(h => h && h.platform === p) || {}).handle || '';
        take({ name: t.name, instagram: on('instagram'), tiktok: on('tiktok') }, (r) => {
          const next = [...hs.filter(h => !h || (h.platform !== 'instagram' && h.platform !== 'tiktok')),
            ...(r.instagram ? [{ platform: 'instagram', handle: r.instagram }] : []), ...(r.tiktok ? [{ platform: 'tiktok', handle: r.tiktok }] : [])];
          const name = r.name || t.name; // never blank
          if (t.name === name && JSON.stringify(next) === JSON.stringify(hs)) return false;
          t.name = name;
          t.socialHandles = next;
          return true;
        });
      });
      (s.teamMembers || []).forEach((m) => {
        const platform = m.socialPlatform || 'instagram';
        take({ name: m.name, instagram: platform === 'instagram' ? m.socialHandle : '', tiktok: platform === 'tiktok' ? m.socialHandle : '' }, (r) => {
          const handle = (platform === 'tiktok' ? r.tiktok : r.instagram) || '';
          const name = r.name || m.name;
          if (m.name === name && (m.socialHandle || '') === handle) return false;
          m.name = name;
          m.socialHandle = handle;
          return true;
        });
      });
    });
    try { localStorage.setItem(TAKEN, edited.map(r => r.editedAt).sort().pop()); } catch (e) { /* private mode */ }
    if (n) ed.saveState();
    return n;
  }
};
