// HOW DID THE PITCH GO? on a person's page (round 2, connect/05): the three
// answers as chips (data/pitch.js), and once a yes has passed to Ref, a
// card saying so, with OPEN (their board in Ref). Someone who asked to
// shoot first gets the same Yes from the page's menu, and the same chips.
import { esc } from '../components/util.js';
import { savePerson } from '../data/db.js';
import { ANSWERS, answerPitch } from '../data/pitch.js';
import { passToRef, takeBackFromRef, refLinkFor } from '../data/to-ref.js';
import { firstName } from '../data/fill.js';
import { dayOf } from '../data/dates.js';

const C = () => window.DFConnect;

// The card for a yes passed to Ref ('' when nothing passed, as with New
// clients switched off). OPEN only inside the suite, where Ref is.
function passedHtml(person, link) {
  if (!link || !C()) return '';
  const href = window.DFData.notebookUrl('ref', { client: link.id });
  return `<div class="passed-ref">${C().pairHtml('rounds', 'ref')}
    <span class="passed-ref-words"><span class="passed-ref-title">Passed to Ref</span><span class="passed-ref-line">${esc(`${firstName(person.name)}'s mood board is waiting there.`)}</span></span>
    ${href ? `<a class="passed-ref-open" href="${esc(href)}">Open</a>` : ''}</div>`;
}

export async function pitchHtml(person, pitched) {
  const now = person.pitch ? person.pitch.answer : '';
  const chips = ANSWERS.map((a) => `<button type="button" class="pitch-chip" role="radio" aria-checked="${a.key === now}" data-answer="${a.key}">${esc(a.label)}</button>`).join('');
  const link = now === 'yes' ? await refLinkFor(person).catch(() => null) : null;
  return `<p class="pitch-label" id="pitchLabel">${pitched ? 'How did the pitch go?' : 'Shooting together?'}</p>
    <div class="pitch-chips" role="radiogroup" aria-labelledby="pitchLabel">${chips}</div>${passedHtml(person, link)}`;
}

// An answer (a chip, or Yes from the menu): saved, and a yes passed to Ref
// (or taken back from it, if Ref hasn't started their board).
export async function answer(person, key, pitched) {
  if (person.pitch && person.pitch.answer === key) return person;
  const after = answerPitch(person, key, dayOf());
  await savePerson(after);
  if (key === 'yes') await passToRef(after, pitched).catch(() => null);
  else if (person.pitch && person.pitch.answer === 'yes') await takeBackFromRef(person).catch(() => {});
  return after;
}

export function wirePitch(view, person, pitched, redraw) {
  view.querySelectorAll('[data-answer]').forEach((b) => b.addEventListener('click', async () => {
    await answer(person, b.dataset.answer, pitched);
    redraw();
  }));
}
