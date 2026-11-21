// A connection opened (Tightening Rounds, rounds/09, 16 Nov), from Done
// today, SO FAR on their page, or their page on the shelf: the kind's tag,
// "Checked in with Lindsey", the day and how ("Mon 16 Nov · by text"), WHAT
// YOU SAID in full, YOUR NOTE and what was PROMISED with it (each left out
// when there's none). DELETE
// takes it out of the log, with Undo (a due move done today is due again);
// EDIT opens the one sheet filled in; COPY AGAIN copies what you said.
// From DONE TODAY (who), their photo and name on top go to their page (20 Nov).
import { openSheet } from '../components/sheet.js';
import { tagHtml } from '../components/marks.js';
import { toast } from '../components/toast.js';
import { copy } from '../components/copy.js';
import { esc } from '../components/util.js';
import { whoHtml, wireWho } from '../components/who-row.js';
import { moveName, moveLook } from '../data/kinds.js';
import { howWords } from '../data/done-notes.js';
import { withWords } from '../data/one-move.js';
import { promiseFor, promiseWho, isKept, tickWords } from '../data/move-promise.js';
import { deleteLine, undoDelete } from '../data/one-move-store.js';
import { longDay } from '../data/dates.js';
import { openOneMove } from './one-sheet.js';

// after(): the screen drawn again, once it's changed or deleted. who: show
// who it's with, as a way to their page.
export function openSaid(person, line, after, { who = false } = {}) {
  const promise = promiseFor(person, line.id);
  const s = openSheet({
    title: withWords(line, person.name),
    className: 'sheet-small said-sheet',
    body: `${who ? whoHtml(person) : ''}
      <p class="said-title">${esc(withWords(line, person.name))}</p>
      <p class="said-when">${esc([longDay(line.day), howWords(line)].filter(Boolean).join(' · '))}</p>
      ${line.said ? `<p class="label said-label">What you said</p><p class="said-words">${esc(line.said)}</p>` : ''}
      ${line.note ? `<p class="label said-label">Your note</p><p class="said-note">${esc(line.note)}</p>` : ''}
      ${promise ? `<p class="label said-label">Promised</p><p class="said-note said-promise">${esc(promiseWho(promise, person.name))}${isKept(promise) ? ` · ${esc(tickWords(promise))}` : ''}</p>` : ''}
      <div class="said-btns">
        <button type="button" class="text-btn" data-delete>Delete</button>
        <button type="button" class="btn secondary" data-edit>Edit</button>
        ${line.said ? '<button type="button" class="btn secondary" data-copy>Copy again</button>' : ''}
      </div>`,
  });
  s.el.querySelector('.sheet-header h2').innerHTML = tagHtml(moveLook(line), moveName(line));
  wireWho(s, person);
  s.body.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.matches('[data-copy]')) toast(await copy(line.said) ? 'Copied.' : 'Select the message and copy it.');
    else if (b.matches('[data-edit]')) { s.close(); openOneMove(person, { line, after }); }
    else if (b.matches('[data-delete]')) {
      s.close();
      const gone = await deleteLine(person, line);
      await after();
      toast('Deleted.', { action: { label: 'Undo', run: () => undoDelete(gone).then(after) } });
    }
  });
  return s;
}
