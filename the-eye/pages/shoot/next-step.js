// The button at the foot of a shoot's page: always the next thing the shoot
// needs at its stage (components/shoot-stage.js), with a line above it when
// that helps. And Complete on its own: once a shoot is Delivered, has its
// final images (a video has none) and its reflection, it goes to the Archive.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootNextStep = function addShootNextStep(ed) {
  Object.assign(ed, { drawNextStep, runNextStep, setShootStatusOnPage, openShootPart });
  const bar = document.getElementById('shootNext');
  const btn = document.getElementById('shootNextBtn');
  const hint = document.getElementById('shootNextHint');
  let step = null;

  function drawNextStep(s, counts) {
    step = ed.nextStep(s, counts || {});
    bar.hidden = !step;
    if (!step) return;
    btn.textContent = step.label;
    hint.textContent = step.hint || '';
    hint.hidden = !step.hint;
  }

  // As if the status were picked on the page: its own change listener asks
  // what comes next (deadline-prompt.js), and the form saves.
  function setShootStatusOnPage(to) {
    const select = document.getElementById('shootStatus');
    if (![...select.options].some(o => o.value === to)) return;
    select.value = to;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    ed.saveShootNow();
    ed.drawShootFront();
  }

  // A part still to add opens its chapter of the guide, unless the guide's
  // turned off (New shoot guide: On the page); then its page.
  function openShootPart(chapter, page) {
    if (ed.isNewShootGuideOn()) ed.startShootWizard({ again: true, from: chapter, only: true });
    else ed.showShootPage(page);
  }

  function runNextStep(next) {
    const go = page => ed.showShootPage(page);
    switch (next.key) {
      case 'chapter': ed.openShootPart(next.chapter, ed.SETUP_CHAPTERS.find(c => c.key === next.chapter).page); break;
      case 'status': setShootStatusOnPage(next.to); break;
      case 'shootMode': document.getElementById('enterShootModeBtn').click(); break;
      case 'reflect': go('postShootHeading'); document.getElementById('reflectHelperBtn').click(); break;
      case 'finalImages': go('postShootHeading'); document.getElementById('addFinalPhotos').click(); break;
      case 'complete': document.getElementById('completeShootBtn').click(); break;
      case 'unarchive': document.getElementById('unarchiveShootBtn').click(); break;
      case 'date': go('logisticsHeading'); break;
      default: break;
    }
  }
  btn.addEventListener('click', () => { if (step) runNextStep(step); });

  // Complete on its own, when a change made now leaves the shoot ready (a
  // shoot that was ready when it opened keeps its Complete button instead
  // of vanishing on the way in). It says so, the same as Complete did.
  let readyAtOpen = { id: null, ready: false };
  let checking = false;
  function completeIfReady() {
    if (checking || ed.shootModalOverlay.hidden || !ed.currentShootId || ed.shootWizardActive || ed.shootOpening) return;
    const id = ed.currentShootId;
    checking = true;
    ed.frontCounts(id).then((c) => {
      c.urls.forEach(u => URL.revokeObjectURL(u));
      if (ed.shootModalOverlay.hidden || ed.currentShootId !== id) return;
      const ready = ed.readyToComplete(ed.frontShoot(), c);
      if (readyAtOpen.id !== id) { readyAtOpen = { id, ready }; return; }
      if (ready && !readyAtOpen.ready) document.getElementById('completeShootPromptConfirmBtn').click();
      readyAtOpen.ready = ready;
    }).finally(() => { checking = false; });
  }

  // Every save passes through saveState, and photos change their grids: the
  // front page follows, and the shoot may be complete now.
  let redraw = 0;
  function follow() {
    if (ed.shootModalOverlay.hidden) return;
    clearTimeout(redraw);
    redraw = setTimeout(() => { ed.drawShootFront(); completeIfReady(); }, 120);
  }
  const saveState = ed.saveState;
  ed.saveState = function saveStateAndFollow(...args) {
    const out = saveState.apply(this, args);
    follow();
    return out;
  };
  ['finalImagesGrid', 'moodboardGrid', 'refBoards'].forEach(id => new MutationObserver(follow).observe(document.getElementById(id), { childList: true }));
  // A shoot that's just opened sets where it starts from.
  new MutationObserver(() => { if (!ed.shootModalOverlay.hidden) { readyAtOpen = { id: null, ready: false }; follow(); } })
    .observe(ed.shootModalOverlay, { attributes: true, attributeFilter: ['hidden'] });
};
