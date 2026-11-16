// What Rounds tells the one list of people (round 2, connect/08): each of
// its people, with their next move and group, for the person page and search
// on the shelf (the suite's shared files, window.DFData, keep the list:
// shared/data/people-things.js). And the other way: a person changed on that
// page comes back into Rounds, their name and handles (and from here to the
// other devices, like any change), unless Rounds changed them since.
// With them, Rounds' part of the year page (data/year-tally.js).
import { listPeople, savePeople, getPhoto, photoIds, listMoves, onChange } from './db.js';
import { happened } from './happened.js';
import { HOW_CHOICES } from './done-notes.js';
import { doneSoFar } from './so-far.js';
import { momentChoices } from './moments.js';
import { eyePhoto, eyeShoots } from './eye.js';
import { yearTally } from './year-tally.js';
import { lookOf, markSvg, moveLook } from './kinds.js';
import { phrase } from './reasons.js';
import { GROUPS, groupWords } from './plan.js';
import { dayOf } from './dates.js';
import { whenDue } from './work-days.js';
import { getWeek } from './moves.js';
import { dueLine } from './people-find.js';

const D = () => window.DFData;

// When the move's due, as the person page says it (data/people-find.js).
export { dueLine };

// A Rounds person as the list knows them: found again by their id.
export const listedAs = (p) => ({ name: p.name, instagram: p.instagram, tiktok: p.tiktok, roundsId: p.id, at: p.updatedAt || '' });

// Their page on the shelf (everything with them in all four), or null:
// outside the suite, or before the list has them.
export async function shelfPageOf(p) {
  if (!D() || !D().personFor) return null;
  const r = await D().personFor(listedAs(p)).catch(() => null);
  return r ? D().personUrl(r.id) : null;
}

// A person as the list keeps them: their name, their next move ("Check in,
// due 2 Dec"), their group, what's happened with them (lines: the moves log,
// for The Eye's talent card), what's been done (SO FAR, with their shoots:
// The Eye's), a Say thanks waiting (for The Eye) and their photo (asked for
// only when it changed).
export function personThing(p, today, week, ownPhoto, lines = [], shoots = []) {
  const next = p.next && !p.letGo ? p.next : null;
  const what = next ? phrase(next.kind, p.name, next.year) : p.letGo ? 'Let go' : 'Nothing planned';
  const when = next ? dueLine(next, week, today) : '';
  return {
    id: p.id,
    kind: 'person',
    title: p.name || (p.instagram || p.tiktok ? `@${p.instagram || p.tiktok}` : 'Someone'),
    line: next ? `${what}, ${when.replace(/^Due/, 'due')}` : what,
    day: next ? whenDue(next, week, today) : '',
    people: [listedAs(p)],
    params: { person: p.id },
    more: {
      next: { title: what, line: when, bg: next ? lookOf(moveLook(next)).bg : '#E1E1DC', icon: next ? markSvg(moveLook(next), 10) : '' },
      group: GROUPS[p.group] ? groupWords(p) : '',
      happened: happened(p, lines),
      // SO FAR (thanks/06), each with its mark: a move's own, or a
      // notebook's (mark), which the shelf draws.
      done: doneSoFar(p, lines, shoots).map((r) => ({ ...r, bg: r.mark ? '' : lookOf(r.look).bg, icon: r.mark ? '' : markSvg(r.look, 10) })),
      hows: { ...HOW_CHOICES, moment: momentChoices(p.name) },
      // A Say thanks waiting, for The Eye's nudge on a captured shoot (thanks/01).
      thanks: next && next.kind === 'thanks' ? { due: whenDue(next, week, today), shoots: p.shoots || [] } : null,
    },
    coverKey: ownPhoto ? `own:${p.id}` : p.photoKey ? `eye:${p.photoKey}` : '',
    covers: () => photoOf(p, ownPhoto),
  };
}
// Their photo: one added in Rounds, else their talent photo from The Eye.
async function photoOf(p, own) {
  if (own) {
    const blob = await getPhoto(p.id);
    return blob ? [{ type: blob.type, bytes: await blob.arrayBuffer() }] : [];
  }
  const pic = p.photoKey ? D().pictureOf(await eyePhoto(p.photoKey)) : null;
  return pic ? [pic] : [];
}

// Tells the list, a moment after the last change (and from now on, after
// every change: tellPeopleFromNowOn).
let soon = null;
export function tellPeople(wait = 1500) {
  if (!D() || !D().publishThings) return;
  clearTimeout(soon);
  soon = setTimeout(async () => {
    try {
      const [people, week, ids, lines] = await Promise.all([listPeople(), getWeek(), photoIds(), listMoves()]);
      const own = new Set(ids);
      const shoots = eyeShoots();
      window.DFYear?.publishYear('rounds', yearTally(people, lines, shoots));
      await D().publishThings('rounds', people.map((p) => personThing(p, dayOf(), week, own.has(p.id), lines, shoots)));
    } catch (e) { /* the list just doesn't hear this time */ }
  }, wait);
}
export const tellPeopleFromNowOn = () => onChange(() => tellPeople());

// ---------- Changed on the person page ----------
const TAKEN = 'df-people-taken-rounds'; // the newest change already taken
// Each of its people the list says was changed since (found by their Rounds
// id): the new name and handles, unless Rounds changed them later still.
export async function takePeopleEdits() {
  if (!D() || !D().peopleAll) return 0;
  let taken = '';
  try { taken = localStorage.getItem(TAKEN) || ''; } catch (e) { /* private mode */ }
  const edited = (await D().peopleAll()).filter((r) => r.editedAt && r.editedAt > taken);
  if (!edited.length) return 0;
  const changed = [];
  for (const p of await listPeople()) {
    const r = edited.find((x) => x.sigs.includes(`rounds:${p.id}`));
    if (!r || (p.updatedAt && p.updatedAt > r.editedAt)) continue;
    const next = { ...p, name: r.name || p.name, instagram: r.instagram, tiktok: r.tiktok };
    if (next.name !== p.name || next.instagram !== p.instagram || next.tiktok !== p.tiktok) changed.push(next);
  }
  if (changed.length) await savePeople(changed);
  try { localStorage.setItem(TAKEN, edited.map((r) => r.editedAt).sort().pop()); } catch (e) { /* private mode */ }
  return changed.length;
}
