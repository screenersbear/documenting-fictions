// Line icons on a 24 x 24 grid, in the current text color.
const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const ICONS = {
  back: svg('<path d="M14.5 5l-7 7 7 7"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  trash: svg('<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>'),
  // The three sections: a page being written on, a week, a look back.
  entries: svg('<path d="M6 3.5h12v17H6z"/><path d="M9 8h6M9 11.5h6M9 15h3.5"/>'),
  week: svg('<rect x="3.5" y="5" width="17" height="15.5" rx="1.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4M7.5 13.5h2M11 13.5h2M14.5 13.5h2M7.5 17h2"/>'),
  reviews: svg('<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v3.2h3.2"/><path d="M12 8.2V12l2.6 1.6"/>'),
  eye: svg('<path d="M18 3.5H9.2a3 3 0 0 0-3 3v4.6M6 20.5h8.8a3 3 0 0 0 3-3v-4.6M8.7 6.6l6.6 10.8"/>'),
  photo: svg('<rect x="3.5" y="5" width="17" height="14" rx="1.5"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17.5l5-4.5 3.5 3 3-2.5 4.5 4"/>'),
  bulb: svg('<path d="M9 17.5h6M10 20.5h4M12 3.5a5.5 5.5 0 0 0-3.2 10c.5.4.7 1 .7 1.6v.4h5v-.4c0-.6.2-1.2.7-1.6A5.5 5.5 0 0 0 12 3.5z"/>'),
};
