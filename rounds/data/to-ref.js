// A yes passed to Ref (round 2, connect/05): a 'new-client' link in
// df-links with who it is, their handle and their photo, which Ref shows as
// a slip and makes a mood board from. Only while New clients is switched on
// (the shelf's Options, HOW THEY CONNECT). Rounds only writes the link.
import { getPhoto } from './db.js';
import { eyePhoto } from './eye.js';
import { clientFor } from './pitch.js';

const D = () => window.DFData;
const C = () => window.DFConnect;
// Inside the suite only: on its own, Rounds has no Ref (rounds/STANDALONE.md).
const ready = () => !!(window.DF_SUITE && D() && C() && D().saveLink);

// Their link to Ref (null when there's none).
export async function refLinkFor(person) {
  if (!ready()) return null;
  const [l] = await D().linksWhere({ fromApp: 'rounds', fromId: person.id, type: 'new-client' });
  return l || null;
}

// Their photo as bytes, the way df-links keeps pictures (null for none).
async function photoOf(person) {
  const own = await getPhoto(person.id);
  if (own) return { type: own.type || 'image/jpeg', bytes: await own.arrayBuffer() };
  const src = person.photoKey ? await eyePhoto(person.photoKey) : '';
  if (!src) return null;
  const b = await (await fetch(src)).blob();
  return { type: b.type || 'image/jpeg', bytes: await b.arrayBuffer() };
}

// A yes: the link made (or brought up to date), with their photo.
export async function passToRef(person, pitched) {
  if (!ready() || !C().connectOn('clients')) return null;
  const had = await refLinkFor(person);
  const photo = await photoOf(person).catch(() => null);
  const link = { ...(had || {}), fromApp: 'rounds', fromId: person.id, toApp: 'ref', toId: (had && had.toId) || '', type: 'new-client', ...clientFor(person, pitched) };
  return D().saveLink(link, photo ? { cover: photo } : undefined);
}

// A yes taken back before Ref started their board: the link goes. (A board
// already started stays, with everything in it.)
export async function takeBackFromRef(person) {
  const l = await refLinkFor(person);
  if (l && !l.toId) await D().dropLinks([l.id]);
}
