// Reflections' weekly log (a recap it writes itself): the weeks with a shoot
// in them, and each week as a card (This week, Last week, else its dates)
// with a row per shoot: its cover, its name and day, the lesson it left, and
// View shoot. The Monday brief shows last week's rows too.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addJournalWeeklyLog = function addJournalWeeklyLog(ed) {
  Object.assign(ed, { shootWeekWindow, weekRangeLabel, computeWeeklyLog, logTakeaways, showLogShootRef, openLogShoot, logShootRowsHtml, wireLogShootRefs, renderWeekCard });
  // ---------- Journal weekly log (auto-generated recap) ----------
  // Fully derived from state.shoots — nothing here is persisted, so editing
  // a shoot's category or lessons-learned later just updates the log the
  // next time it's opened. Weeks run Monday to Sunday, like everywhere else
  // in the app (daysIntoWeek).
  function shootWeekWindow(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const start = new Date(date);
    start.setDate(date.getDate() - ed.daysIntoWeek(date));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  }

  // "2 to 8 Nov" (row-words.js), the year added when it isn't this one.
  function weekRangeLabel(start, end) {
    return ed.rowDateRange(ed.formatDate(start), ed.formatDate(end), ed.todayStr());
  }

  function computeWeeklyLog() {
    const shotShoots = ed.state.shoots.filter(s => s.date && ed.POST_CAPTURE_STATUSES.includes(s.status));
    const weeks = new Map();
    shotShoots.forEach(s => {
      const { start, end } = shootWeekWindow(s.date);
      const key = ed.formatDate(start);
      if (!weeks.has(key)) weeks.set(key, { start, end, shoots: [] });
      weeks.get(key).shoots.push(s);
    });
    return Array.from(weeks.values())
      .sort((a, b) => b.start - a.start)
      .map(w => ({
        // Kept so the list can group weeks by year > month. A week straddling
        // a month boundary files under the month it *starts* in, matching the
        // month its label leads with.
        start: w.start,
        label: weekRangeLabel(w.start, w.end),
        shoots: w.shoots.slice().sort((a, b) => a.date.localeCompare(b.date)),
        takeaways: logTakeaways(w.shoots),
      }));
  }

  // Keeps each takeaway tied to the shoot it came from (rather than a
  // flat list of strings) so tapping one can open that same shoot.
  // One shoot's Lessons Learned is always exactly one takeaway here —
  // splitting on every newline used to turn a single entry into
  // several bullets the moment it had a paragraph break in it, which
  // read as several distinct lessons instead of the one the shoot
  // actually had. Internal line breaks are collapsed to spaces rather
  // than dropped outright, so the text stays readable as one bullet.
  function logTakeaways(shoots) {
    return shoots
      .map(s => ({ text: (s.lessonsLearned || '').replace(/\s*\n+\s*/g, ' ').trim(), shootId: s.id }))
      .filter(t => t.text);
  }

  // Tapping a shoot or takeaway in the Log opens a small "this refers to"
  // popup rather than jumping straight to the shoot modal — the Log is a
  // read-only recap, so a confirm step avoids an accidental jump away from it.
  let logShootRefId = null;

  function showLogShootRef(shootId) {
    const s = ed.state.shoots.find(x => x.id === shootId);
    if (!s) return;
    logShootRefId = shootId;
    document.getElementById('logShootRefName').textContent = ed.shootDisplayName(s);
    document.getElementById('logShootRefOverlay').hidden = false;
  }

  document.getElementById('logShootRefCancelBtn').addEventListener('click', () => {
    document.getElementById('logShootRefOverlay').hidden = true;
  });

  document.getElementById('logShootRefViewBtn').addEventListener('click', () => {
    document.getElementById('logShootRefOverlay').hidden = true;
    if (logShootRefId) openLogShoot(logShootRefId);
  });

  // A shoot from the log, opened on its Reflection page.
  function openLogShoot(shootId) {
    const s = ed.state.shoots.find(x => x.id === shootId);
    if (!s) return;
    // Asked from the Monday brief's copy of the week, which would otherwise
    // sit on top of the shoot it's opening (the same layer, later in the
    // page).
    ed.leaveMondayBrief();
    document.querySelector(`.tab[data-view="${s.archived ? 'archive' : 'shoots'}"]`).click();
    ed.openShootModal(shootId);
    // Land on the Reflection page rather than the first one: that's where
    // the takeaway was written, so it's what you came to look at.
    ed.showPostShootContentExpanded();
    ed.showShootPage('postShootHeading');
    ed.updateShootModalTitleFromScroll();
  }

  document.getElementById('logShootRefOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.hidden = true;
  });

  const CHEVRON = '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg>';
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  // A week's shoots, a row each: its cover, its name and day, the lesson it
  // left (one line breaks collapsed, as in logTakeaways) or that there isn't
  // one yet, and View shoot.
  function logShootRowsHtml(w) {
    const today = ed.todayStr();
    return w.shoots.map((s) => {
      const lesson = (s.lessonsLearned || '').replace(/\s*\n+\s*/g, ' ').trim();
      return `
        <div class="log-shoot-row">
          <span class="log-thumb">${ed.shootThumbHtml(s)}</span>
          <div class="log-shoot-body">
            <span class="log-label">${ed.escapeHtml(ed.metaLine([ed.shootDisplayName(s), ed.rowDate(s.date, today, false)]))}</span>
            <span class="log-lesson${lesson ? '' : ' log-lesson-none'}">${ed.escapeHtml(lesson || 'No lesson written yet.')}</span>
            <button type="button" class="log-view-shoot" data-shoot-id="${ed.escapeHtml(s.id)}">View shoot ${CHEVRON}</button>
          </div>
        </div>`;
    }).join('');
  }

  function wireLogShootRefs(card) {
    card.querySelectorAll('.log-view-shoot[data-shoot-id]').forEach(btn => {
      btn.addEventListener('click', () => openLogShoot(btn.dataset.shootId));
    });
  }

  // The card's title: This week, Last week, else its dates ("2 to 8 Nov").
  function weekTitle(start, range) {
    const thisWeek = shootWeekWindow(ed.todayStr()).start;
    const lastWeek = new Date(thisWeek);
    lastWeek.setDate(thisWeek.getDate() - 7);
    const startStr = ed.formatDate(start);
    if (startStr === ed.formatDate(thisWeek)) return 'This week';
    if (startStr === ed.formatDate(lastWeek)) return 'Last week';
    return range;
  }

  // One week as a card: This week, Last week, or its dates, with its dates
  // or how many shoots (or entries) beside; its shoots, then the entries
  // written that week (renderJournalEntryCard). week is null for a week
  // with entries and no shoot; start is null for entries with no date.
  // Resolves once the entries' photos are in.
  function renderWeekCard(container, start, week, entries) {
    let range = '';
    if (start) {
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      range = weekRangeLabel(start, end);
    }
    const startStr = start ? ed.formatDate(start) : '';
    const title = start ? weekTitle(start, range) : 'Undated';
    const count = week ? plural(week.shoots.length, 'shoot', 'shoots') : plural(entries.length, 'entry', 'entries');
    const card = document.createElement('div');
    card.className = 'card log-card';
    // Anchor the table of contents scrolls to (see scrollToJournalItem).
    if (week) card.dataset.weekKey = startStr;
    card.innerHTML = `
      <div class="log-week-head"><h3 class="log-week-heading">${ed.escapeHtml(title)}</h3><span class="log-week-meta">${ed.escapeHtml(range && title !== range ? range : count)}</span></div>
      ${week ? logShootRowsHtml(week) : ''}`;
    wireLogShootRefs(card);
    container.appendChild(card);
    return Promise.all(entries.map(e => ed.renderJournalEntryCard(card, e)));
  }
};
