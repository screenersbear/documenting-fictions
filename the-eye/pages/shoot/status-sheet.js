// Change status, from the status tag on a shoot's page: the statuses its
// status field offers (video has its own edit steps), the one it's at
// marked. Picking one is the same as picking it in that field, so the form
// saves and asks what comes next (deadline-prompt.js) as it always has.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootStatusSheet = function addShootStatusSheet(ed) {
  const overlay = document.getElementById('shootStatusSheetOverlay');
  const list = document.getElementById('shootStatusSheetList');
  const select = document.getElementById('shootStatus');
  const close = () => { overlay.hidden = true; };

  document.getElementById('shootStatusTag').addEventListener('click', () => {
    list.innerHTML = [...select.options].map(o => `
      <button type="button" class="options-item choice-item${o.value === select.value ? ' active' : ''}" data-status="${ed.escapeHtml(o.value)}"${o.value === select.value ? ' aria-current="true"' : ''}>${ed.escapeHtml(o.textContent)}</button>`).join('');
    overlay.hidden = false;
  });
  list.addEventListener('click', (e) => {
    const pick = e.target.closest('[data-status]');
    if (!pick) return;
    close();
    if (pick.dataset.status !== select.value) ed.setShootStatusOnPage(pick.dataset.status);
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.getElementById('shootStatusSheetCancelBtn').addEventListener('click', close);
};
