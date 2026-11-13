// The notebook on a short screen: the nudge that gets iOS to measure again.
// (Loaded before app.js; the file it belongs to runs it.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addBookNudge = function addBookNudge(ed, notebook) {
    // Short, iOS draws nothing pinned below its bottom edge (white included),
    // so the navigator sits above it, but the page's own list still scrolls
    // through the strip under it (user, 11-12). As in Callback, Contact Sheet
    // and Ref, iOS is made to measure again: for a moment the page is taller
    // than the screen and scrolled a pixel and back, up to three times while
    // it's short. On launch, coming back, a popup letting go of the page, and
    // a touch now and then. Never while typing or while a popup holds the
    // page, and it waits out a swipe or a jump to a saved place.
    let nudgeRestUntil = 0; // after a round that didn't take, touches leave it be this long
    let nudgeWaitTimer = 0;
    // Installed, the navigator and the sun show once iOS has its height right
    // (:root.settled in styles/new-shoot-guide-type.css), so they never show high and then drop.
    const settle = () => document.documentElement.classList.add('settled');
    if (!document.documentElement.classList.contains('nb-installed')) settle();
    else setTimeout(settle, 3500); // whatever happens, they show
    function nudgeShortScreen(tries = 3) {
      if (notebook.nudging || !tries || !ed.screenShortHeight) return;
      const field = document.activeElement;
      if (field && field.matches('input, textarea, select, [contenteditable]')) return;
      if (document.body.style.position === 'fixed') return; // the popup's unlock calls back (onPageLetGo)
      // Timers, not animation frames: those stop while the app is put away.
      clearTimeout(nudgeWaitTimer);
      if (performance.now() - ed.lastScrollAt < 250) {
        nudgeWaitTimer = setTimeout(() => nudgeShortScreen(tries), 300);
        return;
      }
      notebook.nudging = true;
      const root = document.documentElement;
      root.classList.add('nb-nudge');
      // The page grows by 160px however long it already is. A long page only
      // given a min-height didn't change at all, so iOS never measured again
      // and the navigator stayed high (user, 11-12).
      const grow = document.createElement('div');
      grow.setAttribute('aria-hidden', 'true');
      grow.style.cssText = 'height: 160px; pointer-events: none;';
      document.body.appendChild(grow);
      setTimeout(() => {
        const y = window.scrollY;
        // Toward the side with room: at the foot of a long page there's none below.
        const to = y > 0 ? y - 1 : y + 1;
        window.scrollTo(0, to);
        setTimeout(() => {
          // Back, unless something else has moved the page since.
          if (Math.abs(window.scrollY - to) < 1.5) window.scrollTo(0, y);
          setTimeout(() => {
            root.classList.remove('nb-nudge');
            grow.remove();
            setTimeout(() => {
              notebook.nudging = false;
              notebook.settleScreenGap();
              if (!ed.screenShortHeight) settle();
              else if (tries > 1) nudgeShortScreen(tries - 1);
              else holdScreen();
            }, 200);
          }, 120);
        }, 40);
      }, 30);
    }
    // Still short after the nudges: as in Ref, iOS can fall short again the
    // moment the page can't scroll, so it's left a pixel taller than the
    // screen (:root.nb-hold), if that's what keeps it right.
    function holdScreen() {
      const root = document.documentElement;
      notebook.nudging = true;
      root.classList.add('nb-hold');
      setTimeout(() => {
        const y = window.scrollY;
        const to = y > 0 ? y - 1 : y + 1;
        window.scrollTo(0, to);
        setTimeout(() => {
          if (Math.abs(window.scrollY - to) < 1.5) window.scrollTo(0, y);
          setTimeout(() => {
            notebook.nudging = false;
            notebook.settleScreenGap();
            if (ed.screenShortHeight) {
              root.classList.remove('nb-hold');
              nudgeRestUntil = performance.now() + 5000;
            }
            settle();
          }, 200);
        }, 60);
      }, 40);
    }
    const settleAndNudge = () => {
      notebook.settleScreenGap();
      if (!ed.screenShortHeight) { settle(); return; }
      // Short again (coming back): out of sight while it's put right, and
      // back in sight soon whatever happens (a nudge can wait on a popup).
      if (!notebook.nudging) {
        document.documentElement.classList.remove('settled');
        setTimeout(settle, 2500);
      }
      nudgeShortScreen();
    };
    ed.onPageLetGo = settleAndNudge;
    // A launching app can report its height late, and a reading skipped for
    // the keyboard is due once it's gone.
    [300, 1200].forEach(ms => setTimeout(settleAndNudge, ms));
    // iOS can also put its own bottom right later with no resize event (once
    // the shut book lets go of the page, say). A gap kept from before would
    // then push the navigator off the screen, so the probes are watched. If
    // it ever goes back and forth, it stops following for a few seconds.
    if (window.ResizeObserver) {
      let moves = [];
      let calmTimer = 0;
      const follow = new ResizeObserver(() => {
        const now = performance.now();
        moves = moves.filter(t => now - t < 4000);
        if (moves.length >= 4) {
          clearTimeout(calmTimer);
          calmTimer = setTimeout(notebook.settleScreenGap, 4100);
          return;
        }
        if (notebook.settleScreenGap()) moves.push(now);
      });
      follow.observe(ed.layoutBoxProbe);
      follow.observe(ed.smallHeightProbe);
    }
    document.addEventListener('focusout', () => setTimeout(notebook.settleScreenGap, 460));
    window.addEventListener('pageshow', settleAndNudge);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) settleAndNudge(); });
    // More chances to notice iOS putting its layout right unannounced: the
    // end of a zoom, and now and then as you use it (three reads of hidden
    // probes, nothing at all when they haven't changed).
    if (window.visualViewport) window.visualViewport.addEventListener('resize', () => setTimeout(notebook.settleScreenGap, 120));
    let lastTouchCheck = 0;
    document.addEventListener('touchend', () => {
      const now = performance.now();
      if (now - lastTouchCheck < 1000) return;
      lastTouchCheck = now;
      setTimeout(() => {
        notebook.settleScreenGap();
        if (performance.now() > nudgeRestUntil) nudgeShortScreen();
      }, 60);
    }, { passive: true });
};
