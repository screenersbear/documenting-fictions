// The bars at the bottom: their height and spacing.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addBottomBar = function addBottomBar(ed) {
  // ---------- fixed bottom bar spacing ----------
  function updateTabbarHeightVar() {
    const tabbar = document.querySelector('.tabbar');
    document.documentElement.style.setProperty('--tabbar-height', tabbar.offsetHeight + 'px');
  }
  updateTabbarHeightVar();
  window.addEventListener('resize', updateTabbarHeightVar);

  // iOS Safari has a known quirk where position:fixed elements (like the
  // bottom tab bar) can visually drift or leave a stale frame on screen
  // after the on-screen keyboard or Safari's own collapsing toolbar resizes
  // the visual viewport, since that resize doesn't always trigger a full
  // reflow. Re-running the tabbar height recalculation on every
  // visualViewport change forces exactly that reflow as a lightweight fix.
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateTabbarHeightVar);
    window.visualViewport.addEventListener('scroll', updateTabbarHeightVar);
  }

  // iOS 26+ on the home screen (WebKit bug 297779): after the keyboard closes,
  // the layer fixed elements hang off can stay shifted, so the bottom bar
  // floats a keyboard's height up the screen and wanders as the page scrolls.
  // Nothing in the page can un-stick it, so the bar is moved back down by the
  // amount the viewport numbers say it's off.
  //
  // Those numbers can also be stale on their own (offsetTop stuck with a short
  // height, while nothing is really shifted), and acting on those would push
  // the bar off the screen. So this only believes readings a healthy phone
  // can't give: the visible area reaching past the bottom of the page's
  // viewport, or a home-screen viewport a keyboard shorter than it was with no
  // keyboard up. Readings while typing, zoomed or mid-close don't count.
  function setupTabbarDriftFix() {
    const vv = window.visualViewport;
    if (!vv) return;
    const tabbar = document.querySelector('.tabbar');
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    const START_AT = 100; // a keyboard-sized gap, not a status bar's
    const KEYBOARD_CLOSE_MS = 450;
    const tallestAtWidth = {}; // rotating changes the height, so kept per width
    let applied = 0;
    let confirmTimer = 0;
    let ignoreUntil = 0;
    let lastScrollAt = 0;

    function isTyping() {
      const el = document.activeElement;
      return !!el && el.matches('textarea, [contenteditable], input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="button"]):not([type="submit"])');
    }

    let driftIsOffset = false;
    let appliedShift = 0;

    function measureDrift() {
      if (vv.scale > 1.01 || isTyping() || ed.isTurned()) return 0;
      const height = window.innerHeight;
      const pastBottom = vv.offsetTop + vv.height - height;
      let shortBy = 0;
      if (navigator.standalone === true || standaloneQuery.matches) {
        const width = window.innerWidth;
        tallestAtWidth[width] = Math.max(tallestAtWidth[width] || 0, height);
        shortBy = tallestAtWidth[width] - height;
      }
      const drift = Math.max(pastBottom, shortBy);
      driftIsOffset = pastBottom >= shortBy;
      // Once correcting, follow it all the way back to nothing: it can shrink
      // gradually as the page scrolls.
      return drift >= (applied ? 2 : START_AT) ? Math.round(drift) : 0;
    }

    function applyDrift(drift) {
      // When the whole view has slid down, the full-page layers (the book, a
      // shoot, the page frame) slide with it, or they'd leave a gap at the top.
      const shift = drift && driftIsOffset ? Math.round(vv.offsetTop) : 0;
      if (shift !== appliedShift) {
        appliedShift = shift;
        if (shift) document.documentElement.style.setProperty('--layer-shift', shift + 'px');
        else document.documentElement.style.removeProperty('--layer-shift');
      }
      if (drift === applied) return;
      applied = drift;
      if (drift) document.documentElement.style.setProperty('--bar-drift', drift + 'px');
      else document.documentElement.style.removeProperty('--bar-drift');
    }

    function sync() {
      if (performance.now() < ignoreUntil) return;
      const drift = measureDrift();
      if (drift && !applied) {
        // A first sighting has to last, so one odd frame can't throw the bar.
        if (!confirmTimer) {
          confirmTimer = setTimeout(() => {
            confirmTimer = 0;
            applyDrift(measureDrift());
          }, 150);
        }
        return;
      }
      applyDrift(drift);
    }

    // A one-pixel scroll and back can make iOS recalculate, which clears the
    // bug properly rather than compensating for it. Not while a popup has the
    // page locked, or mid-swipe, where jumping back would stop the scroll.
    function nudgeIfStuck() {
      if (!measureDrift()) return;
      if (document.body.style.position === 'fixed') return;
      if (performance.now() - lastScrollAt < 200) return;
      const y = window.scrollY;
      window.scrollTo(0, y > 0 ? y - 1 : y + 1);
      setTimeout(() => window.scrollTo(0, y), 40);
    }

    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    window.addEventListener('scroll', () => {
      lastScrollAt = performance.now();
      sync();
    }, { passive: true });
    window.addEventListener('pageshow', sync);
    document.addEventListener('visibilitychange', sync);
    document.addEventListener('focusin', sync);
    document.addEventListener('focusout', () => {
      ignoreUntil = performance.now() + KEYBOARD_CLOSE_MS;
      setTimeout(() => {
        if (performance.now() < ignoreUntil) return; // a later field took over
        sync();
        nudgeIfStuck();
      }, KEYBOARD_CLOSE_MS + 10);
    });
    sync();
  }
  setupTabbarDriftFix();
};
