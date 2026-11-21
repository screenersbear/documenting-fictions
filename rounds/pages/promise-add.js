// + PROMISE (21 Nov): something you promised someone, or they promised you.
// From the Promises tab, WHO IS IT WITH? first (a search over everyone,
// components/person-search.js); from a person's ... menu, straight on to
// WHO PROMISED (I promised, or they did), WHAT, and BY WHEN (optional),
// then ADD THE PROMISE, with Undo.
import { openSheet } from '../components/sheet.js';
import { toast } from '../components/toast.js';
import { esc, uuid } from '../components/util.js';
import { searchBoxHtml, wireSearch } from '../components/person-search.js';
import { whoHtml, wireWho } from '../components/who-row.js';
import { listPeople, listMoves } from '../data/db.js';
import { newPromise, withPromise, WHAT_MOST } from '../data/promises.js';
import { changeSaved, undoChange } from '../data/promise-store.js';
import { dayOf, longDay } from '../data/dates.js';
import { firstName } from '../data/fill.js';

// Who it's with, then the promise. after: draws what's behind again.
export async function openPickForPromise(after) {
  const [people, lines] = await Promise.all([listPeople(), listMoves()]);
  const s = openSheet({
    title: 'A promise',
    className: 'reach-sheet',
    body: people.length ? `<p class="label reach-label prom-who-label">Who is it with?</p>
      ${searchBoxHtml('Search by name or handle')}<div class="pick-list" data-found></div>`
      : '<p class="note">Add someone in People first, then their promise.</p>',
  });
  if (!people.length) return s;
  wireSearch(s.body, people, lines, { onPick: (p) => { s.close(); openAddPromise(p, after, { who: true }); } });
  return s;
}

const chip = (on, mine, label) => `<button type="button" class="pick-chip${on ? ' on' : ''}" data-mine="${mine}" aria-pressed="${on}">${esc(label)}</button>`;

// who: their photo and name on top, as a way to their page.
export function openAddPromise(person, after = async () => {}, { who = false } = {}) {
  const today = dayOf();
  const first = firstName(person.name) || 'They';
  let mine = true;
  let due = '';
  const s = openSheet({
    title: `A promise with ${firstName(person.name) || 'them'}`,
    className: 'sheet-small moment-sheet prom-sheet',
    body: `${who ? whoHtml(person) : ''}
      <p class="label moment-label">Who promised</p>
      <div class="pick-chips">${chip(true, 'yes', 'I promised')}${chip(false, 'no', `${first} promised`)}</div>
      <label class="label moment-label" for="promiseWhat">What</label>
      <textarea class="move-text" id="promiseWhat" rows="2" maxlength="${WHAT_MOST}" placeholder="Send the selects"></textarea>
      <label class="label moment-label" for="promiseDue">By when (optional)</label>
      <span class="moment-when"><span class="moment-when-words"></span><input type="date" id="promiseDue" min="${today}" /></span>
      <div class="moment-btns"><button type="button" class="btn primary" data-save disabled>Add the promise</button></div>`,
  });
  const $ = (sel) => s.body.querySelector(sel);
  wireWho(s, person);
  const drawDue = () => { $('.moment-when-words').textContent = due ? longDay(due) : 'No day'; };
  drawDue();
  $('#promiseDue').addEventListener('change', (e) => {
    due = e.target.value && e.target.value >= today ? e.target.value : ''; // cleared, or a day gone: none
    e.target.value = due;
    drawDue();
  });
  $('#promiseWhat').addEventListener('input', (e) => { $('[data-save]').disabled = !e.target.value.trim(); });
  s.body.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.mine) {
      mine = b.dataset.mine === 'yes';
      s.body.querySelectorAll('[data-mine]').forEach((c) => { const on = (c.dataset.mine === 'yes') === mine; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); });
    } else if (b.matches('[data-save]')) {
      const promise = newPromise({ mine, what: $('#promiseWhat').value, due }, `pr-${uuid()}`, today);
      if (!promise) return;
      s.close();
      const undo = await changeSaved(person.id, (p) => withPromise(p, promise));
      await after();
      if (undo) toast(mine ? 'Promise added.' : `Added to what you're waiting on.`, { action: { label: 'Undo', run: () => undoChange(undo).then(after) } });
    }
  });
  return s;
}
