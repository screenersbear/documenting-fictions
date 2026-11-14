// A person's ... menu (04-person): Edit, a photo (users can add one for
// team members too: The Eye only has talent photos), and Let go, which
// keeps everything (or Bring back).
import { choiceSheet, confirmSheet } from '../components/dialogs.js';
import { keepPhoto, removePhoto, hasOwnPhoto } from '../components/photo.js';
import { pickFile } from '../components/files.js';
import { toast } from '../components/toast.js';
import { savePerson } from '../data/db.js';
import { letGo, bringBack } from '../data/person.js';
import { dayOf } from '../data/dates.js';
import { openEdit } from './person-edit.js';

export async function openPersonMenu(p, redraw) {
  const own = await hasOwnPhoto(p);
  const pick = await choiceSheet({
    title: p.name,
    options: [
      { key: 'edit', label: 'Edit' },
      { key: 'photo', label: own ? 'Change the photo' : 'Choose a photo' },
      ...(own ? [{ key: 'unphoto', label: 'Remove the photo' }] : []),
      p.letGo ? { key: 'back', label: 'Bring back' } : { key: 'go', label: 'Let go' },
    ],
  });
  if (pick === 'edit') openEdit(p, redraw);
  else if (pick === 'photo') {
    const file = await pickFile('image/*');
    if (!file) return;
    try { await keepPhoto(p, file); } catch { toast("That photo couldn't be opened."); return; }
    redraw();
  } else if (pick === 'unphoto') { await removePhoto(p); redraw(); }
  else if (pick === 'back') { await savePerson(bringBack(p, dayOf())); redraw(); }
  else if (pick === 'go') {
    const yes = await confirmSheet({ title: `Let ${p.name} go?`, message: 'They leave Today and your list of people. Everything about them is kept, and you can bring them back.', confirmLabel: 'Let go' });
    if (yes) { await savePerson(letGo(p)); redraw(); }
  }
}
