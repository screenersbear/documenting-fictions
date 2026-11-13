// The Stats tab: its charts and numbers.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addStatsTab = function addStatsTab(ed) {
  Object.assign(ed, { buildPieSVG, animatePieSlices, getStatsShoots, statsPagesNow });
  // ---------- Stats tab ----------
  function polarToCartesian(cx, cy, r, angleDeg) {
    const rad = (angleDeg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function describeArc(cx, cy, r, startAngle, endAngle) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
  }

  const PIE_CX = 100, PIE_CY = 100, PIE_R = 100;

  // Builds slice paths (a lone 100% slice is drawn as a near-full arc rather
  // than a <circle> so it can grow in with the same sweep animation as
  // everything else) plus legend rows with percentages, cycling through
  // PIE_COLORS in data order. Paths are emitted at their zero-angle
  // (invisible) starting position — animatePieSlices() sweeps them out to
  // startAngle/endAngle afterward.
  function buildPieSVG(data) {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    let angle = 0;
    const slices = data.map((d, i) => {
      const color = ed.PIE_COLORS[i % ed.PIE_COLORS.length];
      const pct = total > 0 ? d.value / total : 0;
      const startAngle = angle;
      const endAngle = data.length === 1 ? 359.99 : angle + pct * 360;
      angle = endAngle;
      return { ...d, color, startAngle, endAngle, pct: Math.round(pct * 100) };
    });
    const pathsHtml = slices.map(s => `<path class="pie-slice" data-key="${ed.escapeHtml(String(s.key))}" d="${describeArc(PIE_CX, PIE_CY, PIE_R, 0, 0)}" fill="${s.color}" />`).join('');
    return { pathsHtml, slices };
  }

  // Animates a page's slices from a closed sliver at 12 o'clock out to their
  // final angular spans in lockstep, so the whole pie reads as fanning open
  // rather than each wedge growing independently.
  function animatePieSlices(pathEls, slices) {
    const duration = 650;
    const startTime = performance.now();
    function tick(now) {
      const raw = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - raw, 3);
      pathEls.forEach((el, i) => {
        const s = slices[i];
        el.setAttribute('d', describeArc(PIE_CX, PIE_CY, PIE_R, s.startAngle * eased, s.endAngle * eased));
      });
      if (raw < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  ed.statsSliceFilters = {};
  ed.statsYearFilter = String(new Date().getFullYear());

  // A year counts the shoots dated in it; a postponed or canceled shoot's
  // kept date is only the original plan, so those count under All time only
  // (same as when that date used to be wiped).
  function getStatsShoots() {
    return ed.statsYearFilter === 'all'
      ? ed.state.shoots
      : ed.state.shoots.filter(s => ed.scheduledShootDate(s).slice(0, 4) === ed.statsYearFilter);
  }

  function buildVisualLanguageStats() {
    const vl = ed.state.frameworks.find(f => f.name === 'Visual Language');
    const counts = {};
    getStatsShoots().forEach(s => {
      (s.frameworkTags || []).forEach(t => {
        if (vl && t.frameworkId === vl.id) counts[t.tag] = (counts[t.tag] || 0) + 1;
      });
    });
    const data = Object.entries(counts)
      .map(([tag, value]) => ({ key: tag, label: tag, value }))
      .sort((a, b) => b.value - a.value);
    ed.statsSliceFilters.visualLanguage = {};
    data.forEach(d => {
      ed.statsSliceFilters.visualLanguage[d.key] = (s) => (s.frameworkTags || []).some(t => vl && t.frameworkId === vl.id && t.tag === d.key);
    });
    return data;
  }

  function buildCategoryStats() {
    const counts = {};
    getStatsShoots().forEach(s => {
      const key = s.category || 'uncategorized';
      counts[key] = (counts[key] || 0) + 1;
    });
    const data = Object.entries(counts)
      .map(([key, value]) => ({ key, label: ed.CATEGORY_LABELS[key] || 'Uncategorized', plural: ed.CATEGORY_PLURAL_LABELS[key], value }))
      .sort((a, b) => b.value - a.value);
    ed.statsSliceFilters.shootCategory = {};
    data.forEach(d => {
      ed.statsSliceFilters.shootCategory[d.key] = (s) => (s.category || 'uncategorized') === d.key;
    });
    return data;
  }

  function buildTeamStats() {
    let noneCount = 0;
    const roleCounts = {};
    getStatsShoots().forEach(s => {
      const members = s.teamRequired === 'yes' ? (s.teamMembers || []) : [];
      if (members.length === 0) {
        noneCount++;
      } else {
        members.forEach(tm => {
          const role = tm.role || 'other';
          roleCounts[role] = (roleCounts[role] || 0) + 1;
        });
      }
    });
    const data = [];
    if (noneCount > 0) data.push({ key: '__none__', label: 'None', value: noneCount });
    ed.TEAM_ROLE_OPTIONS.forEach(([val, label]) => {
      if (roleCounts[val]) data.push({ key: val, label, value: roleCounts[val] });
    });
    data.sort((a, b) => b.value - a.value);
    ed.statsSliceFilters.teamMembers = {};
    data.forEach(d => {
      ed.statsSliceFilters.teamMembers[d.key] = d.key === '__none__'
        ? (s) => (s.teamRequired === 'yes' ? (s.teamMembers || []) : []).length === 0
        : (s) => s.teamRequired === 'yes' && (s.teamMembers || []).some(tm => (tm.role || 'other') === d.key);
    });
    return data;
  }

  function buildStatusStats() {
    const counts = {};
    getStatsShoots().forEach(s => {
      const key = s.status || 'prospect';
      counts[key] = (counts[key] || 0) + 1;
    });
    const data = Object.keys(ed.STATUS_LABELS)
      .filter(key => counts[key])
      .map(key => ({ key, label: ed.STATUS_LABELS[key], value: counts[key] }))
      .sort((a, b) => b.value - a.value);
    ed.statsSliceFilters.status = {};
    data.forEach(d => {
      ed.statsSliceFilters.status[d.key] = (s) => (s.status || 'prospect') === d.key;
    });
    return data;
  }

  function statsLocationKey(s) {
    return ed.isLocationBlank(s.location) ? 'No location set' : ed.locationKey(s.location);
  }

  function buildLocationStats() {
    const counts = {};
    const labels = {};
    getStatsShoots().forEach(s => {
      const key = statsLocationKey(s);
      counts[key] = (counts[key] || 0) + 1;
      if (key !== 'No location set') labels[key] = ed.hasText(s.location.name) ? s.location.name.trim() : 'Unnamed location';
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const TOP_N = 6;
    const top = sorted.slice(0, TOP_N);
    const rest = sorted.slice(TOP_N);
    const data = top.map(([key, value]) => ({ key, label: labels[key] || 'No location set', value }));
    ed.statsSliceFilters.location = {};
    data.forEach(d => {
      ed.statsSliceFilters.location[d.key] = (s) => statsLocationKey(s) === d.key;
    });
    if (rest.length) {
      const otherKeys = new Set(rest.map(([k]) => k));
      const otherValue = rest.reduce((sum, [, v]) => sum + v, 0);
      data.push({ key: '__other_locations__', label: 'Other', value: otherValue });
      ed.statsSliceFilters.location.__other_locations__ = (s) => otherKeys.has(statsLocationKey(s));
    }
    return data;
  }

  const ALL_STATS_PAGES = [
    { key: 'status', title: 'Status', build: buildStatusStats },
    { key: 'visualLanguage', title: 'Visual languages', build: buildVisualLanguageStats },
    { key: 'shootCategory', title: 'Categories', build: buildCategoryStats },
    { key: 'teamMembers', title: 'Team', build: buildTeamStats },
    { key: 'location', title: 'Locations', build: buildLocationStats },
    { key: 'regions', title: 'Regions', custom: true },
  ];
  // Visual languages only while those tags are on (App options).
  function statsPagesNow() {
    return ed.lookTagsOn() ? ALL_STATS_PAGES : ALL_STATS_PAGES.filter(p => p.key !== 'visualLanguage');
  }
  ed.STATS_PAGES = statsPagesNow();
};
