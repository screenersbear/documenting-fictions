// A month's review: that month's takeaways from your entries, gathered by
// themselves. Read only: nothing to write here (the user, 11-12).
import { ICONS } from '../components/icons.js';
import { back as goBack } from '../components/nav.js';
import { esc } from '../components/util.js';
import { allEntries, entryTitle, oneLine, prettyDay } from '../data/store.js';
import { periodOf, gather } from './reviews.js';

const back = () => goBack('#/reviews');

export async function reviewScreen(view, id) {
  const p = periodOf(id);
  if (!p) { location.hash = '#/reviews'; return () => {}; }
  const takes = gather(await allEntries(), p);
  const take = (e) => `<a class="take" href="#/entry/${encodeURIComponent(e.id)}">
      <span class="take-name">${esc(entryTitle(e))}<small>${esc(prettyDay(e.date))}</small></span>
      <span class="take-text">${esc(oneLine(e.takeaway))}</span>
    </a>`;
  view.innerHTML = `<div class="screen review-page">
    <div class="folder-head">
      <button type="button" class="icon-btn" data-back aria-label="Back">${ICONS.back}</button>
      <h1>${esc(p.title)}</h1>
      <span class="icon-btn"></span>
    </div>
    <div class="scroll"><div class="form-page">
      ${takes.map(take).join('') || '<p class="note">No takeaways from your entries this month.</p>'}
    </div></div>
  </div>`;
  view.querySelector('[data-back]').addEventListener('click', back);
  return () => {};
}
