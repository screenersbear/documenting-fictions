// A screen laid out as notebook pages: what goes on each page.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addScreenPages = function addScreenPages(ed) {
  Object.assign(ed, { drawFlowPage, buildFlow, statsFlat, screenPageCount, syncPageSide, drawScreenPage, repaginate });
  function atomBottom(a) {
    const el = a.also && a.also.length ? a.also[a.also.length - 1] : a.el;
    return el.getBoundingClientRect().bottom;
  }

  function clearSlice(body) {
    body.style.height = '';
    body.style.overflow = '';
    body.firstElementChild.style.transform = '';
  }

  function drawFlowPage(flow, at) {
    flow.root.querySelectorAll('.pg-first').forEach(el => el.classList.remove('pg-first'));
    flow.parts.forEach(el => el.classList.add('pg-off'));
    flow.bodies.forEach(clearSlice);
    const page = flow.pages[at];
    if (!page) return;
    const show = (el) => {
      for (let n = el; n && n !== flow.root && n.classList.contains('pg-off'); n = n.parentElement) n.classList.remove('pg-off');
    };
    const spans = new Map();
    page.atoms.forEach((a) => {
      show(a.el);
      (a.also || []).forEach(show);
      a.heads.forEach(show);
      if (a.row === undefined) return;
      const span = spans.get(a.el);
      if (span) span.count++;
      else spans.set(a.el, { first: a.row, count: 1, rows: a.rows });
    });
    // A long entry shows through a window as tall as its lines on this page.
    spans.forEach(({ first, count, rows }, body) => {
      if (count === rows) return;
      body.style.height = `${count * ed.LINE}px`;
      body.style.overflow = 'hidden';
      body.firstElementChild.style.transform = `translateY(${-first * ed.LINE}px)`;
    });
    if (at > 0) {
      // Whatever starts a later page starts at the top of it.
      const first = page.atoms[0].heads[0] || page.atoms[0].el;
      for (let n = first; n && n !== flow.root; n = n.parentElement) n.classList.add('pg-first');
    }
  }

  // A flow is one page holding everything; nothing is cut off or hidden.
  function buildFlow(root, atomsOf) {
    root.querySelectorAll('.pg-off, .pg-first').forEach(el => el.classList.remove('pg-off', 'pg-first'));
    root.querySelectorAll('.jb-in').forEach(el => clearSlice(el.parentElement));
    const atoms = atomsOf(root);
    return { root, parts: new Set(), pageEnd: Infinity, pages: atoms.length ? [{ atoms, drawn: new Set() }] : [], bodies: new Set() };
  }

  // The headings a row sits under: its group's, and every group above that.
  function headsAbove(el, root) {
    const heads = [];
    for (let n = el; n && n !== root; n = n.parentElement) {
      if (n.matches('.shoot-status-rows, .upcoming-subheading-rows') && n.previousElementSibling) heads.unshift(n.previousElementSibling);
      else if (n.matches('.section-block')) heads.unshift(n.querySelector(':scope > h2'));
    }
    return heads;
  }
  const listAtoms = (root, selector) => [...root.querySelectorAll(selector)]
    .filter(el => !el.hidden)
    .map(el => ({ el, heads: headsAbove(el, root) }));

  function journalAtoms(root) {
    const atoms = [];
    root.querySelectorAll('.journal-entry-images:not([hidden])').forEach((grid) => {
      // Photo rows take whole ruled lines, so what follows stays on the rules.
      const thumb = grid.querySelector('.moodboard-thumb');
      if (!thumb) return;
      grid.style.gridAutoRows = `${Math.ceil(thumb.offsetHeight / ed.LINE) * ed.LINE}px`;
      grid.style.rowGap = '0';
      grid.style.alignItems = 'start';
    });
    // Like a real notebook, nothing is written twice: a heading goes with the
    // first line under it (so it's never left alone at the foot of a page), and
    // a card that runs over just carries on at the top of the next page.
    const claimed = new Set();
    root.querySelectorAll('#journalList .log-card').forEach((card) => {
      const above = headsAbove(card, root).filter(h => !claimed.has(h));
      above.forEach(h => claimed.add(h));
      let pending = null;
      const lead = () => { const h = pending || []; pending = null; return h; };
      if (card.classList.contains('journal-entry-card')) {
        const heading = card.querySelector('.journal-entry-heading');
        pending = [...above, heading];
        const before = atoms.length;
        const body = card.querySelector('.journal-entry-body');
        const rows = Math.round(body.offsetHeight / ed.LINE);
        for (let row = 0; row < rows; row++) atoms.push({ el: body, heads: lead(), row, rows });
        const grid = card.querySelector('.journal-entry-images');
        if (grid && !grid.hidden) {
          const lines = new Map();
          [...grid.children].forEach((thumb) => {
            const top = Math.round(thumb.getBoundingClientRect().top);
            if (!lines.has(top)) lines.set(top, []);
            lines.get(top).push(thumb);
          });
          lines.forEach(([el, ...also]) => atoms.push({ el, also, heads: lead() }));
        }
        const tags = card.querySelector('.journal-entry-tags');
        if (tags && !tags.hidden) atoms.push({ el: tags, heads: lead() });
        if (atoms.length === before) atoms.push({ el: heading, heads: above });
        atoms[atoms.length - 1].hang = true;
        return;
      }
      const week = card.querySelector(':scope > .log-week-heading');
      pending = [...above, week];
      [...card.querySelector('.journal-paper').children].forEach((child) => {
        if (child.matches('.log-section-label')) { pending = [...(pending || []), child]; return; }
        if (child.matches('ul')) [...child.children].forEach(el => atoms.push({ el, heads: lead() }));
        else atoms.push({ el: child, heads: lead() });
      });
      if (atoms.length) atoms[atoms.length - 1].hang = true;
    });
    const empty = document.getElementById('journalEmpty');
    if (!empty.hidden) atoms.push({ el: empty, heads: [] });
    return atoms;
  }

  const SCREEN_ATOMS = {
    overview: root => listAtoms(root, '#newShootBtn, #statsRow, .section-block:not([hidden]) .shoot-row'),
    shoots: root => listAtoms(root, '#shootSortToggle, #shootSortOptions, #shootList .shoot-row, #shootEmpty'),
    archive: root => listAtoms(root, '#archiveSlideshow, #archiveFilterToggle, #archiveFilters, #archiveList .shoot-row, #archiveEmpty'),
    journal: journalAtoms,
  };

  function statsAtoms(page) {
    const title = page.querySelector('.stats-page-title');
    const heads = title ? [title] : [];
    const atoms = [];
    const pie = page.querySelector(':scope > .pie-chart');
    if (pie) atoms.push({ el: pie, heads });
    const hint = page.querySelector(':scope > .empty-hint');
    if (hint) atoms.push({ el: hint, heads });
    const toolbar = page.querySelector('.world-map-toolbar');
    const map = page.querySelector('.world-map-scroll');
    if (toolbar && map) atoms.push({ el: toolbar, also: [map], heads });
    page.querySelectorAll('.stats-legend > .stats-legend-row').forEach(el => atoms.push({ el, heads }));
    page.querySelectorAll('.stats-region-group').forEach((group) => {
      const heading = group.querySelector('.stats-region-heading');
      const cities = [...group.querySelectorAll('.stats-legend-row-nested')];
      if (!cities.length) atoms.push({ el: heading, heads });
      cities.forEach(el => atoms.push({ el, heads: [...heads, heading] }));
    });
    return atoms;
  }

  // Every breakdown is on the one page, one under another.
  function statsFlat() {
    return ed.statsFlows.length ? [{ stat: 0, sub: 0 }] : [];
  }

  function buildStatsFlows() {
    const was = statsFlat()[screenNow('stats')];
    ed.statsFlows = [...ed.statsCarousel.querySelectorAll('.stats-page')].map(page => buildFlow(page, statsAtoms));
    const flat = statsFlat();
    const sub = was ? was.sub : 0;
    const stay = flat.filter(p => p.stat === ed.statsPageIdx);
    const landing = stay[Math.min(sub, stay.length - 1)];
    ed.screenAt.stats = landing ? flat.indexOf(landing) : 0;
  }

  function screenPageCount(view) {
    if (view === 'stats') return Math.max(1, statsFlat().length);
    const flow = ed.screenFlows[view];
    return (flow && flow.pages.length) || 1;
  }

  // screenAt is the page asked for; it isn't cut down here, because a pass
  // drawn before the photos are in can be shorter than the screen really is.
  const screenNow = view => Math.max(0, Math.min(ed.screenAt[view], screenPageCount(view) - 1)); ed.screenNow = screenNow;

  // There are no left- and right-hand pages any more: every page is the screen.
  function syncPageSide() {
    document.documentElement.dataset.side = 'recto';
  }

  function drawScreenPage(view) {
    ed.queueLastPlace();
    const count = screenPageCount(view);
    const at = screenNow(view);
    syncPageSide();
    let flow = ed.screenFlows[view];
    let sub = at;
    if (view === 'stats') {
      const spot = statsFlat()[at];
      if (spot) {
        ed.statsFlows.forEach((f, stat) => drawFlowPage(f, stat === spot.stat ? spot.sub : 0));
        ed.statsPageIdx = spot.stat;
        ed.positionStatsTrack();
        ed.renderStatsDots();
        ed.updateStatsCarouselHeight();
        flow = ed.statsFlows[spot.stat];
        sub = spot.sub;
      }
    } else if (flow) {
      drawFlowPage(flow, at);
    }
    const page = flow && flow.pages[sub];
    // Only something too tall for any page lets the window scroll.
    document.documentElement.classList.toggle('pg-tall', !!page && atomBottom(page.atoms[page.atoms.length - 1]) + window.scrollY > flow.pageEnd + 0.5);
    document.getElementById('nbScreenNum').textContent = `${at + 1} / ${count}`;
    document.getElementById('nbScreenPrev').disabled = at <= 0;
    document.getElementById('nbScreenNext').disabled = at >= count - 1;
  }

  function repaginate(view) {
    const root = ed.views[view];
    if (!root || root.hidden || ed.currentScreen() !== view) return;
    if (view === 'stats') buildStatsFlows();
    else ed.screenFlows[view] = buildFlow(root, SCREEN_ATOMS[view]);
    drawScreenPage(view);
  }
};
