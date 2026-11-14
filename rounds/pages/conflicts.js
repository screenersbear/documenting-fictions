// "Changed on two devices" (Callback's design): when the same thing was
// changed both here and on another device since they last agreed, Rounds
// asks which to keep, one at a time ("1 of 3"), showing only what differs,
// the other device first. The newer one is the main button. For something
// deleted on one side and changed on the other: Keep or Delete.
import { openSheet } from '../components/sheet.js';
import { toast } from '../components/toast.js';
import { esc } from '../components/util.js';
import { getConflicts } from '../data/sync.js';
import { resolve } from '../data/auto-sync.js';
import { subjectOf, clashRows, newerSide } from '../data/clash.js';
import { deviceLabel } from '../data/sync-file.js';

const btn = (side, label, main) => `<button type="button" class="btn ${main ? 'primary' : 'secondary'}" data-side="${side}">${esc(label)}</button>`;

function clashHtml(c, at, of) {
  const there = c.from ? `the ${c.from}` : 'the other device';
  const here = `this ${deviceLabel(navigator.userAgent)}`;
  const count = of > 1 ? `<p class="clash-count">${at} of ${of}</p>` : '';
  if (c.kind !== 'both') {
    const what = c.kind === 'deletedThere' ? `Deleted on ${there}, changed on ${here}.` : `Deleted on ${here}, changed on ${there}.`;
    return `${count}<h3 class="clash-what">${esc(subjectOf(c))}</h3><p class="clash-note">${esc(what)}</p>
      <div class="sheet-actions">${btn('delete', 'Delete', false)}${btn('keep', 'Keep', true)}</div>`;
  }
  const newer = newerSide(c);
  const rows = clashRows(c).map((r) => `<div class="clash-row"><span class="field-label">${esc(r.label)}</span>
    <span class="clash-side"><span class="clash-who">${esc(there)}${newer === 'theirs' ? ' (newer)' : ''}</span>${esc(r.theirs)}</span>
    <span class="clash-side"><span class="clash-who">${esc(here)}${newer === 'mine' ? ' (newer)' : ''}</span>${esc(r.mine)}</span></div>`).join('');
  return `${count}<h3 class="clash-what">${esc(subjectOf(c))}</h3>${rows}
    <div class="sheet-actions">${btn('theirs', `Keep ${there}'s`, newer === 'theirs')}${btn('mine', `Keep ${here}'s`, newer === 'mine')}</div>`;
}

export async function openConflicts(onChange) {
  let list = await getConflicts();
  if (!list.length) return null;
  let at = 0;
  const s = openSheet({ title: 'Changed on two devices', className: 'sheet-small', body: '<div class="clash"></div>' });
  const box = s.body.querySelector('.clash');
  const draw = () => { box.innerHTML = clashHtml(list[at], at + 1, list.length); };
  draw();
  box.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-side]');
    if (!b) return;
    box.querySelectorAll('button').forEach((x) => { x.disabled = true; });
    const { stale } = await resolve(list[at], b.dataset.side);
    if (stale) toast('That changed here again since. Rounds asks again after the next sync.', { ms: 5000 });
    list = await getConflicts();
    onChange();
    if (!list.length) s.close();
    else { at = Math.min(at, list.length - 1); draw(); }
  });
  return s;
}
