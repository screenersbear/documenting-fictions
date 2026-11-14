// Your photos are up (round 2, connect). When a post shared from Layouts
// tags people Rounds knows (a 'post-people' link in df-links, with the
// caption's handles), each gets that move today, with the shoot's name for
// its message. It counts toward Today's limit like any move. It stands in
// for the move they had next, which comes back once it's done; a thank-you
// still waiting is folded into it (its message says "Thank you again").
// Only the people tagged in the post; anyone let go is left alone.
import { move } from './plan.js';
import { cleanHandle } from './contact.js';
import { firstName } from './fill.js';

// Everyone here tagged by these handles (on Instagram or TikTok, any case).
export function taggedIn(people, handles) {
  const want = new Set((handles || []).map((h) => cleanHandle(h).toLowerCase()).filter(Boolean));
  return people.filter((p) => !p.letGo && [p.instagram, p.tiktok].some((h) => !!h && want.has(h.toLowerCase())));
}

// The person with Your photos are up next.
export function photosUp(person, shoot, today) {
  const had = person.next;
  const then = !had || had.kind === 'thanks' ? null : had.kind === 'photos' ? had.then || null : had;
  const title = String(shoot ?? '').trim();
  return { ...person, next: { ...move('photos', today), ...(title ? { shoot: title } : {}), ...(then ? { then } : {}) } };
}

// The posts waiting, taken: { changed (each person once, as they are after
// every post), taken ([{ link, ids }]: everyone each post tagged) }.
export function takePosts(people, links, today) {
  const now = new Map(people.map((p) => [p.id, p]));
  const changed = new Map();
  const taken = [];
  for (const link of links || []) {
    if (!link || link.takenAt) continue;
    const who = taggedIn([...now.values()], link.handles);
    for (const p of who) {
      const q = photosUp(p, link.title, today);
      now.set(p.id, q);
      changed.set(p.id, q);
    }
    taken.push({ link, ids: who.map((p) => p.id) });
  }
  return { changed: [...changed.values()], taken };
}

// Two or more names: "June, Iryna and Sam".
const listWords = (xs) => `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;

// The slip's line on Today: who's tagged, and that a note is ready.
export function slipLine(names) {
  if (!names.length) return '';
  return names.length === 1 ? `${names[0]} is tagged in the post. A note is ready.` : `${listWords(names)} are tagged in the post. A note for each is ready.`;
}

// Its main button: WRITE TO JUNE, or WRITE TO THEM for more than one.
export const writeWho = (names) => (names.length === 1 ? `Write to ${firstName(names[0])}` : 'Write to them');
