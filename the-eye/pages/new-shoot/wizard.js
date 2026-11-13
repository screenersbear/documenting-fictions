// The new-shoot guide: going through its steps.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addNewShootWizard = function addNewShootWizard(ed) {
  Object.assign(ed, { adjacentShootWizardStep, blurShootWizardFocus, restoreShootWizardBlocks, refreshShootWizard, showShootWizardStep, syncShootWizardViewport, setShootPageInert, startShootWizard, queueShootWizard, startQueuedShootWizard });
  // The slides that currently apply (the one on screen always counts, so the
  // "Step x of y" line can never lose its own place).
  function shootWizardStepsInPlay() {
    return ed.SHOOT_WIZARD_STEPS.filter(step => step.key === ed.shootWizardStepKey || !step.when || step.when());
  }

  // The nearest slide that applies before (-1) or after (+1) the current
  // one, or null at either end. Re-evaluated every time, since slide 1's
  // category decides whether The story applies at all.
  function adjacentShootWizardStep(direction) {
    const from = ed.SHOOT_WIZARD_STEPS.findIndex(step => step.key === ed.shootWizardStepKey);
    for (let i = from + direction; i >= 0 && i < ed.SHOOT_WIZARD_STEPS.length; i += direction) {
      const step = ed.SHOOT_WIZARD_STEPS[i];
      if (!step.when || step.when()) return step;
    }
    return null;
  }

  // Before anything moves: a focused field that's moved loses focus without
  // a focusout (so without its saveShootNow), and iOS never blurs a field
  // when a button is tapped. Blurring also drops the keyboard/native picker.
  function blurShootWizardFocus() {
    const active = document.activeElement;
    if (active && active !== document.body && document.getElementById('shootWizard').contains(active)) active.blur();
  }

  function moveBlockIntoShootWizard(el, body) {
    if (!el || body.contains(el)) return;
    const placeholder = document.createComment('shoot-wizard');
    el.before(placeholder);
    [el, ...el.querySelectorAll('.pg-off, .pg-first')].forEach(node => node.classList.remove('pg-off', 'pg-first'));
    const record = { el, placeholder, unlocked: [], wasInert: el.inert };
    // A block that sits directly under #shootForm (Team, Shot list) was made
    // inert itself along with the rest of the covered page — it has to come
    // alive in the card, then go back to how it was on the page.
    el.inert = false;
    // On the page these open the expand popup instead of taking typing (see
    // its click guard); a slide has the room to type in place.
    el.querySelectorAll('textarea[readonly]').forEach(field => {
      field.readOnly = false;
      record.unlocked.push(field);
    });
    body.appendChild(el);
    ed.shootWizardMoved.push(record);
  }

  function restoreShootWizardBlocks() {
    ed.shootWizardMoved.forEach(({ el, placeholder, unlocked, wasInert }) => {
      unlocked.forEach(field => { field.readOnly = true; });
      el.inert = wasInert;
      if (placeholder.parentNode) placeholder.replaceWith(el);
    });
    ed.shootWizardMoved = [];
    const step = ed.SHOOT_WIZARD_STEPS.find(s => s.key === ed.shootWizardStepKey);
    if (step && step.leave) step.leave();
  }

  function renderShootWizardChrome() {
    const step = ed.SHOOT_WIZARD_STEPS.find(s => s.key === ed.shootWizardStepKey);
    if (!step) return;
    const inPlay = shootWizardStepsInPlay();
    const isLast = !adjacentShootWizardStep(1);
    document.getElementById('shootWizardStep').textContent = `Step ${inPlay.indexOf(step) + 1} of ${inPlay.length}`;
    document.getElementById('shootWizardTitle').textContent = typeof step.title === 'function' ? step.title() : step.title;
    const hintEl = document.getElementById('shootWizardHint');
    hintEl.textContent = (typeof step.hint === 'function' ? step.hint() : step.hint) || '';
    // A slide without a hint doesn't keep an empty line's spacing.
    hintEl.hidden = !hintEl.textContent;
    // No Back on the first slide, nor on the last: that one is just the
    // confirm button (see below).
    document.getElementById('shootWizardBackBtn').hidden = isLast || !adjacentShootWizardStep(-1);
    // Small "Don't show again" link, on the first slide only, and not when
    // the guide was asked for from the ⋯ menu.
    document.getElementById('shootWizardDontShowBtn').hidden = inPlay.indexOf(step) !== 0 || ed.shootWizardAgain;
    // Forward is always possible, filled in or not. On the last slide the
    // forward button is the shoot page's own Save — same varying text as the
    // page's button (picked when the shoot opened) — and the separate "Skip
    // to shoot page" row, on every other slide, steps aside.
    const nextBtn = document.getElementById('shootWizardNextBtn');
    nextBtn.textContent = isLast ? document.getElementById('saveShootBtn').textContent : 'Next';
    nextBtn.classList.toggle('shoot-wizard-save', isLast);
    document.getElementById('shootWizardExitRow').hidden = isLast;
  }

  // Run from scheduleShootAutosave on every change while the wizard's up.
  function refreshShootWizard() {
    renderShootWizardChrome();
    // Values written from code fire no input event, so they'd keep their
    // empty-field look on the slide — a picked location's remembered
    // directions, for one. Only fields whose look is actually out of step get
    // re-synced: re-measuring every box on each keystroke can briefly shrink
    // the card's content and knock its scroll position.
    document.querySelectorAll('#shootWizardBody input, #shootWizardBody textarea').forEach(el => {
      if (el !== document.activeElement && ed.isBoxSheddingField(el) && el.classList.contains('is-filled') !== ed.hasText(el.value)) ed.syncFieldFilledState(el);
    });
  }

  function showShootWizardStep(key) {
    const step = ed.SHOOT_WIZARD_STEPS.find(s => s.key === key);
    if (!step) return;
    blurShootWizardFocus();
    restoreShootWizardBlocks();
    ed.shootWizardStepKey = key;
    const body = document.getElementById('shootWizardBody');
    step.blocks().forEach(block => moveBlockIntoShootWizard(block, body));
    if (step.enter) step.enter();
    body.scrollTop = 0;
    renderShootWizardChrome();
    // Measured now, at the card's width, with the wizard already visible — a
    // hidden one would measure zero and leave every box at its rows default.
    body.querySelectorAll('input, textarea').forEach(ed.syncFieldFilledState);
    ed.autoSizeAllListTextareas();
    // The card, not a field: focusing a field on every slide would throw the
    // keyboard up over the slide before it's even been read.
    document.getElementById('shootWizardCard').focus({ preventScroll: true });
  }

  // Fits the wizard to the part of the screen that's actually visible, so
  // with the iOS keyboard up the card re-centres above it instead of sitting
  // behind it (iOS doesn't shrink the layout viewport). A visible height well
  // under the tallest seen this run means the keyboard's up: compact mode.
  function syncShootWizardViewport() {
    const wizard = document.getElementById('shootWizard');
    const vv = window.visualViewport;
    const height = vv ? vv.height : window.innerHeight;
    ed.shootWizardViewportMaxH = Math.max(ed.shootWizardViewportMaxH, height);
    if (vv) {
      wizard.style.setProperty('--wiz-vv-top', `${vv.offsetTop}px`);
      // With no keyboard up, the dim runs to the real bottom of the screen.
      const keyboardUp = height < ed.shootWizardViewportMaxH * 0.8;
      wizard.style.setProperty('--wiz-vv-h', `${keyboardUp ? vv.height : Math.min(vv.height + ed.screenGap, ed.screenHeightNow())}px`);
    }
    // Also compact outright on a short screen (an iPhone on its side), where
    // the full step line + hint + buttons alone would leave no room for fields.
    wizard.classList.toggle('shoot-wizard-compact', height < ed.shootWizardViewportMaxH * 0.8 || height < 560);
  }

  // The covered page can't take focus while the wizard's up. The wizard is
  // last in the form, so every page field comes before a slide's fields in
  // document order: iOS's keyboard ^/v arrows (or Tab) from a slide's first
  // field would land in a field hidden behind the dim and type into it
  // unseen, or reach Save/Delete/Shoot mode/the tour. Every popup a slide
  // opens is a body-level overlay, so none of them is affected.
  function setShootPageInert(on) {
    const modalEl = ed.shootModalOverlay.querySelector('.modal');
    [...modalEl.children, ...ed.shootForm.children, ed.shootModalOverlay.querySelector('.nb-page-foot'), ed.shootModalOverlay.querySelector('.nb-screen-tabs-shoot'), ed.shootModalOverlay.querySelector('.nb-shoot-bar')].forEach(el => {
      if (el !== ed.shootForm && el.id !== 'shootWizard') el.inert = on;
    });
  }

  function startShootWizard(opts) {
    const first = ed.SHOOT_WIZARD_STEPS.find(step => !step.when || step.when());
    if (!first) return;
    ed.shootWizardActive = true;
    ed.shootWizardAgain = !!(opts && opts.again);
    ed.shootWizardStepKey = null;
    ed.shootWizardViewportMaxH = 0;
    // Slide 1 explains the status button itself, so the one-time intro that
    // points at it "up top" is marked seen rather than stacking over the
    // wizard now, or turning up later to repeat it.
    try { localStorage.setItem(ed.STATUS_SWATCH_INTRO_KEY, '1'); } catch (err) { /* storage unavailable — nothing to remember it in */ }
    // The covered page holds still: only the card scrolls. Doesn't clip the
    // fixed wizard (its containing block is the viewport), and code can
    // still set scrollTop.
    ed.shootModalOverlay.querySelector('.modal').style.overflow = 'hidden';
    // The steps borrow blocks from the page: none may arrive hidden.
    ed.shootForm.querySelectorAll('.pg-off, .pg-first').forEach(el => el.classList.remove('pg-off', 'pg-first'));
    setShootPageInert(true);
    document.getElementById('shootWizard').hidden = false;
    syncShootWizardViewport();
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncShootWizardViewport);
      window.visualViewport.addEventListener('scroll', syncShootWizardViewport);
    }
    showShootWizardStep(first.key);
  }

  // The shoot modal slides up on a transform for its first 0.2s, and while
  // that runs it's the containing block for anything position:fixed inside
  // it — a wizard shown straight away would sit inside the moving sheet,
  // clipped, then jump to full screen. So it waits for the slide-in's own
  // animationend (wired below), with a timer as the fallback for when none
  // comes: the overlay was already open, or the tab is in the background
  // (rAF and CSS animations stall there, timers don't).
  function queueShootWizard() {
    ed.shootWizardPendingId = ed.currentShootId;
    clearTimeout(ed.shootWizardStartTimer);
    ed.shootWizardStartTimer = setTimeout(startQueuedShootWizard, 320);
  }

  function startQueuedShootWizard() {
    const pendingId = ed.shootWizardPendingId;
    ed.shootWizardPendingId = null;
    clearTimeout(ed.shootWizardStartTimer);
    if (!pendingId || pendingId !== ed.currentShootId || ed.shootModalOverlay.hidden || ed.shootWizardActive) return;
    startShootWizard();
  }
};
