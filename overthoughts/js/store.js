// Overthoughts' entries, reviews and photos, kept in its own database
// ('overthoughts', see df-data.js). Two kinds of entry:
//  - free: written here. Date, an optional title, the writing, tags, an
//    optional shoot it's about, and a takeaway.
//  - reflection: a shoot's reflection from The Eye (what went right, what
//    could have gone better, the takeaway). The Eye writes these when a shoot
//    is reflected on there; they can be read and changed here too.
const D = window.DFData;
export const hasText = D.hasText;

export const POST_CAPTURE = ['captured', 'waiting_for_selects', 'editing', 'rough_cut', 'client_review', 'revisions', 'delivered'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const db = () => D.overthoughts();

export async function allEntries() {
  return (await D.rows(await db(), 'entries')).map(([, e]) => e);
}
export async function getEntry(id) {
  return D.getOne(await db(), 'entries', id);
}
export async function saveEntry(e) {
  e.updatedAt = D.nowIso();
  if (e.kind === 'reflection') e.editedIn = 'overthoughts'; // The Eye picks it up from here next time it opens
  await D.putMany(await db(), 'entries', [e]);
  return e;
}
export async function deleteEntry(id) {
  const d = await db();
  const links = (await D.rows(d, 'links')).map(([, l]) => l).filter((l) => l.toId === id || l.fromId === id);
  const tx = d.transaction(['entries', 'images', 'links'], 'readwrite');
  tx.objectStore('entries').delete(id);
  tx.objectStore('images').delete(id);
  links.forEach((l) => tx.objectStore('links').delete(l.id));
  await new Promise((ok, no) => { tx.oncomplete = ok; tx.onerror = tx.onabort = () => no(tx.error); });
}
export function newEntry(date) {
  const now = D.nowIso();
  return { id: D.uid(), kind: 'free', date: date || D.todayStr(), title: '', body: '', tags: [], takeaway: '', shootId: null, createdAt: now, updatedAt: now };
}

// An entry's photos: [{ src, caption }] (or plain data URLs, from older Journal entries).
export async function photos(id) {
  const v = await D.getOne(await db(), 'images', id);
  return (Array.isArray(v) ? v : []).map((p) => (typeof p === 'string' ? { src: p, caption: '' } : p));
}
export async function setPhotos(id, list) {
  const d = await db();
  if (list.length) await D.putMany(d, 'images', [[id, list]]);
  else await D.deleteOne(d, 'images', id);
}
export async function photoIds() {
  return new Set((await D.rows(await db(), 'images')).filter(([, v]) => Array.isArray(v) && v.length).map(([k]) => k));
}

export async function allReviews() {
  return (await D.rows(await db(), 'reviews')).map(([, r]) => r);
}
export async function getReview(id) {
  return D.getOne(await db(), 'reviews', id);
}
export async function saveReview(r) {
  r.updatedAt = D.nowIso();
  await D.putMany(await db(), 'reviews', [r]);
}

// ---------- Reading entries ----------
// A reflection only shows once something's been written in it; until then it
// just stands for the shoot in the weekly log.
export const hasWords = (e) => (e.kind === 'reflection'
  ? hasText(e.wentRight) || hasText(e.couldBeBetter) || hasText(e.takeaway)
  : hasText(e.title) || hasText(e.body) || hasText(e.takeaway));
const firstLine = (t) => (t || '').replace(/^\[[^\]]*\]\s*/, '').split('\n').map((l) => l.trim()).find(Boolean) || '';
export const entryTitle = (e) => (e.kind === 'reflection' ? e.shootName || 'Untitled shoot' : e.title || firstLine(e.body) || 'Untitled entry');
export const oneLine = (t) => (t || '').replace(/\s*\n+\s*/g, ' ').trim();

// Dates are kept as 'YYYY-MM-DD', read as local days.
export function dayOf(s) {
  const [y, m, d] = String(s || '').slice(0, 10).split('-').map(Number);
  return y ? new Date(y, (m || 1) - 1, d || 1) : new Date();
}
export const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function prettyDay(s) {
  const d = dayOf(s);
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
}
export const monthKey = (s) => String(s || '').slice(0, 7);
export const monthName = (key) => { const [y, m] = key.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; };
// Weeks run Monday to Sunday, the same as The Eye's.
export function weekOf(s) {
  const d = dayOf(s);
  const start = new Date(d);
  start.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end, key: iso(start) };
}
export function weekLabel(start, end) {
  const a = MONTHS[start.getMonth()].slice(0, 3), b = MONTHS[end.getMonth()].slice(0, 3);
  return start.getMonth() === end.getMonth()
    ? `${a} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`
    : `${a} ${start.getDate()} – ${b} ${end.getDate()}, ${end.getFullYear()}`;
}
export const byNewest = (a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || '');
