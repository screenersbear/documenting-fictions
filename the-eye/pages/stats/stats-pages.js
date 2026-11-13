// The Stats tab's pages: swiping between them, the dots, the year filters, drawing it.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addStatsPages = function addStatsPages(ed) {
  Object.assign(ed, { renderStatsDots, updateStatsCarouselHeight, positionStatsTrack, renderStats, openStatsDetail, closeStatsDetail });
  function renderStatsPage(page, data) {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) {
      return {
        html: `
          <div class="stats-page" data-key="${page.key}">
            <h2 class="stats-page-title">${ed.escapeHtml(page.title)}</h2>
            <p class="empty-hint">Not enough data yet.</p>
          </div>
        `,
        slices: null,
      };
    }
    const { pathsHtml, slices } = ed.buildPieSVG(data);
    const legendHtml = slices.map(s => `
      <button type="button" class="stats-legend-row" data-key="${ed.escapeHtml(String(s.key))}">
        <span class="legend-swatch" style="background:${s.color}"></span>
        <span class="legend-label">${ed.escapeHtml(s.label)}</span>
        <span class="legend-pct">${s.pct}%</span>
      </button>
    `).join('');
    return {
      html: `
        <div class="stats-page" data-key="${page.key}">
          <h2 class="stats-page-title">${ed.escapeHtml(page.title)}</h2>
          <svg class="pie-chart" viewBox="0 0 200 200">${pathsHtml}</svg>
          <div class="stats-legend">${legendHtml}</div>
        </div>
      `,
      slices,
    };
  }

  const statsCarousel = document.getElementById('statsCarousel'); ed.statsCarousel = statsCarousel;
  const statsDotsEl = document.getElementById('statsDots');
  const statsYearFiltersEl = document.getElementById('statsYearFilters');

  // Which page is showing. Tracked directly rather than read back off a
  // scroll position, since the carousel never scrolls — pages slide by whole
  // steps via the track's transform.
  ed.statsPageIdx = 0;
  let statsSlideLocked = false;

  function renderStatsDots() {
    statsDotsEl.innerHTML = ed.STATS_PAGES.map((p, i) => `<span class="stats-dot ${i === ed.statsPageIdx ? 'active' : ''}"></span>`).join('');
  }

  // A horizontal flex row's own height, left to auto, always matches its
  // TALLEST child regardless of which one is actually in view — the track's
  // align-items:flex-start stops a shorter page from being stretched to fill
  // that height, but the carousel itself still needs this to shrink/grow with
  // whichever page is showing, or a short page would sit above blank space
  // sized to the tallest one.
  function updateStatsCarouselHeight() {
    const activeEl = statsCarousel.querySelectorAll('.stats-page')[ed.statsPageIdx];
    if (activeEl) statsCarousel.style.height = activeEl.offsetHeight + 'px';
  }

  function positionStatsTrack() {
    const track = statsCarousel.querySelector('.stats-track');
    if (track) track.style.transform = `translateX(${-ed.statsPageIdx * 100}%)`;
  }

  function goToStatsPage(idx) {
    const clamped = Math.max(0, Math.min(ed.STATS_PAGES.length - 1, idx));
    if (clamped === ed.statsPageIdx) return;
    ed.turnScreenPage('stats', ed.statsFlat().findIndex(p => p.stat === clamped));
  }

  // A page only changes on a clear, mostly-horizontal swipe, judged when the
  // finger lifts — the page never follows the finger sideways, so nothing
  // from the next page slides partway into view. Same thresholds as the
  // tab-to-tab swipe. The world map scrolls sideways on its own, so a swipe
  // that starts on it only turns the page once the map is already at its
  // edge in that direction (mirroring how a scroll would chain).
  (function setupStatsSwipe() {
    let startX = null;
    let startY = null;
    let mapEdges = null;

    statsCarousel.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) { startX = null; return; }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      const map = e.target.closest('.world-map-scroll');
      mapEdges = map
        ? { atLeft: map.scrollLeft <= 1, atRight: map.scrollLeft + map.clientWidth >= map.scrollWidth - 1 }
        : null;
    }, { passive: true });

    statsCarousel.addEventListener('touchend', (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      startX = null;
      if (statsSlideLocked) return;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      const dir = dx < 0 ? 1 : -1;
      if (mapEdges && !(dir === 1 ? mapEdges.atRight : mapEdges.atLeft)) return;
      // One page per swipe: further swipes wait until this one has landed.
      statsSlideLocked = true;
      setTimeout(() => { statsSlideLocked = false; }, 350);
      ed.stepScreenPage(dir);
    }, { passive: true });

    statsCarousel.addEventListener('touchcancel', () => { startX = null; }, { passive: true });
  })();

  // Delegated (survives renderStats() rebuilding the carousel's innerHTML on
  // every year-filter change, which destroys and recreates the zoom buttons)
  // so they don't need re-binding per render.
  statsCarousel.addEventListener('click', (e) => {
    if (e.target.closest('#worldMapZoomInBtn')) ed.setMapZoom(ed.mapZoomLevel + ed.MAP_ZOOM_STEP);
    else if (e.target.closest('#worldMapZoomOutBtn')) ed.setMapZoom(ed.mapZoomLevel - ed.MAP_ZOOM_STEP);
  });

  // Tapping a country shape directly on the map (as opposed to its legend
  // row below) shows which cities within that country were shot in, without
  // needing to scroll down to the legend to find out.
  statsCarousel.addEventListener('click', (e) => {
    const shotEl = e.target.closest('.region-shot');
    if (shotEl) ed.openRegionCountryPopup(shotEl.id);
  });

  function renderStatsYearFilters() {
    const currentYear = String(new Date().getFullYear());
    const years = new Set([currentYear]);
    ed.state.shoots.forEach(s => { if (ed.scheduledShootDate(s)) years.add(s.date.slice(0, 4)); });
    const sortedYears = [...years].sort((a, b) => b.localeCompare(a));
    const chips = [...sortedYears.map(y => ({ key: y, label: y })), { key: 'all', label: 'All time' }];
    statsYearFiltersEl.innerHTML = chips.map(c => `<button type="button" class="chip ${c.key === ed.statsYearFilter ? 'active' : ''}" data-year="${c.key}">${ed.escapeHtml(c.label)}</button>`).join('');
    const activeChip = chips.find(c => c.key === ed.statsYearFilter);
    document.getElementById('statsYearFilterToggle').textContent = `Filter: ${activeChip ? activeChip.label : ed.statsYearFilter}`;
  }

  document.getElementById('statsYearFilterToggle').addEventListener('click', () => {
    statsYearFiltersEl.hidden = !statsYearFiltersEl.hidden;
  });

  statsYearFiltersEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    ed.statsYearFilter = chip.dataset.year;
    statsYearFiltersEl.hidden = true;
    renderStats();
  });

  function renderStats() {
    drawStats();
    ed.repaginate('stats');
  }
  function drawStats() {
    // Nothing here is observable while the tab is hidden, and it's the most
    // expensive render in the app (pie geometry for every page, plus the world
    // map). Switching to Stats always calls renderAll() after un-hiding the
    // view, so skipping it here just defers the work to the moment it matters.
    if (ed.views.stats.hidden) return;
    ed.statsSliceFilters = {};
    renderStatsYearFilters();
    const funFactEl = document.getElementById('statsFunFact');
    const fact = ed.pickRandomFunFact();
    funFactEl.textContent = fact ? `Fun fact: ${fact}` : '';
    funFactEl.hidden = !fact;
    const pages = ed.STATS_PAGES.map(page => page.custom
      ? ed.regionsPageHtml(ed.buildRegionsStats())
      : renderStatsPage(page, page.build()));
    // The track's transform is set inline on the fresh element, so a re-render
    // (year filter, data change) keeps the page you're on without animating.
    statsCarousel.innerHTML = `<div class="stats-track" style="transform:translateX(${-ed.statsPageIdx * 100}%)">${pages.map(p => p.html).join('')}</div>`;
    statsCarousel.querySelectorAll('.pie-slice, .stats-legend-row').forEach(el => {
      el.addEventListener('click', () => {
        const pageKey = el.closest('.stats-page').dataset.key;
        if (el.classList.contains('stats-region-heading')) {
          // The map may be a page back from this row.
          if (document.getElementById('worldMapScroll').classList.contains('pg-off')) {
            ed.turnScreenPage('stats', ed.statsFlat().findIndex(p => p.stat === ed.statsPageIdx));
          }
          ed.focusRegionOnMap(el.dataset.key);
          return;
        }
        openStatsDetail(pageKey, el.dataset.key);
      });
    });
    statsCarousel.querySelectorAll('.stats-page').forEach((pageEl, i) => {
      const slices = pages[i].slices;
      if (!slices) return;
      ed.animatePieSlices([...pageEl.querySelectorAll('.pie-slice')], slices);
    });
    if (ed.STATS_PAGES.some(p => p.custom)) ed.renderRegionsMap();
    renderStatsDots();
    updateStatsCarouselHeight();
  }

  function openStatsDetail(pageKey, sliceKey) {
    const filter = ed.statsSliceFilters[pageKey] && ed.statsSliceFilters[pageKey][sliceKey];
    const shoots = filter ? ed.getStatsShoots().filter(filter) : [];
    const legendRow = statsCarousel.querySelector(`.stats-page[data-key="${pageKey}"] .stats-legend-row[data-key="${CSS.escape(sliceKey)}"] .legend-label`);
    document.getElementById('statsDetailTitle').textContent = legendRow ? legendRow.textContent : '';
    const list = document.getElementById('statsDetailList');
    list.innerHTML = '';
    shoots
      .sort((a, b) => ed.dateTimeSortKey(b).localeCompare(ed.dateTimeSortKey(a)))
      .forEach(s => ed.renderShootRow(list, s, { showStatus: true }));
    document.getElementById('statsDetailEmpty').hidden = shoots.length > 0;
    const overlay = document.getElementById('statsDetailOverlay');
    overlay.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('open')));
  }

  function closeStatsDetail() {
    const overlay = document.getElementById('statsDetailOverlay');
    overlay.classList.remove('open');
    setTimeout(() => { overlay.hidden = true; }, 300);
  }

  document.getElementById('statsDetailCloseBtn').addEventListener('click', closeStatsDetail);
  document.getElementById('statsDetailOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeStatsDetail();
  });
};
