// What to do with a promise (21 Nov, as Callback's Not yet sheet): KEPT IT
// (yours) or GOT IT (theirs), ANOTHER WEEK, PICK A DAY, LET IT GO, and, on
// the Promises tab, their page. Each change says so with Undo. Kept and let
// go ones leave the lists and stay on the person. KEPT IT on one of yours
// opens the one sheet to log what you did (as Callback's "Promise kept"),
// with MARK IT KEPT WITHOUT LOGGING (21 Nov).
import { choiceSheet } from '../components/dialogs.js';
import { openSheet } from '../components/sheet.js';
import { toast } from '../components/toast.js';
import { esc } from '../components/util.js';
import { keepPromise, letGoPromise, dueOn, anotherWeek, promiseWhen } from '../data/promises.js';
import { changeSaved, undoChange } from '../data/promise-store.js';
import { dayOf, longDay } from '../data/dates.js';
import { firstName } from '../data/fill.js';
import { writeTo } from './move-done.js';

// A day for it: resolves with the day, '' for none, or null if closed.
export function pickPromiseDay(promise, today = dayOf()) {
  return new Promise((resolve) => {
    let answer = null;
    let day = promise.due && promise.due >= today ? promise.due : '';
    const s = openSheet({
      title: 'By when?',
      className: 'sheet-small moment-sheet prom-sheet',
      body: `<p class="sheet-message">${esc(promise.what)}</p>
        <span class="moment-when"><span class="moment-when-words"></span><input type="date" id="promiseDay" min="${today}" value="${esc(day)}" aria-label="The day" /></span>
        <div class="moment-btns"><button type="button" class="btn primary" data-save>Save</button>
        ${promise.due ? '<button type="button" class="text-btn" data-none>No day</button>' : ''}</div>`,
      onClose: () => resolve(answer),
    });
    const words = s.body.querySelector('.moment-when-words');
    const draw = () => { words.textContent = day ? longDay(day) : 'Tap to pick a day'; };
    draw();
    s.body.querySelector('#promiseDay').addEventListener('change', (e) => {
      day = e.target.value && e.target.value >= today ? e.target.value : '';
      e.target.value = day;
      draw();
    });
    s.body.querySelector('[data-save]').addEventListener('click', () => { answer = day; s.close(); });
    s.body.querySelector('[data-none]')?.addEventListener('click', () => { answer = ''; s.close(); });
  });
}

// who: offer their page too (not on their page itself).
export async function openPromiseActions(person, promise, after, { who = true } = {}) {
  const today = dayOf();
  const theirs = promise.mine === false;
  const first = firstName(person.name) || 'them';
  const when = promiseWhen(promise, today);
  const week = anotherWeek(promise.due, today);
  const pick = await choiceSheet({
    title: theirs ? `${first} promised` : `You promised ${first}`,
    message: `${esc(promise.what)}${when ? `<span class="prom-sheet-when">${esc(when)}</span>` : ''}`,
    options: [
      { key: 'kept', label: theirs ? 'Got it' : 'Kept it', detail: theirs ? 'It happened. Off the list.' : 'Log what you did. Off the list.' },
      { key: 'week', label: 'Another week', detail: `${theirs ? 'Expected' : 'Due'} ${longDay(week)}` },
      { key: 'day', label: promise.due ? 'Pick another day' : 'Pick a day' },
      { key: 'go', label: 'Let it go', detail: 'Off the list, without it happening.' },
      ...(who ? [{ key: 'page', label: `${person.name}'s page` }] : []),
    ],
  });
  if (!pick) return;
  if (pick === 'page') { location.hash = `#/person/${encodeURIComponent(person.id)}`; return; }
  let change;
  let said;
  const save = async () => {
    const undo = await changeSaved(person.id, change);
    await after();
    if (undo) toast(said, { action: { label: 'Undo', run: () => undoChange(undo).then(after) } });
  };
  if (pick === 'kept' && !theirs) {
    change = (p) => keepPromise(p, promise.id, today);
    said = 'Marked as kept.';
    writeTo(person, after, { keeps: promise, keptOnly: save });
    return;
  }
  if (pick === 'kept') { change = (p) => keepPromise(p, promise.id, today); said = 'Marked as happened.'; }
  else if (pick === 'go') { change = (p) => letGoPromise(p, promise.id, today); said = 'Let go.'; }
  else if (pick === 'week') { change = (p) => dueOn(p, promise.id, week); said = `Now ${theirs ? 'expected' : 'due'} ${longDay(week)}.`; }
  else {
    const day = await pickPromiseDay(promise, today);
    if (day === null || day === promise.due) return;
    change = (p) => dueOn(p, promise.id, day);
    said = day ? `Now ${theirs ? 'expected' : 'due'} ${longDay(day)}.` : 'No day now.';
  }
  await save();
}
