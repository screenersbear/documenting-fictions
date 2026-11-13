// Entries: every entry, newest first, in months. One scrolling page.
import { esc } from '../components/util.js';
import { head, note } from '../components/page-head.js';
import { allEntries, hasWords, entryTitle, oneLine, hasText, byNewest, dayOf, monthKey, monthName, MONTHS } from '../data/store.js';

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
