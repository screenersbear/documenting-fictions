// A promise as a row (the Promises tab, and a person's page): what it is,
// over who it's with and when it's due ("3 days late" in red), then a
// chevron. On the tab each row has their photo; on their own page, not.
// A tap opens what to do with it (pages/promise-sheet.js).
import { photoHtml } from './photo.js';
import { esc } from './util.js';
import { CHEV } from './icons.js';
import { promiseWhen, isLate } from '../data/promises.js';

// item: { person, promise }. who: their photo and name on the row.
export function promiseRowHtml({ person, promise }, today, { who = true } = {}) {
  const when = promiseWhen(promise, today);
  const line = [who ? person.name : '', when].filter(Boolean).join(' · ') || 'No day set';
  return `<button type="button" class="prom-row${who ? '' : ' prom-row-own'}" data-promise="${esc(promise.id)}" data-person="${esc(person.id)}">${who ? photoHtml(person, 'small') : ''}
    <span class="prom-words"><span class="prom-what">${esc(promise.what)}</span><span class="prom-line${isLate(promise, today) ? ' is-late' : ''}">${esc(line)}</span></span>${CHEV}</button>`;
}
