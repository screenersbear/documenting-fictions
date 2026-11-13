// Shoot mode's pages.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootModePages = function addShootModePages(ed) {
  Object.assign(ed, { drawShootModePage, breakShootModePages });
  // ---------- Shoot mode's pages ----------
  // Shoot mode is a page of the notebook as well, with the notebook around it
  // dimmed. Three parts, each a flow of its own so each starts on a fresh
  // page: last time's lesson, the quick review buttons and the shot list
  // (over as many pages as it runs to); the mood board, its photos sized to
  // fill its page; then the shooting notes.
  const shootModePage = ed.shootModeOverlay.querySelector('.shoot-mode-modal');
  const shootModeSheet = document.getElementById('shootModeSheet');
  const shootModeMain = document.getElementById('shootModeMain');
  const shootModeMore = document.getElementById('shootModeMore');
  const shootModeBoard = document.getElementById('shootModeMoodboardBlock');
  const shootModeBoardPart = document.getElementById('shootModeBoardPage');
  ed.shootModeFlows = null;
  ed.shootModeAt = 0;
  let shootModeBreakDue = false;
  ed.shootModeShowDue = null;  // a `show` held back while typing
  ed.shootModeWanted = null;   // a page asked for before the mood board's photos are in
  ed.shootModeBoardIn = false; // the mood board's photos are in

  function shootModeAtoms(root) {
    const atoms = [];
    const shown = el => el && !el.hidden && el.getClientRects().length > 0;
    const add = (el, heads) => { if (shown(el)) atoms.push({ el, heads: heads.filter(shown) }); };
    const listHead = document.getElementById('shootModeShotListHeading');
    [...root.children].forEach((child) => {
      if (child.id === 'shootModeShotList') {
        [...child.children].forEach(row => add(row, [listHead]));
      } else if (child === shootModeBoard) {
        const head = document.getElementById('shootModeMoodboardHeading');
        [...child.children].forEach((part) => {
          if (part === head || part.tagName === 'INPUT') return;
          if (part.id === 'shootModeMoodboard') [...part.children].forEach(row => add(row, [head]));
          else add(part, [head]);
        });
      } else if (child.matches('.shoot-mode-quick-review')) {
        add(child, [child.previousElementSibling]);
      } else if (child.id === 'shootModeAddShotBtn' && shown(child) && atoms.length && atoms[atoms.length - 1].heads.includes(listHead)) {
        // "+ Add shot" goes with the last shot (or the empty hint), never
        // onto a page of its own under the list's heading.
        atoms[atoms.length - 1].also = [child];
      } else if (child.matches('#shootModeShotsEmpty, #shootModeAddShotBtn')) {
        // Under the shot list: a page it runs onto keeps the list's heading.
        add(child, [listHead]);
      } else if (!child.matches('h3')) {
        add(child, []);
      }
    });
    return atoms;
  }

  // Three pages, each scrolling on its own (round 2, 07-shoot-mode): the
  // shot list, the mood board, then the notes. A swipe turns them; the dots
  // under the clock say which one this is.
  const PARTS = ['main', 'board', 'more'];
  const shootModePages = () => (ed.shootModeFlows ? PARTS.map(part => ({ part, i: 0 })) : []); ed.shootModePages = shootModePages;

  // The mood board's photos in rows of `cols` (a page breaks between rows).
  function groupShootModeBoard(cols) {
    const grid = document.getElementById('shootModeMoodboard');
    const thumbs = [...grid.querySelectorAll('.moodboard-thumb')];
    const rows = [...grid.querySelectorAll('.shoot-mode-moodboard-row')];
    const need = Math.ceil(thumbs.length / cols);
    while (rows.length < need) {
      const row = document.createElement('div');
      row.className = 'moodboard-grid shoot-mode-moodboard-row';
      grid.appendChild(row);
      rows.push(row);
    }
    thumbs.forEach((thumb, i) => rows[Math.floor(i / cols)].appendChild(thumb));
    rows.slice(need).forEach(row => row.remove());
  }

  const BOARD_GAP_X = 8;
  const BOARD_GAP_Y = 6;
  const BOARD_MIN = 64;
  const BOARD_GIVE = 1.25;
  function fitShootModeBoard(limitY) {
    const grid = document.getElementById('shootModeMoodboard');
    const n = grid.querySelectorAll('.moodboard-thumb').length;
    grid.classList.remove('is-fitted');
    ['--mb-cols', '--mb-w', '--mb-h'].forEach(v => grid.style.removeProperty(v));
    if (!n) { groupShootModeBoard(3); return; }
    const box = grid.getBoundingClientRect();
    const cs = getComputedStyle(grid);
    const W = grid.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    // Down to the foot of "+ Add photos", its margin too (the page would scroll by it).
    const addBtn = document.getElementById('shootModeAddMoodboardBtn');
    const below = addBtn.getBoundingClientRect().bottom + (parseFloat(getComputedStyle(addBtn).marginBottom) || 0) - box.bottom;
    const H = Math.floor(limitY - box.top - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - below) - 2;
    const ratios = [...grid.querySelectorAll('img')].map(img => (img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 0)).filter(Boolean).sort((a, b) => a - b);
    const ratio = Math.min(16 / 9, Math.max(9 / 16, ratios.length ? ratios[Math.floor(ratios.length / 2)] : 1));
    let best = null;
    for (let c = 1; c <= n; c++) {
      const r = Math.ceil(n / c);
      let w = (W - (c - 1) * BOARD_GAP_X) / c;
      let h = (H - r * BOARD_GAP_Y) / r;
      h = Math.min(h, (w / ratio) * BOARD_GIVE);
      w = Math.min(w, h * ratio * BOARD_GIVE);
      if (w > 0 && h > 0 && (!best || w * h > best.w * best.h)) best = { c, w, h };
    }
    if (!best || Math.min(best.w, best.h) < BOARD_MIN) {
      // Too many to fit one page: cells both ways at least BOARD_MIN, over more pages.
      const c = Math.max(1, Math.floor((W + BOARD_GAP_X) / (BOARD_MIN * Math.max(1, ratio) + BOARD_GAP_X)));
      const w = (W - (c - 1) * BOARD_GAP_X) / c;
      const fallback = { c, w, h: w / ratio };
      if (!best || Math.min(fallback.w, fallback.h) > Math.min(best.w, best.h)) {
        // As many whole rows as a page takes, stretched (a little, as above)
        // to fill it rather than leave a strip at the foot of each page.
        const room = limitY - box.top - parseFloat(cs.paddingTop) - 2;
        const perPage = Math.max(1, Math.floor(room / (fallback.h + BOARD_GAP_Y)));
        if (Math.ceil(n / c) > perPage) fallback.h = Math.min(room / perPage - BOARD_GAP_Y, fallback.h * BOARD_GIVE);
        best = fallback;
      }
    }
    groupShootModeBoard(best.c);
    grid.style.setProperty('--mb-cols', String(best.c));
    grid.style.setProperty('--mb-w', `${Math.floor(best.w)}px`);
    grid.style.setProperty('--mb-h', `${Math.floor(best.h)}px`);
    grid.classList.add('is-fitted');
  }

  function drawShootModePage() {
    const pages = shootModePages();
    ed.shootModeAt = Math.max(0, Math.min(ed.shootModeAt, pages.length - 1));
    const page = pages[ed.shootModeAt];
    if (page) {
      shootModeSheet.dataset.part = page.part;
      ed.drawFlowPage(ed.shootModeFlows[page.part], page.i);
    }
    document.getElementById('shootModeFoot').textContent = `${ed.shootModeAt + 1} / ${Math.max(1, pages.length)}`;
    document.getElementById('shootModeDots').innerHTML = pages.map((p, i) => `<span class="${i === ed.shootModeAt ? 'on' : ''}"></span>`).join('');
    shootModePage.scrollTop = 0;
    document.getElementById('shootModePrev').disabled = ed.shootModeAt <= 0;
    document.getElementById('shootModeNext').disabled = ed.shootModeAt >= pages.length - 1;
    ed.queueLastPlace();
  }

  // `show`: something that has to end up on the page showing (a new shot
  // row, the newest photo). Held while typing in it, and done on focusout.
  function breakShootModePages(opts = {}) {
    if (ed.shootModeOverlay.hidden) return;
    const active = document.activeElement;
    if (!opts.force && ed.typingNow() && ed.shootModeOverlay.contains(active)) {
      shootModeBreakDue = true;
      if (opts.show) ed.shootModeShowDue = opts.show;
      return;
    }
    shootModeBreakDue = false;
    const show = opts.show || ed.shootModeShowDue;
    ed.shootModeShowDue = null;
    const pages = shootModePages();
    const was = pages[ed.shootModeAt];
    // Whatever was at the top of the page showing stays on the page showing.
    let anchor = show || (was && ed.shootModeFlows[was.part].pages[was.i] && ed.shootModeFlows[was.part].pages[was.i].atoms[0] && ed.shootModeFlows[was.part].pages[was.i].atoms[0].el);
    // A row of photos can be taken apart below: hold on to its first photo.
    if (anchor && anchor.matches && anchor.matches('.shoot-mode-moodboard-row')) anchor = anchor.querySelector('.moodboard-thumb') || anchor;
    const scrolled = Number.isInteger(opts.at) ? 0 : shootModePage.scrollTop;
    const limit = () => shootModePage.getBoundingClientRect().top + shootModePage.clientHeight - parseFloat(getComputedStyle(shootModePage).paddingBottom);
    // Each part is measured while it's the one showing, its writing sized to
    // fit first (a hidden one would measure nothing and lose its height).
    shootModeSheet.querySelectorAll('.pg-off, .pg-first').forEach(el => el.classList.remove('pg-off', 'pg-first'));
    shootModeSheet.dataset.part = 'main';
    shootModeMain.querySelectorAll('.shot-text').forEach(ed.autoSizeTextarea);
    const main = ed.buildFlow(shootModeMain, shootModeAtoms, limit(), { margins: true, later: true });
    shootModeSheet.dataset.part = 'board';
    // Its photos in rows of three, as tall as they come (not fitted to a page).
    const boardGrid = document.getElementById('shootModeMoodboard');
    boardGrid.classList.remove('is-fitted');
    ['--mb-cols', '--mb-w', '--mb-h'].forEach(v => boardGrid.style.removeProperty(v));
    groupShootModeBoard(3);
    const board = ed.buildFlow(shootModeBoardPart, shootModeAtoms, limit(), { margins: true, later: true });
    shootModeSheet.dataset.part = 'more';
    ed.autoSizeTextarea(document.getElementById('shootModeShootingNotes'));
    const more = ed.buildFlow(shootModeMore, shootModeAtoms, limit(), { margins: true, later: true });
    ed.shootModeFlows = { main, board, more };
    const holds = (el) => ({ part, i }) => ed.shootModeFlows[part].pages[i].atoms.some(a => a.el === el || a.el.contains(el));
    if (ed.shootModeWanted !== null) ed.shootModeAt = ed.shootModeWanted;
    else if (Number.isInteger(opts.at)) ed.shootModeAt = opts.at;
    else if (anchor) {
      const at = shootModePages().findIndex(holds(anchor));
      if (at >= 0) ed.shootModeAt = at;
    }
    // Something just written that grew past the page's foot: the page turns with it.
    if (opts.follow && ed.shootModeWanted === null) {
      const now = shootModePages();
      if (now[ed.shootModeAt] && !holds(opts.follow)(now[ed.shootModeAt])) {
        const at = now.findIndex(holds(opts.follow));
        if (at >= 0) ed.shootModeAt = at;
      }
    }
    shootModeSheet.dataset.part = 'main';
    drawShootModePage();
    shootModePage.scrollTop = scrolled;
    // Something that has to be seen (a new shot row, the newest photo) is scrolled to.
    if (show && show.scrollIntoView) show.scrollIntoView({ block: 'nearest' });
  }

  // The header sets where every page starts, and its clock lines come and
  // go (golden hour, the must-haves) on their own: the pages are cut again.
  (function watchShootModeHeader() {
    const header = shootModeSheet.querySelector('.shoot-mode-header');
    if (!header || !window.ResizeObserver) return;
    let height = 0;
    new ResizeObserver(() => {
      const now = header.offsetHeight;
      if (now === height) return;
      height = now;
      if (!ed.shootModeOverlay.hidden && ed.shootModeFlows) breakShootModePages();
    }).observe(header);
  })();

  // The copy keeps its ids, and so its look (the shot rows', the mood
  // board's and the title's come from them): it sits in the turn layer after
  // the real page, so a look-up by id still finds the real one first.
  const shootModeSheetCopy = () => ed.pageCopy(shootModeSheet, copy => copy.removeAttribute('id'));

  function stepShootModePage(by) {
    const to = ed.shootModeAt + by;
    if (to < 0 || to >= shootModePages().length) return;
    const turning = ed.motionOk();
    const oldCopy = turning ? shootModeSheetCopy() : null;
    ed.shootModeWanted = null;
    ed.shootModeAt = to;
    drawShootModePage();
    if (!turning) return;
    const layer = ed.shootModeOverlay.querySelector('.nb-turn-layer');
    if (by > 0) ed.playTurn(layer, '', oldCopy);
    else ed.playTurn(layer, 'back', shootModeSheetCopy(), oldCopy);
  }
  document.getElementById('shootModePrev').addEventListener('click', () => stepShootModePage(-1));
  document.getElementById('shootModeNext').addEventListener('click', () => stepShootModePage(1));

  (function setupShootModePageSwipe() {
    let start = null;
    ed.shootModeOverlay.addEventListener('touchstart', (e) => {
      start = null;
      if (e.touches.length !== 1 || ed.typingNow()) return;
      if (e.target.closest('.shoot-mode-bottom-bar, [class*="drag-handle"], input[type=range], .nb-page-foot')) return;
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) return;
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });
    ed.shootModeOverlay.addEventListener('touchcancel', () => { start = null; }, { passive: true });
    ed.shootModeOverlay.addEventListener('touchend', (e) => {
      if (!start) return;
      const dx = e.changedTouches[0].clientX - start.x;
      const dy = e.changedTouches[0].clientY - start.y;
      start = null;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      stepShootModePage(dx < 0 ? 1 : -1);
    }, { passive: true });
    // Typing grows a row or the notes: the pages are cut again once it's done.
    ed.shootModeOverlay.addEventListener('focusout', (e) => {
      const written = e.target.closest && e.target.closest('.shoot-mode-shot-row, #shootModeMain > *, #shootModeBoardPage > *, #shootModeMore > *');
      setTimeout(() => { if (shootModeBreakDue || !ed.typingNow()) breakShootModePages({ follow: written }); }, 0);
    });
  })();
};
