// The new-shoot guide: finishing or leaving it, and turning it on or off.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addNewShootWizardEnd = function addNewShootWizardEnd(ed) {
  Object.assign(ed, { endShootWizard, isNewShootGuideOn, setNewShootGuideOn });
  // Every way out: Done, "Skip to shoot page", the post-shoot prompt's Yes,
  // closeShootModal and openShootModal. Idempotent. `closing` skips the
  // landing-on-the-page work, since a close/reopen does its own next.
  function endShootWizard(opts) {
    const closing = !!(opts && opts.closing);
    ed.shootWizardPendingId = null;
    clearTimeout(ed.shootWizardStartTimer);
    if (!ed.shootWizardActive) return;
    closeLeaveShootWizardPrompt();
    ed.closeConceptHelper();
    ed.blurShootWizardFocus();
    ed.restoreShootWizardBlocks();
    ed.shootWizardActive = false;
    ed.shootWizardAgain = false;
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
  }

  document.getElementById('shootWizardBackBtn').addEventListener('click', () => {
    if (!ed.shootWizardActive) return;
    const prev = ed.adjacentShootWizardStep(-1);
    if (prev) ed.showShootWizardStep(prev.key);
  });

  document.getElementById('shootWizardNextBtn').addEventListener('click', () => {
    if (!ed.shootWizardActive) return;
    const next = ed.adjacentShootWizardStep(1);
    if (next) ed.showShootWizardStep(next.key);
    // The last slide's button is Save: save and close, like the page's.
    else ed.closeShootModal();
  });

  // Leaving early always asks first — from "Skip to shoot page" or a tap on
  // the dim around the card. (Finishing on the last slide, or "Don't show
  // again", don't: those say what they do.)
  function askLeaveShootWizard() {
    if (!ed.shootWizardActive) return;
    document.getElementById('shootWizardLeaveOverlay').hidden = false;
  }

  function closeLeaveShootWizardPrompt() {
    document.getElementById('shootWizardLeaveOverlay').hidden = true;
  }

  document.getElementById('shootWizardExitBtn').addEventListener('click', askLeaveShootWizard);

  // Only a tap that both starts and ends on the dim: with a mouse, a text
  // selection dragged out past the card's edge also "clicks" the backdrop.
  let shootWizardPressOnBackdrop = false;
  document.getElementById('shootWizard').addEventListener('pointerdown', (e) => {
    shootWizardPressOnBackdrop = e.target === e.currentTarget;
  });
  document.getElementById('shootWizard').addEventListener('click', (e) => {
    if (e.target === e.currentTarget && shootWizardPressOnBackdrop) askLeaveShootWizard();
    shootWizardPressOnBackdrop = false;
  });

  document.getElementById('shootWizardLeaveStayBtn').addEventListener('click', closeLeaveShootWizardPrompt);

  document.getElementById('shootWizardLeaveGoBtn').addEventListener('click', () => {
    closeLeaveShootWizardPrompt();
    endShootWizard();
  });

  document.getElementById('shootWizardLeaveOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeLeaveShootWizardPrompt();
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
