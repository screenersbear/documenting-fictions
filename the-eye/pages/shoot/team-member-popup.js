// The team member popup: name, role and handle, or someone from before.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootTeamMemberPopup = function addShootTeamMemberPopup(ed) {
  Object.assign(ed, { openTeamMemberModal, getTeamRequiredChoice, setTeamRequiredChoice, openManageTeamMembersModal });
  // ---------- Team member popup (name/role/handle + a "returning member" picker) ----------
  // The member being edited (null when adding one) — the member itself, not
  // its place in the list: an Undo of a removal can put someone back in
  // front of them while the popup's open, and Save must still land on them.
  let teamMemberModalTarget = null;
  let teamMemberModalDraft = null;
  let pastTeamMemberSamples = [];

  // Every distinct past team member name, ranked by how many past shoots
  // they've worked (most-used first, alphabetical within a tie) — same
  // "returning contact" idea as past locations, just counted by name
  // instead of by location key. The sample pulled in for each name is
  // whichever shoot used it most recently. A solo shoot's team list is kept
  // but hidden (see updateTeamRequiredUI), so it doesn't count here.
  function getAllPastTeamMembers() {
    const counts = {};
    const sampleDates = {};
    const samples = {};
    const dismissed = new Set(ed.state.dismissedTeamMemberKeys);
    ed.state.shoots.forEach(s => {
      if (s.teamRequired !== 'yes') return;
      (s.teamMembers || []).forEach(tm => {
        if (!ed.hasText(tm.name)) return;
        const key = tm.name.trim().toLowerCase();
        if (dismissed.has(key)) return;
        counts[key] = (counts[key] || 0) + 1;
        const d = s.date || '';
        if (!(key in sampleDates) || d > sampleDates[key]) {
          sampleDates[key] = d;
          samples[key] = tm;
        }
      });
    });
    return Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a] || samples[a].name.localeCompare(samples[b].name))
      .map(key => samples[key]);
  }

  // Static option lists — populated once rather than per-render, since
  // (unlike the old inline repeater) this modal isn't rebuilt every time
  // a team member is added or edited.
  document.getElementById('teamMemberModalRoleSelect').innerHTML =
    ed.TEAM_ROLE_OPTIONS.map(([val, label]) => `<option value="${val}">${label}</option>`).join('');
  document.getElementById('teamMemberModalSocialPlatform').innerHTML =
    ed.SOCIAL_PLATFORM_OPTIONS.map(([val, label]) => `<option value="${val}">${label}</option>`).join('');

  function refreshPastTeamMembersSelect() {
    pastTeamMemberSamples = getAllPastTeamMembers();
    const select = document.getElementById('pastTeamMembersSelect');
    select.innerHTML = '<option value="">Select a past team member…</option>'
      + pastTeamMemberSamples.map((tm, i) => `<option value="${i}">${ed.escapeHtml(tm.name)}</option>`).join('')
      + '<option value="__manage__">Edit saved team…</option>';
  }

  document.getElementById('pastTeamMembersSelect').addEventListener('change', (e) => {
    if (e.target.value === '__manage__') {
      e.target.value = '';
      openManageTeamMembersModal();
      return;
    }
    if (e.target.value === '') return;
    const tm = pastTeamMemberSamples[Number(e.target.value)];
    if (!tm || !teamMemberModalDraft) return;
    teamMemberModalDraft.role = tm.role || 'makeup_artist';
    teamMemberModalDraft.name = tm.name || '';
    teamMemberModalDraft.socialPlatform = tm.socialPlatform || 'instagram';
    teamMemberModalDraft.socialHandle = tm.socialHandle || '';
    fillTeamMemberModalForm();
  });

  // Same non-destructive "dismiss" pattern as Manage Locations — deleting
  // here only hides a name from future quick-picks (dismissedTeamMemberKeys),
  // it never touches any shoot's own teamMembers array.
  function renderManageTeamMembersList() {
    const samples = getAllPastTeamMembers();
    const container = document.getElementById('manageTeamMembersList');
    if (!samples.length) {
      container.innerHTML = '<p class="empty-hint">No saved team members yet.</p>';
      return;
    }
    container.innerHTML = samples.map((tm, idx) => `
      <div class="manage-location-row">
        <span>${ed.escapeHtml(tm.name)}</span>
        <button type="button" class="delete-manage-location" data-idx="${idx}"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
      </div>
    `).join('');
    container.querySelectorAll('.delete-manage-location').forEach(btn => {
      btn.addEventListener('click', () => {
        const tm = samples[Number(btn.dataset.idx)];
        if (!tm) return;
        const key = tm.name.trim().toLowerCase();
        if (!ed.state.dismissedTeamMemberKeys.includes(key)) ed.state.dismissedTeamMemberKeys.push(key);
        ed.saveState();
        renderManageTeamMembersList();
        // The Team member modal's dropdown is still open underneath, so it
        // has to drop the deleted entry now rather than on next open.
        refreshPastTeamMembersSelect();
      });
    });
  }

  function openManageTeamMembersModal() {
    renderManageTeamMembersList();
    document.getElementById('manageTeamMembersOverlay').hidden = false;
  }

  function fillTeamMemberModalForm() {
    document.getElementById('teamMemberModalRoleSelect').value = teamMemberModalDraft.role || 'makeup_artist';
    document.getElementById('teamMemberModalNameInput').value = teamMemberModalDraft.name || '';
    document.getElementById('teamMemberModalSocialPlatform').value = teamMemberModalDraft.socialPlatform || 'instagram';
    document.getElementById('teamMemberModalSocialInput').value = teamMemberModalDraft.socialHandle || '@';
  }

  function openTeamMemberModal(idx) {
    const existing = (idx === null || idx === undefined) ? null : (ed.currentTeamMembers[idx] || null);
    teamMemberModalTarget = existing;
    teamMemberModalDraft = existing
      ? { ...existing }
      : { role: 'makeup_artist', name: '', socialPlatform: 'instagram', socialHandle: '' };
    refreshPastTeamMembersSelect();
    fillTeamMemberModalForm();
    document.getElementById('teamMemberModalOverlay').hidden = false;
  }

  document.getElementById('teamMemberModalRoleSelect').addEventListener('change', (e) => {
    teamMemberModalDraft.role = e.target.value;
  });

  document.getElementById('teamMemberModalNameInput').addEventListener('input', (e) => {
    teamMemberModalDraft.name = e.target.value;
  });

  // Same auto-fill as before the popup redesign: leaving the name field
  // having typed a known contact's name fills in whatever handle was saved
  // for them last time, unless one's already been typed here.
  document.getElementById('teamMemberModalNameInput').addEventListener('blur', () => {
    const draft = teamMemberModalDraft;
    if (!draft || ed.hasText(draft.socialHandle)) return;
    const match = ed.lookupBestContactHandle(draft.name);
    if (!match) return;
    draft.socialPlatform = match.platform;
    draft.socialHandle = match.handle;
    fillTeamMemberModalForm();
  });

  document.getElementById('teamMemberModalSocialPlatform').addEventListener('change', (e) => {
    teamMemberModalDraft.socialPlatform = e.target.value;
  });

  document.getElementById('teamMemberModalSocialInput').addEventListener('input', (e) => {
    teamMemberModalDraft.socialHandle = e.target.value;
  });

  document.getElementById('saveTeamMemberModalBtn').addEventListener('click', () => {
    const draft = teamMemberModalDraft;
    draft.name = document.getElementById('teamMemberModalNameInput').value.trim();
    draft.socialHandle = ed.normalizeSocialHandle(draft.socialHandle);

    // Found again by the member itself, in case the list moved meanwhile.
    const at = teamMemberModalTarget ? ed.currentTeamMembers.indexOf(teamMemberModalTarget) : -1;
    if (at !== -1) ed.currentTeamMembers[at] = draft;
    else ed.currentTeamMembers.push(draft);

    document.getElementById('teamMemberModalOverlay').hidden = true;
    teamMemberModalDraft = null;
    teamMemberModalTarget = null;
    ed.renderTeamMembers();
    ed.scheduleShootAutosave();
  });

  // "Requires team?" is two named buttons, "Just me" / "With a team", rather
  // than a pair of Yes/No tick boxes. The answer is still saved as
  // teamRequired 'no'/'yes' ('' while neither's been picked), read straight
  // off whichever button is showing as picked.
  const TEAM_REQUIRED_CHOICES = [['teamRequiredNoBtn', 'no'], ['teamRequiredYesBtn', 'yes']];

  function getTeamRequiredChoice() {
    const picked = TEAM_REQUIRED_CHOICES.find(([id]) => document.getElementById(id).classList.contains('active'));
    return picked ? picked[1] : '';
  }

  function setTeamRequiredChoice(value) {
    TEAM_REQUIRED_CHOICES.forEach(([id, choice]) => {
      const btn = document.getElementById(id);
      btn.classList.toggle('active', value === choice);
      btn.setAttribute('aria-pressed', value === choice ? 'true' : 'false');
    });
    updateTeamRequiredUI();
  }

  // Switching to "Just me" only HIDES the team list and Directions for team —
  // both are kept, and come straight back with "With a team". Everything that
  // shows or counts a team (PDFs, Stats, Pending labels...) checks
  // teamRequired === 'yes' for the same reason, and directionFieldApplies
  // leaves Directions for team out of Shoot mode and the PDFs on a solo shoot.
  function updateTeamRequiredUI() {
    const choice = getTeamRequiredChoice();
    document.getElementById('teamDetailsBlock').hidden = choice !== 'yes';
    document.getElementById('teamFinalizedNote').hidden = choice !== 'no';
    const directionsField = document.getElementById('shootTeamDirectionsField');
    directionsField.hidden = choice === 'no';
    // Back from "Just me": the kept directions were last measured while
    // hidden (zero height), so they're sized to their text again now.
    if (!directionsField.hidden) ed.syncFieldFilledState(document.getElementById('shootTeamDirections'));
  }

  // Buttons fire no input/change event of their own, so each saves itself
  // (scheduleShootAutosave also refreshes the new-shoot guide, whose Team
  // slide borrows this whole block). Tapping the one already picked keeps it.
  TEAM_REQUIRED_CHOICES.forEach(([id, choice]) => {
    document.getElementById(id).addEventListener('click', () => {
      if (getTeamRequiredChoice() === choice) return;
      setTeamRequiredChoice(choice);
      ed.scheduleShootAutosave();
    });
  });
};
