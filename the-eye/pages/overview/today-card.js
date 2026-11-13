// The Today card at the top of Overview: only what needs you now, in place of
// the pop-ups that used to open on launch. A shoot ready to shoot today (with
// Shoot mode), a shoot whose day has gone by without an answer ("Did it
// happen?"), deadlines gone by, and Monday's look back at last week. Hidden
// when there's nothing. Full report (and the bell) open the daily report.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addOverviewTodayCard = function addOverviewTodayCard(ed) {
  Object.assign(ed, { renderTodayCard });
  const card = document.getElementById('todayCard');
  const items = document.getElementById('todayCardItems');
  const CHEVRON = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg>';
  const byDate = (a, b) => ed.dateTimeSortKey(a).localeCompare(ed.dateTimeSortKey(b));
  const b = text => `<b>${ed.escapeHtml(text)}</b>`;

  // A line you tap to go somewhere.
  const linkItem = (act, id, html) => `<button type="button" class="today-item today-link" data-act="${act}" data-id="${ed.escapeHtml(id)}"><span>${html}</span>${CHEVRON}</button>`;
  // A question with its two answers.
  const askItem = (id, html, yes, no) => `<div class="today-item"><p>${html}</p><div class="today-btns">${yes}${no}</div></div>`;
  const btn = (act, id, label, primary) => `<button type="button" class="${primary ? 'primary' : 'secondary'}" data-act="${act}" data-id="${ed.escapeHtml(id)}">${label}</button>`;

  function renderTodayCard() {
    // The day starts at 5am, as the daily report's does (effectiveReportDateStr):
    // a shoot that ran late last night isn't "yesterday's" yet at 1am.
    const day = ed.effectiveReportDateStr();
    const today = ed.todayStr();
    const html = [];

    // Shoot day: only once it's Shoot ready, since that's when Shoot mode works.
    if (!ed.shootModeOverlay || ed.shootModeOverlay.hidden) {
      ed.state.shoots.filter(s => !s.archived && s.status === 'waiting_to_shoot' && s.date === day).sort(byDate).forEach((s) => {
        html.push(askItem(s.id, `You're shooting ${b(ed.shootDisplayName(s))} today.`, btn('shoot-mode', s.id, 'Shoot mode', true), ''));
      });
    }

    // Any shoot whose day has gone by and isn't marked shot yet, oldest
    // first, however many days ago (so a few days away from the app don't
    // lose one). A postponed or canceled shoot's kept date already has its
    // answer; a new date it's been given since is asked about like any
    // other (isOriginalPlanDate).
    ed.state.shoots.filter(s => !s.archived && !ed.POST_CAPTURE_STATUSES.includes(s.status) && !ed.isOriginalPlanDate(s) && s.date && s.date < day)
      .sort(byDate).forEach((s) => {
        const info = ed.projectDayInfo(s);
        const name = `${b(ed.shootDisplayName(s))}${info ? ` (day ${info.day})` : ''}`;
        html.push(askItem(s.id, `Did ${name} happen? It was set for ${ed.escapeHtml(ed.setForWords(s.date, day))}.`,
          btn('happened', s.id, 'Yes, it happened', true), btn('move', s.id, 'Move the date', false)));
      });

    // Deadlines gone by: once per project, whose days share one.
    const overdue = ed.state.shoots.filter(s => ed.isUpcomingDeadline(s) && s.deadline < today);
    ed.collapseProjects(overdue).forEach((item) => {
      const isProject = item.kind === 'project';
      const deadline = isProject ? item.members.map(s => s.deadline).sort()[0] : item.shoot.deadline;
      const name = isProject ? (item.project.name || ed.UNTITLED_PROJECT_NAME) : ed.shootDisplayName(item.shoot);
      html.push(linkItem(isProject ? 'project' : 'shoot', isProject ? item.project.id : item.shoot.id,
        `${b(name)} is <span class="today-late">${ed.pastDeadlineWords(deadline, today)}</span> its deadline.`));
    });

    // On a Monday: last week, looked back on, until it's been read.
    if (ed.mondayBriefDue()) html.push(linkItem('brief', '', `${b('Last week')}: your shoots and what you took from them.`));

    items.innerHTML = html.join('');
    card.hidden = !html.length;
  }

  items.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const id = el.dataset.id;
    switch (el.dataset.act) {
      case 'shoot-mode': ed.openShootMode(id); break;
      // As the old day-after check-in did: the status changes on the spot
      // (applyStatusChange saves and redraws, which takes the line away),
      // without the follow-up questions a status change usually brings.
      case 'happened': ed.applyStatusChange(id, 'captured', { followUps: false }); break;
      // Postponed (its date kept as the original plan), then its page, to
      // give it the new one.
      case 'move':
        if (ed.applyStatusChange(id, 'rescheduled', { followUps: false }) !== null) ed.openShootModal(id);
        break;
      case 'shoot': ed.openShootModal(id); break;
      case 'project': ed.openProjectPopup(id); break;
      case 'brief': ed.maybeShowMondayBrief(); break;
      default: break;
    }
  });

  document.getElementById('todayReportBtn').addEventListener('click', () => ed.openNotificationsBell());
};
