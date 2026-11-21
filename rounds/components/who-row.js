// Who a sheet is about, as a way to their page (20 Nov): their photo and
// name on one row, a link to #/person/<id>. On WHAT YOU SAID and a moment's
// sheet opened from DONE TODAY, so a tap on the name or the picture goes to
// their profile. The sheet closes as it goes.
import { photoHtml, fillPhotos } from './photo.js';
import { esc } from './util.js';
import { CHEV_SMALL } from './icons.js';

export const whoHtml = (person) => `<a class="who-row" href="#/person/${encodeURIComponent(person.id)}" data-who>${photoHtml(person, 'small')}
  <span class="who-words"><span class="who-name">${esc(person.name)}</span><span class="who-open">Their page ${CHEV_SMALL}</span></span></a>`;

// s: the open sheet, its body holding whoHtml.
export function wireWho(s, person) {
  const a = s.body.querySelector('[data-who]');
  if (!a) return;
  fillPhotos(a, [person]);
  a.addEventListener('click', () => s.close());
}
