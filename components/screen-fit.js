// Fits the shelf to the iPhone's screen when it's installed on the home screen.
// (Loaded before app.js.)
window.ShelfParts = window.ShelfParts || {};
window.ShelfParts.addScreenFit = function addScreenFit(ed) {
  'use strict';
  // ---------- iPhone home-screen app ----------
  // Right after it opens, iOS 26 can leave the screen about a status bar
  // short at the bottom, and it draws nothing pinned below that edge: the
  // film roll then sat that much higher than the bar's icon in the notebooks.
  // Put right the notebooks' way (ref/components/screen-fit.js): iOS is made to measure again
  // by making the page a moment taller and scrolling a pixel and back. If it
  // stays short, the bar comes down by that much less instead. The bar waits
  // unseen until then (html.settled), so it never shows high and drops.
  let probe = null;
  // How far short of the screen's real bottom iOS has its bottom edge, in px (0 when it's right).
  function screenGap() {
    if (!probe) {
      probe = document.createElement('div');
      probe.setAttribute('aria-hidden', 'true');
      probe.style.cssText = 'position: fixed; left: 0; bottom: 0; width: 1px; height: 0; visibility: hidden; pointer-events: none; padding-top: env(safe-area-inset-top);';
      document.body.appendChild(probe);
    }
    const portrait = Math.abs(window.innerWidth - screen.width) < 2;
    const real = portrait ? screen.height : screen.width;
    ed.root.style.setProperty('--screen-h', `${Math.round(real)}px`);
    const under = parseFloat(getComputedStyle(probe).paddingTop) > 0;
    const gap = Math.round(real - probe.getBoundingClientRect().bottom);
    // Drawn under the status bar, the page's top is the screen's top, so any
    // gap is missing screen. Below it, one bar's height is normal and twice
    // that means a bar's height is missing.
    if (under) return gap > 8 && gap < 120 ? gap : 0;
    return gap > 76 && gap < 150 ? Math.round(gap / 2) : 0;
  }
  const pause = (ms) => new Promise((r) => setTimeout(r, ms)); // timers: animation frames stop while the app is put away
  let nudging = false;
  async function fitScreen() {
    if (nudging) return;
    nudging = true;
    if (screenGap()) ed.root.classList.remove('settled'); // short again (coming back): out of sight while it's put right
    for (let i = 0; i < 3 && screenGap(); i++) {
      ed.root.classList.add('ios-nudge');
      await pause(30);
      const y = window.scrollY;
      window.scrollTo(0, y + 1);
      await pause(40);
      window.scrollTo(0, y);
      await pause(120);
      ed.root.classList.remove('ios-nudge');
      await pause(200);
    }
    let gap = screenGap();
    // iOS can fall short again the moment the page can't scroll. If so, it's
    // left scrollable: the shelf is pinned, so nothing moves, and the
    // touchmove below keeps a finger from scrolling it.
    if (gap > 0) {
      ed.root.classList.add('ios-hold');
      await pause(40);
      window.scrollTo(0, 1);
      await pause(60);
      window.scrollTo(0, 0);
      await pause(200);
      gap = screenGap();
      if (gap > 0) ed.root.classList.remove('ios-hold');
    }
    ed.root.classList.toggle('is-short', gap > 0);
    if (gap > 0) ed.root.style.setProperty('--short-by', `${gap}px`);
    else ed.root.style.removeProperty('--short-by');
    nudging = false;
    ed.size();
    ed.render();
    ed.root.classList.add('settled');
  }
  if (!ed.iPhoneApp) ed.root.classList.add('settled');
  else setTimeout(() => ed.root.classList.add('settled'), 3500); // whatever happens, it shows
  if (ed.iPhoneApp) {
    let soonTimer = 0; // load, pageshow and coming back can all land together
    const soon = (ms) => { clearTimeout(soonTimer); soonTimer = setTimeout(fitScreen, ms); };
    window.addEventListener('load', () => soon(120));
    window.addEventListener('pageshow', () => soon(80));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) soon(80); });
    window.addEventListener('orientationchange', () => soon(300));
    document.addEventListener('touchmove', (e) => {
      if (!ed.root.classList.contains('ios-hold') || e.touches.length > 1) return;
      for (let el = e.target; el && el !== document.body; el = el.parentElement) {
        const st = getComputedStyle(el);
        if (/auto|scroll/.test(st.overflowY) && el.scrollHeight > el.clientHeight) return;
        if (st.touchAction === 'none') return;
      }
      e.preventDefault();
    }, { passive: false });
  }
};
