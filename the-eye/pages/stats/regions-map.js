// The regions map (world-map.svg, fetched once and kept).
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addStatsRegionsMap = function addStatsRegionsMap(ed) {
  Object.assign(ed, { buildRegionsStats, regionsPageHtml, setMapZoom, focusRegionOnMap, openRegionCountryPopup, renderRegionsMap });
  // ---------- Regions map (world-map.svg, fetched once and cached) ----------
  let worldMapSvgEl = null;
  ed.worldMapFetchPromise = null;
  let regionsSliceColors = {};
  let regionsDataByCountry = {};
  ed.mapZoomLevel = 1;
  const MAP_ZOOM_MIN = 1;
  const MAP_ZOOM_MAX = 4;
  const MAP_ZOOM_STEP = 0.5; ed.MAP_ZOOM_STEP = MAP_ZOOM_STEP;
  const MAP_BASE_WIDTH = 900;

  function buildRegionsStats() {
    const countryGroups = {};
    ed.getStatsShoots().forEach(s => {
      const code = s.location && s.location.country;
      if (!code) return;
      if (!countryGroups[code]) countryGroups[code] = { count: 0, cities: {} };
      countryGroups[code].count++;
      const cityLabel = (s.location.city || '').trim() || 'No city set';
      const cityKey = cityLabel.toLowerCase();
      if (!countryGroups[code].cities[cityKey]) countryGroups[code].cities[cityKey] = { label: cityLabel, count: 0 };
      countryGroups[code].cities[cityKey].count++;
    });

    ed.statsSliceFilters.regions = {};
    const data = Object.entries(countryGroups)
      .map(([code, group]) => {
        ed.statsSliceFilters.regions[code] = (s) => !!(s.location && s.location.country === code);
        const cities = Object.entries(group.cities)
          .map(([cityKey, c]) => {
            const compositeKey = `${code}__${cityKey}`;
            ed.statsSliceFilters.regions[compositeKey] = (s) => {
              if (!s.location || s.location.country !== code) return false;
              const label = (s.location.city || '').trim() || 'No city set';
              return label.toLowerCase() === cityKey;
            };
            return { key: compositeKey, label: c.label, value: c.count, pct: Math.round((c.count / group.count) * 100) };
          })
          .sort((a, b) => b.value - a.value);
        return { key: code, label: ed.REGION_LABELS[code] || code, value: group.count, cities };
      })
      .sort((a, b) => b.value - a.value);
    return data;
  }

  function regionsPageHtml(data) {
    regionsDataByCountry = Object.fromEntries(data.map(d => [d.key, d]));
    if (!data.length) {
      regionsSliceColors = {};
      return {
        html: `
          <div class="stats-page stats-page-regions" data-key="regions">
            <h2 class="stats-page-title">Regions</h2>
            <p class="empty-hint">Not enough data yet.</p>
          </div>
        `,
        slices: null,
      };
    }
    const { slices } = ed.buildPieSVG(data);
    regionsSliceColors = Object.fromEntries(slices.map(s => [s.key, s.color]));
    const groupsHtml = data.map((d, i) => {
      const cityRowsHtml = d.cities.map(c => `
        <button type="button" class="stats-legend-row stats-legend-row-nested" data-key="${ed.escapeHtml(c.key)}">
          <span class="legend-swatch legend-swatch-blank"></span>
          <span class="legend-label">${ed.escapeHtml(c.label)}</span>
          <span class="legend-pct">${c.pct}%</span>
        </button>
      `).join('');
      return `
        <div class="stats-region-group">
          <button type="button" class="stats-legend-row stats-region-heading" data-key="${ed.escapeHtml(d.key)}">
            <span class="legend-swatch" style="background:${slices[i].color}"></span>
            <span class="legend-label">${ed.escapeHtml(d.label)}</span>
            <span class="legend-pct">${slices[i].pct}%</span>
          </button>
          <div class="stats-region-cities">${cityRowsHtml}</div>
        </div>
      `;
    }).join('');
    return {
      html: `
        <div class="stats-page stats-page-regions" data-key="regions">
          <h2 class="stats-page-title">Regions</h2>
          <div class="world-map-toolbar">
            <button type="button" class="map-zoom-btn" id="worldMapZoomOutBtn" aria-label="Zoom out">&minus;</button>
            <button type="button" class="map-zoom-btn" id="worldMapZoomInBtn" aria-label="Zoom in">+</button>
          </div>
          <div class="world-map-scroll" id="worldMapScroll">
            <div id="worldMapContainer"><p class="empty-hint">Loading map…</p></div>
          </div>
          <div class="stats-legend">${groupsHtml}</div>
        </div>
      `,
      slices,
    };
  }

  function applyRegionsHighlight() {
    const container = document.getElementById('worldMapContainer');
    if (!container) return;
    const svg = container.querySelector('svg');
    if (!svg) return;
    svg.querySelectorAll('.region-shot').forEach(el => {
      el.classList.remove('region-shot');
      el.style.removeProperty('--region-color');
    });
    Object.entries(regionsSliceColors).forEach(([code, color]) => {
      const el = svg.getElementById ? svg.getElementById(code) : null;
      const target = el || svg.querySelector(`#${CSS.escape(code)}`);
      if (target) {
        target.classList.add('region-shot');
        target.style.setProperty('--region-color', color);
      }
    });
  }

  function setMapZoom(level) {
    ed.mapZoomLevel = Math.min(MAP_ZOOM_MAX, Math.max(MAP_ZOOM_MIN, level));
    const svg = document.querySelector('#worldMapContainer svg');
    if (svg) svg.style.width = `${MAP_BASE_WIDTH * ed.mapZoomLevel}px`;
  }

  // Zooms in a touch and scrolls/pulses a specific region into view — tapping
  // a legend row shouldn't just open the shoot list, it should also help the
  // reader actually find that country on the map.
  // A country's shape can be dozens of separate <path>s (each state/province
  // plus outlying territories like Puerto Rico or Guam, all under one <g>) —
  // a plain bounding box over the whole group gets dragged toward whichever
  // territory sits farthest out, landing nowhere near the country's actual
  // landmass (e.g. the US: a naive box centers somewhere in the Atlantic).
  // Weighting each path's center by its own area instead lets the large,
  // contiguous mainland dominate over small, far-flung outliers.
  function regionCenterPoint(target) {
    const paths = target.tagName.toLowerCase() === 'g' ? [...target.querySelectorAll('path')] : [target];
    let totalArea = 0, sumX = 0, sumY = 0;
    paths.forEach(p => {
      const r = p.getBoundingClientRect();
      const area = r.width * r.height;
      totalArea += area;
      sumX += (r.left + r.width / 2) * area;
      sumY += (r.top + r.height / 2) * area;
    });
    if (!totalArea) {
      const r = target.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    return { x: sumX / totalArea, y: sumY / totalArea };
  }

  function focusRegionOnMap(code) {
    const container = document.getElementById('worldMapContainer');
    const scrollWrap = document.getElementById('worldMapScroll');
    if (!container || !scrollWrap) return;
    const svg = container.querySelector('svg');
    if (!svg) return;
    const el = svg.getElementById ? svg.getElementById(code) : null;
    const target = el || svg.querySelector(`#${CSS.escape(code)}`);
    if (!target) return;
    setMapZoom(Math.max(ed.mapZoomLevel, 2));
    // scrollIntoView on an SVG child is unreliable across engines, so the
    // scroll position is computed by hand from getBoundingClientRect once
    // the zoom's width transition has settled (matches its 0.2s duration).
    setTimeout(() => {
      const point = regionCenterPoint(target);
      const wrapRect = scrollWrap.getBoundingClientRect();
      const centerX = point.x - wrapRect.left + scrollWrap.scrollLeft;
      const centerY = point.y - wrapRect.top + scrollWrap.scrollTop;
      scrollWrap.scrollTo({
        left: Math.max(0, centerX - scrollWrap.clientWidth / 2),
        top: Math.max(0, centerY - scrollWrap.clientHeight / 2),
        behavior: 'smooth',
      });
    }, 220);
    target.classList.remove('region-focus-pulse');
    void target.offsetWidth;
    target.classList.add('region-focus-pulse');
    setTimeout(() => target.classList.remove('region-focus-pulse'), 1200);
  }

  // Tapping a country shape directly on the map shows its city breakdown in
  // a small popup, without needing to scroll down to the legend for it.
  function openRegionCountryPopup(code) {
    const entry = regionsDataByCountry[code];
    if (!entry) return;
    document.getElementById('regionCountryPopupTitle').textContent = entry.label;
    const list = document.getElementById('regionCountryPopupList');
    list.innerHTML = entry.cities.map(c => `
      <button type="button" class="stats-legend-row stats-legend-row-nested" data-key="${ed.escapeHtml(c.key)}">
        <span class="legend-swatch legend-swatch-blank"></span>
        <span class="legend-label">${ed.escapeHtml(c.label)}</span>
        <span class="legend-pct">${c.pct}%</span>
      </button>
    `).join('');
    list.querySelectorAll('.stats-legend-row').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('regionCountryPopupOverlay').hidden = true;
        ed.openStatsDetail('regions', btn.dataset.key);
      });
    });
    document.getElementById('regionCountryPopupOverlay').hidden = false;
  }

  // Parses the map exactly once and then reuses that same <svg> node forever.
  // renderStats() rebuilds the whole carousel's innerHTML, which throws away
  // the container this lives in, so this used to re-run innerHTML with ~900KB
  // of SVG text on every render — reparsing 2,000+ <path> elements each time
  // any bit of state changed. Moving the already-parsed node into the fresh
  // container costs nothing by comparison. Being detached from the document in
  // between is fine; it keeps its children either way.
  function mountWorldMap(container) {
    // The node carries over whatever zoom width and pulse class it had last
    // time, so reset both to match the zoom level being reset above.
    worldMapSvgEl.style.width = `${MAP_BASE_WIDTH}px`;
    worldMapSvgEl.querySelectorAll('.region-focus-pulse').forEach(el => el.classList.remove('region-focus-pulse'));
    container.replaceChildren(worldMapSvgEl);
    applyRegionsHighlight();
  }

  function renderRegionsMap() {
    const container = document.getElementById('worldMapContainer');
    if (!container) return;
    ed.mapZoomLevel = 1;
    if (worldMapSvgEl) {
      mountWorldMap(container);
      return;
    }
    if (!ed.worldMapFetchPromise) {
      ed.worldMapFetchPromise = fetch('world-map.svg').then(r => r.text());
    }
    ed.worldMapFetchPromise.then(svgText => {
      const el = document.getElementById('worldMapContainer');
      if (!el) return;
      if (!worldMapSvgEl) {
        const holder = document.createElement('div');
        holder.innerHTML = svgText;
        worldMapSvgEl = holder.querySelector('svg');
        if (!worldMapSvgEl) throw new Error('no svg root');
      }
      mountWorldMap(el);
      ed.repaginate('stats');
    }).catch(() => {
      const el = document.getElementById('worldMapContainer');
      if (el) el.innerHTML = '<p class="empty-hint">Couldn\'t load the map.</p>';
    });
  }
};
