// A handle box, Instagram's or TikTok's (rounds/NOTES.md, The @ in the
// Instagram field, 21 Nov): an @ fixed at its start, inside the box, so only
// the handle is typed, and the cursor starts right after it. Typed or
// pasted, "@june.park" or a profile link (instagram.com/june.park/?igsh=...)
// comes out as just "june.park"; spaces go. Saved as before, through
// cleanHandle (data/contact.js), so nothing already saved changes.
import { esc } from './util.js';
import { cleanHandle } from '../data/contact.js';

export const handleFieldHtml = (label, name, value = '') => `<label class="field"><span class="field-label">${label}</span>
  <span class="handle-box"><span class="handle-at" aria-hidden="true">@</span><input type="text" name="${name}" value="${esc(cleanHandle(value))}" aria-label="${label} handle" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="handle" /></span></label>`;

// Each handle box in root keeps to just the handle as it's typed or pasted.
export function wireHandles(root) {
  for (const input of root.querySelectorAll('.handle-box input')) {
    input.addEventListener('input', () => {
      const t = cleanHandle(input.value);
      if (t !== input.value) input.value = t;
    });
  }
}
