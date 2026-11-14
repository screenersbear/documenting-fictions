// Import people (rounds/NOTES.md): a CSV file from Files, OneDrive or
// iCloud. Before anything is added, the list, every row ticked, to untick
// anyone; then ADD N PEOPLE. Anyone Rounds has already is skipped, and so
// is a row with no name; both are counted, and never stop the import. Their
// first moves join Today a few at a time.
import { toast } from '../components/toast.js';
import { uuid } from '../components/util.js';
import { pickFile } from '../components/files.js';
import { readPeople, newOnes } from '../data/csv.js';
import { fromImport } from '../data/person.js';
import { listPeople, savePeople, getSetting } from '../data/db.js';
import { PER_DAY, perDayOf } from '../data/today.js';
import { dayOf } from '../data/dates.js';
import { openReview } from './review.js';

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
// Who was left out of a list, and why (rows of a file, or leads).
export const leftOut = (skipped, bad, [one, many] = ['row', 'rows']) => [skipped && `${plural(skipped, 'person is', 'people are')} in Rounds already and won't be added again.`, bad && `${plural(bad, `${one} has`, `${many} have`)} no name and ${bad === 1 ? 'is' : 'are'} left out.`].filter(Boolean).join(' ');
// People added: their first moves join Today a few at a time.
export async function addRows(rows) {
  const perDay = perDayOf(await getSetting('perDay', PER_DAY));
  await savePeople(fromImport(rows, dayOf(), perDay, uuid));
  toast(`${plural(rows.length, 'person', 'people')} added. Their first moves join Today a few at a time.`, { ms: 5000 });
}

export async function openImport(onAdded) {
  const file = await pickFile('.csv,text/csv,text/comma-separated-values');
  if (!file) return null;
  let found;
  try { found = readPeople(await file.text()); } catch (e) { toast(e.message, { ms: 6000 }); return null; }
  const { fresh, skipped } = newOnes(found.rows, await listPeople());
  const notes = leftOut(skipped, found.bad);
  if (!fresh.length) { toast(`No one new to add. ${notes}`.trim(), { ms: 6000 }); return null; }
  return openReview({
    title: 'Import people',
    notes,
    items: fresh.map((row) => ({ row })),
    onAdd: async (ticked) => {
      await addRows(fresh.filter((_, i) => ticked[i]));
      onAdded();
    },
  });
}
