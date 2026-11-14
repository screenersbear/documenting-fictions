// Claude's leads (inbox.json, rounds/NOTES.md): "N new leads from Claude",
// one quiet line on Today, and REVIEW: the same tick list as Import people,
// where each came from small under its name. Ticked ones are added; unticked
// ones go on the passed list and are never offered again. Leaving without
// deciding keeps them for next time.
import { toast } from '../components/toast.js';
import { esc } from '../components/util.js';
import { listPeople, addPassed } from '../data/db.js';
import { reviewLeads, passedOf } from '../data/inbox.js';
import { waitingLeads, leadsHandled } from '../data/sync.js';
import { request } from '../data/auto-sync.js';
import { openReview } from './review.js';
import { addRows, leftOut, plural } from './import.js';

// Today's line, when there are new ones ('' when not).
export async function leadsHtml(people) {
  const n = reviewLeads(await waitingLeads(), people).fresh.length;
  return n ? `<div class="today-leads"><span>${esc(plural(n, 'new lead', 'new leads'))} from Claude</span><button type="button" class="text-btn" data-leads>Review</button></div>` : '';
}

export async function openLeads(onChange) {
  const [entries, people] = await Promise.all([waitingLeads(), listPeople()]);
  const { fresh, skipped, bad } = reviewLeads(entries, people);
  const done = async () => {
    await leadsHandled(entries.map((e) => e.id));
    request(0);
    onChange();
  };
  if (!fresh.length) { await done(); return null; }
  return openReview({
    title: 'Leads from Claude',
    notes: leftOut(skipped, bad, ['lead', 'leads']),
    items: fresh.map((l) => ({ row: l.row, from: l.foundBy })),
    none: 'Pass on them all',
    onAdd: async (ticked) => {
      const add = fresh.filter((_, i) => ticked[i]);
      const pass = fresh.filter((_, i) => !ticked[i]);
      if (pass.length) await addPassed(pass.map(passedOf));
      if (add.length) await addRows(add.map((l) => l.row));
      else toast(`${plural(pass.length, 'lead', 'leads')} passed on. Claude won't offer ${pass.length === 1 ? 'it' : 'them'} again.`);
      await done();
    },
  });
}
