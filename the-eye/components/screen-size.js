// How tall the screen really is (the gap iOS leaves), measured at the start and on resize.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addScreenSize = function addScreenSize(ed) {
  Object.assign(ed, { measureScreenGap });
  // Installed on the home screen, iOS can lay the page out a status bar short
  // of the real screen (WebKit bug 254868): bottom:0 and 100svh stop that far
  // above the bottom, leaving a blank band. --screen-gap carries what bottom:0
  // is short by and --nb-h the screen's true height. Measured from what CSS
  // itself gets, only as an installed app, only upright. A keyboard-sized
  // reading is a different problem (see setupTabbarDriftFix) and is ignored.
  const SCREEN_GAP_MAX = 80;
  const layoutBoxProbe = document.createElement('div'); ed.layoutBoxProbe = layoutBoxProbe;
  layoutBoxProbe.style.cssText = 'position:fixed;top:0;bottom:0;left:0;width:0;visibility:hidden;pointer-events:none';
  const smallHeightProbe = document.createElement('div'); ed.smallHeightProbe = smallHeightProbe;
  smallHeightProbe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100svh;visibility:hidden;pointer-events:none';
  const statusBarProbe = document.createElement('div');
  statusBarProbe.id = 'nbStatusBarProbe';
  statusBarProbe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:env(safe-area-inset-top);visibility:hidden;pointer-events:none';
  document.body.append(layoutBoxProbe, smallHeightProbe, statusBarProbe);
  // Installed, the navigator hangs from the top at the screen's real bottom (see styles/notebook-popups.css).
  if (navigator.standalone === true || matchMedia('(display-mode: standalone)').matches) document.documentElement.classList.add('nb-installed');
  let screenGap = 0; ed.screenGap = screenGap;
  ed.screenShortHeight = 0;
  let screenLaidOut = 0;
  let screenGapUpright = null;
  const screenHeightNow = () => layoutBoxProbe.getBoundingClientRect().height + screenGap; ed.screenHeightNow = screenHeightNow;

  function measureScreenGap() {
    if (!(navigator.standalone === true || matchMedia('(display-mode: standalone)').matches)) return false;
    if (ed.isTurned()) return false; // turned back upright: the page is its own upright screen
    const upright = window.innerWidth < window.innerHeight;
    // A keyboard makes for odd readings, unless the phone has just been turned.
    const field = document.activeElement;
    if (upright === screenGapUpright && field && field.matches('input, textarea, select, [contenteditable]')) return false;
    if (window.visualViewport && window.visualViewport.scale > 1.01) return false;
    const full = Math.max(screen.width, screen.height);
    const hasStatusBar = upright && statusBarProbe.getBoundingClientRect().height > 0;
    const shortBy = (el) => full - el.getBoundingClientRect().height;
    const boxShort = shortBy(layoutBoxProbe);
    // (Only the page's own box: 100svh can be off on its own, see below.)
    if (upright && boxShort > SCREEN_GAP_MAX) return false;
    screenGapUpright = upright;
    // iOS draws nothing in the strip it's short by (on the iPhone the
    // navigator vanished in it), so everything stays above it: --nb-h is the
    // height iOS laid out, and .nb-short drops the room kept for the home bar,
    // which is that strip's height further down anyway.
    const shortHeight = hasStatusBar && boxShort >= 8 ? Math.round(full - boxShort) : 0;
    // Installed, everything is laid out from the height iOS laid the page out
    // at, never 100svh: on iOS 26 that can be a status bar short of the
    // screen even when the page isn't, which left the navigator that high with
    // the list showing under it (user's screenshot, 11-12).
    const laidOut = Math.round(layoutBoxProbe.getBoundingClientRect().height);
    if (shortHeight === ed.screenShortHeight && laidOut === screenLaidOut) return false;
    ed.screenShortHeight = shortHeight;
    screenLaidOut = laidOut;
    document.documentElement.classList.toggle('nb-short', !!shortHeight);
    document.documentElement.style.setProperty('--nb-h', `${laidOut}px`);
    return true;
  }
  measureScreenGap();
};
