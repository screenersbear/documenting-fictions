// Rounds starts here. Routes: #/today, #/people, #/promises, #/person/<id>,
// #/messages (your messages, from Options since 21 Nov).
// Inside the suite, #/ goes back to the shelf.
// Set up once, before anything else: sheets above the keyboard, the iPhone's
// screen, no page zoom.
import './components/keyboard-fit.js';
import './components/screen-fit.js';
import './components/no-zoom.js';
import { closeAllSheets } from './components/sheet.js';
import { hideToast, toast } from './components/toast.js';
import { showSection } from './components/navbar.js';
import { esc } from './components/util.js';
import { drawSection } from './pages/sections.js';
import { personScreen } from './pages/person.js';
import { messagesScreen } from './pages/messages.js';
import { openOptions } from './pages/options.js';
import { introSeen, openIntro } from './pages/intro.js';
import { welcome, offerTour } from './pages/welcome.js';
import { bringInFromEye, yearsFromEye } from './data/eye.js';
import { takeFromLayouts } from './data/from-layouts.js';
import { takeAsks } from './data/asks.js';
import { takePeopleEdits, tellPeople, tellPeopleFromNowOn } from './data/people-out.js';
import { startAutoSync } from './data/auto-sync.js';
import { openConflicts } from './pages/conflicts.js';

const view = document.getElementById('view');
const suite = window.DF_SUITE;
const SECTION = { '/today': 0, '/people': 1, '/promises': 2 };
let token = 0;

async function route() {
  const mine = ++token;
  closeAllSheets();
  hideToast(); // its UNDO belongs to the page it came up on
  const h = (location.hash || '#/').slice(1) || '/';
  if (h === '/') {
    if (suite) suite.home(); else location.replace('#/today');
    return;
  }
  let m;
  try {
    if (h in SECTION) {
      await drawSection(SECTION[h], view);
      if (mine === token) showSection(SECTION[h], true);
    } else if ((m = h.match(/^\/person\/(.+)$/))) {
      await personScreen(view, decodeURIComponent(m[1]));
      if (mine === token) showSection(1);
    } else if (h === '/messages') {
      await messagesScreen(view);
      if (mine === token) showSection(-1);
    } else location.replace('#/today');
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="screen"><div class="scroll"><p class="note">Something went wrong. ${esc(e.message || 'Try reloading.')}</p></div></div>`;
  }
}

// The band's notebooks button: back to the shelf. Options: from the menu ring.
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-books]')) location.hash = '#/';
  else if (e.target.closest('[data-app-menu]')) openOptions(redrawSoon, onSynced);
});
// A change made in Options shows once its sheets have closed.
let waiting = null;
function redrawSoon() {
  if (waiting) return;
  waiting = setInterval(() => {
    if (document.querySelector('.sheet-overlay')) return;
    clearInterval(waiting);
    waiting = null;
    route();
  }, 200);
}

// After each sync (data/auto-sync.js): changes from the repository, or new
// leads from Claude, show once no sheet is open; a new clash asks which to
// keep (or says where to find it, if something else is open). What went
// wrong is shown in Options, Sync.
let leadsSeen = null;
function onSynced(r) {
  if (r.error) return;
  if (r.newConflicts) {
    if (!document.querySelector('.sheet-overlay')) { openConflicts(redrawSoon); return; }
    toast('Something was changed on two devices at once. Options, Sync has it.', { ms: 6000 });
  }
  const leadsNew = leadsSeen === null ? r.leads > 0 : r.leads !== leadsSeen;
  leadsSeen = r.leads;
  if (r.changedHere || leadsNew) redrawSoon();
}

window.addEventListener('hashchange', route);
// Opened at a person from their page on the shelf (?person=<id>; with
// &moment=1 ADD A MOMENT opens there, with &said=<line> What you said for
// one of their moves), or at their move from The Eye's Say
// thanks (&move=1: the move opens there).
if (suite && suite.get && suite.get('person')) {
  for (const [param, key] of [['move', 'rounds-open-move'], ['moment', 'rounds-open-moment']]) {
    if (suite.get(param)) { try { sessionStorage.setItem(key, suite.get('person')); } catch (e) { /* the person page, then */ } }
  }
  // A move tapped there (&said=<its line>): What you said opens for it.
  if (suite.get('said')) { try { sessionStorage.setItem('rounds-open-said', suite.get('said')); } catch (e) { /* the person page, then */ } }
  history.replaceState(null, '', `#/person/${encodeURIComponent(suite.get('person'))}`);
}
else if ((location.hash || '#/') === '#/') history.replaceState(null, '', suite && suite.at ? `#/${suite.at}` : '#/today');
// People from The Eye's shoots, and the people in posts shared from
// Layouts, come in first (and A year since for a shoot whose year came),
// then the notebook's drawn; and again whenever Rounds comes back on screen.
// One after the other: both can change the same person. A name changed on
// the person page on the shelf comes in before them. On its own, Rounds has
// no other notebooks, so nothing comes in (rounds/STANDALONE.md).
const bringIn = suite
  ? async () => (await takePeopleEdits().catch(() => 0)) + (await bringInFromEye()) + (await yearsFromEye()) + (await takeFromLayouts()) + (await takeAsks().catch(() => 0))
  : async () => 0;
// Rounds tells the one list of people its people, now and after each change.
tellPeopleFromNowOn();
tellPeople(3000);
bringIn().catch(console.error).finally(() => { route(); startAutoSync(onSynced); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden || document.querySelector('.sheet-overlay')) return;
  bringIn().then((n) => { if (n && !document.querySelector('.sheet-overlay')) route(); }).catch(console.error);
});
// The first launch: inside the suite, how to get back to the shelf (and the
// cards if they're wanted); on its own, an offer of the cards.
if (suite) { if (suite.firstVisit) setTimeout(() => { if (!document.querySelector('.sheet-overlay')) welcome('Rounds', openIntro); }, 900); }
else if (!introSeen()) setTimeout(() => { if (!document.querySelector('.sheet-overlay')) offerTour(openIntro); }, 1200);

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(() => {});
