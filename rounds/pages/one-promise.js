// Promises on the one sheet (21 Nov, Starky: "is there a way to add a
// promise to a connection you're logging? that's the real thing"), as
// Callback's log sheet had them. ANYTHING PROMISED? (optional) under A NOTE
// FOR YOU: once something is typed, WHO PROMISED and BY WHEN come under it.
// Saved with the move and tied to it (data/move-promise.js). Editing the move
// shows its promise, with a tick (PROMISE KEPT, or THEY CAME THROUGH);
// clearing its words takes it off. Opened from KEPT IT on one of yours
// (keeps), the promise is quoted on top, with MARK IT KEPT WITHOUT LOGGING.
import { esc } from '../components/util.js';
import { TICK } from '../components/icons.js';
import { whoChipsHtml, byWhenHtml, wirePromiseFields } from '../components/promise-fields.js';
import { WHAT_MOST } from '../data/promises.js';
import { isKept, tickWords } from '../data/move-promise.js';

// had: the promise this move made already (editing it), or null.
export const onePromiseHtml = (person, today, had = null) => `
  <label class="label one-label" for="onePromise">Anything promised? (optional)</label>
  <textarea class="move-text one-prom-what" id="onePromise" rows="1" maxlength="${WHAT_MOST}" placeholder="Send the selects">${esc(had?.what || '')}</textarea>
  <div class="one-prom-more" data-prom-more${had ? '' : ' hidden'}>
    ${whoChipsHtml(person, had ? had.mine !== false : true)}
    <label class="label one-prom-label" for="onePromiseDue">By when (optional)</label>
    ${byWhenHtml('onePromiseDue', today, had?.due || '')}
    ${had ? `<label class="save-msg one-prom-tick"><input type="checkbox" class="save-msg-input" data-prom-kept${isKept(had) ? ' checked' : ''} /><span class="save-msg-box" aria-hidden="true">${TICK}</span>
      <span class="save-msg-words">${esc(tickWords(had))}</span></label>` : ''}
  </div>`;

// root: the sheet's body. read(): { what, mine, due, kept }, or null with nothing typed.
export function wireOnePromise(root, today, had = null) {
  const box = root.querySelector('#onePromise');
  const more = root.querySelector('[data-prom-more]');
  const fields = wirePromiseFields(more, today, { mine: had ? had.mine !== false : true, due: had?.due || '' });
  box.addEventListener('input', () => { if (box.value.trim()) more.hidden = false; });
  return {
    read: () => (box.value.trim() ? { what: box.value, ...fields.read(), kept: !!root.querySelector('[data-prom-kept]')?.checked } : null),
  };
}

// KEPT IT, logged: the promise on top of the sheet, and the way out without a move.
export const keepsHtml = (promise) => `<div class="one-keeps"><p class="label one-label">Promise kept</p>
  <p class="one-keeps-what">${esc(promise.what)}</p>
  <button type="button" class="text-btn one-keeps-skip" data-keep-only>Mark it kept without logging</button></div>`;
