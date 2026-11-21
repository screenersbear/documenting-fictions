// Choosing a person's photo (20 Nov): from the ... menu, or a tap on the
// photo on their page. Pick one, crop it (components/crop-sheet.js), and
// it's kept (components/photo.js keepPhoto).
import { pickFile } from '../components/files.js';
import { openCrop } from '../components/crop-sheet.js';
import { keepPhoto } from '../components/photo.js';
import { toast } from '../components/toast.js';

// redraw: their page drawn again once it's changed.
export async function changePhoto(p, redraw) {
  const file = await pickFile('image/*');
  if (!file) return;
  const cropped = await openCrop(file);
  if (cropped === false) { toast("That photo couldn't be opened."); return; }
  if (!cropped) return;
  try { await keepPhoto(p, cropped); } catch { toast("That photo couldn't be opened."); return; }
  redraw();
}
