// Posts from Layouts (round 2, connect): a post shared there tells Rounds
// who's tagged in it (a 'post-people' link in df-links). Rounds takes each
// once: the people it knows get Your photos are up (data/photos-up.js), and
// the link keeps who they were, for the slip on Today. A post that tags no
// one here is put away without a slip.
import { listPeople, savePeople } from './db.js';
import { takePosts } from './photos-up.js';
import { dayOf } from './dates.js';

// Gives how many people got the move.
export async function takeFromLayouts() {
  const D = window.DFData;
  if (!D || !D.linksWhere) return 0;
  const waiting = (await D.linksWhere({ toApp: 'rounds', type: 'post-people' })).filter((l) => !l.takenAt);
  if (!waiting.length) return 0;
  const { changed, taken } = takePosts(await listPeople(), waiting, dayOf());
  if (changed.length) await savePeople(changed);
  const now = new Date().toISOString();
  for (const { link, ids } of taken) await D.saveLink({ ...link, takenAt: now, people: ids, ...(ids.length ? {} : { tuckedAt: now }) });
  return changed.length;
}
