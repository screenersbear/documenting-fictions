// Done today (from Today): each move marked done today, the newest first,
// with how it was done and its note, and Undo to put it back as it was. For a card swiped away by mistake once
// the toast's Undo has gone: its card comes back on Today. Under them ADD A
// MOMENT, with anyone (pages/moment-who.js).
import { openSheet } from '../components/sheet.js';
import { miniHtml } from '../components/marks.js';
import { toast } from '../components/toast.js';
import { esc } from '../components/util.js';
import { moveName, moveLook } from '../data/kinds.js';
import { howWords } from '../data/done-notes.js';
import { loadDone, undoDone } from '../data/moves.js';
import { openMomentWho } from './moment-who.js';

const rowHtml = ({ line, person }, i) => `
  <div class="done-row">${miniHtml(moveLook(line))}
    <span class="choice-text"><span class="choice-label">${esc(person.name)}</span><span class="choice-detail">${esc([moveName(line), howWords(line)].filter(Boolean).join(' · '))}</span>${line.note ? `<span class="done-row-note">${esc(line.note)}</span>` : ''}</span>
    <button type="button" class="text-btn" data-undo="${i}">Undo</button>
  </div>`;

// onChange: Today drawn again behind the sheet after each Undo.
export async function openDoneToday(onChange) {
  let { lines, done } = await loadDone();
  const s = openSheet({ title: 'Done today', className: 'sheet-small', body: '<div class="done-list"></div><button type="button" class="btn secondary done-moment" data-moment>Add a moment</button>' });
  const list = s.body.querySelector('.done-list');
  s.body.querySelector('[data-moment]').addEventListener('click', () => {
    s.close();
    openMomentWho(done.map((d) => d.person.id), onChange);
  });
  const draw = () => { list.innerHTML = done.map(rowHtml).join(''); };
  draw();
  list.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-undo]');
    if (!b || b.disabled) return;
    b.disabled = true;
    await undoDone(done[Number(b.dataset.undo)], lines);
    ({ lines, done } = await loadDone());
    await onChange();
    toast('Undone.');
    if (done.length) draw();
    else s.close();
  });
}
