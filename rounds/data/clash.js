// How a clash reads in "Changed on two devices" (data/merge.js finds them):
// what it's about, and each field that differs, in words, this phone's and
// the other device's side by side.
import { KINDS } from './kinds.js';
import { GROUPS } from './plan.js';
import { getPath } from './merge.js';
import { WEEK } from './work-days.js';

const FIELDS = {
  name: 'Name', group: 'Group', groups: 'Groups', instagram: 'Instagram', tiktok: 'TikTok', website: 'Website', email: 'Email',
  where: 'Where you met', note: 'Note', address: 'Address', next: 'Next move', draft: 'Draft in Gmail',
  promises: 'Promises', letGo: 'Let go', 'lists.email': 'Email newsletter', 'lists.mail': 'Mail newsletter', text: 'Message',
};
const SETTINGS = { perDay: 'Moves a day', workDays: 'Work days', daysOff: 'Days off', offer: 'Your offer', city: 'Your city' };

// A field's value in words ('Nothing' for none).
export function valueWords(path, v, id = '') {
  if (v === undefined || v === null || v === '') return 'Nothing';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (path === 'group') return GROUPS[v] || String(v);
  if (path === 'groups' && Array.isArray(v)) return v.map((g) => GROUPS[g] || String(g)).join(', ') || 'Nothing';
  if (path === 'next' || path === 'draft') return KINDS[v.kind] ? [KINDS[v.kind].name, v.due && `due ${v.due}`].filter(Boolean).join(', ') : 'Nothing';
  if (path === 'promises' && Array.isArray(v)) return v.filter((x) => x && x.open && x.what).map((x) => x.what).join('; ') || 'None open';
  if ((id === 'workDays' || id === 'daysOff') && Array.isArray(v)) return WEEK.filter(([d]) => v.includes(d)).map(([, n]) => n).join(', ') || 'Nothing';
  return typeof v === 'object' ? JSON.stringify(v) : String(v);
}

// What the clash is about: someone by name, a message by its kind, a setting.
export function subjectOf(c) {
  const r = c.mine || c.theirs || {};
  if (c.store === 'people') return r.name || 'Someone';
  if (c.store === 'messages') return `The ${KINDS[c.id] ? KINDS[c.id].name : c.id} message`;
  if (c.store === 'settings') return SETTINGS[c.id] || 'A setting';
  if (c.store === 'moves') return 'A move marked done';
  return 'A lead passed on';
}

// The fields that differ: [{ label, theirs, mine }].
export function clashRows(c) {
  return (c.loud || []).map((p) => ({
    label: c.store === 'settings' && p === 'value' ? SETTINGS[c.id] || 'Setting' : FIELDS[p] || p,
    theirs: valueWords(p, getPath(c.theirs, p), c.id),
    mine: valueWords(p, getPath(c.mine, p), c.id),
  }));
}

// Which side changed last.
export const newerSide = (c) => ((c.theirs && c.theirs.updatedAt) || '') > ((c.mine && c.mine.updatedAt) || '') ? 'theirs' : 'mine';
