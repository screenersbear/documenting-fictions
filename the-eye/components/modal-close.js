// Closing popups (shared by them all).
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addModalClose = function addModalClose(ed) {
  // ---------- shared modal close handlers ----------
  document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.close === 'shoot') ed.closeShootModal();
      if (btn.dataset.close === 'frameworks') ed.closeFrameworksModal();
      if (btn.dataset.close === 'journal') ed.closeJournalModal();
      if (btn.dataset.close === 'location') document.getElementById('locationModalOverlay').hidden = true;
      if (btn.dataset.close === 'talent') document.getElementById('talentModalOverlay').hidden = true;
      if (btn.dataset.close === 'teamMember') document.getElementById('teamMemberModalOverlay').hidden = true;
      if (btn.dataset.close === 'journalToc') document.getElementById('journalTocOverlay').hidden = true;
      if (btn.dataset.close === 'categoryVisibility') ed.closeCategoryVisibilityModal();
      if (btn.dataset.close === 'manageLocations') document.getElementById('manageLocationsOverlay').hidden = true;
      if (btn.dataset.close === 'manageTeamMembers') document.getElementById('manageTeamMembersOverlay').hidden = true;
      if (btn.dataset.close === 'manageTalents') document.getElementById('manageTalentsOverlay').hidden = true;
      if (btn.dataset.close === 'manageLightingSetups') document.getElementById('manageLightingSetupsOverlay').hidden = true;
      if (btn.dataset.close === 'regionCountryPopup') document.getElementById('regionCountryPopupOverlay').hidden = true;
    });
  });

  // No backdrop dismiss on a shoot: what's around the page is the notebook,
  // right beside the tabs, and a near miss shouldn't close it. Back does.
  [ed.frameworksModalOverlay, document.getElementById('locationModalOverlay'), document.getElementById('talentModalOverlay'), document.getElementById('teamMemberModalOverlay'), document.getElementById('journalTocOverlay'), document.getElementById('tabIntroOverlay'), ed.categoryVisibilityOverlay, document.getElementById('manageLocationsOverlay'), document.getElementById('manageTeamMembersOverlay'), document.getElementById('manageTalentsOverlay'), document.getElementById('manageLightingSetupsOverlay'), document.getElementById('regionCountryPopupOverlay')].forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.hidden = true;
    });
  });
};
