// Right after a move is done (round 2, thanks/02): the move's tag, the
// person, "Done today", then HOW (Text, Instagram, Email, In person: one
// pick, already picked when you came back from the move's button) and A
// NOTE (OPTIONAL) with quick taps that add their words. SAVE keeps them
// with the move; SKIP (or closing) leaves the move done without them.
// Never required: the next card is already there behind it. moveDone is
// the one way Today, a slip and a person's page mark a move done.
import { openSheet } from '../components/sheet.js';
import { tagHtml } from '../components/marks.js';
import { photoHtml, fillPhotos } from '../components/photo.js';
import { toast } from '../components/toast.js';
import { esc } from '../components/util.js';
import { moveName, moveLook } from '../data/kinds.js';
import { HOWS, quickTaps, addTap } from '../data/done-notes.js';
import { doMove, undoMove, saveHowNote } from '../data/moves.js';

const chipsHtml = (list, attr, on = '') => list.map(([k, label]) => `<button type="button" class="pick-chip${k === on ? ' on' : ''}" ${attr}="${esc(k)}" aria-pressed="${k === on}">${esc(label)}</button>`).join('');

// The sheet for one move done ({ line } from doMove). how: picked already.
export function openHowNote(person, line, how = '') {
  const s = openSheet({
    title: moveName(line),
    className: 'sheet-small done-note',
    body: `
      <div class="move-who">${photoHtml(person, 'small')}<span class="move-who-words"><span class="move-name">${esc(person.name)}</span><span class="move-handle">Done today</span></span></div>
      <p class="label done-note-label">How</p>
      <div class="pick-chips" data-hows>${chipsHtml(Object.entries(HOWS), 'data-how', how)}</div>
      <label class="label done-note-label" for="doneNote">A note (optional)</label>
      <textarea class="move-text done-note-text" id="doneNote" rows="3" maxlength="500"></textarea>
      <div class="pick-chips" data-taps>${chipsHtml(quickTaps(person.name).map((t) => [t, t]), 'data-tap')}</div>
      <div class="done-note-btns"><button type="button" class="text-btn" data-skip>Skip</button><button type="button" class="btn primary" data-save>Save</button></div>`,
  });
  s.el.querySelector('.sheet-header h2').innerHTML = tagHtml(moveLook(line), moveName(line));
  fillPhotos(s.el, [person]);
  const note = s.body.querySelector('.done-note-text');
  s.body.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.how !== undefined) {
      how = how === b.dataset.how ? '' : b.dataset.how;
      s.body.querySelectorAll('[data-how]').forEach((c) => { c.classList.toggle('on', c.dataset.how === how); c.setAttribute('aria-pressed', c.dataset.how === how); });
    } else if (b.dataset.tap !== undefined) {
      note.value = addTap(note.value, b.dataset.tap);
      b.classList.add('on');
    } else if (b.matches('[data-skip]')) s.close();
    else if (b.matches('[data-save]')) {
      if (how || note.value.trim()) await saveHowNote(line, { how, note: note.value });
      s.close();
    }
  });
  return s;
}

// A move done: logged with what you said, the screen drawn again, Done.
// with Undo, then the sheet for how and a note.
export async function moveDone(person, { said = '', how = '' } = {}, redraw, away = null) {
  const [undo] = await Promise.all([doMove(person, said), away]);
  await redraw();
  toast('Done.', { action: { label: 'Undo', run: () => undoMove(undo).then(redraw) } });
  return openHowNote(person, undo.line, how);
}
