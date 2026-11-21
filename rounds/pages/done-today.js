// DONE TODAY on Today (rounds/12 and 13, 16 Nov): under the cards, and the
// page's content once the day is done. It took the place of the Done today
// button and its sheet. Every move and moment done today, newest first
// (data/today.js doneOn), each row its mark, "Said thanks to Maya R. ·
// text" and the first line of what you said (data/done-rows.js). Tap a
// move for What you said (pages/what-you-said.js, rounds/09: edit, copy,
// delete with Undo, which brings a due move's card back); a moment opens to
// change or delete (pages/moment-sheet.js). Both show who it was with on
// top, a way to their page (20 Nov). No section when nothing's done.
import { esc } from '../components/util.js';
import { CHEV_SMALL } from '../components/icons.js';
import { doneRow } from '../data/done-rows.js';
import { MOMENT_KIND } from '../data/moments.js';
import { markHtml } from './so-far.js';
import { openSaid } from './what-you-said.js';
import { openMoment } from './moment-sheet.js';

function rowHtml(done, i) {
  const r = doneRow(done);
  const under = r.said ? `"${r.said}"` : r.note;
  return `<button type="button" class="done-today-row" data-done="${i}">${markHtml(r)}
    <span class="done-today-words"><span class="done-today-what">${esc(r.before)}<b>${esc(r.name)}</b>${esc(r.after)}${r.how ? ` <span>· ${esc(r.how)}</span>` : ''}</span>${under ? `<span class="done-today-said">${esc(under)}</span>` : ''}</span>
    <span class="done-today-chev">${CHEV_SMALL}</span></button>`;
}

// done: doneOn's list.
export const doneTodayHtml = (done) => (done.length ? `<section class="done-today">
  <h2 class="done-today-head">Done today <span>${done.length}</span></h2>
  <div class="done-today-list">${done.map(rowHtml).join('')}</div></section>` : '');

// after: Today drawn again, once one's changed or deleted.
export function wireDoneToday(view, done, after) {
  view.querySelector('.done-today-list')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-done]');
    if (!b) return;
    const { line, person } = done[Number(b.dataset.done)];
    if (line.kind === MOMENT_KIND) openMoment(person, { line, after, who: true });
    else openSaid(person, line, after, { who: true });
  });
}
