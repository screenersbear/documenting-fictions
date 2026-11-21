// The slip at the top of Today when a post shared from Layouts tags people
// Rounds knows (round 2, connect): the shoot, who's tagged (their photos),
// then WRITE TO <NAME> (the first one's move, as from their card) or NOT
// NOW. Their moves stay on Today either way (data/photos-up.js). It shows once.
// Inside the suite only: on its own, Rounds has no Layouts (rounds/STANDALONE.md).
import { photoHtml } from '../components/photo.js';
import { esc } from '../components/util.js';
import { firstName } from '../data/fill.js';
import { slipLine, writeWho } from '../data/photos-up.js';

const C = () => window.DFConnect;

const personHtml = (p) => `<span class="rd-slip-person">${photoHtml(p, 'small')}<span class="rd-slip-name">${esc(firstName(p.name))}</span></span>`;

// Every slip waiting here, as markup. people: everyone, for their names and photos.
export async function postSlipsHtml(people) {
  if (!window.DF_SUITE || !C() || !window.DFData) return '';
  const byId = new Map(people.map((p) => [p.id, p]));
  const out = [];
  for (const link of await C().slipsFor('rounds')) {
    if (link.type !== 'post-people' || !link.takenAt) continue;
    const who = (link.people || []).map((id) => byId.get(id)).filter((p) => p && !p.letGo);
    if (!who.length) continue;
    const names = who.map((p) => p.name);
    out.push(C().slipHtml({
      link,
      title: link.title || 'A new post',
      line: slipLine(names),
      body: `<div class="rd-slip-people" data-first="${esc(who[0].id)}">${who.map(personHtml).join('')}</div>`,
      main: writeWho(names),
    }));
  }
  return out.join('');
}

// WRITE TO opens the first one's move (open(id)); NOT NOW tucks the slip away.
export function wirePostSlips(root, open) {
  root.querySelectorAll('.df-slip[data-slip]').forEach((slip) => slip.addEventListener('click', async (e) => {
    const go = e.target.closest('[data-slip-open]');
    if (!go && !e.target.closest('[data-slip-later]')) return;
    const link = await window.DFData.getLink(slip.dataset.slip);
    if (!link) return;
    await (go ? C().openSlip(link) : C().tuckSlip(link));
    const first = slip.querySelector('[data-first]')?.dataset.first;
    slip.remove();
    if (go && first) open(first);
  }));
}
