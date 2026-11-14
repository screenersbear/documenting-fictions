// Where a message goes and how a person's handle reads: their Instagram
// first, then TikTok, then an email (only a business's, to pitch), then a
// website (rounds/NOTES.md: no phone numbers).

// A handle from what was typed or pasted: "@maya.rr", "maya.rr" or a link to the profile.
export function cleanHandle(text) {
  let t = String(text ?? '').trim();
  const m = t.match(/(?:instagram\.com|tiktok\.com)\/@?([^/?#\s]+)/i);
  if (m) t = m[1];
  return t.replace(/^@+/, '').replace(/\s+/g, '');
}
// A website as a link that opens: "hobokenflowers.com" gets its https://.
export function cleanSite(text) {
  const t = String(text ?? '').trim();
  if (!t) return '';
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}
export const siteName = (url) => url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '');

// Where COPY AND OPEN goes: { how, url }, or null with nowhere to go.
export function contactFor(person, text = '') {
  if (person.instagram) return { how: 'Instagram', url: `https://www.instagram.com/${encodeURIComponent(person.instagram)}/` };
  if (person.tiktok) return { how: 'TikTok', url: `https://www.tiktok.com/@${encodeURIComponent(person.tiktok)}` };
  if (person.email) return { how: 'email', url: `mailto:${person.email}?body=${encodeURIComponent(text)}` };
  if (person.website) return { how: 'website', url: person.website };
  return null;
}
// Their profile, from their name on a person's page ('' with none).
export const profileUrl = (person) => contactFor({ ...person, email: '' })?.url || '';
// The handle under a name: @maya.rr, or the website's name.
export function handleText(person) {
  if (person.instagram) return `@${person.instagram}`;
  if (person.tiktok) return `@${person.tiktok}`;
  return person.website ? siteName(person.website) : '';
}
