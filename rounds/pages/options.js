// Options, from the band's menu: how many moves a day (three, at most five),
// the work days, Sync (with Claude, through GitHub), Import people, the two
// newsletter lists to export, and How it works.
import { openSheet } from '../components/sheet.js';
import { toast } from '../components/toast.js';
import { CHEV } from '../components/icons.js';
import { saveFile } from '../components/files.js';
import { getSetting, setSetting, listPeople } from '../data/db.js';
import { PER_DAY, MOST, perDayOf } from '../data/today.js';
import { WEEK, workDaysOf, toggleDay } from '../data/work-days.js';
import { listRows } from '../data/lists.js';
import { toCsv } from '../data/csv.js';
import { dayOf } from '../data/dates.js';
import { openImport } from './import.js';
import { openIntro } from './intro.js';
import { syncRowHtml, openSync } from './sync-sheet.js';

const row = (attr, label, detail = '') => `<button type="button" class="choice" ${attr}><span class="choice-text"><span class="choice-label">${label}</span>${detail ? `<span class="choice-detail">${detail}</span>` : ''}</span>${CHEV}</button>`;
const LISTS = { email: ['Email newsletter list', 'rounds-email-list'], mail: ['Mail newsletter list', 'rounds-mail-list'] };

// onChange: something Today or People shows has changed.
// autoHandler: what to do after each sync, once sync is turned on here.
export async function openOptions(onChange, autoHandler) {
  const [perDay, people, workDays, syncRow] = await Promise.all([getSetting('perDay', PER_DAY), listPeople(), getSetting('workDays', null), syncRowHtml()]);
  let n = perDayOf(perDay);
  let days = workDaysOf(workDays);
  const chips = () => WEEK.map(([d, name]) => `<button type="button" class="day-chip${days.includes(d) ? ' on' : ''}" data-day="${d}" aria-pressed="${days.includes(d)}">${name}</button>`).join('');
  const count = (which) => listRows(people, which).length - 1;
  const people1 = (k) => (k === 1 ? '1 person' : `${k} people`);
  const s = openSheet({
    title: 'Options',
    body: `
      <div class="switch-row"><span>Moves a day</span>
        <span class="stepper"><button type="button" data-step="-1" aria-label="Fewer"><span>−</span></button><output data-n>${n}</output><button type="button" data-step="1" aria-label="More"><span>+</span></button></span></div>
      <div class="work-days"><span class="field-label">Work days</span><div class="day-chips">${chips()}</div><p class="work-days-note">Pitches and follow ups wait for these days.</p></div>
      <div class="choice-list">
        ${syncRow}
        ${row('data-import', 'Import people', 'From a CSV file')}
        ${row('data-list="email"', 'Export the email list', `${people1(count('email'))}, for your newsletter tool`)}
        ${row('data-list="mail"', 'Export the mail list', `${people1(count('mail'))}, names and addresses`)}
        ${row('data-intro', 'How it works')}
      </div>`,
  });
  const out = s.body.querySelector('[data-n]');
  s.body.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.day) {
      days = toggleDay(days, Number(b.dataset.day));
      s.body.querySelector('.day-chips').innerHTML = chips();
      await setSetting('workDays', days);
      onChange();
    } else if (b.dataset.step) {
      const to = Math.min(MOST, Math.max(1, n + Number(b.dataset.step)));
      if (to === n) return;
      n = to;
      out.textContent = String(n);
      await setSetting('perDay', n);
      onChange();
    } else if (b.matches('[data-import]')) { s.close(); openImport(onChange); }
    else if (b.matches('[data-sync]')) { s.close(); openSync(onChange, autoHandler); }
    else if (b.matches('[data-intro]')) { s.close(); openIntro(); }
    else if (b.dataset.list) {
      const which = b.dataset.list;
      if (!count(which)) { toast(`No one is on the ${which} list yet. Edit a person to add them.`); return; }
      const [, name] = LISTS[which];
      await saveFile(new File([toCsv(listRows(people, which))], `${name}-${dayOf()}.csv`, { type: 'text/csv' }));
    }
  });
  return s;
}
