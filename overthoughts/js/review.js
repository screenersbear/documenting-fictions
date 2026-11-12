// A month's (or a year's) review: that stretch's takeaways from your entries,
// gathered by themselves, the counts, and one
// question to answer in your own words. Saves as you go.
import { ICONS } from './icons.js';
import { back as goBack } from './nav.js';
import { esc, debounce } from './util.js';
import { toast } from './ui.js';
import { allEntries, getReview, saveReview, entryTitle, oneLine, hasText, prettyDay } from './store.js';
import { periodOf, gather, countLine } from './screens.js';


const back = () => goBack('#/reviews');

export async function reviewScreen(view, id) {
  const p = periodOf(id);
  if (!p) { location.hash = '#/reviews'; return () => {}; }
  const g = gather(await allEntries(), p);
  const r = (await getReview(id)) || { id, period: p.period, key: p.key, summary: '', createdAt: window.DFData.nowIso() };
  let dirty = false;

  const take = (e, name) => `<a class="take" href="#/entry/${encodeURIComponent(e.id)}">
      <span class="take-name">${esc(name)}<small>${esc(prettyDay(e.date))}</small></span>
      <span class="take-text">${esc(oneLine(e.takeaway))}</span>
    </a>`;
  const mine = g.mine.filter((e) => hasText(e.takeaway));
  const question = p.period === 'month' ? 'What changed this month?' : 'What changed this year?';

  view.innerHTML = `<div class="screen review-page">
    <div class="folder-head">
      <button type="button" class="icon-btn" data-back aria-label="Back">${ICONS.back}</button>
      <h1>${esc(p.title)}</h1>
      <span class="icon-btn"></span>
    </div>
    <div class="scroll"><div class="form-page">
      <p class="count-line">${esc(countLine(g))}</p>
      <h2 class="month">Takeaways</h2>
      ${mine.map((e) => take(e, entryTitle(e))).join('') || `<p class="note">No takeaways from your entries ${p.period === 'month' ? 'this month' : 'this year'}.</p>`}
      <label class="group review-q">
        <span class="label">${esc(question)}</span>
        <textarea class="write big" data-f="summary" rows="6" placeholder="In your own words">${esc(r.summary || '')}</textarea>
      </label>
    </div></div>
  </div>`;
  const root = view.querySelector('.screen');
  const t = root.querySelector('textarea');
  const grow = () => { t.style.height = 'auto'; t.style.height = `${t.scrollHeight + 2}px`; };
  grow();

  const store = async () => {
    if (!dirty) return;
    dirty = false;
    await saveReview(r);
  };
  const later = debounce(() => store().catch((err) => toast(err.message || 'That wasn\'t saved.')), 450);
  t.addEventListener('input', () => { r.summary = t.value; dirty = true; grow(); later(); });
  root.querySelector('[data-back]').addEventListener('click', back);
  return () => { later.cancel(); store().catch(console.error); };
}
