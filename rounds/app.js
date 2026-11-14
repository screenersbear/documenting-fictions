// Rounds starts here. Routes: #/today, #/people, #/person/<id>, #/messages.
// Inside the suite, #/ goes back to the shelf.
// Set up once, before anything else: sheets above the keyboard, the iPhone's
// screen, no page zoom.
import './components/keyboard-fit.js';
import './components/screen-fit.js';
import './components/no-zoom.js';
import { closeAllSheets } from './components/sheet.js';
import { hideToast } from './components/toast.js';
import { showSection } from './components/navbar.js';
import { esc } from './components/util.js';
import { drawSection } from './pages/sections.js';
import { personScreen } from './pages/person.js';
import { openOptions } from './pages/options.js';
import { introSeen, openIntro } from './pages/intro.js';
import { welcome } from './pages/welcome.js';
import { bringInFromEye } from './data/eye.js';

const view = document.getElementById('view');
const suite = window.DF_SUITE;
const SECTION = { '/today': 0, '/people': 1, '/messages': 2 };
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
    } else location.replace('#/today');
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="screen"><div class="scroll"><p class="note">Something went wrong. ${esc(e.message || 'Try reloading.')}</p></div></div>`;
  }
}

// The band's notebooks button: back to the shelf. Options: from the menu ring.
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-books]')) location.hash = '#/';
  else if (e.target.closest('[data-app-menu]')) openOptions(redrawSoon);
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

window.addEventListener('hashchange', route);
if ((location.hash || '#/') === '#/') history.replaceState(null, '', suite && suite.at ? `#/${suite.at}` : '#/today');
// People from The Eye's shoots come in first, then the notebook's drawn;
// and again whenever Rounds comes back on screen.
bringInFromEye().catch(console.error).finally(route);
document.addEventListener('visibilitychange', () => {
  if (document.hidden || document.querySelector('.sheet-overlay')) return;
  bringInFromEye().then((n) => { if (n && !document.querySelector('.sheet-overlay')) route(); }).catch(console.error);
});
// The first launch: inside the suite, how to get back to the shelf (and the
// cards if they're wanted); on its own, the cards.
if (suite) { if (suite.firstVisit) setTimeout(() => { if (!document.querySelector('.sheet-overlay')) welcome('Rounds', openIntro); }, 900); }
else if (!introSeen()) setTimeout(() => { if (!document.querySelector('.sheet-overlay')) openIntro(); }, 1200);

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(() => {});
