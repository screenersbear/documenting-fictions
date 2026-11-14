// The marks at the shelf's right edge (round 2): one for each way the books
// can stand, the one in use long, so the swipe up or down can be found. After
// a swipe its name shows beside them for a moment. (Loaded before app.js.)
window.ShelfParts = window.ShelfParts || {};
window.ShelfParts.addShapeMarks = function addShapeMarks(ed) {
  'use strict';
  const NAMES = { ring: 'Ring', dominoes: 'Dominoes', row: 'Row', spread: 'Spread' };
  const marks = document.createElement('div');
  marks.className = 'shape-marks';
  marks.setAttribute('role', 'img');
  marks.innerHTML = ed.LAYOUTS.map(() => '<i></i>').join('');
  const name = document.createElement('span');
  name.className = 'shape-name';
  name.setAttribute('aria-live', 'polite');
  ed.shelf.append(marks, name);
  let hide = 0;
  // say: a swipe just changed it, so its name shows for 1.5 s.
  ed.shapeMarks = function shapeMarks(say) {
    const at = ed.LAYOUTS.indexOf(ed.layout);
    [...marks.children].forEach((m, i) => m.classList.toggle('on', i === at));
    marks.setAttribute('aria-label', `Arrangement: ${NAMES[ed.layout].toLowerCase()}, ${at + 1} of ${ed.LAYOUTS.length}`);
    if (!say) return;
    name.textContent = NAMES[ed.layout];
    name.classList.add('in');
    clearTimeout(hide);
    hide = setTimeout(() => name.classList.remove('in'), 1500);
  };
  ed.shapeMarks(false);
};
