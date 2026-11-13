// A shoot as a chapter: showing a page, and the bar and menus under it.
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

  // Scrolls to a section (the first one is the top of the page). opts.turn:
  // asked for by a tap, so it glides there.
  function showShootPage(id, opts = {}) {
    const pages = ed.availableShootPages();
    if (!pages.some(p => p.id === id)) {
      if (!opts.orFirst) return;
      id = pages[0].id;
    }
    ed.shootWanted = null;
    ed.shootPageId = id;
    ed.shootSub = 0;
    if (ed.currentShootId) ed.shootPageMemory[ed.currentShootId] = { id, sub: 0 };
    ed.shootPageEls.forEach(({ el }) => el.classList.remove('nb-off'));
    ed.drawShootSub();
    ed.drawShootPageNumber();
    ed.updateShootRunningHead();
    // Boxes that were out of sight may have measured nothing.
    ed.autoSizeAllListTextareas();
    ed.syncAllShootFormFields();
    const modal = ed.shootModalOverlay.querySelector('.modal');
    const head = document.getElementById(id);
    const top = id === pages[0].id || !head ? 0
      : modal.scrollTop + head.getBoundingClientRect().top - modal.getBoundingClientRect().top - parseFloat(getComputedStyle(modal).paddingTop);
    modal.scrollTo({ top: Math.max(0, top), behavior: opts.turn && ed.motionOk() ? 'smooth' : 'auto' });
    if (ed.shootBreakWatch) ed.shootBreakWatch.takeRecords();
  }

  // Scrolled by hand: the section at the top of the page is the one it's on.
  (function followShootScroll() {
    const modal = ed.shootModalOverlay.querySelector('.modal');
    let due = false;
    modal.addEventListener('scroll', () => {
      if (due) return;
      due = true;
      setTimeout(() => {
        due = false;
        if (ed.shootModalOverlay.hidden || ed.shootWizardActive || ed.shootWizardPendingId) return;
        const line = modal.getBoundingClientRect().top + modal.clientHeight / 3;
        let on = null;
        ed.availableShootPages().forEach(({ id }) => {
          const head = document.getElementById(id);
          if (head && head.getBoundingClientRect().top <= line) on = id;
        });
        on = on || ed.availableShootPages()[0].id;
        if (on === ed.shootPageId) return;
        ed.shootPageId = on;
        if (ed.currentShootId) ed.shootPageMemory[ed.currentShootId] = { id: on, sub: 0 };
        ed.drawShootPageNumber();
      }, 120);
    }, { passive: true });
  })();

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
    if (document.getElementById('postShootContent').hidden && ed.shootPageId === 'postShootHeading') showShootPage('basicInfoHeading');
    else { ed.queueShootBreak(); ed.drawShootPageNumber(); }
  }).observe(document.getElementById('postShootContent'), { attributes: true, attributeFilter: ['hidden'] });

  // The bottom bar stands in for the buttons that used to sit on the page.
  // They're still there (hidden) and still decide when they apply, so each
  // bar button simply follows its original.
  [
    ['nbBarShootMode', 'enterShootModeBtn'],
    ['nbBarComplete', 'completeShootBtn'],
    ['nbBarUnarchive', 'unarchiveShootBtn'],
  ].forEach(([barId, realId]) => {
    const barBtn = document.getElementById(barId);
    const real = document.getElementById(realId);
    const follow = () => { barBtn.hidden = real.hidden; };
    follow();
    new MutationObserver(follow).observe(real, { attributes: true, attributeFilter: ['hidden'] });
    barBtn.addEventListener('click', () => real.click());
  });
  document.getElementById('nbBarBack').addEventListener('click', () => {
    ed.shootModalOverlay.querySelector('[data-close="shoot"]').click();
  });
  (function setupShootMoreMenu() {
    const overlay = document.getElementById('shootMoreOverlay');
    const close = () => { overlay.hidden = true; };
    const share = document.getElementById('shareShootBtn');
    const del = document.getElementById('deleteShootBtn');
    document.getElementById('nbBarMore').addEventListener('click', () => {
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
