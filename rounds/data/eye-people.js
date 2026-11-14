// People from The Eye (rounds/NOTES.md): after a shoot is captured, its
// talent and team come into Rounds on their own, with a ready Say thanks.
// Rounds only reads The Eye; nothing here changes it.
import { afterShoot, becomesRegular } from './plan.js';
import { findMatch } from './match.js';
import { newPerson } from './person.js';
import { cleanHandle } from './contact.js';
import { isDay, later } from './dates.js';

// The Eye's statuses from Captured on.
export const AFTER_SHOOT = ['captured', 'waiting_for_selects', 'editing', 'delivered'];
const named = (x) => !!x && typeof x.name === 'string' && x.name.trim() !== '';
const handleOn = (list, platform) => cleanHandle((list || []).find((h) => h && h.platform === platform)?.handle);

// Everyone on a shoot: { name, role, instagram, tiktok, photoKey }. A
// talent's photo is kept in The Eye under the shoot and the talent.
export function shootPeople(shoot) {
  const talent = (shoot.talents || []).filter(named).map((t) => ({
    name: t.name.trim(), role: 'Talent',
    instagram: handleOn(t.socialHandles, 'instagram'), tiktok: handleOn(t.socialHandles, 'tiktok'),
    photoKey: t.id ? `${shoot.id}__talent_${t.id}` : '',
  }));
  const team = (shoot.teamMembers || []).filter(named).map((m) => {
    const on = m.socialPlatform || 'instagram';
    return {
      name: m.name.trim(), role: m.role || 'Team',
      instagram: on === 'instagram' ? cleanHandle(m.socialHandle) : '', tiktok: on === 'tiktok' ? cleanHandle(m.socialHandle) : '',
      photoKey: '',
    };
  });
  return [...talent, ...team];
}

// Brings in the people on shoots not seen before: new people, or more
// shoots for people Rounds has. Returns { changed (people new or changed),
// seen (every shoot looked at, for next time) }.
export function bringIn(people, shoots, seen, today, makeId) {
  const all = [...people];
  const changed = new Map();
  const done = new Set(seen);
  const fresh = (shoots || []).filter((s) => s && s.id && !done.has(s.id) && AFTER_SHOOT.includes(s.status) && isDay(s.date))
    .sort((a, b) => a.date.localeCompare(b.date));
  for (const s of fresh) {
    for (const sp of shootPeople(s)) {
      let p = findMatch(all, sp);
      if (!p) {
        p = newPerson({ ...sp, id: makeId(), where: `${sp.role} on ${s.title || 'a shoot'}`, source: 'eye', next: null }, today);
        all.push(p);
      }
      if (p.shoots.includes(s.id)) continue; // on the shoot twice
      const q = { ...p, shoots: [...p.shoots, s.id], lastShot: later(p.lastShot, s.date), photoKey: p.photoKey || sp.photoKey, instagram: p.instagram || sp.instagram };
      if (becomesRegular(q)) q.group = 'regular';
      if (!q.letGo) q.next = afterShoot(q, s.date, today);
      all[all.indexOf(p)] = q;
      changed.set(q.id, q);
    }
    done.add(s.id);
  }
  return { changed: [...changed.values()], seen: [...done] };
}
