// A year since (data/year-since.js) on the one sheet: one of the shoot's
// finals from The Eye under the person, as it is, with SHARE THE PHOTO,
// which hands it to the phone's share sheet (a download on a computer).
import { toast } from '../components/toast.js';
import { esc } from '../components/util.js';
import { saveFile } from '../components/files.js';
import { eyePhoto } from '../data/eye.js';

// SHARE THE PHOTO goes out to the share sheet: the button clicker leaves it alone.
export const finalHtml = (year) => `<div class="move-final" hidden><img alt="${esc(`A final from ${year.shoot || 'the shoot'}`)}" />
  <button type="button" class="text-btn move-share" data-share data-test-skip>Share the photo</button></div>`;

// The shoot's first final, as The Eye keeps it (none: nothing shown).
export async function showFinal(box, year) {
  const src = await eyePhoto(`${year.shootId}__final`);
  if (!src || !box.isConnected) return;
  box.querySelector('img').src = src;
  box.hidden = false;
  box.querySelector('[data-share]').addEventListener('click', async () => {
    const blob = await (await fetch(src)).blob();
    const ext = blob.type === 'image/png' ? 'png' : 'jpg';
    const name = `${String(year.shoot || 'Final').replace(/[\\/:*?"<>|]/g, '').trim() || 'Final'}.${ext}`;
    if (await saveFile(new File([blob], name, { type: blob.type || 'image/jpeg' })) === 'downloaded') toast('The photo is in your downloads.');
  });
}
