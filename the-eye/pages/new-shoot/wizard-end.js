// The new-shoot guide: finishing or leaving it, and turning it on or off.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addNewShootWizardEnd = function addNewShootWizardEnd(ed) {
  Object.assign(ed, { endShootWizard, isNewShootGuideOn, setNewShootGuideOn });
  // Every way out: Done, Done for now, Back from the first chapter, the
  // post-shoot prompt's Yes, closeShootModal and openShootModal. Idempotent. `closing` skips the
  // landing-on-the-page work, since a close/reopen does its own next.
  function endShootWizard(opts) {
    const closing = !!(opts && opts.closing);
    ed.shootWizardPendingId = null;
    clearTimeout(ed.shootWizardStartTimer);
    if (!ed.shootWizardActive) return;
    ed.closeConceptHelper();
    ed.blurShootWizardFocus();
    ed.restoreShootWizardBlocks();
    ed.shootWizardActive = false;
    ed.shootWizardAgain = false;
    ed.shootWizardOnly = false;
    ed.shootWizardStepKey = null;
    const wizard = document.getElementById('shootWizard');
    wizard.hidden = true;
    wizard.classList.remove('shoot-wizard-compact');
    ed.setShootPageInert(false);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', ed.syncShootWizardViewport);
      window.visualViewport.removeEventListener('scroll', ed.syncShootWizardViewport);
    }
    const modalEl = ed.shootModalOverlay.querySelector('.modal');
    modalEl.style.overflow = '';
    if (closing) return;
    // Everything was last measured at the card's width; the page is wider.
    ed.syncAllShootFormFields();
    ed.autoSizeAllListTextareas();
    // Instant, not smooth: smooth scrolling doesn't run in a background tab.
    modalEl.scrollTop = 0;
    ed.updateShootModalTitleFromScroll();
    ed.breakShootPages();
    // Done (or Skip): the shoot's front page, with what was filled in.
    ed.showShootPage('front');
  }

  document.getElementById('shootWizardBackBtn').addEventListener('click', () => {
    if (!ed.shootWizardActive) return;
    // Back from the first chapter (or the only one) leaves, like Done for now.
    const prev = ed.adjacentShootWizardStep(-1);
    if (prev) ed.showShootWizardStep(prev.key);
    else endShootWizard();
  });

  document.getElementById('shootWizardNextBtn').addEventListener('click', () => {
    if (!ed.shootWizardActive) return;
    const next = ed.adjacentShootWizardStep(1);
    if (next) ed.showShootWizardStep(next.key);
    // Done, on the last chapter: the shoot's page, with what's filled in.
    else endShootWizard();
  });

  // Done for now: what's filled in is already on the page, which opens.
  document.getElementById('shootWizardExitBtn').addEventListener('click', () => endShootWizard());
  // Skip: on to the next chapter without answering this one.
  document.getElementById('shootWizardSkipBtn').addEventListener('click', () => {
    if (!ed.shootWizardActive) return;
    const next = ed.adjacentShootWizardStep(1);
    if (next) ed.showShootWizardStep(next.key);
    else endShootWizard();
  });

  // On/off for the whole guide, remembered on this device. Turned off from
  // the first slide's "Don't show again", and back on (or off) from the App
  // options' New shoot guide switch.
  const NEW_SHOOT_GUIDE_OFF_KEY = 'dailies_new_shoot_guide_off_v1';

  function isNewShootGuideOn() {
    try { return localStorage.getItem(NEW_SHOOT_GUIDE_OFF_KEY) !== '1'; } catch (err) { return true; }
  }

  function setNewShootGuideOn(on) {
    try {
      if (on) localStorage.removeItem(NEW_SHOOT_GUIDE_OFF_KEY);
      else localStorage.setItem(NEW_SHOOT_GUIDE_OFF_KEY, '1');
    } catch (err) { /* storage unavailable — nothing to remember it in */ }
  }
};
