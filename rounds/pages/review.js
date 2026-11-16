// The tick list Import people and Claude's leads share (rounds/NOTES.md):
// everyone ticked, to untick anyone, then ADD N PEOPLE. A line on top says
// who was left out and why; Claude's leads show where they came from, small,
// under each name.
import { openSheet } from '../components/sheet.js';
import { esc } from '../components/util.js';
import { groupWords } from '../data/plan.js';

const metaOf = (r) => [groupWords(r).replace(/\. /g, ', '), r.instagram && `@${r.instagram}`, r.note || r.where].filter(Boolean).join(' · ');

// items: [{ row, from }]. onAdd(ticked) gets each item's tick, in order, once
// the button's pressed. none: the button's words with no one ticked (left
// out, it can't be pressed).
export function openReview({ title, notes = '', items, onAdd, none = '' }) {
  const s = openSheet({
    title,
    body: `
      ${notes ? `<p class="import-sum">${esc(notes)}</p>` : ''}
      <div class="import-list">${items.map(({ row, from }, i) => `
        <label class="import-row"><input type="checkbox" checked data-i="${i}" />
          <span class="import-who"><span class="import-name">${esc(row.name)}</span><span class="import-meta">${esc(metaOf(row))}</span>${from ? `<span class="import-from">${esc(from)}</span>` : ''}</span></label>`).join('')}</div>
      <div class="sheet-actions one"><button type="button" class="btn primary" data-add></button></div>`,
  });
  const ticks = [...s.body.querySelectorAll('[data-i]')];
  const add = s.body.querySelector('[data-add]');
  const label = () => {
    const n = ticks.filter((t) => t.checked).length;
    add.textContent = n === 1 ? 'Add 1 person' : n || !none ? `Add ${n} people` : none;
    add.disabled = !n && !none;
  };
  label();
  s.body.addEventListener('change', label);
  add.addEventListener('click', async () => {
    add.disabled = true;
    await onAdd(ticks.map((t) => t.checked));
    s.close();
  });
  return s;
}
