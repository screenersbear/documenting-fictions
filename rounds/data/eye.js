// Reading The Eye, never changing it: its shoots (kept in localStorage) and
// its talent photos (in its own database). Rounds doesn't load the suite's
// shared data (60 KB of backup code it has no use for), so these few lines
// are its own. The two notebooks share a website, inside the suite and out.
import { bringIn } from './eye-people.js';
import { listPeople, savePeople, getSetting, setSetting } from './db.js';
import { uuid } from '../components/util.js';
import { dayOf } from './dates.js';

const EYE_STATE = 'dailies_state_v1';
const EYE_PHOTOS = 'starky-moodboards';

export function eyeShoots() {
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
  const { changed, seen: now } = bringIn(people, shoots, seen, dayOf(), uuid);
  if (changed.length) await savePeople(changed);
  if (now.length !== seen.length) await setSetting('eyeSeen', now);
  return changed.length;
}

// A talent photo, as The Eye keeps it ('' when there's none). Opened the
// way The Eye opens it (version 1, with its one store), so it's never left
// without that store if Rounds happens to open it first.
export function eyePhoto(key) {
  return new Promise((done) => {
    let req;
    try { req = indexedDB.open(EYE_PHOTOS, 1); } catch { done(''); return; }
    req.onupgradeneeded = () => req.result.createObjectStore('images');
    req.onerror = () => done('');
    req.onblocked = () => done('');
    req.onsuccess = () => {
      const db = req.result;
      try {
        const get = db.transaction('images').objectStore('images').get(key);
        get.onsuccess = () => { const v = get.result; db.close(); done((Array.isArray(v) && v[0] && v[0].src) || ''); };
        get.onerror = () => { db.close(); done(''); };
      } catch { db.close(); done(''); }
    };
  });
}
