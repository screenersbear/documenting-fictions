// The first-time intro to the status swatch button.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addSwatchIntro = function addSwatchIntro(ed) {
  Object.assign(ed, { maybeShowStatusSwatchIntro });
  // ---------- First-time status swatch button intro ----------
  // Shown once, the first time a new shoot is created, so it's clear the
  // "Status: ..." button up top is tappable rather than just a label.
  const STATUS_SWATCH_INTRO_KEY = 'dailies_seen_status_swatch_intro_v1'; ed.STATUS_SWATCH_INTRO_KEY = STATUS_SWATCH_INTRO_KEY;

  function maybeShowStatusSwatchIntro() {
    if (localStorage.getItem(STATUS_SWATCH_INTRO_KEY)) return;
    document.getElementById('statusSwatchIntroOverlay').hidden = false;
    localStorage.setItem(STATUS_SWATCH_INTRO_KEY, '1');
  }

  document.getElementById('statusSwatchIntroCloseBtn').addEventListener('click', () => {
    document.getElementById('statusSwatchIntroOverlay').hidden = true;
  });
};
