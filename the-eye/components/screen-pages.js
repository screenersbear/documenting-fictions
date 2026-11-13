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

  const SCREEN_ATOMS = {
    overview: root => listAtoms(root, '#todayCard, .section-block:not([hidden]) :is(.next-shoot, .shoot-row)'),
    shoots: root => listAtoms(root, '#shootSortToggle, #shootSortOptions, #shootList .shoot-row, #shootEmpty'),
    archive: root => listAtoms(root, '#archiveSlideshow, #archiveCaption, #archiveFilters, #archiveList .archive-month, #archiveList .shoot-status-rows:not([hidden]) > .shoot-row, #archiveEmpty'),
    journal: root => listAtoms(root, '#view-journal .list-intro, .journal-toolbar, #journalFilters, #journalList > .log-card, #journalEmpty'),
  };

  function statsAtoms(page) {
    const heads = [...page.querySelectorAll(':scope > .stats-page-title, :scope > .stats-sentence')];
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

  // One chart a page.
  function statsFlat() {
    return ed.statsFlows.map((f, stat) => ({ stat, sub: 0 }));
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
