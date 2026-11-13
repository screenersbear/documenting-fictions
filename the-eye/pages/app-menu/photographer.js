// Photographer information: who's behind the camera.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addAppMenuPhotographer = function addAppMenuPhotographer(ed) {
  Object.assign(ed, { maybeShowPhotographerPrompt });
  // ---------- Photographer information ----------
  // Asked once on first open, and editable any time from the app menu. The
  // prompt is marked seen as soon as it's shown (not on save), so declining to
  // fill it in doesn't mean being asked again every launch.
  const PHOTOGRAPHER_PROMPT_KEY = 'dailies_seen_photographer_prompt_v1';

  function openPhotographerModal(isFirstRun) {
    const p = ed.normalizePhotographer(ed.state.photographer);
    document.getElementById('photographerNameInput').value = p.name;
    document.getElementById('photographerBusinessInput').value = p.businessName;
    document.getElementById('photographerPlatformSelect').value = p.socialPlatform;
    document.getElementById('photographerHandleInput').value = p.socialHandle || '@';
    document.getElementById('photographerPhoneInput').value = p.phone;
    document.getElementById('photographerIntroText').hidden = !isFirstRun;
    document.getElementById('photographerModalTitle').textContent =
      isFirstRun ? 'Welcome! A bit about you' : 'Photographer information';
    document.getElementById('photographerModalOverlay').hidden = false;
  }

  function closePhotographerModal() {
    document.getElementById('photographerModalOverlay').hidden = true;
  }

  function savePhotographerFromForm() {
    ed.state.photographer = ed.normalizePhotographer({
      name: document.getElementById('photographerNameInput').value.trim(),
      businessName: document.getElementById('photographerBusinessInput').value.trim(),
      socialPlatform: document.getElementById('photographerPlatformSelect').value,
      socialHandle: ed.normalizeSocialHandle(document.getElementById('photographerHandleInput').value),
      phone: document.getElementById('photographerPhoneInput').value.trim(),
    });
    ed.saveState();
    closePhotographerModal();
  }

  document.getElementById('photographerSaveBtn').addEventListener('click', savePhotographerFromForm);
  document.getElementById('photographerCloseBtn').addEventListener('click', closePhotographerModal);
  document.getElementById('photographerModalOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('photographerModalOverlay')) closePhotographerModal();
  });

  document.getElementById('photographerInfoBtn').addEventListener('click', () => {
    ed.closeAppMenu();
    openPhotographerModal(false);
  });

  function maybeShowPhotographerPrompt() {
    if (localStorage.getItem(PHOTOGRAPHER_PROMPT_KEY)) return;
    localStorage.setItem(PHOTOGRAPHER_PROMPT_KEY, '1');
    openPhotographerModal(true);
  }
};
