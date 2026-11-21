// Reading The Eye, never changing it (inside the suite only): its shoots (kept in localStorage) and
// its talent photos (in its own database). These few lines are Rounds' own:
// of the suite's shared data it loads only the hand-offs (df-links), not
// The Eye's backup code. The two notebooks share a website, inside the suite
// and out. What came in is noted in df-links (a 'people' link per shoot),
// for the shoot's record in The Eye (PASSED ON); with The shoot's people
// switched off (HOW THEY CONNECT), new shoots are passed by. A year after
// a shoot is delivered, its people get A year since (data/year-since.js),
// with one of its finals.
import { bringIn } from './eye-people.js';
import { takeYears } from './year-since.js';
import { listPeople, savePeople, getSetting, setSetting } from './db.js';
import { uuid } from '../components/util.js';
import { dayOf } from './dates.js';

const EYE_STATE = 'dailies_state_v1';
const EYE_PHOTOS = 'starky-moodboards';
// On its own (no ../suite.js), Rounds has no The Eye beside it: no shoots,
// no photos (rounds/STANDALONE.md), and The Eye's database is never opened.
const alone = () => !window.DF_SUITE;

export function eyeShoots() {
  if (alone()) return [];
  try {
    const state = JSON.parse(localStorage.getItem(EYE_STATE) || 'null');
    return state && Array.isArray(state.shoots) ? state.shoots : [];
  } catch { return []; }
}

// People from shoots captured since last time (data/eye-people.js).
export async function bringInFromEye() {
  const shoots = eyeShoots();
  if (!shoots.length) return 0;
  const [people, seen] = await Promise.all([listPeople(), getSetting('eyeSeen', [])]);
  const { changed, seen: now, brought } = bringIn(people, shoots, seen, dayOf(), uuid);
  const on = !window.DFConnect || window.DFConnect.connectOn('people');
  if (on && changed.length) await savePeople(changed);
  if (now.length !== seen.length) await setSetting('eyeSeen', now);
  if (on) await notePeople(brought).catch(() => {});
  return on ? changed.length : 0;
}

// A year since: the shoots whose year came since last time (with The
// shoot's people switched off, passed by too).
export async function yearsFromEye() {
  const shoots = eyeShoots();
  if (!shoots.length) return 0;
  const [people, seen] = await Promise.all([listPeople(), getSetting('yearSeen', [])]);
  const { changed, seen: now } = takeYears(people, shoots, dayOf(), seen);
  const on = !window.DFConnect || window.DFConnect.connectOn('people');
  if (on && changed.length) await savePeople(changed);
  if (now.length !== seen.length) await setSetting('yearSeen', now);
  return on ? changed.length : 0;
}

// Each shoot's people, noted for its record in The Eye.
async function notePeople(brought) {
  const D = window.DFData;
  if (!D || !D.saveLink) return;
  for (const b of brought) {
    const [had] = await D.linksWhere({ fromApp: 'the-eye', fromId: b.shootId, type: 'people' });
    await D.saveLink({ ...(had || {}), fromApp: 'the-eye', fromId: b.shootId, toApp: 'rounds', toId: '', type: 'people', title: b.title, names: b.names });
  }
}

// A talent photo, or a shoot's first final, as The Eye keeps it ('' when there's none). Opened the
// way The Eye opens it (version 1, with its one store), so it's never left
// without that store if Rounds happens to open it first.
export function eyePhoto(key) {
  return new Promise((done) => {
    if (alone()) { done(''); return; }
    let req;
    try { req = indexedDB.open(EYE_PHOTOS, 1); } catch { done(''); return; }
    req.onupgradeneeded = () => req.result.createObjectStore('images');
    req.onerror = () => done('');
    req.onblocked = () => done('');
    req.onsuccess = () => {
      const db = req.result;
      try {
        const get = db.transaction('images').objectStore('images').get(key);
        get.onsuccess = () => { const v = get.result; db.close(); done((Array.isArray(v) && v[0] && (typeof v[0] === 'string' ? v[0] : v[0].src)) || ''); };
        get.onerror = () => { db.close(); done(''); };
      } catch { db.close(); done(''); }
    };
  });
}
