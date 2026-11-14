// Import people (rounds/NOTES.md): a CSV file from Files, OneDrive or
// iCloud. Before anything is added, the list, every row ticked, to untick
// anyone; then ADD N PEOPLE. Anyone Rounds has already is skipped, and so
// is a row with no name; both are counted, and never stop the import. Their
// first moves join Today a few at a time.
import { openSheet } from '../components/sheet.js';
import { toast } from '../components/toast.js';
import { esc, uuid } from '../components/util.js';
import { pickFile } from '../components/files.js';
import { readPeople, newOnes } from '../data/csv.js';
import { fromImport } from '../data/person.js';
import { GROUPS } from '../data/plan.js';
import { listPeople, savePeople, getSetting } from '../data/db.js';
import { PER_DAY, perDayOf } from '../data/today.js';
import { dayOf } from '../data/dates.js';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export async function openImport(onAdded) {
  const file = await pickFile('.csv,text/csv,text/comma-separated-values');
  if (!file) return null;
  let found;
  try { found = readPeople(await file.text()); } catch (e) { toast(e.message, { ms: 6000 }); return null; }
  const { fresh, skipped } = newOnes(found.rows, await listPeople());
  const notes = [skipped && `${plural(skipped, 'person is', 'people are')} in Rounds already and won't be added again.`, found.bad && `${plural(found.bad, 'row has', 'rows have')} no name and ${found.bad === 1 ? 'is' : 'are'} left out.`].filter(Boolean).join(' ');
  if (!fresh.length) { toast(`No one new to add. ${notes}`.trim(), { ms: 6000 }); return null; }
  const s = openSheet({
    title: 'Import people',
    body: `
      ${notes ? `<p class="import-sum">${esc(notes)}</p>` : ''}
      <div class="import-list">${fresh.map((r, i) => `
        <label class="import-row"><input type="checkbox" checked data-i="${i}" />
          <span class="import-who"><span class="import-name">${esc(r.name)}</span><span class="import-meta">${esc([GROUPS[r.group], r.instagram && `@${r.instagram}`, r.note || r.where].filter(Boolean).join(' · '))}</span></span></label>`).join('')}</div>
      <div class="sheet-actions one"><button type="button" class="btn primary" data-add></button></div>`,
  });
  const ticks = [...s.body.querySelectorAll('[data-i]')];
  const add = s.body.querySelector('[data-add]');
  const label = () => {
    const n = ticks.filter((t) => t.checked).length;
    add.textContent = n === 1 ? 'Add 1 person' : `Add ${n} people`;
    add.disabled = !n;
  };
  label();
  s.body.addEventListener('change', label);
  add.addEventListener('click', async () => {
    const rows = fresh.filter((_, i) => ticks[i].checked);
    const perDay = perDayOf(await getSetting('perDay', PER_DAY));
    await savePeople(fromImport(rows, dayOf(), perDay, uuid));
    s.close();
    toast(`${plural(rows.length, 'person', 'people')} added. Their first moves join Today a few at a time.`, { ms: 5000 });
    onAdded();
  });
  return s;
}
