// The band on top of Today, People and Messages (DESIGN.md 9.1): the title
// in mango, its two ring buttons (the notebooks button, only in the suite,
// and Options), Rounds' mark (an arc with three stops: a mango arc, teal and
// white stops, cut by the band's foot), and the label line: where you are,
// a hairline, today's date. And the short band on a person's page (9.3).
import { esc } from './util.js';
import { BOOKS, MENU, BACK, MORE } from './icons.js';

const ring = (label, attr, svg) => `<button type="button" class="ring-btn" ${attr} aria-label="${label}"><span>${svg}</span></button>`;
const MARK = '<svg class="band-mark" viewBox="0 0 80 40" aria-hidden="true"><path d="M8 40 A32 32 0 0 1 72 40" fill="none" stroke="#FFD100" stroke-width="6"/><circle cx="12.3" cy="24" r="7" fill="#14BFA0"/><circle cx="40" cy="8" r="5.5" fill="#FFFFFF"/><circle cx="67.7" cy="24" r="4" fill="#14BFA0"/></svg>';

// SAT 14 NOV (the capitals are the band's).
export const bandDate = (d = new Date()) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');

// title: the band's big word; place: the label line's.
export function bandHtml({ title, place }) {
  return `
    <header class="band">
      <h1 class="band-title">${esc(title)}</h1>
      <div class="band-btns">${ring('Back to your notebooks', 'data-books', BOOKS)}${ring('Options', 'data-app-menu', MENU)}</div>
      ${MARK}
      <p class="band-line"><b>${esc(place)}</b><span class="band-rule"></span><span class="band-date">${bandDate()}</span></p>
    </header>`;
}

// The short band: back (a link), the place on the hairline, the ... menu.
export function shortBandHtml({ place, back, more }) {
  return `
    <header class="band band-short">
      <a class="ring-btn" href="${back}" aria-label="Back"><span>${BACK}</span></a>
      <p class="band-line"><b>${esc(place)}</b><span class="band-rule"></span></p>
      ${ring(more, 'data-band-more', MORE)}
    </header>`;
}
