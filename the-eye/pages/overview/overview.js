// The Overview tab (home): its buttons and counters.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addOverview = function addOverview(ed) {
  Object.assign(ed, { lockBodyScroll, unlockBodyScroll, scrollPageTo, anyPopupOpen, openStatBoxDetail, refreshOpenStatBoxDetail, closeStatBoxDetail });
  // ---------- Overview (home) ----------

  const STAT_BOX_FILTERS = {
    // Photo shoots in Editing, plus every video step after Captured and
    // before Delivered (Rough cut, Client review, Revisions): video has no
    // separate selects stage, so its whole edit lives in this one tile.
    editing: s => !s.archived && ed.isInTheEditStatus(s.status),
    // Only shoots still being planned or waiting to shoot. Prospects are too
    // early for anyone to have a team or mood board started, and a shoot
    // that's captured, in selects/editing, delivered, postponed or canceled
    // is past needing either — it used to sneak into this count (and list)
    // through an unfinalized team alone, under a title that says "mood
    // boards pending".
    pending: s => !s.archived && (s.status === 'planning' || s.status === 'waiting_to_shoot') && ed.shootPendingLabels(s).length > 0,
    // Captured or later with no reflection written yet — the same shoots
    // whose rows say "Pending: Reflection" and that the daily report
    // reminds about (archived ones aren't counted, as with the other tiles).
    reflections: s => !s.archived && ed.isPostCaptureStatus(s.status)
      && !ed.hasText(s.whatWentRight) && !ed.hasText(s.couldBeBetter) && !ed.hasText(s.lessonsLearned),
  }; ed.STAT_BOX_FILTERS = STAT_BOX_FILTERS;

  const STAT_BOX_TITLES = {
    pending: 'Teams + mood boards pending',
    editing: 'In the edit',
    reflections: 'Pending reflections',
  }; ed.STAT_BOX_TITLES = STAT_BOX_TITLES;

  // Tracks which stat box's list is showing so closeShootModal can re-apply
  // the same filter — the popup stacks UNDER the shoot modal rather than
  // closing when a row's shoot is opened (see .stat-box-detail-overlay's
  // z-index comment), so without this a shoot you just completed from here
  // stayed listed until you closed and reopened the popup by hand.
  ed.activeStatBoxKey = null;

  // Reference-counted rather than a single on/off flag — the stat box detail
  // popup and the shoot modal can be open at once (a shoot opened from a stat
  // box list stacks on top rather than closing it first, see the z-index
  // comment above), so the second lock must not stomp the first one's saved
  // scroll position, and the page should only actually unlock once both are
  // closed again.
  ed.bodyScrollLockY = 0;
  ed.bodyScrollLockCount = 0;
  ed.onPageLetGo = null; // the notebook's nudge (nudgeShortScreen), for once no popup holds the page
  function lockBodyScroll() {
    if (ed.bodyScrollLockCount === 0) {
      ed.bodyScrollLockY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${ed.bodyScrollLockY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
    }
    ed.bodyScrollLockCount++;
  }
  function unlockBodyScroll() {
    ed.bodyScrollLockCount = Math.max(0, ed.bodyScrollLockCount - 1);
    if (ed.bodyScrollLockCount === 0) {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      window.scrollTo(0, ed.bodyScrollLockY);
      if (ed.onPageLetGo) setTimeout(ed.onPageLetGo, 80);
    }
  }

  // Scrolls the page — or, while a popup holds it locked, sets where it
  // will be once the popup closes (a tab switched under a popup, as "Done
  // shooting" does, opens at the top rather than at the old tab's place).
  function scrollPageTo(y) {
    if (ed.bodyScrollLockCount > 0) {
      ed.bodyScrollLockY = y;
      document.body.style.top = `-${y}px`;
    } else {
      window.scrollTo(0, y);
    }
  }

  // Every popup holds the page still: while any popup layer is showing, the
  // page underneath is locked (the lock above, taken once for all of them),
  // so dragging on a popup — App options, say — can't scroll the screen
  // below it. It watches each layer's `hidden` attribute rather than every
  // open/close function, so any popup built as one of these layers is
  // covered. (The stat box/project popups and the shoot page also take the
  // lock themselves; the count above keeps that from doubling up.)
  const POPUP_LAYER_SELECTOR = '.modal-overlay, .stat-box-detail-overlay, .stats-detail-overlay, .image-viewer-overlay';
  const popupLayers = [...document.querySelectorAll(POPUP_LAYER_SELECTOR)]; ed.popupLayers = popupLayers;
  let popupScrollLocked = false;

  function anyPopupOpen() {
    return popupLayers.some(layer => !layer.hidden);
  }

  // Slow work that has no popup up while it runs: a backup being gathered,
  // a PDF being built or sitting in the share sheet, a restore being
  // written. A new version is never swapped in meanwhile (see
  // updateCanReloadNow): its reload would drop the work halfway, share
  // sheet, "Backup saved" and all, without a word. A count, not a flag, since
  // two can overlap (a backup still gathering while a PDF builds).
  ed.busyTasks = 0;

  function syncPopupScrollLock() {
    const open = anyPopupOpen();
    if (open === popupScrollLocked) return;
    popupScrollLocked = open;
    if (open) {
      lockBodyScroll();
    } else {
      unlockBodyScroll();
    }
  }

  const popupLayerObserver = new MutationObserver(syncPopupScrollLock);
  popupLayers.forEach(layer => popupLayerObserver.observe(layer, { attributes: true, attributeFilter: ['hidden'] }));

  // Split out from openStatBoxDetail so a later refresh (see closeShootModal)
  // can repaint just the list, without replaying the open animation or
  // re-locking scroll on a popup that's already open.
  function renderStatBoxDetailList(filterFn) {
    const shoots = ed.state.shoots.filter(filterFn)
      .sort((a, b) => ed.dateTimeSortKey(a).localeCompare(ed.dateTimeSortKey(b)));
    // One compact box per project, matching the tile's own count (see
    // renderOverview), placed where its earliest listed day would sit.
    const items = ed.collapseProjects(shoots);
    const list = document.getElementById('statBoxDetailList');
    list.innerHTML = '';
    items.forEach(item => ed.renderCompactListItem(list, item));
    document.getElementById('statBoxDetailEmpty').hidden = items.length > 0;
  }

  function openStatBoxDetail(filterFn, title, key) {
    ed.activeStatBoxKey = key;
    document.getElementById('statBoxDetailTitle').textContent = title;
    renderStatBoxDetailList(filterFn);
    const overlay = document.getElementById('statBoxDetailOverlay');
    overlay.hidden = false;
    lockBodyScroll();
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('open')));
  }

  // The stat box popup stacks UNDER the shoot modal rather than closing when
  // a row's shoot is opened (see .stat-box-detail-overlay's z-index comment),
  // so every path that can close the shoot modal — save, delete (both the
  // in-modal button and the options-menu one), complete, unarchive — needs
  // to call this or a shoot that just stopped matching the active filter
  // (mood board checked off, deleted, completed…) sits there stale until
  // the popup itself is closed and reopened by hand.
  function refreshOpenStatBoxDetail() {
    if (ed.activeStatBoxKey && !document.getElementById('statBoxDetailOverlay').hidden) {
      renderStatBoxDetailList(STAT_BOX_FILTERS[ed.activeStatBoxKey]);
    }
  }

  function closeStatBoxDetail() {
    ed.activeStatBoxKey = null;
    const overlay = document.getElementById('statBoxDetailOverlay');
    overlay.classList.remove('open');
    unlockBodyScroll();
    setTimeout(() => { overlay.hidden = true; }, 200);
  }

  document.getElementById('statBoxDetailCloseBtn').addEventListener('click', closeStatBoxDetail);
  document.getElementById('statBoxDetailOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeStatBoxDetail();
  });
};
