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
  // Options (round 5): a disc in the front notebook's colour, three dots in
  // its partner colour shrinking left to right.
  ed.optionsBtn.className = 'opts-disc';
  ed.optionsBtn.innerHTML = '<i></i><i></i><i></i>';
  let shown = '';
  // Called on every frame of a turn (pages/shelf-turntable.js render), so it
  // only writes when the book in front (or its colour) changes.
  ed.caption = function caption() {
    const at = ed.mod(Math.round(ed.pos));
    const b = ed.BOOKS[at], k = ed.colorOf(b), c = ed.COLORS[k];
    if (`${at} ${k}` === shown) return;
    shown = `${at} ${k}`;
    ed.optionsBtn.style.setProperty('--disc', c.band);
    ed.optionsBtn.style.setProperty('--dots', ed.partnerOf(b, k));
    name.textContent = b.short;
    line.textContent = b.line;
    [...dots.children].forEach((d, i) => d.classList.toggle('on', i === at));
    ed.optionsBtn.setAttribute('aria-label', `Options for ${b.short}`);
  };
};
