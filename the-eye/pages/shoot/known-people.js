// Everyone you know, for the talent and team member popups (people/NOTES.md,
// 15 Nov): the talent and team on The Eye's shoots, and anyone the one list
// of people has from the other notebooks (shared/data/people.js), newest
// first, each with a short label ("team, 3 shoots"). Under a popup's Name,
// up to five of them as you type, matched on a first or last name or a
// handle; picking one fills the popup, so the shoot has that same person
// (not a second one spelled differently).
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootKnownPeople = function addShootKnownPeople(ed) {
  Object.assign(ed, { knownPeople, knownLabel, matchKnown, attachSuggestions, bestHandle });
  ed.knownList = [];
  const lower = v => String(v || '').trim().toLowerCase();
  const bare = v => lower(v).replace(/^@+/, '');
  const handlesOf = list => (list || []).filter(h => h && ed.hasText(h.handle)).map(h => ({ platform: h.platform || 'instagram', handle: h.handle.trim() }));

  // From The Eye's shoots: one per name, with what they last were (talent
  // or team), how many shoots, and their handles and photo from the latest.
  function fromShoots() {
    const byName = new Map();
    const hidden = new Set([...(ed.state.dismissedTalentKeys || []), ...(ed.state.dismissedTeamMemberKeys || [])]);
    const seen = (name, role, s, handles, photo) => {
      const key = lower(name);
      if (!key || hidden.has(key)) return;
      const p = byName.get(key) || { name: name.trim(), role, shoots: new Set(), last: '', socialHandles: [], photo: '' };
      p.shoots.add(s.id);
      const date = s.date || '';
      if (date >= p.last) {
        p.last = date;
        p.role = role;
        p.name = name.trim();
        if (handles.length) p.socialHandles = handles;
        if (photo) p.photo = photo;
      }
      if (!p.socialHandles.length) p.socialHandles = handles;
      if (!p.photo && photo) p.photo = photo;
      byName.set(key, p);
    };
    ed.state.shoots.forEach(s => {
      (s.talents || []).forEach(t => t && ed.hasText(t.name) && seen(t.name, 'talent', s, handlesOf(t.socialHandles), t.photo || ''));
      (s.teamMembers || []).forEach(m => m && ed.hasText(m.name) && seen(m.name, 'team', s, handlesOf([{ platform: m.socialPlatform, handle: m.socialHandle }]), ''));
    });
    return [...byName.values()].map(p => ({ ...p, shoots: p.shoots.size }));
  }

  // Everyone, newest first: The Eye's people, then the one list's others
  // (no shoots here yet). Kept in ed.knownList for the suggestions.
  async function knownPeople() {
    const list = fromShoots();
    const D = window.DFData;
    const all = D && D.peopleAll ? await D.peopleAll().catch(() => []) : [];
    const has = (q) => list.some(p => lower(p.name) === lower(q.name)
      || (q.instagram && p.socialHandles.some(h => h.platform === 'instagram' && bare(h.handle) === bare(q.instagram))));
    all.filter(q => q && ed.hasText(q.name) && !has(q)).forEach(q => list.push({
      name: q.name.trim(), role: '', shoots: 0, last: String(q.updatedAt || q.createdAt || '').slice(0, 10), photo: '',
      socialHandles: handlesOf([{ platform: 'instagram', handle: q.instagram }, { platform: 'tiktok', handle: q.tiktok }]),
    }));
    ed.knownList = list.sort((a, b) => b.last.localeCompare(a.last) || a.name.localeCompare(b.name));
    return ed.knownList;
  }

  // "team, 3 shoots"; nothing for someone with no shoots here.
  function knownLabel(p) {
    return p.shoots ? `${p.role}, ${p.shoots} shoot${p.shoots === 1 ? '' : 's'}` : '';
  }

  // Up to five whose first or last name, whole name or a handle starts with
  // what's typed (any case).
  function matchKnown(list, typed, most = 5) {
    const q = lower(typed).replace(/^@+/, '');
    if (!q) return [];
    return list.filter(p => lower(p.name).startsWith(q)
      || lower(p.name).split(/\s+/).some(w => w.startsWith(q))
      || p.socialHandles.some(h => bare(h.handle).startsWith(q))).slice(0, most);
  }

  // A team member has room for one handle: Instagram's if they have one.
  function bestHandle(p) {
    return p.socialHandles.find(h => h.platform === 'instagram') || p.socialHandles[0] || null;
  }

  // The list under a Name field: shown as you type, gone once one's picked
  // (pick(person) fills the popup) or nothing matches.
  function attachSuggestions(input, pick) {
    const box = document.createElement('div');
    box.className = 'name-suggest';
    box.hidden = true;
    (input.closest('label') || input).after(box);
    let shown = [];
    const hide = () => { box.hidden = true; box.innerHTML = ''; shown = []; };
    input.addEventListener('input', () => {
      shown = matchKnown(ed.knownList, input.value);
      if (!shown.length) { hide(); return; }
      box.innerHTML = shown.map((p, i) => `<button type="button" class="name-suggest-row" data-known="${i}">
        <span class="name-suggest-name">${ed.escapeHtml(p.name)}</span>${knownLabel(p) ? `<span class="name-suggest-label">${ed.escapeHtml(knownLabel(p))}</span>` : ''}</button>`).join('');
      box.hidden = false;
    });
    // Pressed, not clicked: the field keeps the keyboard up meanwhile.
    box.addEventListener('mousedown', e => e.preventDefault());
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-known]');
      if (!b) return;
      const p = shown[Number(b.dataset.known)];
      hide();
      pick(p);
    });
    return { hide };
  }
};
