// What a promise needs (21 Nov): WHO PROMISED (I promised, or they did),
// WHAT, and BY WHEN (optional). On + PROMISE's sheet (pages/promise-add.js),
// and under "Anything promised?" on the one sheet (pages/one-promise.js), as
// Callback's log sheet had it.
import { esc } from './util.js';
import { WHAT_MOST } from '../data/promises.js';
import { firstName } from '../data/fill.js';
import { longDay } from '../data/dates.js';

const chip = (on, mine, label) => `<button type="button" class="pick-chip${on ? ' on' : ''}" data-mine="${mine}" aria-pressed="${on}">${esc(label)}</button>`;

// I promised / <their first name> promised; mine: which is on.
export const whoChipsHtml = (person, mine = true) => `<div class="pick-chips">${chip(mine, 'yes', 'I promised')}${chip(!mine, 'no', `${firstName(person.name) || 'They'} promised`)}</div>`;

// BY WHEN: the day in words over a date picker. id: the picker's; due: its day ('' none).
export const byWhenHtml = (id, today, due = '') => `<span class="moment-when"><span class="moment-when-words"></span><input type="date" id="${esc(id)}" min="${esc(today)}" value="${esc(due)}" /></span>`;

// + PROMISE's sheet: the chips, then WHAT, then BY WHEN.
export const promiseFieldsHtml = (person, today) => `<p class="label moment-label">Who promised</p>
    ${whoChipsHtml(person)}
    <label class="label moment-label" for="promiseWhat">What</label>
    <textarea class="move-text" id="promiseWhat" rows="2" maxlength="${WHAT_MOST}" placeholder="Send the selects"></textarea>
    <label class="label moment-label" for="promiseDue">By when (optional)</label>
    ${byWhenHtml('promiseDue', today)}`;

// box: what holds the chips and the picker. They work, and read() gives
// { mine, due } as they stand. start: { mine, due } to begin with.
export function wirePromiseFields(box, today, { mine: firstMine = true, due: firstDue = '' } = {}) {
  let mine = firstMine !== false;
  let due = firstDue || '';
  const words = box.querySelector('.moment-when-words');
  const drawDue = () => { words.textContent = due ? longDay(due) : 'No day'; };
  drawDue();
  box.querySelector('input[type="date"]').addEventListener('change', (e) => {
    due = e.target.value && e.target.value >= today ? e.target.value : ''; // cleared, or a day gone: none
    e.target.value = due;
    drawDue();
  });
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mine]');
    if (!b) return;
    mine = b.dataset.mine === 'yes';
    box.querySelectorAll('[data-mine]').forEach((c) => { const on = (c.dataset.mine === 'yes') === mine; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); });
  });
  return { read: () => ({ mine, due }) };
}
