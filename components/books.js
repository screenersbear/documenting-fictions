// The four notebooks on the shelf: where each one lives, where it keeps its
// colour, the mark on its cover, the line about it under the shelf, and the
// tabs on its fore-edge. (Loaded before app.js.)
(function () {
  'use strict';
  // The marks (DESIGN.md 7), drawn in the cover's partner colour (--p) with
  // paper or white.
  const P = 'style="fill:var(--p)"';
  const MARKS = {
    ref: `<rect width="12" height="12" ${P}/><rect x="12" width="12" height="12" fill="#FFFFFF"/><rect y="12" width="12" height="12" fill="#FFFFFF"/><rect x="12" y="12" width="12" height="12" ${P}/>`,
    eye: '<circle cx="12" cy="12" r="10.25" fill="none" stroke-width="3.5" style="stroke:var(--p)"/><circle cx="12" cy="12" r="4" fill="#FAFAF7"/>',
    layouts: `<rect x="1" y="4" width="6.5" height="16" ${P}/><rect x="8.75" y="6.4" width="6.5" height="13.6" fill="#FAFAF7"/><rect x="16.5" y="8.6" width="6.5" height="11.4" ${P}/>`,
    overthoughts: `<circle cx="12" cy="6.5" r="5.5" fill="#FAFAF7"/><circle cx="12" cy="17.5" r="5.5" fill="#FAFAF7"/><circle cx="6.5" cy="12" r="5.5" fill="#FAFAF7"/><circle cx="17.5" cy="12" r="5.5" fill="#FAFAF7"/><circle cx="12" cy="12" r="2.6" ${P}/>`,
  };
  // colors: the ones its Options sheet offers, its own first.
  // tabs: [label, top %, height %, width (of W), depth (of T), light?, where it opens]
  window.ShelfBooks = [
    {
      id: 'ref', name: 'ref, do something', short: 'Ref', line: 'Tag photos, build mood boards', key: 'ref-notebook-book', color: 'ocean',
      colors: ['ocean', 'orange', 'mango', 'berry', 'fern', 'ink'], mark: MARKS.ref,
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
      id: 'contact-sheet', name: 'Contact Sheet', short: 'Contact Sheet', line: 'Lay out carousels and Stories', key: 'contact-sheet-book', color: 'orange',
      colors: ['orange', 'mango', 'berry', 'fern', 'ocean', 'ink'], mark: MARKS.layouts,
      block: (c) => `contact-sheet/art/${c}-block.webp`,
      tabs: [['Table of contents', 5.7, 26, .085, .2, true, 'contents'], ['New chapter', 32.5, 20, .09, -.2, false, 'new']],
    },
    {
      id: 'overthoughts', name: 'Overthoughts', short: 'Overthoughts', line: 'Think things over', key: 'overthoughts-book', color: 'leaf',
      colors: ['leaf', 'orange', 'mango', 'berry', 'fern', 'ocean', 'ink'], mark: MARKS.overthoughts,
      block: (c) => `overthoughts/art/${c}-block.webp`,
      tabs: [['Entries', 5.7, 17.7, .11, .2, true, 'entries'], ['Reviews', 24.4, 17.7, .115, -.2, false, 'reviews']],
    },
  ];
})();
