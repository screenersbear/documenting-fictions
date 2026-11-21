// ADD A MOMENT (round 2, thanks/05, 16 Nov): something done with someone
// outside the planned moves. A MOMENT WITH <NAME>: WHAT HAPPENED (one pick),
// WHEN (today, tap to change), A NOTE (OPTIONAL), and COUNTS AS KEEPING IN
// TOUCH (on) saying what it moves, then ADD THE MOMENT (with Undo). From a
// person's page, Done today, and the person page on the shelf (which opens
// Rounds here). A moment tapped in SO FAR opens the same sheet filled in:
// SAVE, or DELETE THE MOMENT (with Undo). From DONE TODAY (who), their
// photo and name on top go to their page (20 Nov).
import { openSheet } from '../components/sheet.js';
import { toast } from '../components/toast.js';
import { esc } from '../components/util.js';
import { whoHtml, wireWho } from '../components/who-row.js';
import { momentChoices, keepWords } from '../data/moments.js';
import { addMoment, changeMoment, dropMoment, undoMomentAdd, undoMomentDrop } from '../data/moment-store.js';
import { dayOf, addDays, shortDay, dateOf } from '../data/dates.js';
import { firstName } from '../data/fill.js';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// WHEN, as the box says it: "Today, Mon 16 Nov", "Yesterday, Sun 15 Nov", "Fri 13 Nov".
export function whenBox(day, today) {
  const words = `${WEEKDAYS[dateOf(day).getDay()]} ${shortDay(day)}`;
  if (day === today) return `Today, ${words}`;
  return day === addDays(today, -1) ? `Yesterday, ${words}` : words;
}

// person: as Rounds keeps them. line: a moment from the log, to change.
// after: draws what's behind again. who: show who it's with, as a way to their page.
export function openMoment(person, { line = null, after = async () => {}, who = false } = {}) {
  const today = dayOf();
  let what = line ? line.what : '';
  let day = line ? line.day : today;
  const s = openSheet({
    title: `A moment with ${firstName(person.name) || 'them'}`,
    className: 'sheet-small moment-sheet',
    body: `${who ? whoHtml(person) : ''}
      <p class="label moment-label">What happened</p>
      <div class="pick-chips">${momentChoices(person.name).map(([k, label]) => `<button type="button" class="pick-chip${k === what ? ' on' : ''}" data-what="${esc(k)}" aria-pressed="${k === what}">${esc(label)}</button>`).join('')}</div>
      <label class="label moment-label" for="momentDay">When</label>
      <span class="moment-when"><span class="moment-when-words"></span><input type="date" id="momentDay" max="${today}" value="${esc(day)}" /></span>
      <label class="label moment-label" for="momentNote">A note (optional)</label>
      <textarea class="move-text moment-note" id="momentNote" rows="3" maxlength="500">${esc(line ? line.note || '' : '')}</textarea>
      <label class="moment-keeps"><span class="moment-keeps-words">Counts as keeping in touch<span class="moment-keeps-sub"></span></span><input type="checkbox" class="switch" id="momentKeeps" ${!line || line.keeps ? 'checked' : ''} /></label>
      <div class="moment-btns"><button type="button" class="btn primary" data-save ${what ? '' : 'disabled'}>${line ? 'Save' : 'Add the moment'}</button>
      ${line ? '<button type="button" class="text-btn" data-delete>Delete the moment</button>' : ''}</div>`,
  });
  const $ = (sel) => s.body.querySelector(sel);
  wireWho(s, person);
  const draw = () => {
    $('.moment-when-words').textContent = whenBox(day, today);
    $('.moment-keeps-sub').textContent = $('#momentKeeps').checked ? keepWords(person, day, today) : 'Nothing in Rounds moves.';
  };
  draw();
  $('#momentKeeps').addEventListener('change', draw);
  $('#momentDay').addEventListener('change', (e) => {
    const v = e.target.value;
    day = v && v <= today ? v : today; // cleared, or a day to come: today
    e.target.value = day;
    draw();
  });
  s.body.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.what !== undefined) {
      what = b.dataset.what;
      s.body.querySelectorAll('[data-what]').forEach((c) => { c.classList.toggle('on', c.dataset.what === what); c.setAttribute('aria-pressed', c.dataset.what === what); });
      $('[data-save]').disabled = false;
    } else if (b.matches('[data-save]') && what) {
      const fields = { what, day, note: $('#momentNote').value, keeps: $('#momentKeeps').checked };
      s.close();
      if (line) {
        await changeMoment(person, line, fields);
        await after();
        return;
      }
      const undo = await addMoment(person, fields);
      await after();
      toast('Moment added.', { action: { label: 'Undo', run: () => undoMomentAdd(undo).then(after) } });
    } else if (b.matches('[data-delete]')) {
      s.close();
      const undo = await dropMoment(person, line);
      await after();
      toast('Moment deleted.', { action: { label: 'Undo', run: () => undoMomentDrop(undo).then(after) } });
    }
  });
  return s;
}
