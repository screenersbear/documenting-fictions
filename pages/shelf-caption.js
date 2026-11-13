// Under the shelf: the name of the notebook in front, a line about it, a dot
// for each notebook (the one in front long), and Options for it. Changed as
// the shelf turns. (Loaded before app.js.)
window.ShelfParts = window.ShelfParts || {};
window.ShelfParts.addCaption = function addCaption(ed) {
  'use strict';
  const name = document.getElementById('frontName');
  const line = document.getElementById('frontLine');
  const dots = document.getElementById('frontDots');
  dots.innerHTML = ed.BOOKS.map(() => '<span></span>').join('');
  ed.optionsBtn.innerHTML = '<span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></span>';
  let shown = -1;
  // Called on every frame of a turn (pages/shelf-turntable.js render), so it
  // only writes when the book in front changes.
  ed.caption = function caption() {
    const at = ed.mod(Math.round(ed.pos));
    if (at === shown) return;
    shown = at;
    const b = ed.BOOKS[at];
    name.textContent = b.short;
    line.textContent = b.line;
    [...dots.children].forEach((d, i) => d.classList.toggle('on', i === at));
    ed.optionsBtn.setAttribute('aria-label', `Options for ${b.short}`);
  };
};
