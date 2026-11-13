// The Monday brief (last week, looked back on, once a week), and the app
// starting up: the photos read in, the page shown, and what opens first.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addNoticesMondayBrief = function addNoticesMondayBrief(ed) {
  Object.assign(ed, { mondayBriefDue, maybeShowMondayBrief, leaveMondayBrief, launchPopups });
  // ---------- Monday brief (last week, once a week) ----------
  // On a Monday — from 5am, the same day boundary as the daily report
  // (effectiveReportDateStr) — a look back at last week to take into the new
  // one: the week laid out like a page of the weekly log (its shoots and the
  // lessons learned from each), and a nudge for any shoot still without a
  // reflection. No counts (11-12): only the lessons go into the new week.
  // "Last week" is Monday to Sunday, the seven days up to yesterday: the same
  // week as the weekly log's (see daysIntoWeek). It no longer opens on its
  // own: the Today card offers it until it's been read.
  const MONDAY_BRIEF_SHOWN_KEY = 'dailies_monday_brief_shown_v1';
  // A brief on its way (it shows on the next tick, see maybeShowMondayBrief),
  // so a second tap meanwhile doesn't start another.
  let mondayBriefPending = false;

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

  // Shows this Monday's brief if one's due (the Today card's line). True when
  // it's on its way. It shows on the next tick, once the tap that asked for it
  // is done.
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
      // Something opened meanwhile keeps the screen; the line stays on the
      // Today card for later.
      if (ed.anyPopupOpen()) return;
      try { localStorage.setItem(MONDAY_BRIEF_SHOWN_KEY, brief.today); } catch (e) { /* ignore */ }
      renderMondayBrief(brief);
      // Read now, so its line leaves the Today card.
      ed.renderTodayCard();
    });
    return true;
  }

  function renderMondayBrief({ label, week }) {
    document.getElementById('mondayBriefTitle').textContent = label;
    const body = document.getElementById('mondayBriefBody');
    body.innerHTML = '';
    // Alternating bars.
    let headingCount = 0;
    const sectionHeading = (text) => {
      const h3 = document.createElement('h3');
      h3.className = `shoot-mode-section-heading ${headingCount++ % 2 ? 'heading-navy' : 'heading-yellow'}`;
      h3.textContent = text;
      return h3;
    };
    const shoots = week ? week.shoots : [];

    if (week) {
      body.appendChild(sectionHeading('Last week'));
      const card = document.createElement('div');
      card.className = 'card log-card monday-brief-log';
      card.innerHTML = ed.logShootRowsHtml(week);
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

  // Left for somewhere else (a shoot, the Pending reflections list).
  function leaveMondayBrief() {
    document.getElementById('mondayBriefOverlay').hidden = true;
  }

  // OK and the X: done reading. No backdrop dismiss, like the other notices.
  ['mondayBriefOkBtn', 'mondayBriefCloseBtn'].forEach(id => {
    document.getElementById(id).addEventListener('click', leaveMondayBrief);
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
    // "opens": it may be a new day, with new things for the Today card.
    if (!document.documentElement.classList.contains('booting')) ed.renderTodayCard();
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
  // What opens first. Introductions first: on a genuinely first run this is
  // the welcome step. Then Shoot mode, if it's still switched on (you're
  // mid-shoot and want the working view), else the Overview's tip the first
  // time. Nothing else opens on its own: what needs you is on the Today card.
  function launchPopups() {
    ed.maybeShowPhotographerPrompt();
    if (!document.getElementById('photographerModalOverlay').hidden) return;
    if (!ed.resumeShootModeIfActive()) ed.showTabIntro('overview');
  }
  // Inside Documenting Fictions, the first visit's cards come before all of
  // these; they follow once the cards (and the tour, if taken) are done
  // (setupNotebook).
  if (!(window.DF_SUITE && window.DF_SUITE.firstVisit)) launchPopups();
};
