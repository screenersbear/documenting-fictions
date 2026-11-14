// Is this someone Rounds already has? An Instagram handle is the surest
// match; with no handle, the name (rounds/NOTES.md, Import people). A
// handle also finds someone of the same name who has no handle yet.
export const nameKey = (name) => `name:${String(name ?? '').trim().toLowerCase().replace(/\s+/g, ' ')}`;
export const handleKey = (handle) => `ig:${String(handle).toLowerCase()}`;
export const matchKey = (p) => (p.instagram ? handleKey(p.instagram) : nameKey(p.name));
// Every key a person can be matched by.
export const keysOf = (p) => (p.instagram ? [handleKey(p.instagram), nameKey(p.name)] : [nameKey(p.name)]);
export function findMatch(people, p) {
  const k = matchKey(p);
  const named = () => people.find((q) => !q.instagram && nameKey(q.name) === nameKey(p.name));
  return people.find((q) => keysOf(q).includes(k)) || (p.instagram && named()) || null;
}
