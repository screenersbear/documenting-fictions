// A shoot as a chapter: showing a page, and its More menu.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootChapter = function addShootChapter(ed) {
  Object.assign(ed, { shootPageCopy, showShootPage });
  // What's on this page, for the sheet that turns. The lists that are read
  // back when the shoot saves are found by id across the whole document, so
  // the copy's lose theirs (keeping how they're laid out) and can't be
  // mistaken for the real ones. Other ids stay: they carry the page's look,
  // and the real form comes first in the document.
  const SHOOT_READ_BACK_IDS = [...ed.FRAMEWORK_TAG_CONTAINER_IDS, 'shootAspectRatios', 'shotListItems', 'lightingSetupsItems'];
  function shootPageCopy() {
    return ed.pageCopy(ed.shootForm, (copy) => {
      copy.querySelectorAll(':scope > .nb-off, :scope > #shootWizard, :scope > #deleteShootBtn, :scope > .modal-actions').forEach(el => el.remove());
      SHOOT_READ_BACK_IDS.forEach(id => {
        const el = copy.querySelector(`#${id}`);
        if (!el) return;
        const { display, flexDirection, flexWrap, gap } = getComputedStyle(document.getElementById(id));
        Object.assign(el.style, { display, flexDirection, flexWrap, gap });
        el.removeAttribute('id');
      });
    });
  }

  // 'front' is the front page (pages/shoot/shoot-front.js); any other id
  // is that part of the form, on a page of its own. A part that isn't there
  // (the reflection before the shoot) gives the front page with opts.orFirst.
  function showShootPage(id, opts = {}) {
    if (id === 'front') { ed.showShootFront(); return; }
    const pages = ed.availableShootPages();
    if (!pages.some(p => p.id === id)) {
      if (opts.orFirst) ed.showShootFront();
      return;
    }
    ed.shootWanted = null;
    ed.shootPageId = id;
    ed.shootSub = 0;
    if (ed.currentShootId) ed.shootPageMemory[ed.currentShootId] = { id, sub: 0 };
    ed.shootPageEls.forEach(({ el }) => el.classList.remove('nb-off'));
    ed.showShootDetail(id);
    ed.drawShootSub();
    ed.drawShootPageNumber();
    ed.updateShootRunningHead();
    if (ed.shootBreakWatch) ed.shootBreakWatch.takeRecords();
  }

  ed.shootForm.addEventListener('input', (e) => { if (e.target.id === 'shootTitle') ed.updateShootRunningHead(); });
  // Anything that adds to a page or takes from it breaks the pages again.
  ed.shootBreakWatch = new MutationObserver((records) => {
    ed.noteShootChanges(records);
    ed.queueShootBreak();
  });
  ed.shootBreakWatch.observe(ed.shootForm, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden'] });
  // Only a field that really changed is followed; helpers and the expand popup fire input too.
  ed.shootForm.addEventListener('input', (e) => {
    if (ed.shootBreakChanged[ed.shootBreakChanged.length - 1] !== e.target) ed.shootBreakChanged.push(e.target);
  });
  ed.shootForm.addEventListener('focusout', () => ed.queueShootBreak(250));
  // Reflection comes and goes with the status: the page count follows, and if its
  // page is the open one when it goes, the book falls back to the first page.
  new MutationObserver(() => {
    if (ed.shootModalOverlay.hidden) return;
    if (document.getElementById('postShootContent').hidden && !ed.shootOnFront && ed.shootPageId === 'postShootHeading') showShootPage('front');
    else { ed.queueShootBreak(); ed.drawShootPageNumber(); }
  }).observe(document.getElementById('postShootContent'), { attributes: true, attributeFilter: ['hidden'] });

  // The buttons that used to sit on the page are still there (hidden) and
  // still decide when they apply: the next step button (next-step.js)
  // presses them. More is the band's right button.
  (function setupShootMoreMenu() {
    const overlay = document.getElementById('shootMoreOverlay');
    const close = () => { overlay.hidden = true; };
    const share = document.getElementById('shareShootBtn');
    const del = document.getElementById('deleteShootBtn');
    document.getElementById('shootBandMore').addEventListener('click', () => {
      document.getElementById('shootMoreShareBtn').hidden = share.hidden;
      document.getElementById('shootMoreShareDivider').hidden = share.hidden;
      document.getElementById('shootMoreDeleteBtn').hidden = del.hidden;
      document.getElementById('shootMoreDeleteDivider').hidden = del.hidden;
      overlay.hidden = false;
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.getElementById('shootMoreCancelBtn').addEventListener('click', close);
    [['shootMoreGuideBtn', 'shootTourBtn'], ['shootMoreShareBtn', 'shareShootBtn'], ['shootMoreDeleteBtn', 'deleteShootBtn']].forEach(([menuId, realId]) => {
      document.getElementById(menuId).addEventListener('click', () => {
        close();
        document.getElementById(realId).click();
      });
    });
  })();
};
