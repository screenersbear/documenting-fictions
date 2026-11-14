// Today (01-today): three moves a day (at most five), one card at a time.
// Swipe the card away when it's done, or LATER for tomorrow; WRITE TO (or a
// tap on the card) opens the move. No overdue counts, no streaks: when the
// day's done, a calm "That's today".
import { bandHtml } from '../components/band.js';
import { fillPhotos } from '../components/photo.js';
import { toast } from '../components/toast.js';
import { esc } from '../components/util.js';
import { PLUS } from '../components/icons.js';
import { loadToday, doMove, undoMove, laterMove } from '../data/moves.js';
import { waiting } from '../data/today.js';
import { dayOf, dueWords } from '../data/dates.js';
import { cardHtml, behindHtml, writeLabel, arcHtml } from './today-card.js';
import { wireCard, cardAway } from './card-swipe.js';
import { openMove } from './move.js';
import { openAddPerson } from './add-person.js';

const head = (count, arc) => `<div class="today-head"><span class="today-count">${count}</span>${arc}</div>`;

function stackHtml(pick, left, today) {
  const n = pick.ids.length;
  const at = n - left.length + 1;
  const [top, next, after] = left;
  return `
    ${head(`${at} of ${n} today`, arcHtml(pick, top.id, `Move ${at} of ${n}`))}
    <div class="stack">${after ? behindHtml(after, 2) : ''}${next ? behindHtml(next, 1) : ''}${cardHtml(top, today)}</div>
    <div class="today-btns">
      <button type="button" class="btn secondary" data-later>Later</button>
      <button type="button" class="btn primary" data-write><span>${esc(writeLabel(top))}</span></button>
    </div>`;
}

// No card to show: the day's done, nothing's due, or no one's here yet.
function calmHtml(people, pick, today) {
  const n = pick.ids.length;
  if (n) return `${head(`${n} of ${n} today`, arcHtml(pick, '', `All ${n} done`))}<div class="today-calm"><h2>That's today.</h2><p>Rounds picks the next ones tomorrow.</p></div>`;
  const here = people.filter((p) => !p.letGo);
  if (!here.length) {
    const eye = window.DF_SUITE ? ' People from your shoots in The Eye come in on their own.' : '';
    return `<div class="today-calm"><h2>No one here yet.</h2><p>Add the people you work with, and Rounds picks a few to write to each day.${eye}</p>
      <button type="button" class="btn primary" data-add>${PLUS}Add someone</button></div>`;
  }
  const next = here.filter((p) => p.next).map((p) => p.next.due).sort()[0];
  const when = next ? `The next move is due ${dueWords(next, today).replace('Tomorrow', 'tomorrow')}.` : 'Nothing is planned.';
  return `<div class="today-calm"><h2>Nothing today.</h2><p>${when}</p></div>`;
}

export async function todayScreen(view, { beside = false } = {}) {
  const today = dayOf();
  const { people, pick } = await loadToday();
  const byId = new Map(people.map((p) => [p.id, p]));
  const left = waiting(pick).map((id) => byId.get(id));
  view.innerHTML = `<div class="screen"><div class="scroll">${bandHtml({ title: 'Rounds', place: 'Today' })}${left.length ? stackHtml(pick, left, today) : calmHtml(people, pick, today)}</div></div>`;
  fillPhotos(view, people);
  if (beside) return;
  view.querySelector('[data-add]')?.addEventListener('click', () => openAddPerson(() => todayScreen(view)));
  if (!left.length) return;
  const top = left[0];
  const card = view.querySelector('.card.top');
  const redraw = () => todayScreen(view).then(() => view.querySelector('.screen')?.classList.add('still'));
  const done = async (dir = 1, dx = 0) => {
    const [undo] = await Promise.all([doMove(top), cardAway(card, dir, dx)]);
    await redraw();
    toast('Done.', { action: { label: 'Undo', run: () => undoMove(undo).then(redraw) } });
  };
  const later = async () => {
    await Promise.all([laterMove(top), cardAway(card, 0)]);
    await redraw();
  };
  const open = () => openMove(top, { onDone: () => done(1), onLater: later });
  wireCard(card, { onOpen: open, onSwipe: done });
  view.querySelector('[data-write]').addEventListener('click', open);
  view.querySelector('[data-later]').addEventListener('click', later);
}
