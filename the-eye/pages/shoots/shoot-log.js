// The Shoots tab (the shoot log).
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootsShootLog = function addShootsShootLog(ed) {
  Object.assign(ed, { renderCategoryFilterChips, renderShoots });
  // ---------- Shoot Log view ----------
  // The Shoots page has three sort modes, each with its own nested-heading
  // scheme:
  //  - 'status' (default): grouped by status, same as always.
  //  - 'shoot_date': ignores status entirely and reorganizes every shoot by
  //    how soon it happens.
  //  - 'category': grouped by shoot category, only showing categories that
  //    actually have a shoot in them.
  // The chosen sort is remembered on this device (like collapsed sections),
  // so the Shoots page reopens the way it was left, even after a relaunch.
  const SHOOT_SORT_KEY = 'dailies_shoot_sort_v1';
  const SHOOT_SORT_LABELS = { status: 'Status', shoot_date: 'Shoot date', category: 'Category' };

  function loadShootSort() {
    try {
      const saved = localStorage.getItem(SHOOT_SORT_KEY);
      return SHOOT_SORT_LABELS[saved] ? saved : 'status';
    } catch (e) {
      return 'status';
    }
  }

  let shootSort = loadShootSort();

  const SHOOT_DATE_BUCKET_ORDER = ['this_week', 'next_week', 'later_this_month', 'next_month', 'future', 'past', 'undated'];
  const SHOOT_DATE_BUCKET_LABELS = {
    past: 'Past',
    this_week: 'This week',
    next_week: 'Next week',
    later_this_month: 'Later this month',
    next_month: 'Next month',
    future: 'In the future',
    undated: 'Undated',
  };

  // Buckets a shoot date by proximity for the 'shoot_date' sort — a finer
  // breakdown than weekBucket() (which only serves Overview's this/next/later
  // split), since this needs to separate "later this month" from "next month"
  // from "further out," and also has to account for dates already in the
  // past (weekBucket() is only ever used for upcoming, not-yet-shot dates).
  function shootDateBucket(dateStr) {
    if (!dateStr) return 'undated';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfThisWeek = new Date(today);
    startOfThisWeek.setDate(today.getDate() - ed.daysIntoWeek(today));
    const endOfThisWeek = new Date(startOfThisWeek);
    endOfThisWeek.setDate(startOfThisWeek.getDate() + 6);
    const startOfNextWeek = new Date(endOfThisWeek);
    startOfNextWeek.setDate(endOfThisWeek.getDate() + 1);
    const endOfNextWeek = new Date(startOfNextWeek);
    endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
    const endOfThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);

    if (date < startOfThisWeek) return 'past';
    if (date <= endOfThisWeek) return 'this_week';
    if (date <= endOfNextWeek) return 'next_week';
    if (date <= endOfThisMonth) return 'later_this_month';
    if (date <= endOfNextMonth) return 'next_month';
    return 'future';
  }

  function renderShootSortOptions() {
    document.getElementById('shootSortToggle').textContent = `Sort: ${SHOOT_SORT_LABELS[shootSort]}`;
    document.querySelectorAll('#shootSortOptions .chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.sort === shootSort);
    });
  }

  document.getElementById('shootSortToggle').addEventListener('click', () => {
    const options = document.getElementById('shootSortOptions');
    options.hidden = !options.hidden;
  });

  document.getElementById('shootSortOptions').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip || !chip.dataset.sort) return;
    shootSort = chip.dataset.sort;
    try { localStorage.setItem(SHOOT_SORT_KEY, shootSort); } catch (e) { /* ignore */ }
    document.getElementById('shootSortOptions').hidden = true;
    renderShoots();
  });

  function renderCategoryFilterChips(containerId, toggleId, activeFilter) {
    const container = document.getElementById(containerId);
    const visibleCats = ed.CATEGORY_FILTER_ORDER.filter(ed.isCategoryVisible);
    container.innerHTML = `
      <button type="button" class="chip ${activeFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>
      ${visibleCats.map(cat => `<button type="button" class="chip ${activeFilter === cat ? 'active' : ''}" data-filter="${cat}">${ed.CATEGORY_LABELS[cat]}</button>`).join('')}
      <button type="button" class="chip chip-manage"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> Edit</button>
    `;
    document.getElementById(toggleId).textContent = `Filter: ${activeFilter === 'all' ? 'All' : (ed.CATEGORY_LABELS[activeFilter] || 'All')}`;
  }

  // Shared renderer for one nested group (status / date bucket / category)
  // on the Shoots page — same collapsible pill-heading + rows-wrap structure
  // regardless of which sort mode built the group. Takes collapseProjects()
  // items, so a project shows as one box (see renderListItem).
  function renderShootGroup(list, groupKey, label, items, visibleIndex) {
    const groupEl = document.createElement('div');
    groupEl.className = 'shoot-status-group';

    const heading = document.createElement('h2');
    heading.className = `status-group-heading ${visibleIndex % 2 === 0 ? 'heading-yellow' : 'heading-navy'}`;
    heading.textContent = label;

    const rowsWrap = document.createElement('div');
    rowsWrap.className = 'shoot-status-rows';
    items.forEach(item => ed.renderListItem(rowsWrap, item, { showPending: true }));

    groupEl.appendChild(heading);
    groupEl.appendChild(rowsWrap);
    list.appendChild(groupEl);
  }

  // Default — grouped by status, same as always: every group orders by
  // shoot date except the edit stages (Editing, and video's Rough cut/Client
  // review/Revisions), which order by deadline since that's the date that
  // actually matters once a shoot's already been captured. A project box
  // goes in the group of its least-advanced listed day (listItemStatusKey)
  // and sorts by its rep, through the same comparators.
  function renderShootsByStatus(list, items) {
    let visibleIndex = 0;
    Object.keys(ed.STATUS_LABELS).forEach(statusKey => {
      const group = items.filter(item => ed.listItemStatusKey(item) === statusKey)
        .sort((a, b) => {
          const repA = ed.listItemRep(a);
          const repB = ed.listItemRep(b);
          // Edit stages sort by the deadline each row shows (for a project
          // box, its earliest still-owed one — see listItemDate).
          return ed.isInTheEditStatus(statusKey)
            ? ed.dateSortKey(ed.listItemDate(a, 'deadline')).localeCompare(ed.dateSortKey(ed.listItemDate(b, 'deadline')))
            : ed.dateTimeSortKey(repA).localeCompare(ed.dateTimeSortKey(repB));
        });
      if (!group.length) return;
      renderShootGroup(list, statusKey, ed.STATUS_LABELS[statusKey], group, visibleIndex);
      visibleIndex++;
    });
  }

  // Ignores status entirely — every shoot lands in one bucket by how soon
  // (or how long ago) its shoot date is; a project box by its rep's date
  // (its next day ahead, else its first day). A postponed or canceled
  // shoot's kept date is only the original plan, so it files as Undated,
  // where it always sat back when that date was wiped.
  function renderShootsByDate(list, items) {
    const buckets = new Map();
    items.forEach(item => {
      const bucket = shootDateBucket(ed.scheduledShootDate(ed.listItemRep(item)));
      if (!buckets.has(bucket)) buckets.set(bucket, []);
      buckets.get(bucket).push(item);
    });
    let visibleIndex = 0;
    SHOOT_DATE_BUCKET_ORDER.forEach(bucketKey => {
      const group = buckets.get(bucketKey);
      if (!group || !group.length) return;
      group.sort((a, b) => ed.dateTimeSortKey(ed.listItemRep(a)).localeCompare(ed.dateTimeSortKey(ed.listItemRep(b))));
      renderShootGroup(list, `date:${bucketKey}`, SHOOT_DATE_BUCKET_LABELS[bucketKey], group, visibleIndex);
      visibleIndex++;
    });
  }

  // Grouped by category — only categories with at least one shoot show up,
  // in the app's usual category order (not alphabetical; that's just for
  // the Edit Shoot category dropdown). A project box files under its rep's
  // category.
  function renderShootsByCategory(list, items) {
    const buckets = new Map();
    items.forEach(item => {
      const cat = ed.listItemRep(item).category || 'other';
      if (!buckets.has(cat)) buckets.set(cat, []);
      buckets.get(cat).push(item);
    });
    let visibleIndex = 0;
    ed.CATEGORY_FILTER_ORDER.forEach(cat => {
      const group = buckets.get(cat);
      if (!group || !group.length) return;
      group.sort((a, b) => ed.dateTimeSortKey(ed.listItemRep(a)).localeCompare(ed.dateTimeSortKey(ed.listItemRep(b))));
      renderShootGroup(list, `cat:${cat}`, ed.CATEGORY_LABELS[cat] || 'Other', group, visibleIndex);
      visibleIndex++;
    });
  }

  function renderShoots() {
    drawShoots();
    ed.repaginate('shoots');
  }
  function drawShoots() {
    renderShootSortOptions();
    const list = document.getElementById('shootList');
    // Collapsed once for the whole page, so every sort mode files a
    // project's box exactly once (by its rep, or its least-advanced day for
    // Status) rather than splitting it across groups.
    const items = ed.collapseProjects(ed.state.shoots.filter(s => !s.archived));

    list.innerHTML = '';
    document.getElementById('shootEmpty').hidden = items.length !== 0;

    if (shootSort === 'shoot_date') renderShootsByDate(list, items);
    else if (shootSort === 'category') renderShootsByCategory(list, items);
    else renderShootsByStatus(list, items);
  }
};
