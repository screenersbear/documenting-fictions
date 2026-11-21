// Today (01-today): three moves a day (at most five), one card at a time.
// Swiping only flips through them (18 Nov, data/flip.js): "2 of 3" while
// flipping, and nothing is marked done. WRITE TO (or a tap on the card), or
// DONE on the card for something done outside the app, opens the one sheet
// (pages/one-sheet.js); LATER moves it to tomorrow. + CONNECTION
// beside the count starts one with someone new or someone you know
// (pages/reach-out.js, 20 Nov: was REACH OUT, too quiet to see). No overdue
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
import { wireCard, cardAway, cardIn, settleBack } from './card-swipe.js';
import { writeTo } from './move-done.js';
import { fresh, frontAt, flipTo, inFront, flipWords } from '../data/flip.js';
import { openReachOut } from './reach-out.js';
import { openAddPerson } from './add-person.js';
import { doneTodayHtml, wireDoneToday } from './done-today.js';
import { leadsHtml, openLeads } from './leads.js';
import { postSlipsHtml, wirePostSlips } from './post-slip.js';

// The count, + CONNECTION beside it (rounds/06; a filled pill since 20 Nov), and the arc.
const head = (count, arc) => `<div class="today-head"><span class="today-count-row">${count ? `<span class="today-count">${count}</span>` : ''}<button type="button" class="today-reach" data-reach>${PLUS}Connection</button></span>${arc}</div>`;

// The card in front while flipping (data/flip.js); a new visit to Today
// starts at the first again.
let flip = fresh();

// left: the people still waiting, in order; at: where the one in front
// sits among them. The stack shows it first, the next two behind it.
function stackHtml(pick, left, today, at) {
  const n = pick.ids.length;
  const [top, next, after] = inFront(left, at);
  const words = flipWords(pick.ids, left.map((p) => p.id), at);
  const label = words ? `Move ${words}` : `Move ${n - left.length + 1} of ${n}`;
  return `
    ${head(words || countWords(n, left.length), arcHtml(pick, top.id, label))}
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

export async function todayScreen(view, { beside = false, again = false } = {}) {
  const today = dayOf();
  if (!again) flip = fresh(today);
  const [{ people, pick, week }, { done: doneToday }] = await Promise.all([loadToday(), loadDone()]);
  const [leads, slips] = await Promise.all([leadsHtml(people), postSlipsHtml(people).catch(() => '')]);
  const byId = new Map(people.map((p) => [p.id, p]));
  const left = waiting(pick).map((id) => byId.get(id));
  const ids = left.map((p) => p.id);
  const at = frontAt(ids, flip, today);
  view.innerHTML = `<div class="screen"><div class="scroll">${bandHtml({ title: 'Rounds', place: 'Today' })}${slips}${leads}${left.length ? stackHtml(pick, left, today, at) : calmHtml(people, pick, today, week)}${doneTodayHtml(doneToday)}</div></div>`;
  fillPhotos(view, people);
  if (beside) return;
  const redraw = () => todayScreen(view, { again: true }).then(() => view.querySelector('.screen')?.classList.add('still'));
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
  const top = left[at];
  // While flipping, the front stays where it is (its card gone, the one after it comes up); otherwise it's the first.
  flip = at ? { day: today, id: top.id, at } : fresh(today);
  const holder = view.querySelector('.card-top');
  const card = holder.querySelector('.card.top');
  // A swipe left shows the next card, right the one before; with one card there's nothing to flip to.
  const turn = async (sign, dx) => {
    if (left.length < 2) { settleBack(holder, dx); return; }
    await cardAway(holder, sign, dx);
    flip = flipTo(ids, at, -sign, today);
    await redraw();
    const next = view.querySelector('.card-top');
    if (next) cardIn(next);
  };
  const later = async () => {
    await Promise.all([laterMove(top), cardAway(holder, 0)]);
    await redraw();
  };
  // Their due move done on the sheet: the card goes off to the side.
  const open = () => writeTo(top, redraw, { gone: (d) => (d.line.extra ? null : cardAway(holder, 1, 0)) });
  wireCard(holder, card, { onOpen: open, onSwipe: turn, onDone: open });
  view.querySelector('[data-write]').addEventListener('click', open);
  view.querySelector('[data-later]').addEventListener('click', later);
}
