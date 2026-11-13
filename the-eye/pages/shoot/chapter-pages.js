// A shoot as a chapter: its pages, and where they break.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootChapterPages = function addShootChapterPages(ed) {
  Object.assign(ed, { typingNow, shootFlatPages, drawShootSub, breakShootPages, noteShootChanges, queueShootBreak, availableShootPages, drawShootPageNumber, updateShootRunningHead });
  // ---------- A shoot as a chapter ----------
  // A shoot is one page that scrolls, its sections one under another. Which
  // section is at the top of the page is kept (shootPageId) for coming back
  // to it. The form's direct children are listed by section (shootPageEls).
  const shootPageEls = (() => {
    const ids = ed.SHOOT_MODAL_SECTIONS.map(sec => sec.id);
    const els = [];
    let page = null;
    [...ed.shootForm.children].forEach(el => {
      if (el.id === 'postShootContent') { els.push({ el, page: 'postShootHeading' }); page = null; return; }
      if (ids.includes(el.id)) page = el.id;
      if (page && !el.classList.contains('folder-tab-deco') && el.id !== 'deleteShootBtn' && !el.classList.contains('modal-actions') && el.id !== 'shootWizard') els.push({ el, page });
    });
    return els;
  })(); ed.shootPageEls = shootPageEls;
  const shootPageMemory = {}; ed.shootPageMemory = shootPageMemory;
  ed.shootPageId = 'basicInfoHeading';
  // A section runs over as many pages as it needs. Inside a shoot the breaks
  // fall between whole blocks: a list stays in one piece so it can be dragged
  // and typed in, and one taller than a page scrolls on a page of its own.
  ed.shootSub = 0;
  ed.shootFlows = null;
  ed.shootBreakWatch = null;
  let shootBreakTimer = null;
  ed.shootBreakChanged = []; // what's changed since the pages were last broken
  ed.shootWanted = null; // the page a shoot reopens on, held until its photos are in
  ed.shootOpening = null; // set while a shoot that's just opened waits for its photos
  const SHOOT_PAGE_BODIES = {
    basicInfoHeading: 'basicInfoBody',
    logisticsHeading: 'logisticsBody',
    teamHeading: 'teamBody',
    directionHeading: 'directionBody',
    visualsHeading: 'visualsBody',
    shotListHeading: 'shotListBody',
    postShootHeading: 'postShootBody',
  };
  const SHOOT_BLOCKS_INSIDE = '#formSection2, #narrativeFieldsBlock, #videoDeliverablesBlock, #frameworkTagsContainerEarly, #frameworkTagsContainer';
  const SHOOT_STAYS_WITH_NEXT = '.form-section-label-row, #conceptHelperBtn, #reflectHelperBtn';
  const SHOOT_STAYS_WITH_LAST = '#multiDayRow, #addShotBtn';

  function typingNow() {
    const el = document.activeElement;
    return !!el && (el.isContentEditable || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT'
      || (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'file'].includes(el.type)));
  }

  function shootFlowAtoms(body) {
    const atoms = [];
    let glue = false;
    const walk = (parent) => [...parent.children].forEach((el) => {
      if (el.hidden || !el.getBoundingClientRect().height) return;
      if (el.matches(SHOOT_BLOCKS_INSIDE)) { walk(el); return; }
      const last = atoms[atoms.length - 1];
      if (last && (glue || el.matches(SHOOT_STAYS_WITH_LAST))) last.also.push(el);
      else atoms.push({ el, also: [], heads: [] });
      glue = el.matches(SHOOT_STAYS_WITH_NEXT);
    });
    walk(body);
    return atoms;
  }

  function shootFlatPages() {
    const flat = [];
    availableShootPages().forEach(({ id }) => {
      const flow = ed.shootFlows && ed.shootFlows[id];
      const count = (flow && flow.pages.length) || 1;
      for (let sub = 0; sub < count; sub++) flat.push({ id, sub });
    });
    return flat;
  }

  function drawShootSub() {
    if (ed.shootWizardActive || ed.shootWizardPendingId) return;
    const flow = ed.shootFlows && ed.shootFlows[ed.shootPageId];
    if (!flow || !flow.pages.length) { ed.shootSub = 0; return; }
    ed.shootSub = Math.max(0, Math.min(ed.shootSub, flow.pages.length - 1));
    ed.drawFlowPage(flow, ed.shootSub);
    if (ed.currentShootId && !ed.shootWanted) shootPageMemory[ed.currentShootId] = { id: ed.shootPageId, sub: ed.shootSub };
  }

  // All in one go, before anything's painted. Holds off while a field is
  // being typed in, a row's being dragged or the new-shoot steps are up.
  function breakShootPages() {
    if (ed.shootModalOverlay.hidden || ed.shootWizardActive || ed.shootWizardPendingId || typingNow()) return;
    if (!document.getElementById('expandFieldOverlay').hidden) return;
    if (ed.shootForm.querySelector('.shot-dragging, .lighting-dragging')) return;
    const modal = ed.shootModalOverlay.querySelector('.modal');
    const scrolled = modal.scrollTop;
    modal.scrollTop = 0;
    const oldFlow = ed.shootFlows && ed.shootFlows[ed.shootPageId];
    const oldPage = oldFlow && oldFlow.pages[ed.shootSub];
    if (ed.shootBreakWatch) noteShootChanges(ed.shootBreakWatch.takeRecords());
    const atomHolds = (a, node) => [a.el, ...a.also].some(el => el.contains(node));
    // Stay with the block that just changed on this page: if it has grown
    // over onto the next one, the page turns with it. Otherwise stay with
    // what the page started with.
    const changedHere = oldPage ? ed.shootBreakChanged.filter(node => oldPage.atoms.some(a => atomHolds(a, node))) : [];
    const follow = changedHere.length ? changedHere[changedHere.length - 1] : oldPage ? oldPage.atoms[0].el : null;
    ed.shootBreakChanged = [];
    ed.shootForm.querySelectorAll('.pg-off, .pg-first').forEach(el => el.classList.remove('pg-off', 'pg-first'));
    shootPageEls.forEach(({ el }) => el.classList.remove('nb-off'));
    ed.autoSizeAllListTextareas();
    ed.syncAllShootFormFields();
    const flows = {};
    availableShootPages().forEach(({ id }) => {
      flows[id] = ed.buildFlow(document.getElementById(SHOOT_PAGE_BODIES[id]), shootFlowAtoms);
    });
    ed.shootFlows = flows;
    const flow = ed.shootFlows[ed.shootPageId];
    // An edit on this page outranks the remembered page.
    if (changedHere.length) ed.shootWanted = null;
    if (ed.shootWanted && ed.shootWanted.id === ed.shootPageId) ed.shootSub = ed.shootWanted.sub;
    else {
      const found = follow && flow ? flow.pages.findIndex(p => p.atoms.some(a => atomHolds(a, follow))) : -1;
      if (found >= 0) ed.shootSub = found;
    }
    if (!ed.shootOpening) ed.shootWanted = null; // photos are in: this is the real page count
    drawShootSub();
    drawShootPageNumber();
    // Boxes hidden while the others were measured lost their height.
    ed.autoSizeAllListTextareas();
    ed.syncAllShootFormFields();
    modal.scrollTop = scrolled;
    if (ed.shootBreakWatch) ed.shootBreakWatch.takeRecords();
  }

  // A shoot's photos arriving as it opens aren't an edit to follow.
  function noteShootChanges(records) {
    records.forEach((r) => {
      if (!ed.shootOpening || !r.target.closest('#moodboardGrid, #finalImagesGrid')) ed.shootBreakChanged.push(r.target);
    });
  }

  function queueShootBreak(ms = 80) {
    clearTimeout(shootBreakTimer);
    shootBreakTimer = setTimeout(breakShootPages, ms);
  }

  function availableShootPages() {
    const reflection = !document.getElementById('postShootContent').hidden;
    return ed.SHOOT_MODAL_SECTIONS.filter(sec => sec.id !== 'postShootHeading' || reflection);
  }

  function drawShootPageNumber() {
    ed.queueLastPlace();
    const pages = shootFlatPages();
    const at = pages.findIndex(p => p.id === ed.shootPageId && p.sub === ed.shootSub);
    document.getElementById('nbPageFoot').textContent = `${at + 1} / ${pages.length}`;
    document.getElementById('nbPagePrev').disabled = at <= 0;
    document.getElementById('nbPageNext').disabled = at >= pages.length - 1;
  }

  // The running head: the shoot's name, written at the top of each page.
  function updateShootRunningHead() {
    document.getElementById('nbShootRun').textContent = ed.shootDisplayName({
      title: document.getElementById('shootTitle').value.trim(),
      talents: ed.currentTalents,
    });
  }
};
