// Today (01-today): three moves a day (at most five), one card at a time.
// Swipe the card away when it's done, or LATER for tomorrow; WRITE TO (or a
// tap on the card) opens the one sheet (pages/one-sheet.js). + REACH OUT
// beside the count starts one with anyone (pages/reach-out.js). No overdue
// counts, no streaks: when the day's done (rounds/13), the arc stays full,
// the count says ALL 3 DONE, then a calm "That's today." and who's next.
// DONE TODAY (pages/done-today.js, rounds/12) lists what's done under the
// cards, and is the page once the day is done. A post from Layouts that tags
// people here shows as a slip at the top, once.
import { bandHtml } from '../components/band.js';
import { fillPhotos } from '../components/photo.js';
import { esc } from '../components/util.js';
import { PLUS } from '../components/icons.js';
import { loadToday, loadDone, laterMove } from '../data/moves.js';
import { waiting, countWords } from '../data/today.js';
import { whenDue } from '../data/work-days.js';
import { dayOf, dueWords } from '../data/dates.js';
import { nextUpWords } from '../data/next-up.js';
import { cardHtml, behindHtml, writeLabel, arcHtml } from './today-card.js';
import { wireCard, cardAway } from './card-swipe.js';
import { swipeDone, writeTo } from './move-done.js';
import { openReachOut } from './reach-out.js';
import { openAddPerson } from './add-person.js';
import { doneTodayHtml, wireDoneToday } from './done-today.js';
import { leadsHtml, openLeads } from './leads.js';
import { postSlipsHtml, wirePostSlips } from './post-slip.js';

// The count, + REACH OUT beside it (rounds/06), and the arc.
const head = (count, arc) => `<div class="today-head"><span class="today-count-row">${count ? `<span class="today-count">${count}</span>` : ''}<button type="button" class="list-act today-reach" data-reach>${PLUS}Reach out</button></span>${arc}</div>`;

function stackHtml(pick, left, today) {
  const n = pick.ids.length;
  const at = n - left.length + 1;
  const [top, next, after] = left;
  return `
    ${head(countWords(n, left.length), arcHtml(pick, top.id, `Move ${at} of ${n}`))}
    <div class="stack">${after ? behindHtml(after, 2) : ''}${next ? behindHtml(next, 1) : ''}${cardHtml(top, today)}</div>
    <div class="today-btns">
      <button type="button" class="btn secondary" data-later>Later</button>
      <button type="button" class="btn primary" data-write><span>${esc(writeLabel(top))}</span></button>
    </div>`;
}

// No card to show: the day's done, nothing's due, or no one's here yet.
function calmHtml(people, pick, today, week) {
  const n = pick.ids.length;
  if (n) return `${head(`All ${n} done`, arcHtml(pick, '', `All ${n} done`))}<div class="today-calm today-finished"><h2>That's today.</h2><p>${esc(nextUpWords(people, week, today))}</p></div>`;
  const here = people.filter((p) => !p.letGo);
  if (!here.length) {
    const eye = window.DF_SUITE ? ' People from your shoots in The Eye come in on their own.' : '';
    return `<div class="today-calm"><h2>No one here yet.</h2><p>Add the people you work with, and Rounds picks a few to write to each day.${eye}</p>
      <button type="button" class="btn primary" data-add>${PLUS}Add someone</button></div>`;
  }
  const next = here.filter((p) => p.next).map((p) => whenDue(p.next, week, today)).sort()[0];
  const when = next ? `The next move is due ${dueWords(next, today).replace('Tomorrow', 'tomorrow')}.` : 'Nothing is planned.';
  return `${head('', '')}<div class="today-calm"><h2>Nothing today.</h2><p>${when}</p></div>`;
}

export async function todayScreen(view, { beside = false } = {}) {
  const today = dayOf();
  const [{ people, pick, week }, { done: doneToday }] = await Promise.all([loadToday(), loadDone()]);
  const [leads, slips] = await Promise.all([leadsHtml(people), postSlipsHtml(people).catch(() => '')]);
  const byId = new Map(people.map((p) => [p.id, p]));
  const left = waiting(pick).map((id) => byId.get(id));
  view.innerHTML = `<div class="screen"><div class="scroll">${bandHtml({ title: 'Rounds', place: 'Today' })}${slips}${leads}${left.length ? stackHtml(pick, left, today) : calmHtml(people, pick, today, week)}${doneTodayHtml(doneToday)}</div></div>`;
  fillPhotos(view, people);
  if (beside) return;
  const redraw = () => todayScreen(view).then(() => view.querySelector('.screen')?.classList.add('still'));
  view.querySelector('[data-add]')?.addEventListener('click', () => openAddPerson(() => todayScreen(view)));
  wireDoneToday(view, doneToday, redraw);
  view.querySelector('[data-leads]')?.addEventListener('click', () => openLeads(redraw));
  view.querySelector('[data-reach]')?.addEventListener('click', () => openReachOut(redraw));
  // Someone's move, from a slip: as from their card.
  wirePostSlips(view, (id) => {
    const p = byId.get(id);
    if (!p || !p.next) { redraw(); return; }
    writeTo(p, redraw);
  });
  if (!left.length) return;
  const top = left[0];
  const card = view.querySelector('.card.top');
  const done = (dir = 1, dx = 0) => swipeDone(top, redraw, cardAway(card, dir, dx));
  const later = async () => {
    await Promise.all([laterMove(top), cardAway(card, 0)]);
    await redraw();
  };
  // Their due move done on the sheet: the card goes as a swipe sends it.
  const open = () => writeTo(top, redraw, { gone: (d) => (d.line.extra ? null : cardAway(card, 1, 0)) });
  wireCard(card, { onOpen: open, onSwipe: done });
  view.querySelector('[data-write]').addEventListener('click', open);
  view.querySelector('[data-later]').addEventListener('click', later);
}
