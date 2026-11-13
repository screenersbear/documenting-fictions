// Team members on the shoot page.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootTeam = function addShootTeam(ed) {
  Object.assign(ed, { renderTeamMembers });
  // ---------- Team members (popup, mirrors the Talent popup pattern) ----------
  // Each member renders as a read-only summary card — role, name, and handle
  // as plain text — with the card itself reopening the same popup used to
  // add one, prefilled (see openTeamMemberModal/teamMemberModalDraft below).
  // Nothing commits to currentTeamMembers until Save is tapped.
  ed.currentTeamMembers = [];

  function renderTeamMembers() {
    const container = document.getElementById('teamMembersList');
    container.innerHTML = ed.currentTeamMembers.map((tm, idx) => {
      const roleLabel = (ed.TEAM_ROLE_OPTIONS.find(([val]) => val === tm.role) || [null, 'Other'])[1];
      const platformLabel = (ed.SOCIAL_PLATFORM_OPTIONS.find(([val]) => val === tm.socialPlatform) || [null, 'Other'])[1];
      return `
      <div class="team-member-card team-member-summary-card" data-idx="${idx}">
        <div class="talent-summary-heading">
          <span class="talent-summary-name">${ed.escapeHtml(ed.hasText(tm.name) ? tm.name : `Team member ${idx + 1}`)}</span>
        </div>
        <div class="talent-summary-handles">
          <span>${ed.escapeHtml(roleLabel)}</span>
          ${ed.hasText(tm.socialHandle) ? `<span>${ed.escapeHtml(platformLabel)}: ${ed.escapeHtml(tm.socialHandle)}</span>` : ''}
        </div>
        <button type="button" class="talent-summary-delete" data-idx="${idx}"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
      </div>
    `;
    }).join('');

    // The whole card is the "edit" affordance — no separate button needed.
    container.querySelectorAll('.team-member-summary-card').forEach(card => {
      card.addEventListener('click', () => ed.openTeamMemberModal(Number(card.dataset.idx)));
    });
    container.querySelectorAll('.talent-summary-delete').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        // The card itself opens the edit popup, so the delete "x" has to stop
        // the click here or it also reopens a popup for the member it just removed.
        ev.stopPropagation();
        const idx = Number(btn.dataset.idx);
        const [removed] = ed.currentTeamMembers.splice(idx, 1);
        renderTeamMembers();
        ed.scheduleShootAutosave();
        // Gone straight away (no asking), with a few seconds to take it back.
        if (removed) {
          const shootId = ed.currentShootId;
          const following = ed.followingAtRemoval(shootId);
          ed.showUndoToast('Team member removed', () => ed.restoreRemovedShootItem(shootId, 'teamMembers', idx, removed, following));
        }
      });
    });
  }

  document.getElementById('addTeamMemberBtn').addEventListener('click', () => ed.openTeamMemberModal(null));
};
