// Two people who might be one (Tightening Rounds, rounds/10, 16 Nov): the
// same Instagram, TikTok or email, or names that agree, as "Lindsey T." and
// "Lindsay Tran" do: first names the same (or one letter apart, for names of
// four letters or more), and last names the same, one the other's initial,
// or only one of them written down when the first names are the same.
// People shows the first pair not waved away (kept by their two ids).
const fold = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const words = (name) => fold(name).replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);

// One letter changed, added or taken away (or none).
export function oneApart(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return a.slice(i + 1) === b.slice(i + 1) || a.slice(i) === b.slice(i + 1) || a.slice(i + 1) === b.slice(i);
}
const lastAgrees = (x, y) => x === y || (x.length === 1 && y[0] === x) || (y.length === 1 && x[0] === y);

export function namesAlike(a, b) {
  const [fa, ...ra] = words(a);
  const [fb, ...rb] = words(b);
  if (!fa || !fb) return false;
  const same = fa === fb;
  if (!same && !(Math.min(fa.length, fb.length) >= 4 && oneApart(fa, fb))) return false;
  const la = ra.pop() || '';
  const lb = rb.pop() || '';
  if (la && lb) return lastAgrees(la, lb);
  return same;
}
const handles = (p) => [['ig', p.instagram], ['tt', p.tiktok], ['em', p.email]]
  .map(([k, v]) => [k, fold(v).trim().replace(/^@/, '')]).filter(([, v]) => v).map(([k, v]) => `${k}:${v}`);
export const sameHandle = (a, b) => handles(a).some((h) => handles(b).includes(h));

export const pairKey = (a, b) => [a.id, b.id].sort().join('|');
// The first pair (in name order) that might be one person, or null.
// waved: the pairKeys waved away.
export function lookAlike(people, waved = []) {
  const skip = new Set(waved);
  const list = [...people].sort((a, b) => a.name.localeCompare(b.name));
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const [a, b] = [list[i], list[j]];
      if (!skip.has(pairKey(a, b)) && (sameHandle(a, b) || namesAlike(a.name, b.name))) return [a, b];
    }
  }
  return null;
}
