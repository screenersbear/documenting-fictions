// Past talents: the list to pick from, and Manage talents.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootPastTalents = function addShootPastTalents(ed) {
  Object.assign(ed, { refreshPastTalentsSelect });
  // ---------- Talent popup (name/handles/photo + a "returning talent" picker) ----------
  // talentModalTargetIdx: index into currentTalents being edited, or null
  // while adding a new one. talentModalDraft holds the in-progress edits —
  // nothing in currentTalents changes until Save (see saveTalentModalBtn).
  ed.talentModalTargetIdx = null;
  ed.talentModalDraft = null;
  ed.pastTalentSamples = [];

  // Every distinct past talent name, ranked: talents who were the FIRST
  // (lead) name on 2+ shoots first, then talents who were lead on exactly
  // one shoot, then everyone who only ever appeared as a secondary/tertiary
  // talent — alphabetical within each tier. The sample pulled in for each
  // name (handles/photo) is whichever shoot used it most recently, same
  // "most recent wins" reasoning as getLastLocationDirections below.
  function getAllPastTalents() {
    const leadCounts = {};
    const sampleDates = {};
    const samples = {};
    const dismissed = new Set(ed.state.dismissedTalentKeys);
    ed.state.shoots.forEach(s => {
      (s.talents || []).forEach((t, i) => {
        if (!ed.hasText(t.name)) return;
        const key = t.name.trim().toLowerCase();
        if (dismissed.has(key)) return;
        if (i === 0) leadCounts[key] = (leadCounts[key] || 0) + 1;
        const d = s.date || '';
        if (!(key in sampleDates) || d > sampleDates[key]) {
          sampleDates[key] = d;
          samples[key] = t;
        }
      });
    });
    return Object.keys(samples)
      .sort((a, b) => {
        const aLead = leadCounts[a] || 0;
        const bLead = leadCounts[b] || 0;
        const tier = n => (n >= 2 ? 0 : n === 1 ? 1 : 2);
        const tierDiff = tier(aLead) - tier(bLead);
        return tierDiff || samples[a].name.localeCompare(samples[b].name);
      })
      .map(key => samples[key]);
  }

  function refreshPastTalentsSelect() {
    ed.pastTalentSamples = getAllPastTalents();
    const select = document.getElementById('pastTalentsSelect');
    select.innerHTML = '<option value="">Select a past talent…</option>'
      + ed.pastTalentSamples.map((t, i) => `<option value="${i}">${ed.escapeHtml(t.name)}</option>`).join('')
      + '<option value="__manage__">Manage saved…</option>';
  }

  document.getElementById('pastTalentsSelect').addEventListener('change', (e) => {
    if (e.target.value === '__manage__') {
      e.target.value = '';
      openManageTalentsModal();
      return;
    }
    if (e.target.value === '') return;
    const t = ed.pastTalentSamples[Number(e.target.value)];
    if (!t || !ed.talentModalDraft) return;
    ed.talentModalDraft.name = t.name || '';
    ed.talentModalDraft.socialHandles = (t.socialHandles || []).map(sh => ({ ...sh }));
    ed.talentModalDraft.photo = t.photo || '';
    // This card now shows someone else, so its own photo is replaced outright
    // (even by none) — but that's not a request to strip the photo off that
    // person's other shoots, and any earlier Remove press no longer applies.
    ed.talentModalDraft.photoRemoved = false;
    ed.talentModalDraft.photoSwapped = true;
    // Picking a returning talent links this draft to their identity (by
    // name, same matching getAllPastTalents already uses) — saveTalentModalBtn
    // uses this to propagate any edits back to every other shoot's copy of
    // the same person instead of leaving them out of sync.
    ed.talentModalDraft._matchName = t.name || '';
    ed.fillTalentModalForm();
  });

  // Same non-destructive "dismiss" pattern as Manage Locations — deleting
  // here only hides a name from future quick-picks (dismissedTalentKeys),
  // it never touches any shoot's own talents array or the profile-sync
  // matching saveTalentModalBtn does by name.
  function renderManageTalentsList() {
    const samples = getAllPastTalents();
    const container = document.getElementById('manageTalentsList');
    if (!samples.length) {
      container.innerHTML = '<p class="empty-hint">No saved talents yet.</p>';
      return;
    }
    container.innerHTML = samples.map((t, idx) => `
      <div class="manage-location-row">
        <span>${ed.escapeHtml(t.name)}</span>
        <button type="button" class="delete-manage-location" data-idx="${idx}"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
      </div>
    `).join('');
    container.querySelectorAll('.delete-manage-location').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = samples[Number(btn.dataset.idx)];
        if (!t) return;
        const key = t.name.trim().toLowerCase();
        if (!ed.state.dismissedTalentKeys.includes(key)) ed.state.dismissedTalentKeys.push(key);
        ed.saveState();
        renderManageTalentsList();
        // The Talent modal's dropdown is still open underneath, so it has
        // to drop the deleted entry now rather than on next open.
        refreshPastTalentsSelect();
      });
    });
  }

  function openManageTalentsModal() {
    renderManageTalentsList();
    document.getElementById('manageTalentsOverlay').hidden = false;
  }
};
