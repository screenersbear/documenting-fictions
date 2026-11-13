// The notebook: its tabs, and opening it at one.
// (Loaded before app.js; the file it belongs to runs it.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addBookOpen = function addBookOpen(ed, notebook) {
  Object.assign(notebook, { remember, measure, placeTabHits, show });
    // One tab per screen of the app, each on a sheet of its own, named. The
    // buttons are laid over them flat: the tabs themselves are turned in 3D.
    const SCREENS = [...document.querySelectorAll('.tabbar .tab')].map(tab => ({ view: tab.dataset.view, name: tab.textContent.trim() })); notebook.SCREENS = SCREENS;
    const sideTabs = document.getElementById('bookSideTabs');
    const tabHits = document.getElementById('bookTabHits');
    sideTabs.innerHTML = SCREENS.map((s, i) => `<i class="${i % 2 ? 'n' : 'y'}" style="--t:${i};--i:${3 + i * 3}"><span>${s.name}</span></i>`).join('');
    tabHits.innerHTML = SCREENS.map(s => `<button type="button" class="nb-hit nb-hit-tab" data-view="${s.view}" aria-label="Open at ${s.name}"></button>`).join('');

    function remember(state) {
      try { localStorage.setItem(notebook.BOOK_KEY, state); } catch (err) { /* storage unavailable: it just opens shut next time */ }
      ed.queueLastPlace();
    }

    function measure() {
      const vw = window.innerWidth;
      const vh = ed.screenHeightNow();
      const W = Math.min(vw * 0.78, vh * 0.66 * notebook.RATIO, 460);
      const H = W / notebook.RATIO;
      const k = Math.min(1, (vw - 14) / (2 * W), (vh * 0.82) / H);
      notebook.book.style.setProperty('--W', `${W}px`);
      notebook.book.style.setProperty('--H', `${H}px`);
      notebook.book.style.setProperty('--k', String(k));
      // Turned, the near side looks bigger and the pages and tabs show down
      // the right, so what you see would sit right of the middle. This slides
      // it back by half that difference.
      const cos = Math.cos(notebook.TURNED);
      const sin = Math.sin(notebook.TURNED);
      const depth = (notebook.STACK + 1) * W * 0.0112;
      const seen = [[-W / 2, 0], [W / 2, 0], [-W / 2, -depth], [W / 2 + W * notebook.TAB_OUT, -depth * 0.8]].map(
        ([x, d]) => ((x * cos - d * sin) * notebook.PERSPECTIVE) / (notebook.PERSPECTIVE - (x * sin + d * cos)),
      );
      notebook.book.style.setProperty('--shut-x', `${-(Math.min(...seen) + Math.max(...seen)) / 2 / cos}px`);
      ed.relayStickers();
      // Zoomed in, the spine lies along one side of the screen and the page's
      // white covers the rest, OVER past every edge so even its round corners
      // are off the screen; then the plain page underneath takes over. The
      // white inside the cover's block art (df-*-block.webp) stops 2.5% short
      // of the outer edge and 1.9% short of the top and bottom; a section's
      // own right-hand page (.nb-right-page) 1.6% and 1.4%.
      const OVER = 12;
      notebook.book.style.setProperty('--zoom-x', `${vw / 2}px`);
      notebook.book.style.setProperty('--zoom-y', '0px');
      notebook.book.style.setProperty('--zoom-sx', String((vw + OVER) / 0.975 / W));
      notebook.book.style.setProperty('--zoom-rx', String((vw + OVER) / 0.984 / W));
      notebook.book.style.setProperty('--zoom-sy', String((vh + 2 * OVER) / 0.962 / H));
    }

    function setMode(mode) {
      if (mode !== 'closed') notebook.settleTurn();
      notebook.book.className = `nb ${mode}`;
    }

    // Where the side tabs land on screen with the book shut. Measured in that
    // pose in one go, before anything paints.
    function placeTabHits() {
      const before = notebook.book.className;
      const turned = notebook.spinEl.style.transform;
      notebook.spinEl.style.transform = '';
      notebook.book.className = 'nb no-anim closed';
      const rects = [...sideTabs.children].map(el => el.getBoundingClientRect());
      const hits = [...tabHits.children];
      rects.forEach((r, i) => {
        const above = i ? (rects[i - 1].bottom + r.top) / 2 : r.top - 4;
        const below = i < rects.length - 1 ? (r.bottom + rects[i + 1].top) / 2 : r.bottom + 4;
        hits[i].style.cssText = `left:${r.left - 12}px;right:0;top:${above}px;height:${below - above}px`;
      });
      notebook.book.className = before;
      notebook.spinEl.style.transform = turned;
      void notebook.book.offsetWidth;
    }

    function show(mode) {
      if (mode !== 'closed') notebook.settleTurn();
      measure();
      notebook.overlay.hidden = false;
      placeTabHits();
      notebook.book.className = `nb no-anim ${mode}`;
      void notebook.book.offsetWidth;
    }

    function leaveTo(mode, then) {
      clearTimeout(notebook.timer);
      setMode(mode);
      notebook.timer = setTimeout(() => {
        notebook.overlay.hidden = true;
        remember('open');
        notebook.settleScreenGap(); // the page has just been let go of
        if (then) then();
      }, notebook.ZOOM_MS);
    }

    // Further into the book the further down the tab: more sheets to the left.
    function sheets(count, side) {
      return Array.from({ length: count }, (_, i) => `${side * (i + 1) * 1.2}px 0 0 ${i % 2 ? '#e4e4e4' : '#fff'}`).join(',');
    }

    function openBook(view) {
      clearTimeout(notebook.timer);
      const at = SCREENS.findIndex(s => s.view === view);
      if (at > 0) {
        document.getElementById('bookDividerTitle').textContent = SCREENS[at].name;
        document.getElementById('bookDividerFace').style.boxShadow = sheets(2 + at * 3, -1);
        document.getElementById('bookRightPage').style.boxShadow = sheets(2 + (SCREENS.length - 1 - at) * 3, 1);
      }
      setMode(at > 0 ? 'opened at-section' : 'opened');
      notebook.timer = setTimeout(() => {
        document.querySelector(`.tabbar .tab[data-view="${view}"]`).click();
        leaveTo(at > 0 ? 'opened at-section zoom-r' : 'opened zoom-l');
      }, at > 0 ? notebook.SECTION_MS : notebook.OPEN_MS);
    }

    document.getElementById('bookOpenHit').addEventListener('click', () => openBook('overview'));
    tabHits.addEventListener('click', (e) => {
      const hit = e.target.closest('[data-view]');
      if (hit) openBook(hit.dataset.view);
    });
    document.getElementById('shutBookBtn').addEventListener('click', () => {
      // Inside Documenting Fictions the shelf is the shut book: back to it,
      // and it shrinks the page back into this notebook there.
      if (window.DF_SUITE) { window.DF_SUITE.home(); return; }
      clearTimeout(notebook.timer);
      // The book shuts from the left-hand page, wherever Overview had got to.
      ed.clearPan();
      ed.screenAt.overview = 0;
      ed.drawScreenPage('overview');
      show('opened zoom-l');
      setMode('closed');
      remember('shut');
    });
};
