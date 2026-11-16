// People (03-people; tightened 16 Nov, rounds/10): plain cards, a photo over
// the name with a tiny square in the colour and mark of their next move, and
// one dim line: the last thing done this past week, else when they're due
// (data/people-find.js). ADD SOMEONE beside the title. Under it a search box
// (a name, a handle, their note), filter chips (All, Due, Regulars, Clients,
// New, Prospects: one at a time) and SORT: A to Z (so no one sinks), Next
// move or Recently in touch, kept on this device. When two people look
// alike, one quiet line suggests MERGE (pages/merge-sheet.js), or waves the
// pair away for good. Anyone let go, at the end.
import { bandHtml } from '../components/band.js';
import { photoHtml, fillPhotos } from '../components/photo.js';
import { miniHtml } from '../components/marks.js';
import { esc, debounce } from '../components/util.js';
import { PLUS } from '../components/icons.js';
import { X_ICON } from '../components/sheet.js';
import { searchBoxHtml } from '../components/person-search.js';
import { listPeople, listMoves, getSetting, setSetting } from '../data/db.js';
import { getWeek } from '../data/moves.js';
import { dayOf } from '../data/dates.js';
import { FILTERS, SORTS, matches, inFilter, lastLines, sortPeople, cardLine } from '../data/people-find.js';
import { lookAlike, pairKey } from '../data/look-alike.js';
import { openAddPerson } from './add-person.js';
import { openMerge } from './merge-sheet.js';

const SORT_KEY = 'rounds-people-sort';
const WAVED = 'lookAlikeWaved'; // a local setting: pairs waved away on this device
const view = { q: '', filter: 'all' }; // while Rounds is open
function sortNow() {
  try { const k = localStorage.getItem(SORT_KEY); return SORTS.some(([s]) => s === k) ? k : 'az'; } catch (e) { return 'az'; }
}
function keepSort(k) {
  try { localStorage.setItem(SORT_KEY, k); } catch (e) { /* private mode: this visit only */ }
}

const cardHtml = (p, line) => `
  <a class="person-card" href="#/person/${encodeURIComponent(p.id)}">${photoHtml(p)}
    <span class="person-card-name">${p.letGo ? '' : miniHtml(p.next?.kind)}<span>${esc(p.name)}</span></span>
    ${line ? `<span class="person-card-line">${esc(line)}</span>` : ''}</a>`;
const chipHtml = (k, label, on) => `<button type="button" class="pick-chip${on ? ' on' : ''}" data-filter="${k}" aria-pressed="${on}">${esc(label)}</button>`;
const sortHtml = (sort) => `<div class="people-sort">
  <button type="button" class="people-sort-now" data-sort-next>Sort: ${esc(SORTS.find(([k]) => k === sort)[1])}<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg></button>
  <span class="people-sorts">${SORTS.map(([k, n]) => `<button type="button" data-sort="${k}" aria-pressed="${k === sort}">${esc(n)}</button>`).join('<span aria-hidden="true">·</span>')}</span></div>`;
const alikeHtml = ([a, b]) => `<div class="look-alike"><span class="look-alike-words"><b>${esc(a.name)}</b> and <b>${esc(b.name)}</b> might be the same person.</span>
  <button type="button" class="list-act" data-merge>Merge</button><button type="button" class="look-alike-x" data-wave aria-label="Not the same person">${X_ICON}</button></div>`;

export async function peopleScreen(root, { beside = false } = {}) {
  const [people, lines, week, waved] = await Promise.all([listPeople(), listMoves(), getWeek(), getSetting(WAVED, [])]);
  const today = dayOf();
  const last = lastLines(lines);
  const here = people.filter((p) => !p.letGo);
  const pair = lookAlike(people, waved);
  const eye = window.DF_SUITE ? ' People from your shoots in The Eye come in on their own.' : '';
  root.innerHTML = `<div class="screen"><div class="scroll">
    ${bandHtml({ title: 'People', place: 'Rounds' })}
    <div class="list-head"><h2>People <span>${here.length}</span></h2><button type="button" class="list-act" data-add>${PLUS}Add someone</button></div>
    ${people.length ? `${searchBoxHtml('Search people', 'people-find')}
    <div class="people-filters">${FILTERS.map(([k, n]) => chipHtml(k, n, k === view.filter)).join('')}</div>
    <div data-sort-row></div>${pair ? alikeHtml(pair) : ''}<div data-people></div>` : `<p class="note">No one yet. Add the people you work with.${eye}</p>`}
  </div></div>`;
  const list = root.querySelector('[data-people]');
  const draw = () => {
    const sort = sortNow();
    root.querySelector('[data-sort-row]').innerHTML = sortHtml(sort);
    const shown = sortPeople(people.filter((p) => matches(p, view.q) && inFilter(p, view.filter, week, today)), sort, last, week, today);
    const on = shown.filter((p) => !p.letGo);
    const gone = shown.filter((p) => p.letGo);
    const grid = (list) => `<div class="people-grid">${list.map((p) => cardHtml(p, cardLine(p, last.get(p.id), week, today))).join('')}</div>`;
    list.innerHTML = `${on.length ? grid(on) : `<p class="note">${view.q ? `No one matches "${esc(view.q)}".` : 'No one here.'}</p>`}
      ${gone.length ? `<div class="people-gone"><div class="list-head"><h2>Let go <span>${gone.length}</span></h2></div>${grid(gone)}</div>` : ''}`;
    fillPhotos(list, shown);
  };
  if (list) draw();
  if (beside) return;
  const redraw = () => peopleScreen(root).then(() => root.querySelector('.screen')?.classList.add('still'));
  root.querySelector('[data-add]').addEventListener('click', () => openAddPerson((p) => { location.hash = `#/person/${encodeURIComponent(p.id)}`; }));
  if (!list) return;
  const find = root.querySelector('[data-find]');
  find.value = view.q;
  find.addEventListener('input', debounce(() => { view.q = find.value; draw(); }, 120));
  root.querySelector('.people-filters').addEventListener('click', (e) => {
    const b = e.target.closest('[data-filter]');
    if (!b) return;
    view.filter = b.dataset.filter;
    root.querySelectorAll('[data-filter]').forEach((c) => { c.classList.toggle('on', c === b); c.setAttribute('aria-pressed', String(c === b)); });
    draw();
  });
  root.querySelector('[data-sort-row]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-sort], [data-sort-next]');
    if (!b) return;
    const i = SORTS.findIndex(([k]) => k === sortNow());
    keepSort(b.dataset.sort || SORTS[(i + 1) % SORTS.length][0]);
    draw();
  });
  root.querySelector('[data-merge]')?.addEventListener('click', () => openMerge(pair[0], pair[1], redraw));
  root.querySelector('[data-wave]')?.addEventListener('click', async () => {
    await setSetting(WAVED, [...waved, pairKey(...pair)]);
    redraw();
  });
}
