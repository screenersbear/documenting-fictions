// On the day: picking Shoot mode up again, the prompt to start it, and the day-after check-in.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addNoticesShootDay = function addNoticesShootDay(ed) {
  Object.assign(ed, { resumeShootModeIfActive, maybeShowShootModePrompt, checkDayAfterPrompt });
  function resumeShootModeIfActive() {
    const id = ed.getShootModeShootId();
    if (!id) return false;
    const shoot = ed.state.shoots.find(s => s.id === id);
    // Left on into a new day — closed the app mid-shoot and didn't come
    // back until later — shouldn't keep reopening yesterday's working view.
    // Once the shoot's own day has passed, close out of it automatically
    // so the app boots into the regular flow for today instead. Same 5am
    // day boundary as the rest of the once-a-day logic, so shooting late
    // into the night doesn't get kicked out mid-shoot at midnight.
    if (shoot && shoot.date && shoot.date < ed.effectiveReportDateStr()) {
      ed.setShootModeShootId(null);
      return false;
    }
    return ed.openShootMode(id);
  }

  document.getElementById('shootModeStartBtn').addEventListener('click', () => {
    const id = document.getElementById('shootModePromptOverlay').dataset.shootId;
    document.getElementById('shootModePromptOverlay').hidden = true;
    if (id) ed.openShootMode(id);
  });

  document.getElementById('shootModeSkipBtn').addEventListener('click', () => {
    document.getElementById('shootModePromptOverlay').hidden = true;
    // Answers the obvious follow-up — "so where did that go?" — once, rather
    // than re-asking on every shoot day forever.
    ed.showTabIntro('shootmode:where');
  });

  function maybeShowShootModePrompt() {
    if (!ed.shootModeOverlay.hidden) return;
    // Not before 5am: a shoot dated today isn't "today" yet at 1am, so this
    // uses the same 5am-rollover day as the other once-a-day prompts. A
    // late-night open the evening before, or a 2am open on the day itself,
    // stays quiet until the day really starts.
    const today = ed.effectiveReportDateStr();
    let asked;
    try { asked = localStorage.getItem(ed.SHOOT_MODE_ASKED_KEY); } catch (e) { asked = null; }
    if (asked === today) return;

    const shoot = ed.state.shoots.find(x => !x.archived && !ed.POST_CAPTURE_STATUSES.includes(x.status) && x.status !== 'rescheduled' && x.status !== 'canceled' && x.date === today);
    if (!shoot) return;
    try { localStorage.setItem(ed.SHOOT_MODE_ASKED_KEY, today); } catch (e) { /* ignore */ }

    const overlay = document.getElementById('shootModePromptOverlay');
    overlay.dataset.shootId = shoot.id;
    document.getElementById('shootModePromptText').textContent =
      `you're shooting ${ed.shootDisplayName(shoot)} today. Shoot mode strips the app back to just your shot list and your ${ed.moodboardTerm(shoot.category).toLowerCase()}, so you can tick shots off as you go without digging through the planner. It stays on until you end it.`;
    overlay.hidden = false;
  }

  // The next-day check-in answers itself: a row per shoot, each with its two
  // likely answers as buttons — "Postponed" and "Shot it" (Captured) — that
  // update that shoot on the spot through the usual status path
  // (applyStatusChange), and then show what it was set to. The reflection
  // and deadline prompts stay out of it (one per row would stack over the
  // list); the daily report's reflection reminder and the rows' "Pending:
  // Reflection" pick a shot shoot up from there. The button under the list
  // closes it whenever: "Not yet" while any row's still unanswered (those
  // are asked again the next day), "Done" once they all are.
  function checkDayAfterPrompt() {
    const today = ed.effectiveReportDateStr();
    let lastShown;
    try { lastShown = localStorage.getItem(ed.DAY_AFTER_PROMPT_KEY); } catch (e) { lastShown = null; }
    if (lastShown === today) return;

    // Any shoot whose date has passed and hasn't been marked post-capture
    // yet — not just ones from exactly yesterday, so skipping a day (or
    // several) of opening the app doesn't silently drop the check-in for
    // good. It still only asks once a day (the lastShown guard above), so
    // whichever day you next open the app is the day it catches up.
    // Postponed/canceled shoots keep their original date now, but already
    // have their answer; a new date one's been given since is asked about
    // like any other once it's passed (see isOriginalPlanDate).
    const pendingShoots = ed.state.shoots.filter(s => !s.archived && !ed.POST_CAPTURE_STATUSES.includes(s.status) && !ed.isOriginalPlanDate(s) && s.date && s.date < today);
    if (!pendingShoots.length) return;

    try { localStorage.setItem(ed.DAY_AFTER_PROMPT_KEY, today); } catch (e) { /* ignore */ }

    // Oldest first, each named with its date — and its day number on a
    // multi-day project, whose days all share one name — so rows that would
    // otherwise read the same can be told apart. Written once, here: an
    // answer never rewrites a row's name (a day set to Postponed stops
    // counting as a project day, which would renumber the others).
    pendingShoots.sort((a, b) => ed.dateTimeSortKey(a).localeCompare(ed.dateTimeSortKey(b)));
    const rowLabel = s => {
      const info = ed.projectDayInfo(s);
      return `${ed.shootDisplayName(s)} · ${ed.prettyDateShort(s.date)}${info ? ` · Day ${info.day}` : ''}`;
    };
    const plural = pendingShoots.length > 1;
    document.getElementById('dayAfterPromptText').textContent = `Did ${plural ? 'these shoots' : 'this shoot'} happen?`;
    document.getElementById('dayAfterList').innerHTML = pendingShoots.map(s => `
      <div class="day-after-row" data-shoot-id="${ed.escapeHtml(s.id)}">
        <span class="day-after-name">${ed.escapeHtml(rowLabel(s))}</span>
        <div class="modal-actions fit-pair">
          <button type="button" class="secondary" data-status="rescheduled">${ed.escapeHtml(ed.STATUS_LABELS.rescheduled)}</button>
          <button type="button" class="primary" data-status="captured">Shot it</button>
        </div>
        <span class="day-after-result" hidden></span>
      </div>
    `).join('');
    updateDayAfterCloseBtn();
    document.getElementById('dayAfterPromptOverlay').hidden = false;
    document.querySelectorAll('#dayAfterList .modal-actions').forEach(ed.fitButtonPair);
  }

  function updateDayAfterCloseBtn() {
    const allAnswered = [...document.querySelectorAll('#dayAfterList .day-after-result')].every(el => !el.hidden);
    const btn = document.getElementById('dayAfterOkBtn');
    btn.textContent = allAnswered ? 'Done' : 'Not yet';
    btn.className = allAnswered ? 'primary' : 'secondary';
  }

  document.getElementById('dayAfterList').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-status]');
    if (!btn) return;
    const row = btn.closest('.day-after-row');
    const status = btn.dataset.status;
    if (ed.applyStatusChange(row.dataset.shootId, status, { followUps: false }) === null) return;
    row.querySelector('.modal-actions').hidden = true;
    const result = row.querySelector('.day-after-result');
    result.textContent = `Status: ${ed.STATUS_LABELS[status]}`;
    result.hidden = false;
    updateDayAfterCloseBtn();
  });

  document.getElementById('dayAfterOkBtn').addEventListener('click', () => {
    document.getElementById('dayAfterPromptOverlay').hidden = true;
    // On a Monday the check-in holds back last week's brief, which then
    // counts a weekend shoot just answered "Shot it".
    ed.maybeShowMondayBrief();
  });
};
