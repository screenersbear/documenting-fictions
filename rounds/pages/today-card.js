// What Today draws (01-today): the top card, the cards peeking out behind
// it, and the arc's stops (done in berry blade black, the one in front half
// teal in a ring, the rest open). The top card sits in a holder with DONE
// (18 Nov: for something already done outside the app), so the button
// isn't inside the card's own button; the two move together.
import { moveName, moveLook } from '../data/kinds.js';
import { reasonFor } from '../data/reasons.js';
import { handleText } from '../data/contact.js';
import { firstName } from '../data/fill.js';
import { stops } from '../data/today.js';
import { draftWaiting } from '../data/person.js';
import { flairHtml, tagHtml } from '../components/marks.js';
import { photoHtml } from '../components/photo.js';
import { esc } from '../components/util.js';

export function cardHtml(p, today) {
  const look = moveLook(p.next);
  const handle = handleText(p);
  const draft = draftWaiting(p);
  return `
    <div class="card-top">
    <div class="card top${draft ? ' has-draft' : ''}" role="button" tabindex="0" data-open aria-label="${esc(`${moveName(p.next)}, ${p.name}. Open the move`)}">
      ${flairHtml(look)}${photoHtml(p)}
      <div class="card-words">
        ${tagHtml(look, moveName(p.next))}
        <p class="card-name">${esc(p.name)}</p>
        ${handle ? `<p class="card-handle">${esc(handle)}</p>` : ''}
        <p class="card-why">${esc(reasonFor(p, today))}</p>
        ${draft ? '<p class="card-draft">Draft waiting in Gmail</p>' : ''}
      </div>
    </div>
    <button type="button" class="list-act card-done" data-card-done>Done</button>
    </div>`;
}

// The next cards, peeking out behind (n: 1 the nearer, 2 the farther).
export const behindHtml = (p, n) => `<div class="card behind-${n}" aria-hidden="true">${flairHtml(moveLook(p.next))}</div>`;

// WRITE TO DANA; a prospect is usually a business, so WRITE TO THEM.
export const writeLabel = (p) => (p.group === 'prospect' ? 'Write to them' : `Write to ${firstName(p.name)}`);

// The arc and its stops. current: the card on top ('' when the day's done).
// Never empty (progress/NOTES.md, 15 Nov): the line is ink up to this card's
// stop, which is half filled, "started", until it's done. When the day's
// done, the whole arc and every stop are ink, until tomorrow.
const ARC = 'M6 40 A34 34 0 0 1 ';
const halfStop = (x, y) => `<circle cx="${x}" cy="${y}" r="7" fill="#FAFAF7"/>`
  + `<path d="M${x - 6} ${y} A6 6 0 0 0 ${x + 6} ${y} Z" fill="#14BFA0"/>`
  + `<circle cx="${x}" cy="${y}" r="7" fill="none" stroke="#313D45" stroke-width="2"/>`;
export function arcHtml(pick, current, label) {
  const pts = stops(pick.ids.length);
  const at = pick.ids.indexOf(current);
  const to = current ? pts[at] : { x: 74, y: 40 };
  const ink = to ? `<path class="arc-ink" d="${ARC}${to.x} ${to.y}" fill="none" stroke="#313D45" stroke-width="2"/>` : '';
  const dots = pick.ids.map((id, i) => {
    const { x, y } = pts[i];
    if (id === current) return halfStop(x, y);
    if (!current || pick.marks[id] === 'done') return `<circle cx="${x}" cy="${y}" r="5" fill="#313D45"/>`;
    return `<circle cx="${x}" cy="${y}" r="5" fill="#FAFAF7" stroke="#9AA3A8" stroke-width="1.5"/>`;
  }).join('');
  return `<svg class="today-arc" role="img" aria-label="${esc(label)}" viewBox="0 0 80 44" width="80" height="44"><path d="${ARC}74 40" fill="none" stroke="#D6DADD" stroke-width="2"/>${ink}${dots}</svg>`;
}
