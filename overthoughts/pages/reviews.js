// Reviews: month by month, the takeaways from your entries. One scrolling page.
import { esc } from '../components/util.js';
import { head, note } from '../components/page-head.js';
import { allEntries, hasText, monthKey, monthName } from '../data/store.js';

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
