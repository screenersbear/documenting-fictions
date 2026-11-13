// Export previous shoots: picking which.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addPdfExportPicker = function addPdfExportPicker(ed) {
  // ---------- Export previous shoots (archive PDF + optional bulk cleanup) ----------
  // A separate, much bigger export than the single-shoot call sheet above: one
  // PDF containing every text section AND every photo (cover, talent, mood
  // board, final images) for a whole batch of shoots at once, picked by
  // year/month rather than shoot-by-shoot, meant to be the last stop before
  // the user deletes those shoots to free up storage.
  const EXPORT_PREVIOUS_INTRO_KEY = 'dailies_seen_export_previous_intro_v1';

  function shootYearMonth(shoot) {
    const d = shoot.date;
    return { year: d ? d.slice(0, 4) : 'Undated', month: d ? d.slice(5, 7) : '00' };
  }

  function groupShootsByYearMonth(shoots) {
    const years = new Map();
    shoots.forEach(shoot => {
      const { year, month } = shootYearMonth(shoot);
      if (!years.has(year)) years.set(year, new Map());
      const months = years.get(year);
      if (!months.has(month)) months.set(month, []);
      months.get(month).push(shoot);
    });
    return years;
  }

  // Only archived shoots: this export ends in an offer to delete what it
  // covers, and a shoot still being planned or edited shouldn't be one
  // checked month away from that.
  function exportPreviousCandidates() {
    return ed.state.shoots.filter(s => s.archived);
  }

  function renderExportPreviousPicker() {
    const list = document.getElementById('exportPreviousPickerList');
    list.innerHTML = '';
    const candidates = exportPreviousCandidates();
    document.getElementById('exportPreviousPickerEmpty').hidden = candidates.length > 0;

    const years = groupShootsByYearMonth(candidates);
    const sortedYears = [...years.keys()].sort((a, b) => {
      if (a === 'Undated') return 1;
      if (b === 'Undated') return -1;
      return b.localeCompare(a);
    });

    let visibleYearIndex = 0;
    sortedYears.forEach(year => {
      const months = years.get(year);
      const sortedMonths = [...months.keys()].sort((a, b) => b.localeCompare(a));

      const yearGroupEl = document.createElement('div');
      yearGroupEl.className = 'shoot-status-group';

      const yearCollapseKey = `exportPicker:${year}`;
      const yearCollapsed = ed.isSectionCollapsed(yearCollapseKey);
      const yearHeading = document.createElement('h2');
      yearHeading.className = `status-group-heading export-picker-year-heading ${visibleYearIndex % 2 === 0 ? 'heading-yellow' : 'heading-navy'}${yearCollapsed ? ' collapsed' : ''}`;
      yearHeading.innerHTML = `
        <input type="checkbox" class="export-picker-year-check" data-year="${ed.escapeHtml(year)}" />
        <span class="export-picker-heading-label">${ed.escapeHtml(year)}</span>
        ${ed.COLLAPSE_ARROW_SVG}
      `;

      const monthsWrap = document.createElement('div');
      monthsWrap.className = 'shoot-status-rows';
      monthsWrap.hidden = yearCollapsed;

      sortedMonths.forEach(month => {
        const monthShoots = months.get(month);
        const row = document.createElement('label');
        row.className = 'export-picker-month-row';
        row.innerHTML = `
          <input type="checkbox" class="export-picker-month-check" data-year="${ed.escapeHtml(year)}" data-month="${ed.escapeHtml(month)}" />
          <span>${ed.escapeHtml(ed.monthLabel(month))}</span>
          <span class="export-picker-count">${monthShoots.length} shoot${monthShoots.length === 1 ? '' : 's'}</span>
        `;
        monthsWrap.appendChild(row);
      });

      yearHeading.addEventListener('click', (e) => {
        if (e.target.classList.contains('export-picker-year-check')) return;
        const nowHidden = !monthsWrap.hidden;
        monthsWrap.hidden = nowHidden;
        yearHeading.classList.toggle('collapsed', nowHidden);
        ed.setSectionCollapsed(yearCollapseKey, nowHidden);
      });

      yearGroupEl.appendChild(yearHeading);
      yearGroupEl.appendChild(monthsWrap);
      list.appendChild(yearGroupEl);
      visibleYearIndex++;
    });
  }

  // One delegated listener, wired once (not re-attached on every render):
  // checking a year checks/unchecks every month underneath it; checking or
  // unchecking a month updates its year's checked/indeterminate state to
  // match — the only parent/child checkbox cascade anywhere in this app.
  document.getElementById('exportPreviousPickerList').addEventListener('change', (e) => {
    const list = document.getElementById('exportPreviousPickerList');
    if (e.target.classList.contains('export-picker-year-check')) {
      const year = e.target.dataset.year;
      const checked = e.target.checked;
      list.querySelectorAll(`.export-picker-month-check[data-year="${year}"]`).forEach(cb => { cb.checked = checked; });
      e.target.indeterminate = false;
    } else if (e.target.classList.contains('export-picker-month-check')) {
      const year = e.target.dataset.year;
      const monthChecks = [...list.querySelectorAll(`.export-picker-month-check[data-year="${year}"]`)];
      const yearCheck = list.querySelector(`.export-picker-year-check[data-year="${year}"]`);
      const checkedCount = monthChecks.filter(cb => cb.checked).length;
      yearCheck.checked = checkedCount === monthChecks.length;
      yearCheck.indeterminate = checkedCount > 0 && checkedCount < monthChecks.length;
    }
  });

  function selectedExportPreviousShoots() {
    const checkedMonths = [...document.querySelectorAll('.export-picker-month-check:checked')]
      .map(cb => ({ year: cb.dataset.year, month: cb.dataset.month }));
    if (!checkedMonths.length) return [];
    return exportPreviousCandidates().filter(shoot => {
      const { year, month } = shootYearMonth(shoot);
      return checkedMonths.some(m => m.year === year && m.month === month);
    });
  }

  function openExportPreviousPicker() {
    renderExportPreviousPicker();
    document.getElementById('exportPreviousPickerOverlay').hidden = false;
  }

  function closeExportPreviousPicker() {
    document.getElementById('exportPreviousPickerOverlay').hidden = true;
  }

  document.getElementById('exportPreviousShootsBtn').addEventListener('click', () => {
    ed.closeAppMenu();
    if (localStorage.getItem(EXPORT_PREVIOUS_INTRO_KEY)) {
      openExportPreviousPicker();
    } else {
      document.getElementById('exportPreviousIntroOverlay').hidden = false;
    }
  });

  document.getElementById('exportPreviousIntroCloseBtn').addEventListener('click', () => {
    localStorage.setItem(EXPORT_PREVIOUS_INTRO_KEY, '1');
    document.getElementById('exportPreviousIntroOverlay').hidden = true;
    openExportPreviousPicker();
  });

  document.getElementById('exportPreviousIntroOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('exportPreviousIntroOverlay')) e.currentTarget.hidden = true;
  });

  document.getElementById('exportPreviousPickerCloseBtn').addEventListener('click', closeExportPreviousPicker);

  document.getElementById('exportPreviousPickerOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('exportPreviousPickerOverlay')) closeExportPreviousPicker();
  });

  // Calling openExportArchivePreview synchronously (not after an await) here
  // matters for the same reason as the single-shoot build button: its own
  // window.open('', '_blank') call needs to stay inside this click handler's
  // user-gesture context, or mobile browsers block it.
  document.getElementById('exportPreviousPickerBuildBtn').addEventListener('click', () => {
    const shoots = selectedExportPreviousShoots();
    if (!shoots.length) { ed.showToast('Select at least one month to export.'); return; }
    closeExportPreviousPicker();
    ed.openExportArchivePreview(shoots);
  });
};
