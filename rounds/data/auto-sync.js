// When Rounds syncs (Callback's rule): when it opens, 4 s after anything is
// saved, coming back to the front, when the connection returns, every 2
// minutes while it's open, and right away when leaving it with a change
// unsent. One at a time, never two at once; answering a clash waits its turn too.
import { onSyncedChange } from './db.js';
import { syncNow, answer } from './sync.js';

const SOON = 4000;
const EVERY = 120000;
const AGAIN = 15000; // coming back to the front, if this long since the last

let timer = null;
let lastRun = 0;
let chain = Promise.resolve();
let onResult = () => {};

// Runs after whatever is under way (a sync, an answer). cfg: see syncNow.
function inTurn(fn) {
  const p = chain.then(fn);
  chain = p.catch(() => {});
  return p;
}
export const queued = (cfg = null) => inTurn(() => syncNow(cfg));

export function request(delay = 0) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    lastRun = Date.now();
    queued().then((r) => { if (!r.off) onResult(r); }, (error) => onResult({ error }));
  }, delay);
}

// A clash answered: saved, then synced at once so the other devices take it.
export function resolve(c, side) {
  return inTurn(() => answer(c, side)).then((r) => {
    request(0);
    return r;
  });
}

// handler({ changedHere, conflicts, newConflicts } or { error }) after each sync.
let stops = [];
function listen(target, type, fn) {
  target.addEventListener(type, fn);
  stops.push(() => target.removeEventListener(type, fn));
}
export function startAutoSync(handler) {
  stopAutoSync();
  onResult = handler;
  onSyncedChange(() => request(SOON));
  listen(document, 'visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (Date.now() - lastRun > AGAIN) request(0);
    } else if (timer) request(0); // leaving with something unsent: send it now
  });
  listen(window, 'focus', () => { if (Date.now() - lastRun > AGAIN) request(0); });
  listen(window, 'online', () => request(0));
  const every = setInterval(() => { if (document.visibilityState === 'visible') request(0); }, EVERY);
  stops.push(() => clearInterval(every));
  request(0);
}
// Stops it all (sync turned off; and between tests).
export function stopAutoSync() {
  stops.forEach((f) => f());
  stops = [];
  clearTimeout(timer);
  timer = null;
  onSyncedChange(() => {});
}
