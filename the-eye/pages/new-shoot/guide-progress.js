// Shoot progress in the new-shoot guide's Basics (round 5,
// 11-guide-basics-progress): Prospect, Active planning, Shoot ready or
// Captured, so a shoot already done can start as Captured. Picking one sets
// the status field, as picking it there would, but the guide carries on:
// no follow-up questions (the reflection comes when the guide's done, from
// the page). Shown only while the shoot is at one of the four; the later
// stages are on the shoot page's status card.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addGuideProgress = function addGuideProgress(ed) {
  Object.assign(ed, { drawGuideProgress });
  const box = document.getElementById('guideProgress');
  const select = document.getElementById('shootStatus');
  const chips = [...box.querySelectorAll('[data-progress]')];

  // On entering Basics, and after a pick.
  function drawGuideProgress() {
    chips.forEach(b => b.setAttribute('aria-checked', String(b.dataset.progress === select.value)));
    box.hidden = !chips.some(b => b.dataset.progress === select.value);
  }

  box.addEventListener('click', (e) => {
    const pick = e.target.closest('[data-progress]');
    if (!pick || pick.dataset.progress === select.value) return;
    // The status field's change listener asks what comes next only when the
    // status it remembers differs; remembered first, it asks nothing. It
    // still does the rest (and the form saves).
    ed.previousStatusValue = pick.dataset.progress;
    select.value = pick.dataset.progress;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    // Its reflection shows on the page, as when a captured shoot opens.
    document.getElementById('postShootContent').hidden = !ed.isPostCaptureStatus(select.value);
    ed.updateShootModalJumpMenuVisibility();
    ed.updateStatusSwatchDisplay();
    drawGuideProgress();
  });
};
