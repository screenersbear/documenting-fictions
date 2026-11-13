// The toast: a line at the foot of the screen.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addToast = function addToast(ed) {
  Object.assign(ed, { showToast, showNoticeToast, showUndoToast, fitButtonPair });
  // ---------- Toast ----------
  let toastTimer = null;
  // True while an Undo toast (showUndoToast) is up. A notice the app raises
  // by itself rather than in answer to a tap — the storage-full warning, a
  // day of a multi-day project going its own way — waits in heldNotices
  // meanwhile (showNoticeToast) instead of wiping out the Undo button, and
  // shows once the toast is free. A toast for something the user just did
  // still replaces it, as before.
  let undoToastLive = false;
  let heldNotices = [];

  function showToast(message, ms = 3200) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.hidden = false;
    undoToastLive = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, ms);
  }

  function hideToast() {
    document.getElementById('toast').hidden = true;
    undoToastLive = false;
    showHeldNotice();
  }

  // `stillTrue`, if given, is asked again before a held notice shows: an
  // Undo can make it untrue meanwhile (see announceDayDetached).
  function showNoticeToast(message, ms, stillTrue) {
    if (undoToastLive) {
      heldNotices = heldNotices.filter(n => n.message !== message);
      heldNotices.push({ message, ms, stillTrue });
      return;
    }
    showToast(message, ms);
  }

  function showHeldNotice() {
    while (heldNotices.length) {
      const next = heldNotices.shift();
      if (next.stillTrue && !next.stillTrue()) continue;
      showToast(next.message, next.ms);
      return;
    }
  }

  // "Shot removed · Undo": for quick removals that don't ask first (a shot,
  // a lighting setup, a team member) — one tap within a few seconds puts it
  // back. `onUndo` restores whatever was removed.
  function showUndoToast(message, onUndo) {
    const toast = document.getElementById('toast');
    toast.textContent = message + ' ';
    const undo = document.createElement('button');
    undo.type = 'button';
    undo.className = 'toast-undo-btn';
    undo.textContent = 'Undo';
    undo.addEventListener('click', () => {
      clearTimeout(toastTimer);
      toast.hidden = true;
      undoToastLive = false;
      onUndo();
      // Whatever was held back shows now, after the undo has had its say
      // (unless the undo itself put up a toast — then once that's gone).
      if (toast.hidden) showHeldNotice();
    });
    toast.appendChild(undo);
    toast.hidden = false;
    undoToastLive = true;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 5000);
  }

  // Two buttons side by side while both labels fit their half; stacked full
  // width (the action on top, see .modal-actions-stacked) when one doesn't —
  // the labels never wrap (.fit-pair), so one that's too long widens its
  // button, which is what this measures. Call it once the row is showing.
  function fitButtonPair(row) {
    row.classList.remove('modal-actions-stacked');
    const rowWidth = row.getBoundingClientRect().width;
    if (!rowWidth) return;
    const half = (rowWidth - (parseFloat(getComputedStyle(row).columnGap) || 0)) / 2;
    const widths = [...row.querySelectorAll('button')].filter(b => !b.hidden).map(b => b.getBoundingClientRect().width);
    if (Math.max(0, ...widths) > half + 3) row.classList.add('modal-actions-stacked');
  }
};
