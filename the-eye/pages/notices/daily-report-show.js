// The daily report: nudges, today's report kept, and showing it.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addNoticesDailyReportShow = function addNoticesDailyReportShow(ed) {
  Object.assign(ed, { openNotificationsBell });
  // A general nudge about outstanding pending items — separate from the
  // scheduled, once-per-shoot items in computeDailyReportItems() above.
  // Recomputed fresh every time the report shows (like the fun fact), so it
  // always reflects today's real pending state rather than a one-time flag.
  function computeDailyReportNudges(finalImagesMissingCount) {
    const nudges = [];
    const everything = ed.dailyReportEverything();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // "Before a shoot": only the shoots in the next 7 days.
    const activeShoots = ed.state.shoots.filter(s => !s.archived && (everything || ed.shootWithinAWeek(s, today)));

    const moodboardPendingShoots = activeShoots.filter(ed.moodboardPending);
    const moodboardPendingCount = moodboardPendingShoots.length;
    const videoBoardCount = moodboardPendingShoots.filter(ed.isVideoShoot).length;
    // All photo shoots -> the original wording (so an already-cached nudge
    // still matches in refreshCachedDailyReportContent); all video ->
    // storyboard; a mix -> both.
    const allVideo = videoBoardCount > 0 && videoBoardCount === moodboardPendingCount;
    const boardNoun = videoBoardCount === 0 ? 'mood board' : (allVideo ? 'storyboard' : 'mood board or storyboard');
    const boardNounPlural = videoBoardCount === 0 ? 'mood boards' : (allVideo ? 'storyboards' : 'mood boards or storyboards');
    if (moodboardPendingCount === 1) nudges.push(`A shoot still needs a ${boardNoun}!`);
    else if (moodboardPendingCount === 2) nudges.push(`A couple of shoots still need ${boardNounPlural}!`);
    else if (moodboardPendingCount > 2) nudges.push(`${moodboardPendingCount} shoots still need ${boardNounPlural}!`);

    const teamPendingCount = activeShoots.filter(ed.teamPending).length;
    if (teamPendingCount === 1) nudges.push("There's teams yet to be assembled!");
    else if (teamPendingCount > 1) nudges.push('Are all your teams set?');

    if (everything && finalImagesMissingCount === 1) nudges.push('A delivered shoot is still missing its final images!');
    else if (everything && finalImagesMissingCount > 1) nudges.push(`${finalImagesMissingCount} delivered shoots are still missing final images!`);

    return nudges;
  }

  function pickDailyReportNudge(finalImagesMissingCount) {
    const nudges = computeDailyReportNudges(finalImagesMissingCount);
    if (!nudges.length) return null;
    return nudges[Math.floor(Math.random() * nudges.length)];
  }

  // Counts active (not-yet-archived) delivered shoots with no final images
  // uploaded yet — the one piece of Daily report content that needs an
  // IndexedDB lookup, so it's resolved async and awaited before the report
  // gets assembled.
  function countActiveDeliveredShootsMissingFinalImages() {
    // Video has no final images, so a delivered video never counts here.
    const deliveredShoots = ed.state.shoots.filter(s => !s.archived && s.status === 'delivered' && !ed.isVideoShoot(s));
    if (!deliveredShoots.length) return Promise.resolve(0);
    return Promise.all(deliveredShoots.map(s => ed.idbGetImages(ed.finalImagesKey(s.id)).then(images => images.length === 0)))
      .then(flags => flags.filter(Boolean).length);
  }

  // The Daily report's content (items/nudge/fact) is built at most once a
  // day and cached — computeDailyReportItems() mutates one-time reminder
  // flags on each shoot as a side effect, so recomputing it a second time
  // the same day (e.g. reopening via the notifications bell after the
  // automatic popup already showed) would silently lose items whose flags
  // just got set. Both the automatic popup and the on-demand bell read
  // through this same cache.
  const DAILY_REPORT_CONTENT_KEY = 'dailies_daily_report_content_v3'; ed.DAILY_REPORT_CONTENT_KEY = DAILY_REPORT_CONTENT_KEY;

  function loadCachedDailyReportContent() {
    try {
      const raw = localStorage.getItem(DAILY_REPORT_CONTENT_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return (parsed && parsed.date === ed.effectiveReportDateStr()) ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function buildTodaysDailyReportContent() {
    const items = ed.computeDailyReportItems();
    const fact = ed.dailyReportEverything() ? ed.pickRandomFunFact() : null; // the stat of the day is "Everything" only
    return countActiveDeliveredShootsMissingFinalImages().then(finalImagesMissingCount => {
      const nudge = pickDailyReportNudge(finalImagesMissingCount);
      const content = { date: ed.effectiveReportDateStr(), items, nudge, fact };
      try { localStorage.setItem(DAILY_REPORT_CONTENT_KEY, JSON.stringify(content)); } catch (e) { /* ignore */ }
      ed.saveState();
      return content;
    });
  }

  // The cache keeps today's report from re-rolling or re-firing one-time
  // reminders, but everything in it describes the moment it was built — a
  // shoot moved past planning since then (captured, delivered, postponed…)
  // would otherwise keep its "needs a mood board" line until tomorrow. So on
  // every read, the pending-based lines are checked against the data as it is
  // now: a seven-day reminder is dropped or reworded to what's still
  // pending, and the nudge is kept only if it's still true (otherwise a
  // fresh one is picked, or none if nothing's left). Everything else —
  // the fun fact, the editing check-in, the reflection list — stays as built.
  function refreshCachedDailyReportContent(cached) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const items = [];
    cached.items.forEach(item => {
      if (item.kind !== 'sevenDay') { items.push(item); return; }
      const s = ed.state.shoots.find(x => x.id === item.shootId);
      if (!s || s.archived || ed.POST_CAPTURE_STATUSES.includes(s.status)) return;
      const text = ed.sevenDayReminderText(s, today);
      if (text) items.push({ ...item, text });
    });
    return countActiveDeliveredShootsMissingFinalImages().then(finalImagesMissingCount => {
      const current = computeDailyReportNudges(finalImagesMissingCount);
      const nudge = cached.nudge && current.includes(cached.nudge)
        ? cached.nudge
        : (current.length ? current[Math.floor(Math.random() * current.length)] : null);
      const content = { ...cached, items, nudge };
      try { localStorage.setItem(DAILY_REPORT_CONTENT_KEY, JSON.stringify(content)); } catch (e) { /* ignore */ }
      return content;
    });
  }

  // The backup reminder joins after caching, so it's never stored with the
  // day's content (see withBackupReminder).
  function getTodaysDailyReportContent() {
    // After the boards from Ref are known: a shoot with one doesn't need a mood board.
    return ed.refBoardsReady.catch(() => {}).then(() => {
      const cached = loadCachedDailyReportContent();
      return cached ? refreshCachedDailyReportContent(cached) : buildTodaysDailyReportContent();
    }).then(ed.withBackupReminder);
  }

  function renderDailyReportOverlay(content) {
    const { items, nudge, fact } = content;
    const list = document.getElementById('dailyReportList');
    list.innerHTML = '';
    // First, everything on the Today card (components/today-items.js), with
    // the same answers (round 5: the report used to leave them out).
    const today = ed.todayItems();
    if (today.length) {
      const block = document.createElement('div');
      block.className = 'report-today';
      block.innerHTML = today.map(ed.todayItemHtml).join('');
      list.appendChild(block);
    }
    items.forEach(item => {
      const row = document.createElement('div');
      // daily-report-fact is the app's existing "this row isn't a link" marker
      // (it's what the nudge and stat lines use), so a grouped item that names
      // several shoots reuses it rather than inventing a second flavour.
      row.className = (item.shootId || item.action) ? 'daily-report-item' : 'daily-report-item daily-report-fact';
      row.textContent = item.text;
      if (item.list && item.list.length) {
        const ul = document.createElement('ul');
        ul.className = 'daily-report-item-list';
        item.list.forEach(name => {
          const li = document.createElement('li');
          li.textContent = name;
          ul.appendChild(li);
        });
        row.appendChild(ul);
      }
      if (item.shootId) {
        row.addEventListener('click', () => {
          document.getElementById('dailyReportOverlay').hidden = true;
          document.querySelector('.tab[data-view="shoots"]').click();
          ed.openShootModal(item.shootId);
        });
      }
      // The backup reminder (backupReminderItem) runs the backup itself.
      if (item.action === 'backup') {
        row.addEventListener('click', () => {
          document.getElementById('dailyReportOverlay').hidden = true;
          ed.exportAllData();
        });
      }
      list.appendChild(row);
    });

    if (nudge) {
      const row = document.createElement('div');
      row.className = 'daily-report-item daily-report-fact';
      row.textContent = nudge;
      list.appendChild(row);
    }

    if (fact) {
      const row = document.createElement('div');
      row.className = 'daily-report-item daily-report-fact';
      row.textContent = `Stat of the day: ${fact}`;
      list.appendChild(row);
    }

    // It only opens when asked for (the bell, the Today card's N MORE), so it always
    // says something.
    if (!today.length && !items.length && !nudge && !fact) {
      const row = document.createElement('div');
      row.className = 'daily-report-item daily-report-fact';
      row.textContent = 'Nothing to report today.';
      list.appendChild(row);
    }

    document.getElementById('dailyReportOverlay').hidden = false;
  }

  // The bell and the Today card's N MORE: the daily report, shown when
  // asked for (it used to open once a day on its own; the Today card took
  // that over). It always shows something (a "nothing to report" line if
  // today's report is genuinely empty).
  function openNotificationsBell() {
    getTodaysDailyReportContent().then(renderDailyReportOverlay);
  }

  document.getElementById('dailyReportCloseBtn').addEventListener('click', () => {
    document.getElementById('dailyReportOverlay').hidden = true;
  });

  // A Today line, answered or tapped in the report: an answer keeps the
  // report open, without that line; a line to tap closes it and opens what
  // it's about.
  document.getElementById('dailyReportList').addEventListener('click', (e) => {
    const el = e.target.closest('.report-today [data-act]');
    if (!el) return;
    const answer = el.dataset.act === 'happened';
    if (!answer) document.getElementById('dailyReportOverlay').hidden = true;
    ed.runTodayAct(el.dataset.act, el.dataset.id);
    if (answer) openNotificationsBell();
  });
};
