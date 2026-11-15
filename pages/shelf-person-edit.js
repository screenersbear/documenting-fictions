// Changing a person from their page (round 2, connect/08, the ... button):
// their name, Instagram and TikTok, for every notebook. The list of people
// takes it at once; Rounds and The Eye take it into their own copies the
// next time they open (their old name and handles still find the person).
// (Loaded before app.js.)
window.ShelfParts = window.ShelfParts || {};
window.ShelfParts.addPersonEdit = function addPersonEdit(ed) {
  'use strict';
  Object.assign(ed, { editPerson });
  const CLOSE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const field = (key, label, value, hint) => `<label class="opt-label" for="personEdit-${key}">${label}</label>
    <input class="person-input" id="personEdit-${key}" name="${key}" value="${esc(value)}" autocomplete="off" autocapitalize="${key === 'name' ? 'words' : 'none'}" spellcheck="false"${hint ? ` placeholder="${hint}"` : ''}>`;

  // after: run once it's saved (the page draws again).
  function editPerson(person, after) {
    const dim = document.createElement('div');
    dim.className = 'sheet-dim';
    dim.innerHTML = `<form class="sheet person-edit" role="dialog" aria-modal="true" aria-label="Edit ${esc(person.name)}">
      <div class="sheet-head"><h2>Edit</h2><button type="button" class="ring-btn" data-close aria-label="Close"><span>${CLOSE}</span></button></div>
      ${field('name', 'Name', person.name)}${field('instagram', 'Instagram', person.instagram, '@handle')}${field('tiktok', 'TikTok', person.tiktok, '@handle')}
      <p class="opt-note">Changes them in all four notebooks.</p>
      <button type="submit" class="sheet-btn primary">Save</button>
    </form>`;
    document.body.appendChild(dim);
    requestAnimationFrame(() => dim.classList.add('in'));
    const close = () => { dim.classList.remove('in'); setTimeout(() => dim.remove(), 220); };
    const form = dim.firstElementChild;
    dim.addEventListener('click', (e) => { if (e.target === dim || e.target.closest('[data-close]')) close(); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(form));
      if (!f.name.trim() && !f.instagram.trim() && !f.tiktok.trim()) { form.querySelector('input').focus(); return; }
      await window.DFData.editPerson(person.id, f);
      close();
      await after();
    });
    return dim;
  }
};
