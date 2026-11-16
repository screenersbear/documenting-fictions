// + REACH OUT on Today (Tightening Rounds, rounds/06 and 07, 16 Nov): Reach
// out to, a search over everyone (components/person-search.js), the most
// recently in touch first; OR SOMEONE NEW under it, Add "<typed>" as a new
// person. Picking someone opens the one sheet for them (pages/one-sheet.js),
// on their next move's kind, or Check in.
import { openSheet } from '../components/sheet.js';
import { esc } from '../components/util.js';
import { PLUS } from '../components/icons.js';
import { searchBoxHtml, wireSearch } from '../components/person-search.js';
import { listPeople, listMoves } from '../data/db.js';
import { writeTo } from './move-done.js';
import { openAddPerson } from './add-person.js';

export async function openReachOut(redraw) {
  const [people, lines] = await Promise.all([listPeople(), listMoves()]);
  const s = openSheet({
    title: 'Reach out to',
    className: 'reach-sheet',
    body: `${searchBoxHtml('Search by name or handle')}<div class="pick-list" data-found></div>
      <p class="label reach-label">Or someone new</p>
      <button type="button" class="reach-new" data-new>${PLUS}<span>Add someone</span></button>`,
  });
  let typed = '';
  wireSearch(s.body, people, lines, {
    onPick: (p) => { s.close(); writeTo(p, redraw); },
    onType: (t) => {
      typed = t;
      s.body.querySelector('[data-new] span').textContent = t ? `Add "${t}" as a new person` : 'Add someone';
    },
  });
  s.body.querySelector('[data-new]').addEventListener('click', () => {
    s.close();
    openAddPerson((p) => writeTo(p, redraw), { name: typed });
  });
  return s;
}
