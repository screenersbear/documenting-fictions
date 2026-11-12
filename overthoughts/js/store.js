// Overthoughts' entries, reviews and photos, kept in its own database
// ('overthoughts', see df-data.js). An entry is written here: date, an
// optional title, the writing, photos, tags, an optional shoot it's about,
// and a takeaway.
//
// Nothing comes over from The Eye (the user, 11-12): its reflections, weekly
// log and Journal stay in The Eye. Anything copied over before that (kind
// 'reflection', or from: 'the-eye') is left in the database untouched but
// never shown, opened or counted here.
const D = window.DFData;
export const hasText = D.hasText;

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const db = () => D.overthoughts();

const written = (e) => e && e.kind !== 'reflection' && e.from !== 'the-eye';
export async function allEntries() {
  return (await D.rows(await db(), 'entries')).map(([, e]) => e).filter(written);
}
export async function getEntry(id) {
  const e = await D.getOne(await db(), 'entries', id);
  return written(e) ? e : null;
}
export async function saveEntry(e) {
  e.updatedAt = D.nowIso();
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
export const hasWords = (e) => hasText(e.title) || hasText(e.body) || hasText(e.takeaway);
const firstLine = (t) => (t || '').replace(/^\[[^\]]*\]\s*/, '').split('\n').map((l) => l.trim()).find(Boolean) || '';
export const entryTitle = (e) => e.title || firstLine(e.body) || 'Untitled entry';
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
export const byNewest = (a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || '');
