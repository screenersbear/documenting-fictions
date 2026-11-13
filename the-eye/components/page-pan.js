// Turning between a screen's pages: the slide, the spread, the buttons and the keys.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addPagePan = function addPagePan(ed) {
  Object.assign(ed, { clearPan, turnScreenPage, stepScreenPage });
  // Moving along an open spread. Two pictures of the page, side by side, slide
  // across over the real page, which is already the new one underneath.
  const PAN_MS = 460;
  let panLayer = null;
  let panTimer = 0;

  function clearPan() {
    clearTimeout(panTimer);
    if (panLayer) panLayer.remove();
    panLayer = null;
    document.documentElement.classList.remove('nb-panning');
  }

  function pinTo(el, rect) {
    Object.assign(el.style, {
      position: 'absolute', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`,
      right: 'auto', bottom: 'auto',
    });
  }

  // One side of the spread as it's drawn right now. Where the frame's parts
  // sit depends on the side the book is on, so the picture keeps its own.
  function spreadPicture(view) {
    const board = document.querySelector('.nb-board');
    const rect = board.getBoundingClientRect();
    const frame = board.cloneNode(true);
    frame.querySelectorAll('.nb-turn, .nb-turn-under').forEach(el => el.remove());
    frame.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
    pinTo(frame, rect);
    frame.style.boxShadow = 'none';
    frame.style.borderRadius = getComputedStyle(board).borderRadius;
    ['.nb-board-page', '.nb-screen-foot'].forEach((part) => {
      const { left, right, top, bottom, borderRadius } = getComputedStyle(board.querySelector(part));
      Object.assign(frame.querySelector(part).style, { left, right, top, bottom, borderRadius });
    });
    const side = document.createElement('div');
    side.className = 'nb-pan-side';
    const copy = ed.pageCopy(ed.views[view]);
    copy.holder.style.left = `${copy.left}px`;
    copy.holder.style.top = `${copy.top}px`;
    side.append(copy.holder, frame);
    const tabs = document.querySelector('.nb-screen-tabs:not(.nb-screen-tabs-shoot)');
    if (tabs.getClientRects().length) {
      const tabsCopy = tabs.cloneNode(true);
      pinTo(tabsCopy, tabs.getBoundingClientRect());
      tabsCopy.style.display = 'flex';
      tabsCopy.style.visibility = 'visible';
      side.appendChild(tabsCopy);
    }
    return { side, rect };
  }

  function panSpread(view, to) {
    clearPan();
    ed.clearTurn(document.querySelector('.nb-board'));
    const before = spreadPicture(view);
    ed.scrollPageTo(0);
    ed.screenAt[view] = to;
    ed.drawScreenPage(view);
    const after = spreadPicture(view);
    const goingOn = to > 0;
    const left = goingOn ? before : after;
    const right = goingOn ? after : before;
    const distance = left.rect.right - right.rect.left;
    right.side.style.left = `${distance}px`;
    const strip = document.createElement('div');
    strip.className = `nb-pan-strip ${goingOn ? 'on' : 'back'}`;
    strip.style.setProperty('--pan', `${-distance}px`);
    strip.append(left.side, right.side);
    panLayer = document.createElement('div');
    panLayer.className = 'nb-pan';
    panLayer.setAttribute('aria-hidden', 'true');
    panLayer.appendChild(strip);
    document.body.appendChild(panLayer);
    document.documentElement.classList.add('nb-panning');
    panTimer = setTimeout(clearPan, PAN_MS + 40);
  }

  function turnScreenPage(view, to) {
    const from = ed.screenNow(view);
    if (to < 0 || to >= ed.screenPageCount(view) || to === from) return;
    clearPan();
    const turning = ed.motionOk();
    // The left and right pages lie open side by side: no leaf between them.
    if (turning && view === 'overview' && (from === 0 || to === 0)) { panSpread(view, to); return; }
    const oldCopy = turning ? ed.pageCopy(ed.views[view]) : null;
    ed.scrollPageTo(0); // only a page with something too tall on it could be scrolled
    ed.screenAt[view] = to;
    ed.drawScreenPage(view);
    if (!turning) return;
    const board = document.querySelector('.nb-board');
    if (to > from) ed.playTurn(board, '', oldCopy);
    else ed.playTurn(board, 'back', ed.pageCopy(ed.views[view]), oldCopy);
  }
  function stepScreenPage(by) {
    const view = ed.currentScreen();
    const to = ed.screenNow(view) + by;
    if (to >= 0 && to < ed.screenPageCount(view)) { turnScreenPage(view, to); return; }
    // Turning past a section's last page (or back past its first) carries on
    // into the next section, as a leaf turn, landing on its first page either
    // way. Nothing comes before Overview: the book only shuts from the navigator.
    const order = [...document.querySelectorAll('.tabbar .tab')].map(tab => tab.dataset.view);
    const next = order[order.indexOf(view) + Math.sign(by)];
    if (next) ed.turnToView(next);
  }
  document.getElementById('nbScreenPrev').addEventListener('click', () => stepScreenPage(-1));
  document.getElementById('nbScreenNext').addEventListener('click', () => stepScreenPage(1));

  // Opening or closing a filter row changes the room on the page, and a new
  // filter starts from the first page.
  [['shootSortOptions', 'shoots'], ['archiveFilters', 'archive'], ['journalFilters', 'journal'], ['statsYearFilters', 'stats']].forEach(([id, view]) => {
    const el = document.getElementById(id);
    new MutationObserver(() => ed.repaginate(view)).observe(el, { attributes: true, attributeFilter: ['hidden'] });
    el.addEventListener('click', (e) => { if (e.target.closest('.chip')) ed.screenAt[view] = 0; }, true);
  });

  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      const activeBefore = document.querySelector('.tab.active');
      const previous = activeBefore ? activeBefore.dataset.view : view;
      const turning = ed.turnNextTab && previous !== view;
      ed.turnNextTab = false;
      const oldCopy = turning ? ed.pageCopy(ed.views[previous]) : null;
      clearPan();
      document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b === btn));
      document.documentElement.dataset.view = view;
      Object.entries(ed.views).forEach(([key, el]) => { el.hidden = key !== view; });
      // Stop the Archive photo rotation the moment you leave it, rather than
      // waiting on renderArchiveSlideshow's async pass to notice.
      if (view !== 'archive') ed.stopArchiveSlideshow();
      ed.scrollPageTo(0);
      // Turning to a screen opens it at its first page.
      ed.screenAt[view] = 0;
      if (view === 'stats') ed.statsPageIdx = 0;
      ed.syncPageSide();
      ed.renderAll();
      if (turning) {
        const order = [...document.querySelectorAll('.tabbar .tab')].map(tab => tab.dataset.view);
        const board = document.querySelector('.nb-board');
        // Going on, the old page swings away; going back, the page before
        // swings in over it.
        if (order.indexOf(view) > order.indexOf(previous)) ed.playTurn(board, '', oldCopy);
        else ed.playTurn(board, 'back', ed.pageCopy(ed.views[view]), oldCopy);
      }
      // Journal's intro was rewritten when the Log and Reflections notebooks
      // merged into one page, under a new key so anyone who dismissed the old
      // wording sees the new one once.
      ed.showTabIntro(view === 'journal' ? 'journal2' : view);
    });
  });
};
