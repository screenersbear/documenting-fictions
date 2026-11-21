// PROMISES on a person's page (21 Nov): the open ones with them, yours
// first, each a row (components/promise-row.js) that opens what to do with
// it (pages/promise-sheet.js). None open, nothing shows: the ... menu has
// Add a promise.
import { promiseRowHtml } from '../components/promise-row.js';
import { promiseList } from '../data/promises.js';
import { dayOf } from '../data/dates.js';
import { openPromiseActions } from './promise-sheet.js';

const itemsOf = (p) => { const { mine, theirs } = promiseList([p]); return [...mine, ...theirs]; };

export function personPromisesHtml(p) {
  const items = itemsOf(p);
  if (!items.length) return '';
  const today = dayOf();
  return `<div class="person-promises"><div class="list-head"><h2>Promises <span>${items.length}</span></h2></div>
    <div class="prom-list">${items.map((x) => promiseRowHtml(x, today, { who: false })).join('')}</div></div>`;
}

export function wirePersonPromises(view, p, redraw) {
  view.querySelector('.person-promises')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-promise]');
    const item = b && itemsOf(p).find((x) => x.promise.id === b.dataset.promise);
    if (item) openPromiseActions(p, item.promise, redraw, { who: false });
  });
}
