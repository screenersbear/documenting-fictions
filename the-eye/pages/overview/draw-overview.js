// Drawing the Overview tab: the Today card, the next shoot, and the lists
// under it (upcoming shoots, proofs pending, upcoming deadlines).
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addOverviewDrawOverview = function addOverviewDrawOverview(ed) {
  Object.assign(ed, { renderOverview });
  function renderOverview() {
    drawOverview();
    ed.repaginate('overview');
  }

  // A section's count, after its title, in the quieter type.
  function setCount(id, n) {
    document.getElementById(id).textContent = String(n);
  }

  function drawOverview() {
    ed.renderTodayCard();
    const byDate = (a, b) => ed.dateTimeSortKey(a).localeCompare(ed.dateTimeSortKey(b));
    // Today's shoots and the ones after: the first is the Next shoot card,
    // the rest are Upcoming shoots.
    const comingShoots = ed.state.shoots.filter(s => ed.isToday(s) || ed.isUpcoming(s)).sort(byDate);
    const next = comingShoots[0] || null;
    ed.renderNextShoot(next);
    const upcomingShoots = comingShoots.slice(1);
    const deadlineShoots = ed.state.shoots.filter(ed.isUpcomingDeadline)
      .filter(s => ed.weekBucket(s.deadline) === 'this_week' || ed.weekBucket(s.deadline) === 'next_week')
      .sort((a, b) => ed.dateSortKey(a.deadline).localeCompare(ed.dateSortKey(b.deadline)));
    // Video has no proofs step, so a captured video shoot isn't listed here.
    const proofsPendingShoots = ed.state.shoots.filter(s => !s.archived && s.status === 'captured' && !ed.isVideoShoot(s)).sort(byDate);

    // A project's members collapse into one box per list (collapseProjects),
    // so every list below and its count counts a project once.
    const upcomingItems = ed.collapseProjects(upcomingShoots);
    const proofsPendingItems = ed.collapseProjects(proofsPendingShoots);
    const deadlineItems = ed.collapseProjects(deadlineShoots);

    // A section with nothing in it isn't on the page at all.
    document.getElementById('upcomingSection').hidden = !upcomingItems.length;
    setCount('upcomingCount', upcomingItems.length);
    const upList = document.getElementById('upcomingShootsList');
    upList.innerHTML = '';
    if (upcomingItems.length) ed.renderBucketedShoots(upList, upcomingItems, ['this_week', 'next_week', 'later'], 'date', { showStatus: true });

    document.getElementById('proofsPendingSection').hidden = !proofsPendingItems.length;
    setCount('proofsPendingCount', proofsPendingItems.length);
    const proofsList = document.getElementById('proofsPendingShootsList');
    proofsList.innerHTML = '';
    proofsPendingItems.forEach(item => ed.renderListItem(proofsList, item, { showStatus: true }));

    document.getElementById('upcomingDeadlinesSection').hidden = !deadlineItems.length;
    setCount('upcomingDeadlinesCount', deadlineItems.length);
    const deadlineList = document.getElementById('upcomingDeadlinesShootsList');
    deadlineList.innerHTML = '';
    if (deadlineItems.length) ed.renderBucketedShoots(deadlineList, deadlineItems, ['this_week', 'next_week'], 'deadline', { showStatus: true, dueOnly: true });
  }
};
