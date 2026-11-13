// Saved lists, from Options (round 2, 08-options): one row for each list
// the pickers offer. A row opens that list's own editor (the same one its
// picker's "Edit saved" opens); closing the editor comes back here.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addAppMenuSavedLists = function addAppMenuSavedLists(ed) {
  const overlay = document.getElementById('savedListsOverlay');
  // Each list: how to open its editor, and the editor's own popup.
  const LISTS = {
    talent: ['openManageTalentsModal', 'manageTalentsOverlay'],
    team: ['openManageTeamMembersModal', 'manageTeamMembersOverlay'],
    locations: ['openManageLocationsModal', 'manageLocationsOverlay'],
    lighting: ['openManageLightingSetupsModal', 'manageLightingSetupsOverlay'],
    categories: ['openCategoryVisibilityModal', 'categoryVisibilityOverlay'],
    frameworks: ['openFrameworksModal', 'frameworksModalOverlay'],
  };

  // Back to Options.
  function closeSavedLists() {
    overlay.hidden = true;
    document.getElementById('appMenuOverlay').hidden = false;
  }

  document.getElementById('savedListsBtn').addEventListener('click', () => {
    document.getElementById('appMenuOverlay').hidden = true;
    overlay.hidden = false;
  });
  document.getElementById('savedListsCloseBtn').addEventListener('click', closeSavedLists);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSavedLists(); });

  document.getElementById('savedListsRows').addEventListener('click', (e) => {
    const row = e.target.closest('[data-list]');
    if (!row) return;
    const [open, popupId] = LISTS[row.dataset.list];
    const popup = document.getElementById(popupId);
    overlay.hidden = true;
    ed[open]();
    // However the editor is closed, this list comes back.
    const watch = new MutationObserver(() => {
      if (!popup.hidden) return;
      watch.disconnect();
      overlay.hidden = false;
    });
    watch.observe(popup, { attributes: true, attributeFilter: ['hidden'] });
  });
};
