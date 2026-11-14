// A starter message, opened from Messages: the words, the blanks that fill
// in (a tap puts one in where the cursor is), SAVE, and a way back to the
// example Rounds came with.
import { openSheet } from '../components/sheet.js';
import { esc } from '../components/util.js';
import { KINDS } from '../data/kinds.js';
import { FILLS } from '../data/fill.js';
import { saveMessage, resetMessage } from '../data/db.js';
import { tagHtml } from '../components/marks.js';

// mine: the user's words for it (undefined while it's still the example).
export function openMessage(kind, mine, onSaved) {
  const s = openSheet({
    title: KINDS[kind].name,
    body: `
      <form class="form" data-form>
        <label class="field"><span class="field-label">Your message</span><textarea name="text" rows="6">${esc(mine ?? KINDS[kind].starter)}</textarea></label>
        <span class="field-label">Fill in</span>
        <div class="fill-chips">${FILLS.map((f) => `<button type="button" class="fill-chip" data-fill="${f}">[${f}]</button>`).join('')}</div>
        ${mine === undefined ? '' : '<button type="button" class="text-btn" data-reset>Back to the example</button>'}
        <div class="sheet-actions">
          <button type="button" class="btn secondary" data-close>Cancel</button>
          <button type="submit" class="btn primary">Save</button>
        </div>
      </form>`,
  });
  s.el.querySelector('.sheet-header h2').innerHTML = tagHtml(kind);
  const text = s.body.querySelector('textarea');
  s.body.querySelector('.fill-chips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-fill]');
    if (!b) return;
    const at = text.selectionStart ?? text.value.length;
    const put = `[${b.dataset.fill}]`;
    text.setRangeText(put, at, text.selectionEnd ?? at, 'end');
    text.focus();
  });
  s.body.querySelector('[data-reset]')?.addEventListener('click', async () => {
    await resetMessage(kind);
    s.close();
    onSaved();
  });
  s.body.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const words = text.value.trim();
    if (!words || words === KINDS[kind].starter) await resetMessage(kind);
    else await saveMessage(kind, words);
    s.close();
    onSaved();
  });
  return s;
}
