// What Today draws (01-today): the top card, the cards peeking out behind
// it, and the arc's stops (done in berry blade black, this one teal with a
// ring, the rest open).
import { KINDS } from '../data/kinds.js';
import { reasonFor } from '../data/reasons.js';
import { handleText } from '../data/contact.js';
import { firstName } from '../data/fill.js';
import { stops } from '../data/today.js';
import { flairHtml, tagHtml } from '../components/marks.js';
import { photoHtml } from '../components/photo.js';
import { esc } from '../components/util.js';

export function cardHtml(p, today) {
  const kind = p.next.kind;
  const handle = handleText(p);
  return `
    <div class="card top" role="button" tabindex="0" data-open aria-label="${esc(`${KINDS[kind].name}, ${p.name}. Open the move`)}">
      ${flairHtml(kind)}${photoHtml(p)}
      <div class="card-words">
        ${tagHtml(kind)}
        <p class="card-name">${esc(p.name)}</p>
        ${handle ? `<p class="card-handle">${esc(handle)}</p>` : ''}
        <p class="card-why">${esc(reasonFor(p, today))}</p>
      </div>
    </div>`;
}

// The next cards, peeking out behind (n: 1 the nearer, 2 the farther).
export const behindHtml = (p, n) => `<div class="card behind-${n}" aria-hidden="true">${flairHtml(p.next.kind)}</div>`;

// WRITE TO DANA; a prospect is usually a business, so WRITE TO THEM.
export const writeLabel = (p) => (p.group === 'prospect' ? 'Write to them' : `Write to ${firstName(p.name)}`);

// The arc and its stops. current: the card on top ('' when the day's done).
export function arcHtml(pick, current, label) {
  const pts = stops(pick.ids.length);
  const dots = pick.ids.map((id, i) => {
    const { x, y } = pts[i];
    if (id === current) return `<circle cx="${x}" cy="${y}" r="7" fill="#14BFA0" stroke="#313D45" stroke-width="2"/>`;
    if (pick.marks[id] === 'done') return `<circle cx="${x}" cy="${y}" r="5" fill="#313D45"/>`;
    return `<circle cx="${x}" cy="${y}" r="5" fill="#FAFAF7" stroke="#9AA3A8" stroke-width="1.5"/>`;
  }).join('');
  return `<svg class="today-arc" role="img" aria-label="${esc(label)}" viewBox="0 0 80 44" width="80" height="44"><path d="M6 40 A34 34 0 0 1 74 40" fill="none" stroke="#D6DADD" stroke-width="2"/>${dots}</svg>`;
}
