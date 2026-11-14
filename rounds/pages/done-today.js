// Done today (from Today): each move marked done today, the newest first,
// with Undo to put it back as it was. For a card swiped away by mistake once
// the toast's Undo has gone: its card comes back on Today.
import { openSheet } from '../components/sheet.js';
import { miniHtml } from '../components/marks.js';
import { toast } from '../components/toast.js';
import { esc } from '../components/util.js';
import { KINDS } from '../data/kinds.js';
import { loadDone, undoDone } from '../data/moves.js';

const rowHtml = ({ line, person }, i) => `
  <div class="done-row">${miniHtml(line.kind)}
    <span class="choice-text"><span class="choice-label">${esc(person.name)}</span><span class="choice-detail">${esc(KINDS[line.kind].name)}</span></span>
    <button type="button" class="text-btn" data-undo="${i}">Undo</button>
  </div>`;

// onChange: Today drawn again behind the sheet after each Undo.
export async function openDoneToday(onChange) {
  let { lines, done } = await loadDone();
  const s = openSheet({ title: 'Done today', className: 'sheet-small', body: '<div class="done-list"></div>' });
  const list = s.body.querySelector('.done-list');
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
