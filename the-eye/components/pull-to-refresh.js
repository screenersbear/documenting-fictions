// Pull to refresh.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addPullToRefresh = function addPullToRefresh(ed) {
  // ---------- pull to refresh ----------
  (function setupPullToRefresh() {
    const indicator = document.getElementById('pullToRefreshIndicator');
    const THRESHOLD = 70;
    const MAX_PULL = 90;
    const HIDDEN_Y = -60;
    const MIN_VISIBLE_MS = 650;
    let startX = null;
    let startY = null;
    let pullDistance = 0;
    let active = false;
    let refreshing = false;

    function setTransform(y) {
      indicator.style.transform = `translateX(-50%) translateY(${y}px)`;
    }

    // Every popup layer, the photo viewer and Stats' slide-over included —
    // with one up the page is locked at scrollY 0 (see syncPopupScrollLock),
    // so the scrollY check alone would let a drag down in it refresh.
    function anyModalOpen() {
      return ed.anyPopupOpen();
    }

    document.addEventListener('touchstart', (e) => {
      // Pages don't scroll, so only a pull from the top of one refreshes.
      if (refreshing || window.scrollY > 0 || anyModalOpen() || e.touches.length !== 1 || e.touches[0].clientY > 170) {
        active = false;
        return;
      }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      active = true;
      pullDistance = 0;
      indicator.style.transition = 'none';
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!active || startY === null || refreshing) return;
      const dy = e.touches[0].clientY - startY;
      const dx = e.touches[0].clientX - startX;
      // Only a mostly-vertical drag counts as a pull — a diagonal or
      // horizontal one is the tab-swipe gesture's territory instead.
      if (dy <= 0 || window.scrollY > 0 || Math.abs(dx) > Math.abs(dy)) { pullDistance = 0; return; }
      pullDistance = Math.min(MAX_PULL, dy * 0.5);
      indicator.hidden = false;
      setTransform(HIDDEN_Y + pullDistance);
      if (e.cancelable) e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchend', () => {
      if (!active) return;
      active = false;
      indicator.style.transition = 'transform 0.2s ease';
      if (pullDistance >= THRESHOLD) {
        triggerRefresh();
      } else {
        setTransform(HIDDEN_Y);
        setTimeout(() => { if (!refreshing) indicator.hidden = true; }, 200);
      }
      pullDistance = 0;
    });

    // A real touchcancel (incoming call/notification, Control Center swipe,
    // app switch) should never trigger a refresh — just reset the visuals,
    // same as an under-threshold touchend. Without this, an interrupted
    // gesture could leave the indicator's inline transform/transition stuck.
    document.addEventListener('touchcancel', () => {
      if (!active) return;
      active = false;
      indicator.style.transition = 'transform 0.2s ease';
      setTransform(HIDDEN_Y);
      setTimeout(() => { if (!refreshing) indicator.hidden = true; }, 200);
      pullDistance = 0;
    });

    function triggerRefresh() {
      refreshing = true;
      setTransform(14);
      const minDelay = new Promise(resolve => setTimeout(resolve, MIN_VISIBLE_MS));
      const previousState = ed.state;
      ed.state = ed.loadState();
      // loadState() rebuilds every shoot from the saved blob, which has no
      // photos in it (they live in IndexedDB) — without this every thumbnail
      // went blank on a refresh and stayed that way until the app was
      // relaunched. Carrying them across means the repaint below already has
      // them; the re-read after is only a backstop for anything not in memory
      // yet (e.g. a pull while the launch-time read is still running).
      ed.carryPhotosOver(previousState, ed.state);
      ed.renderAll();
      ed.hydratePhotos().then(filled => { if (filled) ed.renderAll(); }).catch(() => {});
      minDelay.then(() => {
        refreshing = false;
        indicator.style.transition = 'transform 0.2s ease';
        setTransform(HIDDEN_Y);
        setTimeout(() => { indicator.hidden = true; }, 200);
      });
    }
  })();
};
