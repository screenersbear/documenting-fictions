// Promises (user, 20 Nov: "messages on the bottom is misleading ... maybe
// that's a place for pending promises and fulfillment?"; the third tab
// since 21 Nov, where Messages was, which moved into Options): + PROMISE,
// then YOU PROMISED, the nearest day first, then THEY PROMISED, what you're
// waiting on. Only the open ones; a tap on one says what to do with it
// (pages/promise-sheet.js). Callback's open loops come in here too
// (Bring in from Callback).
import { bandHtml } from '../components/band.js';
import { fillPhotos } from '../components/photo.js';
import { esc } from '../components/util.js';
import { PLUS } from '../components/icons.js';
import { promiseRowHtml } from '../components/promise-row.js';
import { listPeople } from '../data/db.js';
import { promiseList } from '../data/promises.js';
import { dayOf } from '../data/dates.js';
import { openPickForPromise } from './promise-add.js';
import { openPromiseActions } from './promise-sheet.js';

const addHtml = () => `<button type="button" class="big-btn big-btn-ink prom-add" data-add-promise><span class="big-btn-plus" aria-hidden="true">${PLUS}</span><span class="big-btn-words"><b>Promise</b><span>Something you or they said would happen</span></span></button>`;

function listHtml(title, items, today) {
  if (!items.length) return '';
  return `<div class="prom-part"><div class="list-head"><h2>${esc(title)} <span>${items.length}</span></h2></div>
    <div class="prom-list">${items.map((x) => promiseRowHtml(x, today)).join('')}</div></div>`;
}

export async function promisesScreen(view, { beside = false } = {}) {
  const people = await listPeople();
  const today = dayOf();
  const { mine, theirs } = promiseList(people);
  view.innerHTML = `<div class="screen"><div class="scroll">
    ${bandHtml({ title: 'Promises', place: 'Rounds' })}
    ${addHtml()}
    ${mine.length || theirs.length ? `${listHtml('You promised', mine, today)}${listHtml('They promised', theirs, today)}`
      : '<p class="note prom-none">When you promise someone something, or they promise you, add it here. Rounds keeps it in front of you until it happens.</p>'}
  </div></div>`;
  fillPhotos(view, [...mine, ...theirs].map((x) => x.person));
  if (beside) return;
  const redraw = () => promisesScreen(view).then(() => view.querySelector('.screen')?.classList.add('still'));
  view.querySelector('.scroll').addEventListener('click', (e) => {
    if (e.target.closest('[data-add-promise]')) { openPickForPromise(redraw); return; }
    const b = e.target.closest('[data-promise]');
    if (!b) return;
    const item = [...mine, ...theirs].find((x) => x.promise.id === b.dataset.promise && x.person.id === b.dataset.person);
    if (item) openPromiseActions(item.person, item.promise, redraw);
  });
}
