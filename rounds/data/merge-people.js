// Two people made one (Tightening Rounds, rounds/11, 16 Nov). The one picked
// keeps its name, id and photo; everything else comes together: groups,
// shoots, handles and details it didn't have, both notes, the sooner next
// move, every promise (21 Nov), and every line of the log (moves, moments, notes). (Not to be mixed
// up with data/merge.js, which is sync putting two copies of the same
// records together.)
import { cleanGroups, leadGroup, groupsOf } from './plan.js';
import { later } from './dates.js';
import { bothPromises } from './promises.js';

const FILL = ['instagram', 'tiktok', 'website', 'email', 'address', 'photoKey', 'pitched', 'pitch', 'draft'];
const both = (a, b) => [...new Set([a, b].map((v) => String(v ?? '').trim()).filter(Boolean))].join('. ');
const earlier = (a, b) => [a, b].filter(Boolean).sort()[0] || '';

// The move still ahead that comes first (one let go has none ahead).
function nextOf(a, b) {
  const na = !a.letGo && a.next;
  const nb = !b.letGo && b.next;
  if (na && nb) return nb.due < na.due ? nb : na;
  return na || nb || a.next || b.next || null;
}

// keep: the one whose name and photo stay; other: the one that goes into it.
export function mergePeople(keep, other) {
  const out = { ...keep };
  for (const k of FILL) if (!keep[k] && other[k]) out[k] = other[k];
  const groups = cleanGroups([...groupsOf(keep), ...groupsOf(other)]);
  Object.assign(out, {
    groups,
    group: leadGroup(groups),
    groupPicked: !!(keep.groupPicked || other.groupPicked),
    where: both(keep.where, other.where),
    note: both(keep.note, other.note),
    lists: { email: !!(keep.lists?.email || other.lists?.email), mail: !!(keep.lists?.mail || other.lists?.mail) },
    shoots: [...new Set([...(keep.shoots || []), ...(other.shoots || [])])],
    lastShot: later(keep.lastShot || '', other.lastShot || ''),
    lastMove: later(keep.lastMove || '', other.lastMove || ''),
    added: earlier(keep.added, other.added),
    letGo: !!(keep.letGo && other.letGo),
    next: nextOf(keep, other),
  });
  const promises = bothPromises(keep.promises, other.promises);
  if (promises.length) out.promises = promises;
  return out;
}

// The other one's lines, now the kept one's.
export const movedLines = (lines, from, to) => lines.filter((l) => l.personId === from).map((l) => ({ ...l, personId: to }));
// "5 things logged": their lines in the log (moves, moments and notes).
export function loggedWords(lines, id) {
  const n = lines.filter((l) => l.personId === id && l.day).length;
  return `${n} ${n === 1 ? 'thing' : 'things'} logged`;
}
