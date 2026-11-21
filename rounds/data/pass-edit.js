// A name or handle changed in Rounds (Edit on their page, refining round,
// 21 Nov) passes on to the other notebooks, as a change made on the person
// page does: the one list of people takes it as an edit (shared/data/
// people.js, editPerson), so The Eye's talent and team and Ref's board for
// them follow. A yes Ref hasn't started a board for yet says the new name
// and handle too. Inside the suite only; Rounds only writes the list and
// its own link.
import { listedAs } from './people-out.js';
import { refLinkFor } from './to-ref.js';
import { clientFor } from './pitch.js';

const D = () => window.DFData;
const KEYS = ['name', 'instagram', 'tiktok'];
const said = (v) => String(v ?? '').trim();

// Whether their name or a handle is different now.
export const nameChanged = (before, after) => !!before && !!after && KEYS.some((k) => said(before[k]) !== said(after[k]));

// before: as they were; after: as saved. True when it passed on.
export async function passEdit(before, after) {
  if (!D() || !D().personFor || !nameChanged(before, after)) return false;
  const r = await D().personFor(listedAs(before));
  if (r) await D().editPerson(r.id, { name: after.name, instagram: after.instagram, tiktok: after.tiktok });
  const l = await refLinkFor(after);
  if (l && !l.toId) await D().saveLink({ ...l, ...clientFor(after, l.pitched) });
  return !!r;
}
