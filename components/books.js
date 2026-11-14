// The four notebooks on the shelf: where each one lives, where it keeps its
// colour, the mark on its cover, the line about it under the shelf, and the
// tabs on its fore-edge. Rounds took Overthoughts' place on 14 Nov (Starky):
// Overthoughts' folder and saved data are kept, it's only off the shelf.
// (Loaded before app.js.)
(function () {
  'use strict';
  // The marks (DESIGN.md 7), drawn in the cover's partner colour (--p) with
  // paper or white.
  const P = 'style="fill:var(--p)"';
  const MARKS = {
    ref: `<rect width="12" height="12" ${P}/><rect x="12" width="12" height="12" fill="#FFFFFF"/><rect y="12" width="12" height="12" fill="#FFFFFF"/><rect x="12" y="12" width="12" height="12" ${P}/>`,
    eye: '<circle cx="12" cy="12" r="10.25" fill="none" stroke-width="3.5" style="stroke:var(--p)"/><circle cx="12" cy="12" r="4" fill="#FAFAF7"/>',
    layouts: `<rect x="1" y="4" width="6.5" height="16" ${P}/><rect x="8.75" y="6.4" width="6.5" height="13.6" fill="#FAFAF7"/><rect x="16.5" y="8.6" width="6.5" height="11.4" ${P}/>`,
    // Rounds: an arc with three stops (its own colours on the cover, see inks).
    rounds: '<path d="M2 20 A10 10 0 0 1 22 20" fill="none" stroke-width="2.6" style="stroke:var(--p)"/><circle cx="3.6" cy="14.2" r="2.6" style="fill:var(--s, #FFD100)"/><circle cx="12" cy="10" r="2" fill="#FFFFFF"/><circle cx="20.4" cy="14.2" r="1.5" style="fill:var(--s, #FFD100)"/>',
  };
  // colors: the ones its Options sheet offers, its own first.
  // tabs: [label, top %, height %, width (of W), depth (of T), light?, where it opens]
  // inks (Rounds only): on these covers, what's drawn on it (p) and the arc's
  // stops (s), in place of the cover's own partner colour. Rounds' teal cover
  // has an ink arc and name with mango stops (rounds/NOTES.md, deliberate).
  window.ShelfBooks = [
    {
      id: 'ref', name: 'ref, do something', short: 'Ref', line: 'Tag photos, build mood boards', key: 'ref-notebook-book', color: 'ocean',
      colors: ['ocean', 'orange', 'mango', 'berry', 'fern', 'leaf', 'ink'], mark: MARKS.ref,
      block: (c) => `ref/art/${c}-block.webp`,
      tabs: [['Mood boards', 5.7, 17.7, .11, .2, true, 'boards'], ['Tags', 24.4, 17.7, .115, -.2, false, 'tags']],
    },
    {
      id: 'the-eye', name: 'The Eye', short: 'The Eye', line: 'Plan and run your shoots', key: 'df-app-color', color: 'mango',
      colors: ['mango', 'orange', 'berry', 'fern', 'ocean', 'leaf', 'ink'], mark: MARKS.eye,
      block: (c) => `the-eye/art/df-${c}-block.webp`,
      tabs: [['Overview', 4.4, 18.2, .1, .3, true, 'overview'], ['Shoots', 23.3, 18.2, .105, .15, false, 'shoots'], ['Reflections', 42.2, 18.2, .11, 0, true, 'journal'], ['Archive', 61.5, 18.2, .115, -.15, false, 'archive'], ['Stats', 80.4, 18.2, .12, -.3, true, 'stats']],
    },
    {
      id: 'contact-sheet', name: 'Layouts', short: 'Layouts', line: 'Lay out carousels and Stories', key: 'contact-sheet-book', color: 'berry',
      colors: ['berry', 'orange', 'mango', 'fern', 'ocean', 'leaf', 'ink'], mark: MARKS.layouts,
      block: (c) => `contact-sheet/art/${c}-block.webp`,
      tabs: [['All layouts', 5.7, 26, .085, .2, true, 'contents'], ['New layout', 32.5, 20, .09, -.2, false, 'new']],
    },
    {
      id: 'rounds', name: 'Rounds', short: 'Rounds', line: 'Stay in touch, find more work', key: 'rounds-book', color: 'leaf',
      colors: ['leaf', 'orange', 'mango', 'berry', 'fern', 'ocean', 'ink'], mark: MARKS.rounds,
      inks: { leaf: { p: '#313D45' }, orange: { s: '#FFFFFF' }, mango: { s: '#FFFFFF' }, fern: { s: '#FFFFFF' }, ink: { s: '#14BFA0' } },
      block: (c) => `rounds/art/${c}-block.webp`,
      tabs: [['Today', 5.7, 17.7, .11, .2, true, 'today'], ['People', 24.4, 17.7, .115, 0, false, 'people'], ['Messages', 43.1, 17.7, .12, -.2, true, 'messages']],
    },
  ];
})();
