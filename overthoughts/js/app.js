// Routes: #/ shut, #/entries, #/week, #/reviews, #/new, #/entry/<id>, #/review/<id>
// The shut notebook, its opening and the bar are Ref's, with three sections.
import { SECTIONS } from './screens.js';
import { entryScreen } from './entry.js';
import { reviewScreen } from './review.js';
import { closeAllSheets } from './ui.js';
import { showSection, setPuller } from './navbar.js';
import { sideOf } from './spread.js';
import { openOptions, startPage, offerJournal } from './options.js';
import { moved } from './nav.js';
import { ICONS } from './icons.js';
import { esc } from './util.js';

const view = document.getElementById('view');
const book = document.getElementById('book');
const frame = document.getElementById('frame');
let destroyCurrent = null;
let token = 0;
// Inside Documenting Fictions (../suite.js) the shelf is the shut notebook.
const suite = window.DF_SUITE;
let suiteOpened = !(suite && suite.options);

const HASHES = ['/entries', '/week', '/reviews'];
const NAMES = ['Entries', 'Weekly log', 'Reviews'];
const AT = { entries: '#/entries', week: '#/week', reviews: '#/reviews' }; // the shelf's tabs

document.getElementById('bookHit').addEventListener('click', () => { location.hash = '#/entries'; });
const sun = document.getElementById('bookSun');
sun.innerHTML = ICONS.sun;
sun.addEventListener('click', openOptions);
const titleR = document.getElementById('titleR');
const titleL = document.getElementById('titleL');
const tabHits = document.getElementById('bookTabHits');
tabHits.addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b) location.hash = b.dataset.go; });

// The notebook floats shut on white. Tapped, its cover swings open and the
// page grows until its paper covers the whole screen, then it leaves. Timers,
// not transition events: those don't fire if the app is put away mid-swing.
const RATIO = 1000 / 1360;
const TAB_OUT = 0.08;
const STACK = 16;
const TURNED = (20 * Math.PI) / 180; // matches style.css
const PERSPECTIVE = 1100;            // matches .nb in style.css
const OPEN_MS = 900, ZOOM_MS = 760;
const OVER = 12;
document.getElementById('bookStack').innerHTML =
  Array.from({ length: STACK }, (_, i) => `<i style="--i:${i + 1}"></i>`).join('') + `<b style="--i:${STACK + 1}"></b>`;

function measure() {
  const vw = window.innerWidth;
  const vh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--book-h')) || window.innerHeight;
  const W = Math.min(vw * 0.78, vh * 0.66 * RATIO, 460);
  const H = W / RATIO;
  const k = Math.min(1, (vw - 14) / (2 * W), (vh * 0.82) / H);
  const cos = Math.cos(TURNED), sin = Math.sin(TURNED);
  const depth = (STACK + 1) * W * 0.0112;
  const seen = [[-W / 2, 0], [W / 2, 0], [-W / 2, -depth], [W / 2 + W * TAB_OUT, -depth * 0.8]].map(
    ([x, d]) => ((x * cos - d * sin) * PERSPECTIVE) / (PERSPECTIVE - (x * sin + d * cos)),
  );
  const f = frame.getBoundingClientRect();
  const set = (n, v) => book.style.setProperty(n, v);
  set('--W', `${W}px`); set('--H', `${H}px`); set('--k', String(k));
  set('--shut-x', `${-(Math.min(...seen) + Math.max(...seen)) / 2 / cos}px`);
  const pw = (vw + OVER) / 0.986, ph = (vh + 2 * OVER) / 0.986;
  const sx = pw / W, sy = ph / H;
  set('--zoom-x', `${frame.dataset.side === 'left' ? vw / 2 : -vw / 2}px`);
  set('--zoom-y', '0px');
  set('--zoom-sx', String(sx));
  set('--zoom-sy', String(sy));
  set('--title-fs', `${32 / sx}px`);
  set('--title-top', `${(f.top + 12 - (vh - ph) / 2) / sy}px`);
  set('--title-sq', String(sx / sy));
  const c = (f.left + f.right) / 2;
  set('--title-out', `${Math.max(0, frame.dataset.side === 'left' ? 2 * c - 2 * vw + pw : pw - 2 * c) / sx}px`);
}
function placeTabHits() {
  const before = book.className;
  book.className = 'nb no-anim closed';
  const rects = [...document.getElementById('bookSideTabs').children].map((el) => el.getBoundingClientRect());
  [...tabHits.children].forEach((hit, i) => {
    const r = rects[i];
    hit.style.cssText = `left:${r.left - 14}px;right:0;top:${r.top - 3}px;height:${r.height + 6}px`;
  });
  book.className = before;
  void book.offsetWidth;
}
window.addEventListener('ref-layout', () => { measure(); if (!book.hidden && book.classList.contains('closed')) placeTabHits(); });

const zoomed = () => (frame.dataset.side === 'left' ? 'opened zoom-l' : 'opened zoom-r');
const place = (mode) => { book.hidden = false; placeTabHits(); book.className = `nb no-anim ${mode}`; void book.offsetWidth; };
const setMode = (mode) => { book.className = `nb ${mode}`; };
let firstRoute = true;
let isOpen = false;
let bookTimer = 0;
function setBook(open) {
  const first = firstRoute;
  firstRoute = false;
  if (open === isOpen && !first) return;
  isOpen = open;
  clearTimeout(bookTimer);
  stopTurning();
  measure();
  if (first) { if (open) book.hidden = true; else place('closed'); return; }
  if (open) {
    setMode('opened');
    bookTimer = setTimeout(() => {
      setMode(zoomed());
      bookTimer = setTimeout(() => { book.hidden = true; }, ZOOM_MS);
    }, OPEN_MS);
  } else {
    place(zoomed());
    setMode('closed');
  }
}

let routes = 0;
async function route() {
  const mine = ++token;
  if (routes++) moved();
  if (destroyCurrent) { destroyCurrent(); destroyCurrent = null; }
  closeAllSheets();
  const h = (location.hash || '#/').slice(1) || '/';
  if (suite && h === '/' && suiteOpened) { suite.home(); return; }
  if (h !== '/') suiteOpened = true;
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

// Swiping right on Entries (or on the bar) shuts the notebook.
const pull = document.getElementById('pull');
let pulled = 0;
const pullStart = () => { pull.classList.remove('back'); pull.hidden = false; pulled = 0; };
const pullMove = (w) => { pulled = Math.min(w, window.innerWidth); pull.style.width = `${pulled}px`; };
function pullEnd() {
  if (pulled > window.innerWidth * 0.45) {
    pull.hidden = true;
    pull.style.width = '0';
    location.hash = '#/';
  } else {
    pull.classList.add('back');
    pull.style.width = '0';
    setTimeout(() => { pull.hidden = true; }, 200);
  }
}
setPuller({ start: pullStart, move: pullMove, end: pullEnd });

// Turning the shut notebook by hand: drag sideways to spin it, up and down to
// tip it. Let go and it swings back.
const SPIN_AWAY = 0.75, SPIN_TOWARD = 0.95, TILT = 0.42;
const softSpin = (raw) => (raw < 0 ? SPIN_AWAY * Math.tanh(raw / SPIN_AWAY) : SPIN_TOWARD * Math.tanh(raw / SPIN_TOWARD));
const softTilt = (raw) => TILT * Math.tanh(raw / TILT);
const held = { spin: 0, spinV: 0, spinGoal: 0, tilt: 0, tiltV: 0, tiltGoal: 0, drag: null, raf: 0, last: 0, ended: 0 };
const showTurn = () => {
  book.style.setProperty('--spin', `${(held.spin * 180) / Math.PI}deg`);
  book.style.setProperty('--tilt', `${(held.tilt * 180) / Math.PI}deg`);
};
function stopTurning() {
  cancelAnimationFrame(held.raf);
  Object.assign(held, { spin: 0, spinV: 0, spinGoal: 0, tilt: 0, tiltV: 0, tiltGoal: 0, drag: null, raf: 0, last: 0 });
  showTurn();
}
function turnStep(now) {
  const dt = Math.min(0.033, (now - (held.last || now - 16)) / 1000);
  held.last = now;
  const on = !!(held.drag && held.drag.moved);
  const goalS = on ? held.spinGoal : 0, goalT = on ? held.tiltGoal : 0;
  held.spinV += (-(on ? 40 : 14) * (held.spin - goalS) - (on ? 12 : 7.5) * held.spinV) * dt;
  held.tiltV += (-(on ? 40 : 30) * (held.tilt - goalT) - (on ? 12 : 10) * held.tiltV) * dt;
  held.spin += held.spinV * dt;
  held.tilt += held.tiltV * dt;
  showTurn();
  if (!held.drag && Math.abs(held.spin) + Math.abs(held.tilt) < 2e-3 && Math.abs(held.spinV) + Math.abs(held.tiltV) < 1e-2) {
    held.spin = held.tilt = held.spinV = held.tiltV = 0;
    held.raf = 0; held.last = 0;
    showTurn();
    return;
  }
  held.raf = requestAnimationFrame(turnStep);
}
book.addEventListener('pointerdown', (e) => {
  if (e.button || !book.classList.contains('closed') || e.target.closest('.nb-sun')) return;
  held.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, spin0: held.spin, tilt0: held.tilt, moved: false };
});
book.addEventListener('pointermove', (e) => {
  const d = held.drag;
  if (!d || d.id !== e.pointerId) return;
  const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
  if (!d.moved && Math.hypot(dx, dy) > 6) {
    d.moved = true;
    try { book.setPointerCapture(e.pointerId); } catch {}
    if (!held.raf) held.raf = requestAnimationFrame(turnStep);
  }
  if (!d.moved) return;
  const k = 0.0056;
  held.spinGoal = softSpin(d.spin0 + dx * k);
  held.tiltGoal = softTilt(d.tilt0 - dy * k);
});
const letGo = (e) => {
  const d = held.drag;
  if (!d || d.id !== e.pointerId) return;
  held.drag = null;
  if (d.moved) held.ended = performance.now();
};
book.addEventListener('pointerup', letGo);
book.addEventListener('pointercancel', letGo);
book.addEventListener('click', (e) => { if (performance.now() - held.ended < 350) { e.preventDefault(); e.stopPropagation(); } }, true);

// Where it opens: a link from The Eye straight to one entry, a tab on the
// shelf's book, or (on its own) wherever Options says.
window.addEventListener('hashchange', route);
const atEntry = suite && suite.get && suite.get('entry');
if (atEntry) history.replaceState(null, '', `#/entry/${encodeURIComponent(atEntry)}`);
else if (suite && !suite.options && (location.hash || '#/') === '#/') history.replaceState(null, '', AT[suite.at] || '#/entries');
else if (!suite && startPage() && (location.hash || '#/') === '#/') history.replaceState(null, '', startPage());
route().then(() => { if (!(suite && suite.options)) setTimeout(offerJournal, 900); });
if (suite && suite.options) {
  setTimeout(openOptions, 60);
  suite.whenOptionsDone(() => (location.hash || '#/') !== '#/');
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(() => {});

const holdUpright = () => { try { screen.orientation?.lock?.('portrait').catch(() => {}); } catch {} };
holdUpright();
document.addEventListener('visibilitychange', () => { if (!document.hidden) holdUpright(); });
