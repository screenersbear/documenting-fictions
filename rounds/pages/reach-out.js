// + CONNECTION on Today (Tightening Rounds, rounds/06 and 07, 16 Nov; was
// REACH OUT until 20 Nov): someone new or someone you know. SOMEONE NEW
// first (a big button, Add "<typed>" once a name is typed), then OR SOMEONE
// YOU KNOW, a search over everyone (components/person-search.js), the most
// recently in touch first. Picking someone opens the one sheet for them
// (pages/one-sheet.js), on their next move's kind, or Check in; someone new
// is added first (pages/add-person.js), their typed name carried over.
import { openSheet } from '../components/sheet.js';
import { esc } from '../components/util.js';
import { PLUS } from '../components/icons.js';
import { searchBoxHtml, wireSearch } from '../components/person-search.js';
import { listPeople, listMoves } from '../data/db.js';
import { newLine } from '../data/people-find.js';
import { writeTo } from './move-done.js';
import { openAddPerson } from './add-person.js';

// SOMEONE NEW over its line (data/people-find.js newLine).
const bigNewHtml = () => `<button type="button" class="big-btn big-btn-ink reach-new" data-new><span class="big-btn-plus" aria-hidden="true">${PLUS}</span><span class="big-btn-words"><b>Someone new</b><span data-new-line>${esc(newLine(''))}</span></span></button>`;

export async function openReachOut(redraw) {
  const [people, lines] = await Promise.all([listPeople(), listMoves()]);
  const s = openSheet({
    title: 'New connection',
    className: 'reach-sheet',
    body: `${bigNewHtml()}
      <p class="label reach-label">Or someone you know</p>
      ${searchBoxHtml('Search by name or handle')}<div class="pick-list" data-found></div>`,
  });
  let typed = '';
  wireSearch(s.body, people, lines, {
    onPick: (p) => { s.close(); writeTo(p, redraw); },
    onType: (t) => {
      typed = t;
      s.body.querySelector('[data-new-line]').textContent = newLine(t);
    },
  });
  s.body.querySelector('[data-new]').addEventListener('click', () => {
    s.close();
    openAddPerson((p) => writeTo(p, redraw), { name: typed });
  });
  return s;
}
