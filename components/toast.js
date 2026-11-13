// The toast: a word at the foot of the screen, with one thing to do about it.
// (Loaded before app.js.)
window.ShelfParts = window.ShelfParts || {};
window.ShelfParts.addToast = function addToast(ed) {
  'use strict';
  Object.assign(ed, { toast });
  // A word at the foot of the screen, with one thing to do about it.
  function toast(text, label, run) {
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<span></span>${label ? '<button type="button"></button>' : ''}`;
    t.firstChild.textContent = text;
    if (label) {
      const btn = t.querySelector('button');
      btn.textContent = label;
      btn.addEventListener('click', () => { t.remove(); run(); });
    }
    document.body.append(t);
    requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 250); }, 4000);
  }
};
