// People from The Eye (rounds/NOTES.md): after a shoot is captured, its
// talent and team come into Rounds on their own, with a ready Say thanks.
// A talent marked Booked me in The Eye (people/NOTES.md, 15 Nov: they're
// the paying client) is made a Client too, their other groups kept.
// Rounds only reads The Eye; nothing here changes it.
import { afterShoot, becomesRegular, madeRegular, madeClient } from './plan.js';
import { findMatch } from './match.js';
import { newPerson } from './person.js';
import { cleanHandle } from './contact.js';
import { isDay, later } from './dates.js';

// The Eye's statuses from Captured on.
export const AFTER_SHOOT = ['captured', 'waiting_for_selects', 'editing', 'delivered'];
const named = (x) => !!x && typeof x.name === 'string' && x.name.trim() !== '';
const handleOn = (list, platform) => cleanHandle((list || []).find((h) => h && h.platform === platform)?.handle);

// Everyone on a shoot: { name, role, instagram, tiktok, photoKey, booked }.
// A talent's photo is kept in The Eye under the shoot and the talent;
// booked: they booked you for it (only ever a talent, and only when The Eye
// says so).
export function shootPeople(shoot) {
  const talent = (shoot.talents || []).filter(named).map((t) => ({
    name: t.name.trim(), role: 'Talent',
    instagram: handleOn(t.socialHandles, 'instagram'), tiktok: handleOn(t.socialHandles, 'tiktok'),
    photoKey: t.id ? `${shoot.id}__talent_${t.id}` : '',
    booked: t.bookedMe === true,
  }));
  const team = (shoot.teamMembers || []).filter(named).map((m) => {
    const on = m.socialPlatform || 'instagram';
    return {
      name: m.name.trim(), role: m.role || 'Team',
      instagram: on === 'instagram' ? cleanHandle(m.socialHandle) : '', tiktok: on === 'tiktok' ? cleanHandle(m.socialHandle) : '',
      photoKey: '', booked: false,
    };
  });
  return [...talent, ...team];
}

// Brings in the people on shoots not seen before: new people, or more
// shoots for people Rounds has. Returns { changed (people new or changed),
// seen (every shoot looked at, for next time), brought (each shoot that
// brought someone: { shootId, title, names }, for its record in The Eye) }.
export function bringIn(people, shoots, seen, today, makeId) {
  const all = [...people];
  const changed = new Map();
  const brought = [];
  const done = new Set(seen);
  const fresh = (shoots || []).filter((s) => s && s.id && !done.has(s.id) && AFTER_SHOOT.includes(s.status) && isDay(s.date))
    .sort((a, b) => a.date.localeCompare(b.date));
  for (const s of fresh) {
    const on = shootPeople(s);
    const names = on.map((sp) => sp.name).filter((n, i, all) => all.findIndex((x) => x.toLowerCase() === n.toLowerCase()) === i);
    if (names.length) brought.push({ shootId: s.id, title: s.title || '', names });
    for (const sp of on) {
      let p = findMatch(all, sp);
      if (!p) {
        p = newPerson({ ...sp, id: makeId(), where: `${sp.role} on ${s.title || 'a shoot'}`, source: 'eye', next: null }, today);
        all.push(p);
      }
      if (p.shoots.includes(s.id)) continue; // on the shoot twice
      let q = { ...p, shoots: [...p.shoots, s.id], lastShot: later(p.lastShot, s.date), photoKey: p.photoKey || sp.photoKey, instagram: p.instagram || sp.instagram };
      if (becomesRegular(q)) q = madeRegular(q);
      if (sp.booked) q = madeClient(q);
      if (!q.letGo) q.next = afterShoot(q, s.date, today, sp.booked);
      all[all.indexOf(p)] = q;
      changed.set(q.id, q);
    }
    done.add(s.id);
  }
  return { changed: [...changed.values()], seen: [...done], brought };
}
