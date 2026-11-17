// ONE-TIME (see data/callback-read.js): Bring in from Callback, in Options.
// Pick a Callback backup (.json; it's only read). The same tick list as
// Claude's leads, everyone ticked, how many touchpoints under each name,
// then ADD N PEOPLE. Anyone Rounds has already gets the history, never a
// second copy. Syncs like any change.
import { toast } from '../components/toast.js';
import { uuid } from '../components/util.js';
import { pickFile } from '../components/files.js';
import { readCallback, NOT_CALLBACK } from '../data/callback-read.js';
import { bringPlan, bring, fromWords } from '../data/callback-bring.js';
import { listPeople, listMoves, savePeople, logMoves, getSetting } from '../data/db.js';
import { PER_DAY, perDayOf } from '../data/today.js';
import { dayOf } from '../data/dates.js';
import { openReview } from './review.js';
import { plural, leftOut } from './import.js';

const WHO = ['person', 'people'];
// What was done, after ADD.
export function broughtWords(picked) {
  const added = picked.filter((i) => !i.to).length;
  const kept = picked.length - added;
  return [added && `${plural(added, ...WHO)} added.`, kept && `${plural(kept, ...WHO)} in Rounds already got their history.`].filter(Boolean).join(' ');
}

export async function openFromCallback(onAdded) {
  const file = await pickFile('.json,application/json');
  if (!file) return null;
  let found;
  try { found = readCallback(JSON.parse(await file.text())); } catch (e) { toast(e instanceof SyntaxError ? NOT_CALLBACK : e.message, { ms: 6000 }); return null; }
  const { items, skipped } = bringPlan(found.people, await listPeople(), await listMoves());
  const notes = leftOut(skipped, found.bad, WHO);
  if (!items.length) { toast(`No one new to bring in. ${notes}`.trim(), { ms: 6000 }); return null; }
  return openReview({
    title: 'Bring in from Callback',
    notes,
    items: items.map((i) => ({ row: i.row, from: fromWords(i) })),
    onAdd: async (ticked) => {
      const picked = items.filter((_, i) => ticked[i]);
      const out = bring(picked, dayOf(), perDayOf(await getSetting('perDay', PER_DAY)), uuid, Date.now());
      await savePeople(out.people);
      await logMoves(out.lines);
      toast(broughtWords(picked), { ms: 5000 });
      onAdded();
    },
  });
}
