// The three sections, each one scrolling page: Entries, Weekly log, Reviews.
import { ICONS } from './icons.js';
import { esc } from './util.js';
import {
  allEntries, allReviews, hasWords, entryTitle, oneLine, hasText, byNewest, prettyDay, dayOf,
  monthKey, monthName, weekOf, weekLabel, POST_CAPTURE, MONTHS,
} from './store.js';

const head = (title, plus) => `<h1 class="head${plus ? ' head-add' : ''}">${esc(title)}${plus ? `<a class="head-plus" href="#/new" aria-label="Write an entry">${ICONS.plus}</a>` : ''}</h1>`;
const note = (t) => `<p class="note">${esc(t)}</p>`;

// ---------- Entries ----------
const FILTERS = [['all', 'All'], ['free', 'Entries'], ['reflection', 'Reflections']];
let filter = 'all';

function entryRow(e) {
  const d = dayOf(e.date);
  const meta = hasText(e.takeaway) ? oneLine(e.takeaway)
    : e.kind === 'reflection' ? 'Shoot reflection'
    : (e.tags || []).length ? e.tags.join(', ') : oneLine(e.body).slice(0, 90);
  return `<a class="row entry-row" href="#/entry/${encodeURIComponent(e.id)}">
    <span class="row-open">
      <span class="day"><b>${d.getDate()}</b><small>${MONTHS[d.getMonth()].slice(0, 3)}</small></span>
      <span class="row-text">
        <span class="row-name">${e.kind === 'reflection' ? `<i class="kind">${ICONS.eye}</i>` : ''}${esc(entryTitle(e))}</span>
        <span class="row-meta">${esc(meta)}</span>
      </span>
    </span>
  </a>`;
}

export async function entriesScreen(view) {
  const all = (await allEntries()).filter(hasWords).sort(byNewest);
  const shown = all.filter((e) => filter === 'all' || e.kind === filter);
  let html = '';
  let month = '';
  shown.forEach((e) => {
    const m = monthKey(e.date);
    if (m !== month) { month = m; html += `<h2 class="month">${esc(monthName(m))}</h2>`; }
    html += entryRow(e);
  });
  const empty = !all.length ? 'Nothing here yet. Tap + to write your first entry, or reflect on a shoot in The Eye.'
    : filter === 'free' ? 'No entries of your own yet. Tap + to write one.'
    : 'No shoot reflections yet. They come in from The Eye once a shoot is reflected on.';
  view.innerHTML = `<div class="screen">
    ${head('Entries', true)}
    <div class="chips" role="tablist">${FILTERS.map(([k, n]) => `<button type="button" class="chip${k === filter ? ' on' : ''}" data-filter="${k}" role="tab" aria-selected="${k === filter}">${n}</button>`).join('')}</div>
    <div class="scroll"><div class="rows">${html || note(empty)}</div></div>
  </div>`;
  view.querySelector('.chips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-filter]');
    if (!b || b.dataset.filter === filter) return;
    filter = b.dataset.filter;
    entriesScreen(view).then(() => view.querySelector('.screen')?.classList.add('still'));
  });
}

// ---------- Weekly log ----------
// Each week's shoots (once they've been shot) and their takeaways, newest
// week first, the way The Eye's Journal kept it. Only the takeaway shows here;
// tapping it opens the whole reflection.
export async function weekScreen(view) {
  const entries = await allEntries();
  const weeks = new Map();
  const add = (e, kind) => {
    const w = weekOf(e.date);
    if (!weeks.has(w.key)) weeks.set(w.key, { ...w, shoots: [], mine: [] });
    weeks.get(w.key)[kind].push(e);
  };
  entries.forEach((e) => {
    if (e.kind === 'reflection' && e.date && (POST_CAPTURE.includes(e.shootStatus) || hasWords(e))) add(e, 'shoots');
    else if (e.kind === 'free' && hasText(e.takeaway)) add(e, 'mine');
  });
  const list = [...weeks.values()].sort((a, b) => b.key.localeCompare(a.key));
  const take = (e, name) => `<a class="take" href="#/entry/${encodeURIComponent(e.id)}">
      <span class="take-name">${esc(name)}<small>${esc(prettyDay(e.date))}</small></span>
      ${hasText(e.takeaway) ? `<span class="take-text">${esc(oneLine(e.takeaway))}</span>` : '<span class="take-text dim">No takeaway yet</span>'}
    </a>`;
  const html = list.map((w) => `<section class="week">
      <h2 class="month">${esc(weekLabel(w.start, w.end))}</h2>
      ${w.shoots.sort((a, b) => a.date.localeCompare(b.date)).map((e) => take(e, e.shootName || 'Untitled shoot')).join('')}
      ${w.mine.sort((a, b) => a.date.localeCompare(b.date)).map((e) => take(e, entryTitle(e))).join('')}
    </section>`).join('');
  view.innerHTML = `<div class="screen">
    ${head('Weekly log')}
    <div class="scroll">${html || note('No weekly log yet. It fills in on its own once a shoot is marked captured in The Eye.')}</div>
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
  const inside = entries.filter((e) => e.date && p.within(e.date));
  const shoots = inside.filter((e) => e.kind === 'reflection' && (POST_CAPTURE.includes(e.shootStatus) || hasWords(e))).sort((a, b) => a.date.localeCompare(b.date));
  const reflected = shoots.filter(hasWords);
  const mine = inside.filter((e) => e.kind === 'free' && hasWords(e)).sort((a, b) => a.date.localeCompare(b.date));
  const takeaways = [...shoots, ...mine].filter((e) => hasText(e.takeaway)).length;
  return { shoots, reflected, mine, takeaways };
}
export const countLine = (g) => [
  `${g.shoots.length} shoot${g.shoots.length === 1 ? '' : 's'}`,
  `${g.reflected.length} reflected on`,
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
  entries.forEach((e) => { if (e.kind === 'free' ? hasWords(e) : (POST_CAPTURE.includes(e.shootStatus) || hasWords(e))) { months.add(monthKey(e.date)); years.add(e.date.slice(0, 4)); } });
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

export const SECTIONS = [entriesScreen, weekScreen, reviewsScreen];
