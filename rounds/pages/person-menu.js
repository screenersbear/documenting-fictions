// A person's ... menu (04-person): Edit, a photo (users can add one for
// team members too: The Eye only has talent photos), Yes, let's shoot (for
// someone who asks to shoot: the same Yes as after a pitch, connect/05),
// Merge with... (rounds/11), Let go, which keeps everything (or Bring
// back), and Delete, which asks first and can't be undone (16 Nov).
import { choiceSheet, confirmSheet } from '../components/dialogs.js';
import { keepPhoto, removePhoto, hasOwnPhoto } from '../components/photo.js';
import { pickFile } from '../components/files.js';
import { toast } from '../components/toast.js';
import { savePerson } from '../data/db.js';
import { deletePerson } from '../data/people-store.js';
import { forgetPhoto } from '../components/photo.js';
import { letGo, bringBack } from '../data/person.js';
import { dayOf } from '../data/dates.js';
import { openEdit } from './person-edit.js';
import { answer } from './person-pitch.js';
import { openMergeWith } from './merge-sheet.js';

// asks: the page already asks HOW DID THE PITCH GO? (its chips have the Yes).
export async function openPersonMenu(p, redraw, { asks = false, pitched = '' } = {}) {
  const own = await hasOwnPhoto(p);
  const pick = await choiceSheet({
    title: p.name,
    options: [
      { key: 'edit', label: 'Edit' },
      { key: 'photo', label: own ? 'Change the photo' : 'Choose a photo' },
      ...(own ? [{ key: 'unphoto', label: 'Remove the photo' }] : []),
      ...(asks || p.letGo ? [] : [{ key: 'yes', label: "Yes, let's shoot" }]),
      { key: 'merge', label: 'Merge with...' },
      p.letGo ? { key: 'back', label: 'Bring back' } : { key: 'go', label: 'Let go' },
      { key: 'delete', label: 'Delete', danger: true, skip: true },
    ],
  });
  if (pick === 'edit') openEdit(p, redraw);
  else if (pick === 'photo') {
    const file = await pickFile('image/*');
    if (!file) return;
    try { await keepPhoto(p, file); } catch { toast("That photo couldn't be opened."); return; }
    redraw();
  } else if (pick === 'unphoto') { await removePhoto(p); redraw(); }
  else if (pick === 'yes') { await answer(p, 'yes', pitched); redraw(); }
  else if (pick === 'merge') openMergeWith(p, (kept) => (kept.id === p.id ? redraw() : (location.hash = `#/person/${encodeURIComponent(kept.id)}`)));
  else if (pick === 'delete') {
    const yes = await confirmSheet({ title: `Delete ${p.name}?`, message: "This removes them and everything logged with them. It can't be undone.", confirmLabel: 'Delete', danger: true });
    if (!yes) return;
    await deletePerson(p);
    forgetPhoto(p.id);
    location.hash = '#/people';
    toast('Deleted, with everything logged with them.');
  } else if (pick === 'back') { await savePerson(bringBack(p, dayOf())); redraw(); }
  else if (pick === 'go') {
    const yes = await confirmSheet({ title: `Let ${p.name} go?`, message: 'They leave Today and your list of people. Everything about them is kept, and you can bring them back.', confirmLabel: 'Let go' });
    if (yes) { await savePerson(letGo(p)); redraw(); }
  }
}
