// The two sections, each one scrolling page: Entries and Reviews. (The weekly
// log stays in The Eye, its Weekly tab.)
import { ICONS } from './icons.js';
import { esc } from './util.js';
import {
  allEntries, allReviews, hasWords, entryTitle, oneLine, hasText, byNewest, dayOf, monthKey, monthName, MONTHS,
} from './store.js';

const head = (title, plus) => `<h1 class="head${plus ? ' head-add' : ''}">${esc(title)}${plus ? `<a class="head-plus" href="#/new" aria-label="Write an entry">${ICONS.plus}</a>` : ''}</h1>`;
const note = (t) => `<p class="note">${esc(t)}</p>`;

// ---------- Entries ----------
function entryRow(e) {
  const d = dayOf(e.date);
  const meta = hasText(e.takeaway) ? oneLine(e.takeaway)
    : (e.tags || []).length ? e.tags.join(', ') : oneLine(e.body).slice(0, 90);
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
    ${head('Entries', true)}
    <div class="scroll"><div class="rows">${html || note(empty)}</div></div>
  </div>`;
}

// ---------- Reviews ----------
// A review for every month (and year) with something in it, this month's
// always there to write, gathered by itself from that month's takeaways.
export function periodOf(id) {
  const m = /^month-(\d{4})-(\d{2})$/.exec(id), y = /^year-(\d{4})$/.exec(id);
  if (m) return { id, period: 'month', key: `${m[1]}-${m[2]}`, title: monthName(`${m[1]}-${m[2]}`), within: (d) => monthKey(d) === `${m[1]}-${m[2]}` };
  if (y) return { id, period: 'year', key: y[1], title: y[1], within: (d) => String(d || '').slice(0, 4) === y[1] };
  return null;
}
export function gather(entries, p) {
  const mine = entries.filter((e) => e.date && p.within(e.date) && hasWords(e)).sort((a, b) => a.date.localeCompare(b.date));
  const takeaways = mine.filter((e) => hasText(e.takeaway)).length;
  return { mine, takeaways };
}
export const countLine = (g) => [
  `${g.mine.length} entr${g.mine.length === 1 ? 'y' : 'ies'}`,
  `${g.takeaways} takeaway${g.takeaways === 1 ? '' : 's'}`,
].join(' · ');

export async function reviewsScreen(view) {
  const entries = (await allEntries()).filter((e) => e.date);
  const written = new Map((await allReviews()).map((r) => [r.id, hasText(r.summary)]));
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const months = new Set([thisMonth]);
  const years = new Set([String(now.getFullYear())]);
  entries.forEach((e) => { if (hasWords(e)) { months.add(monthKey(e.date)); years.add(e.date.slice(0, 4)); } });
  written.forEach((w, id) => { const p = periodOf(id); if (p && w) (p.period === 'month' ? months : years).add(p.key); });
  const row = (id) => {
    const p = periodOf(id);
    const g = gather(entries, p);
    const said = written.get(id) ? 'Written' : 'Not written yet';
    return `<a class="row" href="#/review/${id}"><span class="row-open"><span class="row-text">
      <span class="row-name">${esc(p.title)}</span>
      <span class="row-meta">${esc(`${g.takeaways} takeaway${g.takeaways === 1 ? '' : 's'} · ${said}`)}</span>
    </span></span></a>`;
  };
  view.innerHTML = `<div class="screen">
    ${head('Reviews')}
    <div class="scroll"><div class="rows">
      <h2 class="month">Months</h2>
      ${[...months].sort().reverse().map((k) => row(`month-${k}`)).join('')}
      <h2 class="month">Years</h2>
      ${[...years].sort().reverse().map((k) => row(`year-${k}`)).join('')}
    </div></div>
  </div>`;
}

export const SECTIONS = [entriesScreen, reviewsScreen];
