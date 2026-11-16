// Merge into one person (Tightening Rounds, rounds/11, 16 Nov), from the
// suggestion on People or Merge with... in a person's menu: the two side by
// side, tap one to keep its name and photo (KEEP THIS NAME), then MERGE.
// Everything comes together (data/merge-people.js), with Undo for a few
// seconds; once that's gone, the one list of people makes them one too, so
// their shoots in The Eye and boards in Ref come along. Sync carries it.
import { openSheet } from '../components/sheet.js';
import { photoHtml, fillPhotos, forgetPhoto } from '../components/photo.js';
import { toast } from '../components/toast.js';
import { esc } from '../components/util.js';
import { searchBoxHtml, wireSearch } from '../components/person-search.js';
import { listPeople, listMoves } from '../data/db.js';
import { handleText } from '../data/contact.js';
import { GROUPS } from '../data/plan.js';
import { loggedWords } from '../data/merge-people.js';
import { mergeInto, undoMerge, joinShared } from '../data/people-store.js';

const UNDO_FOR = 5400; // the toast's Undo, and a little more

// The one list of people hears of it once Undo can't take it back (or as
// the page goes, if that's sooner).
function joinLater(undo) {
  let timer = null;
  const go = () => { clearTimeout(timer); removeEventListener('pagehide', go); joinShared(undo).catch(() => {}); };
  timer = setTimeout(go, UNDO_FOR);
  addEventListener('pagehide', go);
  return () => { clearTimeout(timer); removeEventListener('pagehide', go); };
}

const cardHtml = (p, lines, on) => `<button type="button" class="merge-card${on ? ' on' : ''}" data-keep="${esc(p.id)}" aria-pressed="${on}">${photoHtml(p)}
  <span class="merge-name">${esc(p.name)}</span><span class="merge-handle">${esc(handleText(p) || 'no handle')}</span>
  <span class="merge-count">${esc(`${GROUPS[p.group] || GROUPS.new} · ${loggedWords(lines, p.id)}`)}</span>
  <span class="merge-keep">Keep this name${on ? ' ✓' : ''}</span></button>`;

// after(kept): once merged, or put back (kept: the person who stays).
export async function openMerge(a, b, after) {
  const lines = await listMoves();
  let keep = a;
  const s = openSheet({
    title: 'Merge into one person',
    className: 'sheet-small merge-sheet',
    body: `<div class="merge-cards"></div>
      <p class="merge-what">Everything from both comes together: what you've done, notes, shoots, handles and groups. Pick which name and photo to keep.</p>
      <p class="merge-undo">Undo is there for a few seconds after. Sync and the other notebooks follow.</p>
      <button type="button" class="btn primary merge-go" data-merge>Merge</button>`,
  });
  const cards = s.body.querySelector('.merge-cards');
  const draw = () => { cards.innerHTML = [a, b].map((p) => cardHtml(p, lines, p === keep)).join(''); fillPhotos(cards, [a, b]); };
  draw();
  cards.addEventListener('click', (e) => {
    const c = e.target.closest('[data-keep]');
    if (c) { keep = c.dataset.keep === a.id ? a : b; draw(); }
  });
  s.body.querySelector('[data-merge]').addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    const undo = await mergeInto(keep, keep === a ? b : a);
    [a.id, b.id].forEach(forgetPhoto);
    s.close();
    const stop = joinLater(undo);
    await after(undo.keep);
    const name = undo.keep.name;
    toast(`Merged into ${name}${name.endsWith('.') ? '' : '.'}`, { action: { label: 'Undo', run: async () => {
      stop();
      await undoMerge(undo);
      [a.id, b.id].forEach(forgetPhoto);
      await after(undo.keep);
    } } });
  });
  return s;
}

// Merge with...: who the other one is (anyone but them), then the merge sheet.
export async function openMergeWith(person, after) {
  const [people, lines] = await Promise.all([listPeople(), listMoves()]);
  const s = openSheet({
    title: 'Merge with',
    className: 'reach-sheet',
    body: `${searchBoxHtml('Search by name or handle')}<div class="pick-list" data-found></div>`,
  });
  wireSearch(s.body, people.filter((p) => p.id !== person.id), lines, { onPick: (p) => { s.close(); openMerge(person, p, after); } });
  return s;
}
