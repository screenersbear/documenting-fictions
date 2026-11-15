// Rounds' part of the year (round 2, connect/15), for the year page on the
// shelf (shared/data/year.js): each year's people pitched, its yeses, and
// WHAT LED TO WORK, from Rounds' history: the moves done (the log). Each yes
// (an answer to a pitch, or a Yes for someone who asked to shoot) and each
// shoot booked again (someone's second shoot in The Eye, or later) is put
// down to the last move done with that person before it, within three
// months; the thank-yous don't count, as they come after. A row for each kind
// of move that led to any: "11 sent, 2 of the 6 yeses, 1 booked again".
import { KINDS, KIND_KEYS, markSvg } from './kinds.js';
import { isDay, daysBetween } from './dates.js';
import { AFTER_SHOOT } from './eye-people.js';

export const WITHIN = 90; // days from the move to the yes or shoot
const THANKS = ['thanks', 'yes'];
export const LED_WORDS = {
  pitch: 'Pitches', followup: 'Follow ups', intros: 'Asking past clients for intros', refresh: 'Refresh offers',
  checkin: 'Check ins', photos: 'Your photos are up', hello: 'Saying hello',
};
const yearOf = (day) => day.slice(0, 4);
const add = (o, y, k, n = 1) => { const t = (o[y] = o[y] || {}); t[k] = (t[k] || 0) + n; };

// The yeses: { id, day } for everyone whose answer was yes.
export const yesesOf = (people) => people.filter((p) => p.pitch && p.pitch.answer === 'yes' && isDay(p.pitch.on)).map((p) => ({ id: p.id, day: p.pitch.on }));

// Shoots booked again: { id, day } for each shoot someone was on after
// their first (shoots shot, by their day in The Eye).
export function bookingsOf(people, shoots) {
  const on = new Map((shoots || []).filter((s) => s && AFTER_SHOOT.includes(s.status) && isDay(s.date)).map((s) => [s.id, s.date]));
  const out = [];
  for (const p of people) {
    const days = (p.shoots || []).map((id) => on.get(id)).filter(Boolean).sort();
    for (const day of days.slice(1)) out.push({ id: p.id, day });
  }
  return out;
}

// The move a yes or a shoot is put down to: the last done with them on or
// before its day, within three months (null: none).
export function ledBy(lines, ev) {
  const before = lines.filter((l) => l.personId === ev.id && !THANKS.includes(l.kind) && LED_WORDS[l.kind] && isDay(l.day) && l.day <= ev.day && daysBetween(l.day, ev.day) <= WITHIN);
  return before.sort((a, b) => a.day.localeCompare(b.day) || (a.at || 0) - (b.at || 0)).pop() || null;
}

const yesWords = (y, all) => (y === all ? (y === 1 ? '1 yes' : `all ${y} yeses`) : `${y} of the ${all} yeses`);
// A row's line: "11 sent, 2 of the 6 yeses, 1 booked again".
export function ledLine({ sent = 0, yes = 0, booked = 0 }, allYes) {
  return [sent ? `${sent} sent` : '', yes ? yesWords(yes, allYes) : '', booked ? `${booked} booked again` : ''].filter(Boolean).join(', ');
}

// Every year Rounds has anything for: { '2026': { pitched, yes, led } }.
export function yearTally(people, lines, shoots) {
  const log = (lines || []).filter((l) => l && isDay(l.day));
  const pitched = new Set([
    ...log.filter((l) => l.kind === 'pitch').map((l) => `${yearOf(l.day)} ${l.personId}`),
    ...people.filter((p) => isDay(p.pitched)).map((p) => `${yearOf(p.pitched)} ${p.id}`),
  ]);
  const counts = {}; // year: { pitched, yes }
  const kinds = {}; // year: { 'sent pitch': n, 'yes pitch': n, 'booked intros': n }
  for (const key of pitched) add(counts, key.slice(0, 4), 'pitched');
  for (const l of log) if (LED_WORDS[l.kind]) add(kinds, yearOf(l.day), `sent ${l.kind}`);
  const credit = (ev, what) => { const l = ledBy(log, ev); if (l) add(kinds, yearOf(ev.day), `${what} ${l.kind}`); };
  for (const ev of yesesOf(people)) { add(counts, yearOf(ev.day), 'yes'); credit(ev, 'yes'); }
  for (const ev of bookingsOf(people, shoots)) credit(ev, 'booked');
  const out = {};
  for (const y of new Set([...Object.keys(counts), ...Object.keys(kinds)])) {
    const c = counts[y] || {};
    const k = kinds[y] || {};
    const led = KIND_KEYS.filter((kind) => (k[`yes ${kind}`] || 0) + (k[`booked ${kind}`] || 0) > 0)
      .map((kind) => ({ kind, sent: k[`sent ${kind}`] || 0, yes: k[`yes ${kind}`] || 0, booked: k[`booked ${kind}`] || 0 }))
      .sort((a, b) => (b.yes + b.booked) - (a.yes + a.booked))
      .map((r) => ({ title: LED_WORDS[r.kind], line: ledLine(r, c.yes || 0), bg: KINDS[r.kind].bg, icon: markSvg(r.kind, 10) }));
    out[y] = { ...(c.pitched ? { pitched: c.pitched } : {}), ...(c.yes ? { yes: c.yes } : {}), led };
  }
  return out;
}
