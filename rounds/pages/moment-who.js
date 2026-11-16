// ADD A MOMENT from Done today (round 2, thanks/NOTES.md): first who it was
// with, a box to find them by name or handle over everyone in Rounds (those
// done today first), then the same sheet as on their page.
import { openSheet } from '../components/sheet.js';
import { photoHtml, fillPhotos } from '../components/photo.js';
import { esc } from '../components/util.js';
import { handleText } from '../data/contact.js';
import { listPeople } from '../data/db.js';
import { openMoment } from './moment-sheet.js';

const MOST = 30; // rows at a time: the box finds the rest

// The people to pick from, for what's typed: name or handle, the ones
// done today (ids) first, then by name.
export function whoList(people, typed, firstIds = []) {
  const t = String(typed ?? '').trim().toLowerCase().replace(/^@/, '');
  const hit = (p) => !t || [p.name, p.instagram, p.tiktok].some((v) => String(v || '').toLowerCase().includes(t));
  const rank = (p) => (firstIds.includes(p.id) ? 0 : 1);
  return people.filter((p) => !p.letGo && hit(p)).sort((a, b) => rank(a) - rank(b) || String(a.name).localeCompare(String(b.name))).slice(0, MOST);
}

// firstIds: the people done today. after: Today drawn again.
export async function openMomentWho(firstIds, after) {
  const people = await listPeople();
  const s = openSheet({
    title: 'A moment with',
    className: 'sheet-small moment-who',
    body: `<div class="field"><input type="search" id="momentWho" placeholder="Name or handle" autocomplete="off" aria-label="Who with" /></div>
      <div class="choice-list"></div>`,
  });
  const list = s.body.querySelector('.choice-list');
  let shown = [];
  const draw = () => {
    shown = whoList(people, s.body.querySelector('input').value, firstIds);
    list.innerHTML = shown.map((p, i) => `<button type="button" class="choice" data-who="${i}">${photoHtml(p, 'small')}<span class="choice-text"><span class="choice-label">${esc(p.name)}</span>${handleText(p) ? `<span class="choice-detail">${esc(handleText(p))}</span>` : ''}</span></button>`).join('');
    fillPhotos(list, shown);
  };
  draw();
  s.body.querySelector('input').addEventListener('input', draw);
  list.addEventListener('click', (e) => {
    const b = e.target.closest('[data-who]');
    if (!b) return;
    const p = shown[Number(b.dataset.who)];
    s.close();
    openMoment(p, { after });
  });
}
