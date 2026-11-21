// SO FAR on a person's page (round 2, thanks/06, 16 Nov): everything done
// with them, newest first (data/so-far.js), each row its date in small
// capitals, its mark (a move's own; Rounds' for moments and notes, The
// Eye's for shoots), what (" · how"), and the note under it in light type.
// Tap a move to see what you said (pages/what-you-said.js, rounds/09: EDIT,
// COPY AGAIN, DELETE); a note on its own to change it or delete it; a
// moment to change it or delete it (pages/moment-sheet.js). Deleting has
// Undo. Shoots and answers are as they are. A promise made with a move
// (data/move-promise.js, 21 Nov) sits under it with a tick: PROMISE KEPT
// (yours) or THEY CAME THROUGH (theirs), ticked or unticked with Undo.
import { openSheet } from '../components/sheet.js';
import { miniHtml } from '../components/marks.js';
import { toast } from '../components/toast.js';
import { esc } from '../components/util.js';
import { NOTE_HOWS } from '../data/done-notes.js';
import { saveNote, dropNote, putNoteBack } from '../data/moves.js';
import { promiseFor, promiseWho, tickWords, isKept } from '../data/move-promise.js';
import { keepPromise, openAgain, promiseWhen } from '../data/promises.js';
import { changeSaved, undoChange } from '../data/promise-store.js';
import { TICK } from '../components/icons.js';
import { shortDay, dayOf } from '../data/dates.js';
import { openMoment } from './moment-sheet.js';
import { openSaid } from './what-you-said.js';

const C = () => window.DFConnect;
const TAPPABLE = ['move', 'note', 'moment'];

// A row's mark: a move's own, or a notebook's (Rounds', The Eye's) from the
// suite's shared marks. DONE TODAY's rows on Today use it too.
export function markHtml(r) {
  if (!r.mark) return miniHtml(r.look);
  const nb = C() && C().NOTEBOOKS[r.mark];
  return `<span class="mini nb" style="background:${nb ? nb.bg : 'var(--ink)'}" aria-hidden="true">${nb ? C().markSvg(r.mark, 16) : ''}</span>`;
}
const rowHtml = (r, i) => {
  const tag = r.id && TAPPABLE.includes(r.kind) ? `button type="button" data-so-far="${i}"` : 'div';
  return `<${tag} class="so-far-row"><span class="so-far-day">${esc(shortDay(r.day))}</span>${markHtml(r)}
    <span class="so-far-words"><span class="so-far-what">${esc(r.what)}${r.howWords ? ` <span>· ${esc(r.howWords)}</span>` : ''}</span>${r.note ? `<span class="so-far-note">${esc(r.note)}</span>` : ''}</span></${tag.split(' ')[0]}>`;
};

// The promise made with a move, under it: what, when, and its tick.
function promiseHtml(x, person) {
  const kept = isKept(x);
  const when = kept ? '' : promiseWhen(x, dayOf());
  return `<div class="so-far-prom"><span class="so-far-prom-words"><span class="so-far-prom-what">${esc(promiseWho(x, person.name))}</span>${when ? `<span class="so-far-prom-when">${esc(when)}</span>` : ''}</span>
    <button type="button" class="so-far-prom-tick" role="checkbox" aria-checked="${kept}" data-prom-tick="${esc(x.id)}"><span class="save-msg-box" aria-hidden="true">${TICK}</span>${esc(tickWords(x))}</button></div>`;
}
const withPromiseHtml = (person) => (r, i) => {
  const x = person && r.kind === 'move' ? promiseFor(person, r.id) : null;
  return `${rowHtml(r, i)}${x ? promiseHtml(x, person) : ''}`;
};

// The heading and the rows ('' when there's nothing yet). person: for the promises made with their moves.
export const soFarHtml = (rows, person = null) => (rows.length ? `<h2 class="so-far-head">So far</h2><div class="so-far-list">${rows.map(withPromiseHtml(person)).join('')}</div>` : '');

const chipsHtml = (list, on) => Object.entries(list).map(([k, label]) => `<button type="button" class="pick-chip${k === on ? ' on' : ''}" data-how="${esc(k)}" aria-pressed="${k === on}">${esc(label)}</button>`).join('');

// A note on its own: what it was, the note, DELETE THE NOTE.
function openEdit(row, line, after) {
  let how = line.how || '';
  const s = openSheet({
    title: row.what,
    className: 'sheet-small done-note so-far-edit',
    body: `
      <p class="label done-note-label">What it was</p>
      <div class="pick-chips">${chipsHtml(NOTE_HOWS, how)}</div>
      <label class="label done-note-label" for="soFarNote">The note</label>
      <textarea class="move-text done-note-text" id="soFarNote" rows="3" maxlength="500">${esc(line.note || '')}</textarea>
      <div class="done-note-btns"><button type="button" class="text-btn" data-delete>Delete the note</button><button type="button" class="btn primary" data-save>Save</button></div>`,
  });
  const note = s.body.querySelector('textarea');
  s.body.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.how !== undefined) {
      how = how === b.dataset.how ? '' : b.dataset.how;
      s.body.querySelectorAll('[data-how]').forEach((c) => { c.classList.toggle('on', c.dataset.how === how); c.setAttribute('aria-pressed', c.dataset.how === how); });
    } else if (b.matches('[data-save]')) {
      if (!how && !note.value.trim()) { note.focus(); return; } // a note needs something
      s.close();
      await saveNote(line, { how, note: note.value });
      await after();
    } else if (b.matches('[data-delete]')) {
      s.close();
      await dropNote(line);
      await after();
      toast('Note deleted.', { action: { label: 'Undo', run: () => putNoteBack(line).then(after) } });
    }
  });
}

// The rows on a drawn page: each opens what changes it. lines: the log.
export function wireSoFar(view, person, rows, lines, after) {
  view.querySelectorAll('[data-so-far]').forEach((b) => b.addEventListener('click', () => {
    const row = rows[Number(b.dataset.soFar)];
    const line = lines.find((l) => l.id === row.id);
    if (!line) return;
    if (row.kind === 'moment') openMoment(person, { line, after });
    else if (row.kind === 'move') openSaid(person, line, after);
    else openEdit(row, line, after);
  }));
  view.querySelectorAll('[data-prom-tick]').forEach((b) => b.addEventListener('click', async () => {
    const id = b.dataset.promTick;
    const kept = b.getAttribute('aria-checked') !== 'true';
    const theirs = person.promises?.find((x) => x.id === id)?.mine === false;
    const undo = await changeSaved(person.id, (p) => (kept ? keepPromise(p, id, dayOf()) : openAgain(p, id)));
    await after();
    if (undo) toast(kept ? (theirs ? 'Marked as happened.' : 'Marked as kept.') : 'Open again.', { action: { label: 'Undo', run: () => undoChange(undo).then(after) } });
  }));
}
