// + PROMISE (21 Nov): something you promised someone, or they promised you.
// From the Promises tab, WHO IS IT WITH? first (a search over everyone,
// components/person-search.js); from a person's ... menu, straight on to
// WHO PROMISED (I promised, or they did), WHAT, and BY WHEN (optional:
// components/promise-fields.js), then ADD THE PROMISE, with Undo.
import { openSheet } from '../components/sheet.js';
import { toast } from '../components/toast.js';
import { uuid } from '../components/util.js';
import { searchBoxHtml, wireSearch } from '../components/person-search.js';
import { whoHtml, wireWho } from '../components/who-row.js';
import { promiseFieldsHtml, wirePromiseFields } from '../components/promise-fields.js';
import { listPeople, listMoves } from '../data/db.js';
import { newPromise, withPromise } from '../data/promises.js';
import { changeSaved, undoChange } from '../data/promise-store.js';
import { dayOf } from '../data/dates.js';
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

// who: their photo and name on top, as a way to their page.
export function openAddPromise(person, after = async () => {}, { who = false } = {}) {
  const today = dayOf();
  const s = openSheet({
    title: `A promise with ${firstName(person.name) || 'them'}`,
    className: 'sheet-small moment-sheet prom-sheet',
    body: `${who ? whoHtml(person) : ''}
      ${promiseFieldsHtml(person, today)}
      <div class="moment-btns"><button type="button" class="btn primary" data-save disabled>Add the promise</button></div>`,
  });
  const $ = (sel) => s.body.querySelector(sel);
  wireWho(s, person);
  const fields = wirePromiseFields(s.body, today);
  $('#promiseWhat').addEventListener('input', (e) => { $('[data-save]').disabled = !e.target.value.trim(); });
  $('[data-save]').addEventListener('click', async () => {
    const promise = newPromise({ ...fields.read(), what: $('#promiseWhat').value }, `pr-${uuid()}`, today);
    if (!promise) return;
    s.close();
    const undo = await changeSaved(person.id, (p) => withPromise(p, promise));
    await after();
    if (undo) toast(promise.mine ? 'Promise added.' : `Added to what you're waiting on.`, { action: { label: 'Undo', run: () => undoChange(undo).then(after) } });
  });
  return s;
}
