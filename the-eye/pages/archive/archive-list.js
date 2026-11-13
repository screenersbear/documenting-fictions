// The Archive's list: archived shoots by year, then by month, newest first.
// Each year is a section title with how many shoots it has; each month is
// one row (its name, how many shoots, a few of their covers). Tap a month to
// see its shoots under it (each opens its recap), tap again to fold them
// away. Undated shoots come last, listed under their own title.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addArchiveList = function addArchiveList(ed) {
  Object.assign(ed, { renderArchive });
  // The months showing their shoots, for as long as the app's open.
  const openMonths = new Set();
  const ROW_OPTS = { showBadge: false };

  // A project box stands for several shoots.
  const shootCount = items => items.reduce((n, item) => n + (item.kind === 'project' ? item.members.length : 1), 0);
  const plural = n => `${n} ${n === 1 ? 'shoot' : 'shoots'}`;

  // Up to three covers, overlapping, from the month's shoots that have one.
  function coversHtml(items) {
    const withPhoto = items.map((item) => {
      if (item.kind !== 'project') return item.shoot;
      return (item.rep && item.rep.projectPhoto) ? item.rep : item.members.find(s => s.projectPhoto);
    }).filter(s => s && s.projectPhoto).slice(0, 3);
    return withPhoto.map(s => `<span class="archive-month-cover">${ed.shootThumbHtml(s)}</span>`).join('');
  }

  function renderArchive() {
    drawArchive();
    ed.repaginate('archive');
  }

  function drawArchive() {
    ed.renderArchiveSlideshow();
    const archived = ed.state.shoots.filter(s => s.archived);
    ed.renderCategoryFilterChips('archiveFilters', 'archiveFilterToggle', ed.archiveFilter, new Set(archived.map(s => s.category)));
    const list = document.getElementById('archiveList');
    // Filter first, then collapse: a project box stands for the members that
    // match the active category filter (its date span covers just those).
    // It's filed by its rep's date (for a fully past project, its first day),
    // so it shows once, under one month, even when its days straddle a month
    // or year boundary.
    let shoots = archived;
    if (ed.archiveFilter !== 'all') shoots = shoots.filter(s => s.category === ed.archiveFilter);
    const items = ed.collapseProjects(shoots)
      .sort((a, b) => ed.dateSortKey(ed.listItemRep(b).date).localeCompare(ed.dateSortKey(ed.listItemRep(a).date)));

    list.innerHTML = '';
    document.getElementById('archiveEmpty').hidden = items.length !== 0;

    const years = new Map();
    items.forEach(item => {
      const date = ed.listItemRep(item).date;
      const year = date ? date.slice(0, 4) : 'Undated';
      const month = date ? date.slice(5, 7) : '00';
      if (!years.has(year)) years.set(year, new Map());
      const months = years.get(year);
      if (!months.has(month)) months.set(month, []);
      months.get(month).push(item);
    });
    const sortedYears = [...years.keys()].sort((a, b) => {
      if (a === 'Undated') return 1;
      if (b === 'Undated') return -1;
      return b.localeCompare(a);
    });

    sortedYears.forEach(year => {
      const months = years.get(year);
      const sortedMonths = [...months.keys()].sort((a, b) => b.localeCompare(a));
      const yearItems = [].concat(...sortedMonths.map(m => months.get(m)));
      const yearGroupEl = document.createElement('div');
      yearGroupEl.className = 'shoot-status-group';
      const yearHeading = document.createElement('h2');
      yearHeading.className = 'status-group-heading';
      yearHeading.innerHTML = `${ed.escapeHtml(year)} <span>${shootCount(yearItems)}</span>`;
      const yearRowsWrap = document.createElement('div');
      yearRowsWrap.className = 'shoot-status-rows';

      if (year === 'Undated') {
        // Undated only ever has the one '00' month, so its shoots are listed
        // straight under the title.
        yearItems.forEach(item => ed.renderListItem(yearRowsWrap, item, ROW_OPTS));
      } else {
        sortedMonths.forEach(month => {
          const key = `${year}-${month}`;
          const monthItems = months.get(month);
          const open = openMonths.has(key);
          const row = document.createElement('button');
          row.type = 'button';
          row.className = 'archive-month';
          row.setAttribute('aria-expanded', String(open));
          row.innerHTML = `
            <span class="archive-month-words">
              <span class="archive-month-name">${ed.escapeHtml(ed.monthLabel(month))}</span>
              <span class="archive-month-count">${plural(shootCount(monthItems))}</span>
            </span>
            <span class="archive-month-covers">${coversHtml(monthItems)}</span>`;
          const rows = document.createElement('div');
          rows.className = 'shoot-status-rows archive-month-rows';
          rows.hidden = !open;
          monthItems.forEach(item => ed.renderListItem(rows, item, ROW_OPTS));
          row.addEventListener('click', () => {
            const nowOpen = rows.hidden;
            rows.hidden = !nowOpen;
            row.setAttribute('aria-expanded', String(nowOpen));
            if (nowOpen) openMonths.add(key);
            else openMonths.delete(key);
            ed.repaginate('archive');
          });
          const monthGroupEl = document.createElement('div');
          monthGroupEl.className = 'archive-month-group';
          monthGroupEl.append(row, rows);
          yearRowsWrap.appendChild(monthGroupEl);
        });
      }

      yearGroupEl.append(yearHeading, yearRowsWrap);
      list.appendChild(yearGroupEl);
    });
  }
};
