// References: the list of links.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootReferences = function addShootReferences(ed) {
  Object.assign(ed, { renderReferences });
  // ---------- References (dynamic list of external links) ----------
  ed.currentReferences = [];

  function renderReferences() {
    const container = document.getElementById('referencesList');
    container.innerHTML = ed.currentReferences.map((url, idx) => `
      <div class="reference-row">
        <input type="text" class="reference-input" data-idx="${idx}" value="${ed.escapeHtml(url)}" placeholder="https://…" />
        <button type="button" class="reference-open" data-idx="${idx}" aria-label="Open link">&#8599;</button>
        <button type="button" class="delete-reference" data-idx="${idx}"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
      </div>
    `).join('');

    container.querySelectorAll('.reference-input').forEach(input => {
      input.addEventListener('input', () => {
        ed.currentReferences[Number(input.dataset.idx)] = input.value;
      });
    });
    container.querySelectorAll('.reference-open').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = (ed.currentReferences[Number(btn.dataset.idx)] || '').trim();
        if (!url) return;
        window.open(/^https?:\/\//i.test(url) ? url : `https://${url}`, '_blank', 'noopener');
      });
    });
    container.querySelectorAll('.delete-reference').forEach(btn => {
      btn.addEventListener('click', () => {
        ed.currentReferences.splice(Number(btn.dataset.idx), 1);
        renderReferences();
        ed.scheduleShootAutosave();
      });
    });
    ed.syncAllShootFormFields();
  }

  document.getElementById('addReferenceBtn').addEventListener('click', () => {
    ed.currentReferences.push('');
    renderReferences();
    ed.scheduleShootAutosave();
  });
};
