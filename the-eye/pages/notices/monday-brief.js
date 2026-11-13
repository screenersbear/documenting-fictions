// The Monday brief (last week, once a week on open).
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addNoticesMondayBrief = function addNoticesMondayBrief(ed) {
  Object.assign(ed, { runOwedLaunchPopups, maybeShowMondayBrief, leaveMondayBrief, launchPopups });
  // ---------- Monday brief (last week, once a week on open) ----------
  // The first time the app's opened on a Monday — from 5am, the same day
  // boundary as the daily report (effectiveReportDateStr) — a look back at
  // last week to take into the new one: the week laid out like a page of the
  // weekly log (its shoots and the lessons learned from each), and a nudge
  // for any shoot still without a reflection. No counts (11-12): only the
  // lessons go into the new week. "Last week" is Monday
  // to Sunday, the seven days up to yesterday: the same week as the weekly
  // log's (see daysIntoWeek).
  // It's the last launch popup before the daily report, which follows it
  // once it's closed, so a Monday still gets both. It's checked when the app
  // comes back from the background too (a home-screen app is rarely
  // launched fresh), but only with nothing else on screen.
  const MONDAY_BRIEF_SHOWN_KEY = 'dailies_monday_brief_shown_v1';
  // A brief on its way (it shows on the next tick, see maybeShowMondayBrief),
  // so a second check meanwhile doesn't start another.
  let mondayBriefPending = false;
  // The end of the launch line-up (this brief, then the daily report) when
  // it couldn't show: something else opened while the brief was on its way,
  // or the brief was left for a shoot. It runs once nothing's open (see
  // syncPopupScrollLock) rather than waiting for the next launch.
  let launchTailOwed = false;

  function runOwedLaunchPopups() {
    if (!launchTailOwed) return;
    launchTailOwed = false;
    // After the tap that cleared the screen has finished, in case it opens
    // something of its own (a tab intro, say).
    setTimeout(() => {
      if (document.documentElement.classList.contains('update-reloading')) return;
      if (ed.anyPopupOpen()) { launchTailOwed = true; return; }
      // The check-in first, as at launch: its OK brings the brief.
      ed.checkDayAfterPrompt();
      if (!document.getElementById('dayAfterPromptOverlay').hidden) return;
      if (!maybeShowMondayBrief()) ed.checkDailyReportPrompt();
    }, 0);
  }

  // Today's date when it's a Monday whose brief hasn't shown yet, else null.
  function mondayBriefWaiting() {
    const today = ed.effectiveReportDateStr();
    if (ed.parseShootDate(today).getDay() !== 1) return null;
    let lastShown;
    try { lastShown = localStorage.getItem(MONDAY_BRIEF_SHOWN_KEY); } catch (e) { lastShown = null; }
    return lastShown === today ? null : today;
  }

  // Last week's window and contents, or null when it isn't Monday, this
  // Monday's brief has already shown, or there's nothing to look back on:
  // no shoot shot last week.
  function mondayBriefDue() {
    const today = mondayBriefWaiting();
    if (!today) return null;
    const end = ed.parseShootDate(today);
    end.setDate(end.getDate() - 1);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    const startStr = ed.formatDate(start);
    const endStr = ed.formatDate(end);
    // Shot last week: the weekly log's own rule (a date and Captured or
    // later), over these seven days.
    const shoots = ed.state.shoots
      .filter(s => s.date && s.date >= startStr && s.date <= endStr && ed.POST_CAPTURE_STATUSES.includes(s.status))
      .sort((a, b) => a.date.localeCompare(b.date));
    if (!shoots.length) return null;
    const week = { shoots, takeaways: ed.logTakeaways(shoots) };
    return { today, label: ed.weekRangeLabel(start, end), week };
  }

  // Shows this Monday's brief if one's due. True when it's on its way, so
  // the launch leaves the daily report for after it. It shows on the next
  // tick, after the rest of the launch: an entry being written when the app
  // went away (restoreOpenJournalEntry) opens first, and the brief waits.
  function maybeShowMondayBrief() {
    if (mondayBriefPending) return true;
    if (document.documentElement.classList.contains('update-reloading')) return false;
    const brief = mondayBriefDue();
    if (!brief) return false;
    mondayBriefPending = true;
    Promise.resolve().then(() => {
      mondayBriefPending = false;
      // A page an update's about to replace never shows it.
      if (document.documentElement.classList.contains('update-reloading')) return;
      // Something opened meanwhile (an entry being restored, a shoot from
      // the list) keeps the screen; the brief waits until it's closed.
      if (ed.anyPopupOpen()) { launchTailOwed = true; return; }
      try { localStorage.setItem(MONDAY_BRIEF_SHOWN_KEY, brief.today); } catch (e) { /* ignore */ }
      renderMondayBrief(brief);
    });
    return true;
  }

  function renderMondayBrief({ label, week }) {
    document.getElementById('mondayBriefTitle').textContent = label;
    const body = document.getElementById('mondayBriefBody');
    body.innerHTML = '';
    // Alternating bars, as in Archive mode.
    let headingCount = 0;
    const sectionHeading = (text) => ed.archiveModeSectionHeading(text, headingCount++ % 2 ? 'heading-navy' : 'heading-yellow');
    const shoots = week ? week.shoots : [];

    if (week) {
      body.appendChild(sectionHeading('Last week'));
      const card = document.createElement('div');
      card.className = 'card log-card monday-brief-log';
      card.innerHTML = ed.logWeekPaperHtml(week, 'Shoots', 'No takeaways logged last week.');
      ed.wireLogShootRefs(card);
      body.appendChild(card);
    }

    // Still waiting on one: the Overview's Pending reflections, so not an
    // archived shoot — the list "Reflect now" opens leaves those out too.
    const reflected = s => ed.hasText(s.whatWentRight) || ed.hasText(s.couldBeBetter) || ed.hasText(s.lessonsLearned);
    const unreflected = shoots.filter(s => !s.archived && !reflected(s));
    if (unreflected.length) {
      body.appendChild(sectionHeading('Reflections'));
      // A shoot's days share its name, so each name once.
      const names = ed.joinWithAnd([...new Set(unreflected.map(ed.shootDisplayName))]);
      const text = document.createElement('p');
      text.className = 'monday-brief-text';
      text.textContent = shoots.some(reflected)
        ? `Reflections still missing for ${names}.`
        : `You didn't write any reflections last week. Still missing for ${names}.`;
      body.appendChild(text);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'primary small-btn shoot-mode-add-shot-btn';
      btn.textContent = 'Reflect now';
      // One: straight to its Reflection. More: the Overview's Pending
      // reflections list, to pick which.
      btn.addEventListener('click', () => {
        leaveMondayBrief();
        if (unreflected.length === 1) {
          document.querySelector('.tab[data-view="shoots"]').click();
          ed.openShootPageAtReflection(unreflected[0].id);
        } else {
          ed.openStatBoxDetail(ed.STAT_BOX_FILTERS.reflections, ed.STAT_BOX_TITLES.reflections, 'reflections');
        }
      });
      body.appendChild(btn);
    }

    // Like askConfirm: a field left focused would keep the keyboard up over it.
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    body.scrollTop = 0;
    document.getElementById('mondayBriefOverlay').hidden = false;
  }

  // Left for somewhere else (a shoot, the Pending reflections list): the
  // daily report it was holding back waits until that's closed too.
  function leaveMondayBrief() {
    const overlay = document.getElementById('mondayBriefOverlay');
    if (overlay.hidden) return;
    overlay.hidden = true;
    launchTailOwed = true;
  }

  // OK and the X: done reading, so the daily report it held back comes next
  // (it does nothing if that's already shown today). No backdrop dismiss,
  // like the other launch popups.
  ['mondayBriefOkBtn', 'mondayBriefCloseBtn'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => {
      document.getElementById('mondayBriefOverlay').hidden = true;
      ed.checkDailyReportPrompt();
    });
  });

  // Nothing used to flush pending edits when the app went away, so anything
  // typed inside the debounce window was lost if iOS discarded the backgrounded
  // tab — which it does aggressively. visibilitychange is the reliable signal on
  // mobile Safari (pagehide/beforeunload often never fire when an app is
  // swiped away), and it doubles as the cue to park the Archive rotation so it
  // isn't animating photos for a screen nobody's looking at.
  function flushPendingEdits() {
    ed.saveShootNow();
    ed.saveJournalNow();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      flushPendingEdits();
      ed.saveLastPlace();
      ed.stopArchiveSlideshow();
      return;
    }
    if (!ed.views.archive.hidden) ed.startArchiveSlideshow();
    // iOS holds timers in the background, so Shoot mode's time left is
    // brought up to date straight away rather than at its next tick.
    if (!ed.shootModeOverlay.hidden) ed.renderShootModeClock();
    // Back from the background, which is how a home-screen app mostly
    // "opens": Monday's brief, if it hasn't shown yet and nothing else is
    // up. Not mid-launch, where the launch popups decide. The check-in goes
    // first, as at launch, so a weekend shoot it asks about is in the brief
    // once it's answered (its OK brings the brief).
    if (!document.documentElement.classList.contains('booting') && mondayBriefWaiting()) {
      if (!ed.anyPopupOpen()) {
        ed.checkDayAfterPrompt();
        if (document.getElementById('dayAfterPromptOverlay').hidden) maybeShowMondayBrief();
      } else if (!document.getElementById('bookOverlay').hidden) {
        // Shut notebook: it comes up as soon as the book is opened.
        launchTailOwed = true;
      }
    }
  });
  window.addEventListener('pagehide', flushPendingEdits);
  window.addEventListener('pagehide', () => ed.saveLastPlace());

  // Photos come from IndexedDB, which is async, so the first render below
  // has none and a second one fills them in. The page stays hidden meanwhile
  // (html.booting: a plain white screen) and appears once, photos and all —
  // rather than showing camera icons that swap for photos a moment later.
  // Their read is queued before anything else: the render below (the
  // Journal's photo strips) and the launch popups (the daily report) queue
  // reads of their own, and IndexedDB serves them in order. Capped so a slow
  // read can't hold up the app: after 600ms it shows regardless (the photos
  // then land when they're ready), and styles/base.css reveals the page on its own
  // after 1.5s if this never runs at all. Everything after boot reads photos
  // straight off the in-memory state.
  const photosReady = ed.hydratePhotos()
    .then(filled => { if (filled) ed.renderAll(); })
    .catch(() => {});
  // Inline photos are already in memory, so this can run alongside.
  ed.migrateInlinePhotos();
  ed.renderAll();
  const launchShown = Promise.race([photosReady, new Promise(resolve => setTimeout(resolve, 600))]).then(() => {
    // An update reload already under way (see reloadForUpdate): this page is
    // about to be replaced by the new version, so it never shows at all.
    if (document.documentElement.classList.contains('update-reloading')) return;
    document.documentElement.classList.remove('booting');
    // A popup opened during launch (a tab intro, the daily report…) played
    // its entrance while the page was hidden — play it again now it shows.
    document.querySelectorAll('.modal-overlay:not([hidden]) .modal').forEach(modal => {
      modal.style.animation = 'none';
      void modal.offsetWidth;
      modal.style.animation = '';
    });
    // Archive's slideshow (full-size photos) reads in the background once
    // the app's up, so it's ready before you get there.
    setTimeout(() => { if (!ed.archiveSlideshowLoaded) ed.loadArchiveSlideshow(); }, 400);
  }); ed.launchShown = launchShown;
  // Introductions first: on a genuinely first run this is the welcome step, and
  // the rest of the launch popups defer so they don't stack on top of it.
  function launchPopups() {
    ed.maybeShowPhotographerPrompt();
    if (!document.getElementById('photographerModalOverlay').hidden) return;
    // Shoot mode outranks every launch popup. If it's still switched on you're
    // mid-shoot and want the working view, not a report; and on a shoot day the
    // offer to enter it is the most time-sensitive thing the app can say, so it
    // goes ahead of the daily report rather than queueing behind it.
    if (!ed.resumeShootModeIfActive()) {
      ed.maybeShowShootModePrompt();
      if (document.getElementById('shootModePromptOverlay').hidden) {
        ed.showTabIntro('overview');
        if (document.getElementById('tabIntroOverlay').hidden) {
          ed.checkDayAfterPrompt();
          if (document.getElementById('dayAfterPromptOverlay').hidden) {
            // On a Monday, last week's brief goes first and the daily
            // report follows once it's closed.
            if (!maybeShowMondayBrief()) ed.checkDailyReportPrompt();
          }
        }
      }
    }
  }
  // Inside Documenting Fictions, the first visit's cards come before all of
  // these; they follow once the cards (and the tour, if taken) are done
  // (setupNotebook).
  if (!(window.DF_SUITE && window.DF_SUITE.firstVisit)) launchPopups();
};
