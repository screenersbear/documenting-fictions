// The sums for turning sections as a plain slide (Starky, 14 Nov; DESIGN.md
// 9.4): which section is that way, where the pages sit under the finger, and
// whether letting go goes on or comes back. No page, so it's unit tested
// (tests/unit/the-eye/slide-steps.test.mjs); components/section-slide.js
// does the sliding.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addSlideSteps = function addSlideSteps(ed) {
  // The page settles in 240ms on the shelf's curve, no bounce; with Reduce
  // Motion on, a 150ms crossfade instead.
  ed.SLIDE = { ms: 240, ease: 'cubic-bezier(.4, 0, .2, 1)', fadeMs: 150 };
  Object.assign(ed, { slideTarget, slideOffset, slideCommits });

  // order: the sections, in order; at: the one showing; dir: on (above 0) or
  // back (below 0). The section that way, or null past either end.
  function slideTarget(order, at, dir) {
    const i = order.indexOf(at);
    if (i < 0 || !dir) return null;
    return order[i + Math.sign(dir)] || null;
  }

  // Where the pages sit with the finger dx from where it started: only
  // toward the section that's there (dir 1 is on, the finger going left),
  // and never past a whole page (width).
  function slideOffset(dx, dir, width) {
    return dir > 0 ? Math.max(-width, Math.min(0, dx)) : Math.min(width, Math.max(0, dx));
  }

  // Letting go: on to the next section once the finger has taken the page
  // far enough (60px, or 15% of a narrow page) or flicked it that way
  // (speed in px/ms); a flick back the other way brings it back.
  function slideCommits(dx, dir, width, speed = 0) {
    if (dx * dir >= 0) return false;
    if (speed * dir > 0) return false;
    return Math.abs(dx) > Math.min(60, width * 0.15) || Math.abs(speed) > 0.35;
  }
};
