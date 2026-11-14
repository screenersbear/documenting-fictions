// People (03-people): plain cards, a photo over the name, with a tiny square
// in the colour and mark of their next move. No colour fields here: the
// colour lives on Today. ADD SOMEONE beside the title; anyone let go, at the end.
import { bandHtml } from '../components/band.js';
import { photoHtml, fillPhotos } from '../components/photo.js';
import { miniHtml } from '../components/marks.js';
import { esc } from '../components/util.js';
import { PLUS } from '../components/icons.js';
import { listPeople } from '../data/db.js';
import { openAddPerson } from './add-person.js';

// The soonest move first; no move, then by name.
const order = (a, b) => (a.next ? a.next.due : '~').localeCompare(b.next ? b.next.due : '~') || a.name.localeCompare(b.name);

const cardHtml = (p) => `
  <a class="person-card" href="#/person/${encodeURIComponent(p.id)}">${photoHtml(p)}
    <span class="person-card-name">${p.letGo ? '' : miniHtml(p.next?.kind)}<span>${esc(p.name)}</span></span></a>`;

export async function peopleScreen(view, { beside = false } = {}) {
  const people = await listPeople();
  const here = people.filter((p) => !p.letGo).sort(order);
  const gone = people.filter((p) => p.letGo).sort((a, b) => a.name.localeCompare(b.name));
  const eye = window.DF_SUITE ? ' People from your shoots in The Eye come in on their own.' : '';
  view.innerHTML = `<div class="screen"><div class="scroll">
    ${bandHtml({ title: 'People', place: 'Rounds' })}
    <div class="list-head"><h2>People <span>${here.length}</span></h2><button type="button" class="list-act" data-add>${PLUS}Add someone</button></div>
    ${here.length ? `<div class="people-grid">${here.map(cardHtml).join('')}</div>` : `<p class="note">No one yet. Add the people you work with.${eye}</p>`}
    ${gone.length ? `<div class="people-gone"><div class="list-head"><h2>Let go <span>${gone.length}</span></h2></div><div class="people-grid">${gone.map(cardHtml).join('')}</div></div>` : ''}
  </div></div>`;
  fillPhotos(view, people);
  if (beside) return;
  view.querySelector('[data-add]').addEventListener('click', () => openAddPerson((p) => { location.hash = `#/person/${encodeURIComponent(p.id)}`; }));
}
