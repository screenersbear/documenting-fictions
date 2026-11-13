// Working offline: the service worker, and new versions.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addOffline = function addOffline(ed) {
  // ---------- service worker (offline caching) ----------
  // Skipped inside a native wrapper (Capacitor injects window.Capacitor) —
  // a native build already bundles every file locally, so the service
  // worker's own caching layer is redundant there and can conflict with how
  // the native shell serves local assets. No-op today since window.Capacitor
  // doesn't exist in a plain browser/PWA context.
  if (!window.Capacitor && 'serviceWorker' in navigator) {
    // Without an eager check, an installed (Add to Home Screen) PWA can sit
    // on a stale service worker far longer than "close and reopen the app"
    // would suggest — WKWebView doesn't reliably check for a new sw.js on
    // its own timeline. So every launch checks, and so does every return to
    // the app, since an iOS home-screen app is usually resumed rather than
    // relaunched.
    //
    // A new version then installs in the background and waits: swapping it
    // in means reloading the page, and this used to reload the instant it
    // arrived — a few seconds into a session, closing whatever was open. It
    // now swaps in only while nobody's using the app: at launch, while the
    // page is still hidden (html.booting) and nothing's been shown, or once
    // the app's in the background with no popup, shoot page or toast (an
    // Undo might still be wanted) up. So a fresh deploy still shows by the
    // next launch at the latest; on a good signal the launch itself already
    // gets the new files straight from the network (see sw.js).
    const UPDATE_RELOAD_AT_KEY = 'df_update_reload_at';
    const UPDATE_RELOAD_TAB_KEY = 'df_update_reload_tab';
    // The rest of what was showing: how far down, and the Archive, Journal
    // and Stats filters. A key of its own beside the tab's, so an update
    // from a version that only saved the tab still brings the tab back.
    const UPDATE_RELOAD_VIEW_KEY = 'df_update_reload_view';
    let updateSwapRequested = false; // this page asked a waiting version to take over
    let updateReloadPending = false; // it did, but the app was in use by then

    // "Still hidden" means really hidden: the CSS backstop shows the page
    // after 1.5s even if .booting is still on. Slow work with no popup up
    // (busyTasks: a backup, a PDF) counts as in use too.
    function updateCanReloadNow() {
      // The shut notebook isn't work in progress: it never holds an update back.
      const popupUp = ed.popupLayers.some(layer => !layer.hidden && layer.id !== 'bookOverlay');
      const placingSticker = !document.getElementById('stickerStage').hidden || !document.getElementById('stickerCrop').hidden;
      if (popupUp || placingSticker || !document.getElementById('toast').hidden || ed.busyTasks > 0) return false;
      if (document.hidden) return true;
      return document.documentElement.classList.contains('booting')
        && getComputedStyle(document.body).visibility === 'hidden';
    }

    function swapInWaitingVersion(registration) {
      if (!registration || !registration.waiting || !updateCanReloadNow()) return;
      updateSwapRequested = true;
      registration.waiting.postMessage('skipWaiting');
    }

    function reloadForUpdate() {
      updateReloadPending = false;
      // Never twice within a minute, so nothing can turn this into a loop.
      let lastAt = 0;
      try { lastAt = Number(sessionStorage.getItem(UPDATE_RELOAD_AT_KEY)) || 0; } catch (e) { /* ignore */ }
      if (Date.now() - lastAt < 60000) return;
      // IndexedDB runs requests in order, so this read only comes back once
      // every photo write already under way has landed — the reload can't
      // cut one off halfway.
      ed.idbGetImages('__update_reload__').catch(() => {}).then(() => {
        if (!updateCanReloadNow()) { updateReloadPending = true; return; }
        try {
          sessionStorage.setItem(UPDATE_RELOAD_AT_KEY, String(Date.now()));
          // Swapped in before the launch has put the last place back: the
          // new page launches as usual and puts it back from df_last_place.
          const placeStillToCome = ed.resumePlace && !ed.lastPlaceArmed;
          const activeTab = document.querySelector('.tabbar .tab.active');
          if (activeTab && !placeStillToCome) sessionStorage.setItem(UPDATE_RELOAD_TAB_KEY, activeTab.dataset.view);
          if (!placeStillToCome) {
            sessionStorage.setItem(UPDATE_RELOAD_VIEW_KEY, JSON.stringify({
              // While a popup holds the page still, window.scrollY is 0 and
              // the real place is the one the lock saved.
              scrollY: ed.bodyScrollLockCount > 0 ? ed.bodyScrollLockY : window.scrollY,
              archiveFilter: ed.archiveFilter,
              journalFilter: ed.journalFilter,
              statsYearFilter: ed.statsYearFilter,
              pages: ed.screenAt,
            }));
          }
        } catch (e) { /* ignore */ }
        // At launch, this page stays hidden until the new one replaces it.
        // reload() doesn't stop it, and on a slow answer it would show itself
        // first (the 600ms reveal, or styles/base.css's 1.5s backstop) only to be
        // wiped a moment later, launching twice. In the background nothing
        // shows anyway, so there it's left alone, in case iOS holds the reload
        // until the app's back. The timer is only a backstop for a reload that
        // never happens: sw.js answers this one within 2s.
        if (!document.hidden) {
          document.documentElement.classList.add('update-reloading');
          setTimeout(() => document.documentElement.classList.remove('update-reloading', 'booting'), 5000);
        }
        window.location.reload();
      });
    }

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // The very first install takes control too (clients.claim in sw.js),
      // and the page already is the current version then; so does a version
      // another tab swapped in. Only a swap this page asked for reloads it.
      if (!updateSwapRequested) return;
      updateSwapRequested = false;
      if (updateCanReloadNow()) reloadForUpdate();
      else updateReloadPending = true;
    });

    // Registered after the one that saves pending edits, so it runs second.
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        navigator.serviceWorker.getRegistration()
          .then(registration => registration && registration.update())
          .catch(() => {});
        return;
      }
      if (updateReloadPending) {
        if (updateCanReloadNow()) reloadForUpdate();
        return;
      }
      navigator.serviceWorker.getRegistration().then(swapInWaitingVersion).catch(() => {});
    });

    // A version that finished installing during an earlier session but never
    // got its turn (the app was in use every time it went to the background,
    // or a desktop tab was simply reloaded, which never swaps one in by
    // itself) goes in now, before anything's on screen.
    navigator.serviceWorker.getRegistration().then(swapInWaitingVersion).catch(() => {});

    // Also what starts a new version's install after a launch that came in
    // from the network: sw.js leaves it until now, once this page's own files
    // are kept aside for that install to reuse.
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then(registration => registration.update())
        .catch(() => {});
    });

    // After an update reload, back on the tab that was showing, with the
    // same filters, as far down as it was — the reload happened while you
    // were away, so nothing should look different. Saved by the version
    // before this one, so each value is checked before it's used.
    let tabAfterUpdate = null;
    let viewAfterUpdate = null;
    try {
      tabAfterUpdate = sessionStorage.getItem(UPDATE_RELOAD_TAB_KEY);
      sessionStorage.removeItem(UPDATE_RELOAD_TAB_KEY);
      const savedView = sessionStorage.getItem(UPDATE_RELOAD_VIEW_KEY);
      sessionStorage.removeItem(UPDATE_RELOAD_VIEW_KEY);
      viewAfterUpdate = savedView ? JSON.parse(savedView) : null;
    } catch (e) { /* ignore */ }
    if (viewAfterUpdate && typeof viewAfterUpdate === 'object') {
      const v = viewAfterUpdate;
      if (v.archiveFilter === 'all' || (ed.CATEGORY_FILTER_ORDER.includes(v.archiveFilter) && ed.isCategoryVisible(v.archiveFilter))) {
        ed.archiveFilter = v.archiveFilter;
      }
      if (ed.JOURNAL_FILTERS.some(f => f.key === v.journalFilter)) ed.journalFilter = v.journalFilter;
      if (typeof v.statsYearFilter === 'string' && /^(all|\d{4})$/.test(v.statsYearFilter)) ed.statsYearFilter = v.statsYearFilter;
    } else {
      viewAfterUpdate = null;
    }
    // Filters first, so the tab's own render draws them.
    const tabAfterUpdateBtn = tabAfterUpdate && document.querySelector(`.tabbar .tab[data-view="${tabAfterUpdate}"]`);
    if (tabAfterUpdateBtn && !tabAfterUpdateBtn.classList.contains('active')) tabAfterUpdateBtn.click();
    else if (viewAfterUpdate) ed.renderAll();
    // Back to the same page, once the photos and the map are in and the
    // screen has all its pages.
    if (viewAfterUpdate && viewAfterUpdate.pages) {
      Promise.all([ed.launchShown, Promise.resolve(ed.worldMapFetchPromise).catch(() => {})]).then(() => {
        Object.keys(ed.screenAt).forEach((key) => {
          if (Number.isInteger(viewAfterUpdate.pages[key])) ed.screenAt[key] = viewAfterUpdate.pages[key];
        });
        ed.drawScreenPage(ed.currentScreen());
      });
    }
    // The scroll waits for the launch to show the page: the photos are in by
    // then, so the list is at its full height. It runs straight after the
    // reveal, before anything's drawn, so the top of the page never shows
    // first; and it's instant (scrollPageTo), not smooth.
    const scrollAfterUpdate = viewAfterUpdate ? Number(viewAfterUpdate.scrollY) : 0;
    if (Number.isFinite(scrollAfterUpdate) && scrollAfterUpdate > 0) {
      ed.launchShown.then(() => ed.scrollPageTo(scrollAfterUpdate));
    }
  }

  // A relaunch (not an update reload) goes back to where you left off:
  // setupNotebook only sets resumePlace when the sun menu says so, the book
  // was left open and no update is being carried over. The section with its
  // filters, its pages once the photos and the map are in, then the shoot or
  // archived shoot that was open, at its page. An entry restored mid-write
  // keeps its Journal. Once that's done the place is followed again.
  (function resumeLastPlace() {
    const place = ed.resumePlace;
    const placeViews = [...document.querySelectorAll('.tabbar .tab')].map(tab => tab.dataset.view);
    let back = ed.launchShown;
    if (place) {
      if (place.archiveFilter === 'all' || (ed.CATEGORY_FILTER_ORDER.includes(place.archiveFilter) && ed.isCategoryVisible(place.archiveFilter))) ed.archiveFilter = place.archiveFilter;
      if (ed.JOURNAL_FILTERS.some(f => f.key === place.journalFilter)) ed.journalFilter = place.journalFilter;
      if (typeof place.statsYearFilter === 'string' && /^(all|\d{4})$/.test(place.statsYearFilter)) ed.statsYearFilter = place.statsYearFilter;
      const tab = placeViews.includes(place.view) && ed.journalModalOverlay.hidden && document.querySelector(`.tabbar .tab[data-view="${place.view}"]`);
      if (tab && !tab.classList.contains('active')) tab.click();
      else ed.renderAll();
      back = Promise.all([ed.launchShown, Promise.resolve(ed.worldMapFetchPromise).catch(() => {})]).then(() => {
        if (place.pages && typeof place.pages === 'object') {
          Object.keys(ed.screenAt).forEach((key) => {
            if (Number.isInteger(place.pages[key]) && place.pages[key] >= 0) ed.screenAt[key] = place.pages[key];
          });
          ed.drawScreenPage(ed.currentScreen());
        }
        const scrollY = Number(place.scrollY);
        if (Number.isFinite(scrollY) && scrollY > 0) ed.scrollPageTo(scrollY);
        const { shoot, archive } = place;
        const kept = id => typeof id === 'string' && ed.state.shoots.some(s => s.id === id);
        const clear = ed.shootModalOverlay.hidden && ed.archiveModeOverlay.hidden;
        if (clear && shoot && kept(shoot.id)) {
          const page = shoot.page;
          if (page && ed.SHOOT_MODAL_SECTIONS.some(sec => sec.id === page.id) && Number.isInteger(page.sub) && page.sub >= 0) {
            ed.shootPageMemory[shoot.id] = { id: page.id, sub: page.sub };
          }
          ed.openShootModal(shoot.id);
        } else if (clear && archive && kept(archive.id)) {
          ed.openArchiveMode(archive.id, Number.isInteger(archive.at) && archive.at > 0 ? archive.at : 0);
        }
      });
    }
    Promise.resolve(back).catch(() => {}).then(() => {
      // Shoot mode comes back on its own (resumeShootModeIfActive), whatever
      // the sun menu says; it comes back on the page you were on, too.
      const was = ed.readLastPlace();
      const mode = was && was.shootMode;
      if (mode && !ed.shootModeOverlay.hidden && mode.id === ed.getShootModeShootId() && Number.isInteger(mode.at) && mode.at > 0) {
        if (!ed.shootModeBoardIn) ed.shootModeWanted = mode.at;
        ed.breakShootModePages({ at: mode.at, force: true });
      }
      ed.lastPlaceArmed = true;
      ed.queueLastPlace();
    });
  })();
};
