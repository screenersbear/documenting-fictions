// The line icons Rounds uses (DESIGN.md 8: 24 x 24, 2px strokes, round ends).
const line = (d, size = 18) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

export const BOOKS = line('<rect x="3" y="5" width="4.5" height="14" rx="1"/><rect x="9.5" y="3" width="4.5" height="16" rx="1"/><path d="M16 6.2l3.6-1 3 12.6-3.6 1z"/>', 19);
export const MENU = line('<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>');
export const BACK = line('<polyline points="15 5 8 12 15 19"/>');
export const MORE = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/></svg>';
export const PLUS = line('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', 16);
export const ARROW = line('<path d="M4 12h14"/><polyline points="13 6 19 12 13 18"/>', 16);
export const CHEV = line('<polyline points="9 5 16 12 9 19"/>', 16).replace('<svg', '<svg class="chev"');
export const CHEV_SMALL = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg>';
