// Drawing the Overview tab.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addOverviewDrawOverview = function addOverviewDrawOverview(ed) {
  Object.assign(ed, { renderOverview });
  function renderOverview() {
    drawOverview();
    ed.repaginate('overview');
  }
  function drawOverview() {
    const todayShoots = ed.state.shoots.filter(ed.isToday)
      .sort((a, b) => ed.dateTimeSortKey(a).localeCompare(ed.dateTimeSortKey(b)));
    const upcomingShoots = ed.state.shoots.filter(ed.isUpcoming)
      .sort((a, b) => ed.dateTimeSortKey(a).localeCompare(ed.dateTimeSortKey(b)));
    const deadlineShoots = ed.state.shoots.filter(ed.isUpcomingDeadline)
      .filter(s => ed.weekBucket(s.deadline) === 'this_week' || ed.weekBucket(s.deadline) === 'next_week')
      .sort((a, b) => ed.dateSortKey(a.deadline).localeCompare(ed.dateSortKey(b.deadline)));
    // Video has no proofs step, so a captured video shoot isn't listed here.
    const proofsPendingShoots = ed.state.shoots.filter(s => !s.archived && s.status === 'captured' && !ed.isVideoShoot(s))
      .sort((a, b) => ed.dateTimeSortKey(a).localeCompare(ed.dateTimeSortKey(b)));

    // A project's members collapse into one box per list (collapseProjects),
    // so every list below and each counter's number counts a project once —
    // a tile's number always matches the rows its popup shows. Today is the
    // one exception: a project day happening today is listed as itself.
    const upcomingItems = ed.collapseProjects(upcomingShoots);
    const proofsPendingItems = ed.collapseProjects(proofsPendingShoots);
    const deadlineItems = ed.collapseProjects(deadlineShoots);

    const pendingTeamMoodboardCount = ed.collapseProjects(ed.state.shoots.filter(ed.STAT_BOX_FILTERS.pending)).length;
    const inTheEditCount = ed.collapseProjects(ed.state.shoots.filter(ed.STAT_BOX_FILTERS.editing)).length;
    const pendingReflectionsCount = ed.collapseProjects(ed.state.shoots.filter(ed.STAT_BOX_FILTERS.reflections)).length;

    // "REFLECTIONS" is wider than a tile on most phones, which stretched its
    // column past the other two: the soft hyphen lets it break as
    // "REFLEC-TIONS" only where it doesn't fit, so the tiles stay equal.

    document.getElementById('statsRow').innerHTML = `
      <div class="stat-box" data-stat="pending">
        <span class="stat-num">${pendingTeamMoodboardCount}</span>
        <span class="stat-label">Teams + mood boards pending</span>
      </div>
      <div class="stat-box" data-stat="editing">
        <span class="stat-num">${inTheEditCount}</span>
        <span class="stat-label">In the edit</span>
      </div>
      <div class="stat-box" data-stat="reflections">
        <span class="stat-num">${pendingReflectionsCount}</span>
        <span class="stat-label">Pending reflec&shy;tions</span>
      </div>
    `;

    document.getElementById('todaySection').hidden = todayShoots.length === 0;
    document.getElementById('todayCount').textContent = `[${todayShoots.length}]`;
    const todayList = document.getElementById('todayShootsList');
    todayList.innerHTML = '';
    // Today lists each shoot day as itself (a project's other days are still
    // one box under Upcoming), so a project day says which project it's from.
    todayShoots.forEach(s => ed.renderShootRow(todayList, s, { showStatus: true, showProjectLine: true }));

    // A section with nothing in it isn't on the page at all.
    document.getElementById('upcomingSection').hidden = !upcomingItems.length;
    document.getElementById('upcomingCount').textContent = `[${upcomingItems.length}]`;
    const upList = document.getElementById('upcomingShootsList');
    upList.innerHTML = '';
    if (upcomingItems.length) ed.renderBucketedShoots(upList, upcomingItems, ['this_week', 'next_week', 'later'], 'date', { showStatus: true });

    document.getElementById('proofsPendingSection').hidden = !proofsPendingItems.length;
    document.getElementById('proofsPendingCount').textContent = `[${proofsPendingItems.length}]`;
    const proofsList = document.getElementById('proofsPendingShootsList');
    proofsList.innerHTML = '';
    proofsPendingItems.forEach(item => ed.renderListItem(proofsList, item, { showBadge: false }));

    document.getElementById('upcomingDeadlinesSection').hidden = !deadlineItems.length;
    document.getElementById('upcomingDeadlinesCount').textContent = `[${deadlineItems.length}]`;
    const deadlineList = document.getElementById('upcomingDeadlinesShootsList');
    deadlineList.innerHTML = '';
    if (deadlineItems.length) ed.renderBucketedShoots(deadlineList, deadlineItems, ['this_week', 'next_week'], 'deadline', { showBadge: false });

    // Section heading colors alternate dynamically, always starting with
    // yellow — Today drops out of the page entirely when nothing's due
    // today, so whichever section actually lands first (Today or Upcoming)
    // gets yellow, not a section tied to a fixed color.
    const overviewSectionIds = ['todaySection', 'upcomingSection', 'proofsPendingSection', 'upcomingDeadlinesSection'];
    let nextIsYellow = true;
    overviewSectionIds.forEach(id => {
      const section = document.getElementById(id);
      if (section.hidden) return;
      const heading = section.querySelector('h2');
      heading.classList.toggle('heading-yellow', nextIsYellow);
      heading.classList.toggle('heading-navy', !nextIsYellow);
      nextIsYellow = !nextIsYellow;
    });
  }
};
