// What needs you today: one list for the Today card on Overview and the top
// of the daily report, so the two never disagree (round 5: the report said
// "Nothing to report today" while the card had things on it). A shoot ready
// to shoot today, a shoot whose day went by without an answer, deadlines
// gone by, and Monday's look back, most urgent first. The shoots in, plain
// items and their markup out (no page, no saved data), so it's unit tested
// (tests/unit/the-eye/today-items.test.mjs).
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addTodayItems = function addTodayItems(ed) {
  Object.assign(ed, { todayItems, todayItemHtml, todayCountWords, todayMoreWords, runTodayAct });
  const CHEVRON = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg>';
  const byDate = (a, b) => ed.dateTimeSortKey(a).localeCompare(ed.dateTimeSortKey(b));

  function todayItems() {
    // The day starts at 5am, as the daily report's does (effectiveReportDateStr):
    // a shoot that ran late last night isn't "yesterday's" yet at 1am.
    const day = ed.effectiveReportDateStr();
    const today = ed.todayStr();
    const shoots = ed.state.shoots;
    const list = [];

    // Shoot day: only once it's Shoot ready, since that's when Shoot mode
    // works, and not while Shoot mode is up.
    if (!ed.shootModeOverlay || ed.shootModeOverlay.hidden) {
      shoots.filter(s => !s.archived && s.status === 'waiting_to_shoot' && s.date === day).sort(byDate)
        .forEach(s => list.push({ kind: 'shoot-day', id: s.id, name: ed.shootDisplayName(s) }));
    }

    // Any shoot whose day has gone by and isn't marked shot yet, oldest
    // first, however many days ago (so a few days away from the app don't
    // lose one). A postponed or canceled shoot's kept date already has its
    // answer; a new date it's been given since is asked about like any
    // other (isOriginalPlanDate).
    shoots.filter(s => !s.archived && !ed.POST_CAPTURE_STATUSES.includes(s.status) && !ed.isOriginalPlanDate(s) && s.date && s.date < day)
      .sort(byDate).forEach((s) => {
        const info = ed.projectDayInfo(s);
        list.push({ kind: 'happened', id: s.id, name: ed.shootDisplayName(s), day: info ? info.day : 0, setFor: ed.setForWords(s.date, day) });
      });

    // Deadlines gone by: once per project, whose days share one.
    ed.collapseProjects(shoots.filter(s => ed.isUpcomingDeadline(s) && s.deadline < today)).forEach((item) => {
      if (item.kind === 'project') {
        const deadline = item.members.map(s => s.deadline).sort()[0];
        list.push({ kind: 'late', act: 'project', id: item.project.id, name: item.project.name || ed.UNTITLED_PROJECT_NAME, late: ed.pastDeadlineWords(deadline, today) });
      } else {
        list.push({ kind: 'late', act: 'shoot', id: item.shoot.id, name: ed.shootDisplayName(item.shoot), late: ed.pastDeadlineWords(item.shoot.deadline, today) });
      }
    });

    // On a Monday: last week, looked back on, until it's been read.
    if (ed.mondayBriefDue()) list.push({ kind: 'brief', id: '' });
    return list;
  }

  const b = text => `<b>${ed.escapeHtml(text)}</b>`;
  // A question with its answers.
  const ask = (html, answers) => `<div class="today-item"><p>${html}</p><div class="today-btns">${answers}</div></div>`;
  const answer = (act, id, label, primary) => `<button type="button" class="${primary ? 'primary' : 'secondary'}" data-act="${act}" data-id="${ed.escapeHtml(id)}">${label}</button>`;
  // A line you tap to go somewhere.
  const link = (act, id, html) => `<button type="button" class="today-item today-link" data-act="${act}" data-id="${ed.escapeHtml(id)}"><span>${html}</span>${CHEVRON}</button>`;

  function todayItemHtml(item) {
    switch (item.kind) {
      case 'shoot-day':
        return ask(`You're shooting ${b(item.name)} today.`, answer('shoot-mode', item.id, 'Shoot mode', true));
      case 'happened':
        return ask(`Did ${b(item.name)}${item.day ? ` (day ${item.day})` : ''} happen? It was set for ${ed.escapeHtml(item.setFor)}.`,
          answer('happened', item.id, 'Yes, it happened', true) + answer('move', item.id, 'Move the date', false));
      case 'late':
        return link(item.act, item.id, `${b(item.name)} is <span class="today-late">${ed.escapeHtml(item.late)}</span> its deadline.`);
      default:
        return link('brief', '', `${b('Last week')}: your shoots and what you took from them.`);
    }
  }

  // "1 thing", "4 things" (shown in capitals).
  function todayCountWords(n) {
    return `${n} ${n === 1 ? 'thing' : 'things'}`;
  }
  // "2 more in today's report".
  function todayMoreWords(n) {
    return `${n} more in today's report`;
  }

  // An answer or a line, tapped (on the card or in the report).
  function runTodayAct(act, id) {
    switch (act) {
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
      // Anything else: nothing.
    }
  }
};
