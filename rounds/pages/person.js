// A person (04-person): photo, name, handle (opens their profile), one line
// (their group, and where you met or why they're a fit), then their next
// move, which opens it. The ... menu: Edit, a photo, and Let go.
import { shortBandHtml } from '../components/band.js';
import { photoHtml, fillPhotos } from '../components/photo.js';
import { miniHtml } from '../components/marks.js';
import { toast } from '../components/toast.js';
import { esc } from '../components/util.js';
import { CHEV_SMALL } from '../components/icons.js';
import { getPerson } from '../data/db.js';
import { GROUPS } from '../data/plan.js';
import { phrase } from '../data/reasons.js';
import { handleText, profileUrl } from '../data/contact.js';
import { dayOf, dueWords } from '../data/dates.js';
import { doMove, undoMove, laterMove } from '../data/moves.js';
import { openMove } from './move.js';
import { openPersonMenu } from './person-menu.js';

function restHtml(p) {
  if (p.letGo) return 'Let go. Everything about them is kept, and the menu can bring them back.';
  if (p.group === 'guest') return 'That was the one move. Event guests can go on your newsletter instead: Edit has the lists.';
  return 'Nothing planned. Rounds let this one rest.';
}

export async function personScreen(view, id) {
  const p = await getPerson(id);
  if (!p) { location.replace('#/people'); return; }
  const handle = handleText(p);
  const url = profileUrl(p);
  const line = [GROUPS[p.group], p.note || p.where].filter(Boolean).join('. ');
  const next = p.next && !p.letGo;
  view.innerHTML = `<div class="screen"><div class="scroll">
    ${shortBandHtml({ place: 'People', back: '#/people', more: 'More' })}
    <div class="person-top">
      ${photoHtml(p)}
      <h1 class="person-name">${esc(p.name)}</h1>
      ${handle ? (url ? `<a class="person-handle" href="${esc(url)}" target="_blank" rel="noopener" data-test-skip>${esc(handle)} ${CHEV_SMALL}</a>` : `<span class="person-handle">${esc(handle)}</span>`) : ''}
      <!-- The handle opens their profile on Instagram (or TikTok, or their website): the button clicker leaves it alone. -->
      <p class="person-line">${esc(line.endsWith('.') ? line : `${line}.`)}</p>
    </div>
    ${next ? `<button type="button" class="person-next" data-move>${miniHtml(p.next.kind)}<span class="person-next-what">${esc(phrase(p.next.kind, p.name))}</span><span class="person-next-when">${esc(dueWords(p.next.due, dayOf()))} ${CHEV_SMALL}</span></button>`
      : `<p class="person-rest note">${esc(restHtml(p))}</p>`}
  </div></div>`;
  fillPhotos(view, [p]);
  const redraw = () => personScreen(view, id).then(() => view.querySelector('.screen')?.classList.add('still'));
  view.querySelector('[data-band-more]').addEventListener('click', () => openPersonMenu(p, redraw));
  view.querySelector('[data-move]')?.addEventListener('click', () => openMove(p, {
    onDone: async () => {
      const undo = await doMove(p);
      await redraw();
      toast('Done.', { action: { label: 'Undo', run: () => undoMove(undo).then(redraw) } });
    },
    onLater: () => laterMove(p).then(redraw),
  }));
}
