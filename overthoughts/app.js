// Overthoughts starts here. Routes: #/ shut, #/entries, #/reviews, #/new,
// #/entry/<id>, #/review/<id>. The shut notebook, its opening and the bar are
// Ref's, with two sections.
// Set up once, before anything else: sheets above the keyboard, the iPhone's
// screen, no page zoom.
import './components/keyboard-fit.js';
import './components/screen-fit.js';
import './components/no-zoom.js';
import { SECTIONS } from './pages/sections.js';
import { entryScreen } from './pages/entry.js';
import { reviewScreen } from './pages/review.js';
import { setBook } from './pages/cover.js';
import { openOptions, startPage } from './pages/options.js';
import { openIntro } from './pages/intro.js';
import { welcome } from './pages/welcome.js';
import { closeAllSheets } from './components/sheet.js';
import { showSection } from './components/navbar.js';
import { sideOf } from './components/spread.js';
import { moved } from './components/nav.js';
import { esc } from './components/util.js';
import './components/pull-shut.js';

const view = document.getElementById('view');
const frame = document.getElementById('frame');
let destroyCurrent = null;
let token = 0;
// Inside Documenting Fictions (../suite.js) the shelf is the shut notebook,
// and Options are in the menu at the top of Entries.
const suite = window.DF_SUITE;
document.addEventListener('click', (e) => { if (e.target.closest('[data-app-menu]')) openOptions(); });

const HASHES = ['/entries', '/reviews'];
const NAMES = ['Entries', 'Reviews'];
const AT = { entries: '#/entries', reviews: '#/reviews' }; // the shelf's tabs
const titleR = document.getElementById('titleR');
const titleL = document.getElementById('titleL');

let routes = 0;
async function route() {
  const mine = ++token;
  if (routes++) moved();
  if (destroyCurrent) { destroyCurrent(); destroyCurrent = null; }
  closeAllSheets();
  const h = (location.hash || '#/').slice(1) || '/';
  if (suite && h === '/') { suite.home(); return; }
  const section = HASHES.indexOf(h);
  if (h !== '/') {
    frame.dataset.side = sideOf(section);
    titleL.textContent = section === 0 ? NAMES[0] : '';
    titleR.textContent = section > 0 ? NAMES[section] : '';
  }
  setBook(h !== '/');
  if (h === '/') { showSection(-1); return; }
  try {
    let m;
    if (section >= 0) await SECTIONS[section](view);
    else if (h === '/new') destroyCurrent = await entryScreen(view, null);
    else if ((m = h.match(/^\/entry\/(.+)$/))) destroyCurrent = await entryScreen(view, decodeURIComponent(m[1]));
    else if ((m = h.match(/^\/review\/(.+)$/))) destroyCurrent = await reviewScreen(view, decodeURIComponent(m[1]));
    else { location.hash = '#/entries'; return; }
    if (mine !== token) { if (destroyCurrent) { destroyCurrent(); destroyCurrent = null; } return; }
    showSection(section, section >= 0);
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="screen"><p class="note center">Something went wrong. ${esc(e.message || 'Try reloading.')}</p></div>`;
  }
}
// Put away or closed, whatever's being written is saved first.
document.addEventListener('visibilitychange', () => { if (document.hidden && destroyCurrent) { const d = destroyCurrent; d(); } });
window.addEventListener('pagehide', () => { if (destroyCurrent) destroyCurrent(); });

// Where it opens: a link straight to one entry (?entry=<id>), a tab on the
// shelf's book, or (on its own) wherever Options says.
window.addEventListener('hashchange', route);
const atEntry = suite && suite.get && suite.get('entry');
if (atEntry) history.replaceState(null, '', `#/entry/${encodeURIComponent(atEntry)}`);
else if (suite && (location.hash || '#/') === '#/') history.replaceState(null, '', AT[suite.at] || '#/entries');
else if (!suite && startPage() && (location.hash || '#/') === '#/') history.replaceState(null, '', startPage());
route();
// Inside Documenting Fictions, the first time: how to get back to the shelf,
// and the tour if it's wanted.
if (suite && suite.firstVisit) setTimeout(() => { if (!document.querySelector('.sheet-overlay')) welcome('Overthoughts', openIntro); }, 900);

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(() => {});

const holdUpright = () => { try { screen.orientation?.lock?.('portrait').catch(() => {}); } catch {} };
holdUpright();
document.addEventListener('visibilitychange', () => { if (!document.hidden) holdUpright(); });
