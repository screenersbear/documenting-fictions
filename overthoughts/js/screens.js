// The two sections, each one scrolling page: Entries and Reviews. (The weekly
// log stays in The Eye, its Weekly tab.)
import { ICONS } from './icons.js';
import { esc } from './util.js';
import {
  allEntries, hasWords, entryTitle, oneLine, hasText, byNewest, dayOf, monthKey, monthName, MONTHS,
} from './store.js';

// Inside Documenting Fictions the first page has the menu (Options) on its left.
const head = (title, plus, menu) => `<h1 class="head${plus || menu ? ' head-add' : ''}">${menu && window.DF_SUITE ? `<button type="button" class="head-plus head-menu" data-app-menu aria-label="Menu">${ICONS.menu}</button>` : ''}${esc(title)}${plus ? `<a class="head-plus" href="#/new" aria-label="Write an entry">${ICONS.plus}</a>` : ''}</h1>`;
const note = (t) => `<p class="note">${esc(t)}</p>`;

// ---------- Entries ----------
function entryRow(e) {
  const d = dayOf(e.date);
  const meta = hasText(e.takeaway) ? oneLine(e.takeaway) : oneLine(e.body).slice(0, 90);
  return `<a class="row entry-row" href="#/entry/${encodeURIComponent(e.id)}">
    <span class="row-open">
      <span class="day"><b>${d.getDate()}</b><small>${MONTHS[d.getMonth()].slice(0, 3)}</small></span>
      <span class="row-text">
        <span class="row-name">${esc(entryTitle(e))}</span>
        <span class="row-meta">${esc(meta)}</span>
      </span>
    </span>
  </a>`;
}

export async function entriesScreen(view) {
  const shown = (await allEntries()).filter(hasWords).sort(byNewest);
  let html = '';
  let month = '';
  shown.forEach((e) => {
    const m = monthKey(e.date);
    if (m !== month) { month = m; html += `<h2 class="month">${esc(monthName(m))}</h2>`; }
    html += entryRow(e);
  });
  const empty = 'Nothing here yet. Tap + to write your first entry.';
  view.innerHTML = `<div class="screen">
    ${head('Entries', true, true)}
    <div class="scroll"><div class="rows">${html || note(empty)}</div></div>
  </div>`;
}

// ---------- Reviews ----------
// Month by month, the takeaways from your entries, gathered by themselves.
// Nothing to write and no yearly review (the user, 11-12): a month shows up
// once one of its entries has a takeaway.
export function periodOf(id) {
  const m = /^month-(\d{4})-(\d{2})$/.exec(id);
  return m ? { id, period: 'month', key: `${m[1]}-${m[2]}`, title: monthName(`${m[1]}-${m[2]}`), within: (d) => monthKey(d) === `${m[1]}-${m[2]}` } : null;
}
export function gather(entries, p) {
  return entries.filter((e) => e.date && p.within(e.date) && hasText(e.takeaway)).sort((a, b) => a.date.localeCompare(b.date));
}

export async function reviewsScreen(view) {
  const entries = (await allEntries()).filter((e) => e.date && hasText(e.takeaway));
  const months = [...new Set(entries.map((e) => monthKey(e.date)))].sort().reverse();
  const row = (k) => {
    const n = entries.filter((e) => monthKey(e.date) === k).length;
    return `<a class="row" href="#/review/month-${k}"><span class="row-open"><span class="row-text">
      <span class="row-name">${esc(monthName(k))}</span>
      <span class="row-meta">${n} takeaway${n === 1 ? '' : 's'}</span>
    </span></span></a>`;
  };
  view.innerHTML = `<div class="screen">
    ${head('Reviews')}
    <div class="scroll"><div class="rows">${months.map(row).join('') || note('The takeaways from your entries gather here, month by month.')}</div></div>
  </div>`;
}

export const SECTIONS = [entriesScreen, reviewsScreen];
