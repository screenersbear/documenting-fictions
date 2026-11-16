// A search box over people and the rows it finds (Tightening Rounds: Reach
// out to, rounds/07; Merge with..., rounds/11). Empty, it lists the most
// recently in touch first; typed into, those whose name, handle or note
// has it. Each row: their photo, their name, one dim line (their group and
// the last thing done). Opens unfocused, so the keyboard waits for a tap.
import { photoHtml, fillPhotos } from './photo.js';
import { esc } from './util.js';
import { matches, lastLines, sortPeople, pickLine } from '../data/people-find.js';
import { dayOf } from '../data/dates.js';

const MOST = 40; // rows at once: typing finds the rest
export const SEARCH = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>';
export const searchBoxHtml = (placeholder, cls = '') => `<label class="find-box ${cls}">${SEARCH}<input type="search" data-find placeholder="${esc(placeholder)}" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" aria-label="${esc(placeholder)}" /></label>`;

// root holds searchBoxHtml and an element [data-found]. onType(text) after
// each change (for Add "<typed>" as a new person); onPick(person).
export function wireSearch(root, people, lines, { onPick, onType = () => {} }) {
  const today = dayOf();
  const last = lastLines(lines);
  const ordered = sortPeople(people, 'recent', last, null, today);
  const input = root.querySelector('[data-find]');
  const found = root.querySelector('[data-found]');
  const draw = () => {
    const hits = ordered.filter((p) => matches(p, input.value)).slice(0, MOST);
    found.innerHTML = hits.map((p) => `<button type="button" class="pick-row" data-pick="${esc(p.id)}">${photoHtml(p, 'small')}
      <span class="pick-row-words"><span class="pick-row-name">${esc(p.name)}</span><span class="pick-row-line">${esc(pickLine(p, last.get(p.id), today))}</span></span></button>`).join('');
    fillPhotos(found, hits);
    onType(input.value.trim());
  };
  input.addEventListener('input', draw);
  found.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pick]');
    if (b) onPick(people.find((p) => p.id === b.dataset.pick));
  });
  draw();
}
