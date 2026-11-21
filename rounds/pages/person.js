// A person (04-person): photo (a tap changes it, cropped first: 20 Nov), name, handle (opens their profile), one line
// (their group, and where you met or why they're a fit), then their next
// move, which opens the one sheet (pages/one-sheet.js), then their open
// PROMISES (pages/person-promises.js, 21 Nov). After a pitch, HOW DID THE PITCH GO? comes between
// (pages/person-pitch.js). Under it ADD A MOMENT (pages/moment-sheet.js)
// and SO FAR, everything done with them (pages/so-far.js, thanks/06). In
// the suite, EVERYTHING WITH <NAME>, IN ALL FOUR at the bottom opens their
// page on the shelf (connect/08). The ... menu: Edit, a photo, Yes, Add a
// promise, Merge with..., Let go and Delete.
import { shortBandHtml } from '../components/band.js';
import { photoHtml, fillPhotos } from '../components/photo.js';
import { miniHtml } from '../components/marks.js';
import { moveLook } from '../data/kinds.js';
import { esc } from '../components/util.js';
import { CHEV_SMALL } from '../components/icons.js';
import { getPerson, listMoves } from '../data/db.js';
import { pitchedOn, asksAboutPitch, saidYes, yesLine } from '../data/pitch.js';
import { GROUPS, groupWords } from '../data/plan.js';
import { phrase } from '../data/reasons.js';
import { handleText, profileUrl } from '../data/contact.js';
import { dayOf, dueWords } from '../data/dates.js';
import { getWeek } from '../data/moves.js';
import { writeTo } from './move-done.js';
import { whenDue } from '../data/work-days.js';
import { shelfPageOf } from '../data/people-out.js';
import { firstName } from '../data/fill.js';
import { openPersonMenu } from './person-menu.js';
import { changePhoto } from './person-photo.js';
import { pitchHtml, wirePitch } from './person-pitch.js';
import { openMoment } from './moment-sheet.js';
import { soFarHtml, wireSoFar } from './so-far.js';
import { openSaid } from './what-you-said.js';
import { doneSoFar } from '../data/so-far.js';
import { eyeShoots } from '../data/eye.js';
import { personPromisesHtml, wirePersonPromises } from './person-promises.js';

function restHtml(p) {
  if (p.letGo) return 'Let go. Everything about them is kept, and the menu can bring them back.';
  if (p.group === 'guest') return 'That was the one move. Event guests can go on your newsletter instead: Edit has the lists.';
  return 'Nothing planned. Rounds let this one rest.';
}

export async function personScreen(view, id) {
  const [p, week, lines] = await Promise.all([getPerson(id), getWeek(), listMoves()]);
  if (!p) { location.replace('#/people'); return; }
  const rows = doneSoFar(p, lines, eyeShoots());
  const handle = handleText(p);
  const url = profileUrl(p);
  // The day of their pitch, from the log for a pitch from before Rounds kept it.
  const pitched = pitchedOn(p, !p.pitched && (p.group === 'prospect' || p.pitch) ? lines : []);
  const asks = asksAboutPitch(p, pitched);
  const line = saidYes(p) ? yesLine(pitched) : [GROUPS[p.group] && groupWords(p), p.note || p.where].filter(Boolean).join('. ');
  const next = p.next && !p.letGo;
  view.innerHTML = `<div class="screen"><div class="scroll">
    ${shortBandHtml({ place: 'People', back: '#/people', more: 'More' })}
    <div class="person-top">
      <button type="button" class="person-photo-btn" data-photo aria-label="Change the photo">${photoHtml(p)}</button>
      <h1 class="person-name">${esc(p.name)}</h1>
      ${handle ? (url ? `<a class="person-handle" href="${esc(url)}" target="_blank" rel="noopener" data-test-skip>${esc(handle)} ${CHEV_SMALL}</a>` : `<span class="person-handle">${esc(handle)}</span>`) : ''}
      <!-- The handle opens their profile on Instagram (or TikTok, or their website): the button clicker leaves it alone. -->
      <p class="person-line">${esc(line.endsWith('.') ? line : `${line}.`)}</p>
    </div>
    ${asks ? await pitchHtml(p, pitched) : ''}
    ${next ? `<button type="button" class="person-next" data-move>${miniHtml(moveLook(p.next))}<span class="person-next-what">${esc(phrase(p.next.kind, p.name, p.next.year))}</span><span class="person-next-when">${esc(dueWords(whenDue(p.next, week, dayOf()), dayOf()))} ${CHEV_SMALL}</span></button>`
      : `<p class="person-rest note">${esc(restHtml(p))}</p>`}
    ${personPromisesHtml(p)}
    <button type="button" class="btn secondary person-moment" data-moment>Add a moment</button>
    ${soFarHtml(rows, p)}
  </div></div>`;
  fillPhotos(view, [p]);
  const screen = view.querySelector('.screen');
  shelfPageOf(p).then((page) => {
    if (!page || !screen.isConnected) return; // drawn again meanwhile: that one adds its own
    screen.querySelector('.scroll').insertAdjacentHTML('beforeend', `<a class="person-everything" href="${esc(page)}">Everything with ${esc(firstName(p.name) || 'them')}, in all four ${CHEV_SMALL}</a>`);
  });
  const redraw = () => personScreen(view, id).then(() => view.querySelector('.screen')?.classList.add('still'));
  view.querySelector('[data-band-more]').addEventListener('click', () => openPersonMenu(p, redraw, { asks, pitched }));
  view.querySelector('[data-photo]').addEventListener('click', () => changePhoto(p, redraw));
  wirePitch(view, p, pitched, redraw);
  view.querySelector('[data-moment]').addEventListener('click', () => openMoment(p, { after: redraw }));
  wireSoFar(view, p, rows, lines, redraw);
  wirePersonPromises(view, p, redraw);
  view.querySelector('[data-move]')?.addEventListener('click', () => writeTo(p, redraw));
  // Sent here to do the move (The Eye's OPEN ROUNDS), or to add a moment
  // (the person page on the shelf): it opens once.
  const once = (key) => {
    try { const v = sessionStorage.getItem(key) || ''; sessionStorage.removeItem(key); return v; } catch (e) { return ''; } // private mode
  };
  if (once('rounds-open-move') === id) view.querySelector('[data-move]')?.click();
  if (once('rounds-open-moment') === id) view.querySelector('[data-moment]').click();
  // A move tapped on their page on the shelf: What you said, for it.
  const said = once('rounds-open-said');
  const saidLine = said && lines.find((l) => l.id === said && l.personId === id);
  if (saidLine) openSaid(p, saidLine, redraw);
}
