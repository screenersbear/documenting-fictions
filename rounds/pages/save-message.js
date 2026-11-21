// SAVE THIS AS YOUR <KIND> MESSAGE (rounds/14, 18 Nov), on the one sheet
// (pages/one-sheet.js): once your message was put in the box and then
// changed, a line under the box, its tick box off to start. DONE with it
// ticked saves the new words in Messages, the person's details turned back
// into blanks (data/fill.js unfill). Not there when the message wasn't used,
// or is back as it was.
import { esc } from '../components/util.js';
import { TICK } from '../components/icons.js';
import { messageWord } from '../data/kinds.js';

export const saveMessageHtml = () => `
  <label class="save-msg" hidden><input type="checkbox" class="save-msg-input" data-save-msg /><span class="save-msg-box" aria-hidden="true">${TICK}</span>
    <span class="save-msg-words"><span class="save-msg-title"></span><span class="save-msg-sub">You changed it. Next time it starts like this.</span></span></label>`;

// row: the label above; box: WHAT DID YOU SAY?; onShow: told when the line
// comes or goes.
export function wireSaveMessage(row, box, onShow = () => {}) {
  const tick = row.querySelector('[data-save-msg]');
  let used = null; // { kind, text }: the message as it went in the box
  const changed = () => !!used && !!box.value.trim() && box.value.trim() !== used.text.trim();
  function draw() {
    const show = changed();
    if (!show) tick.checked = false;
    if (row.hidden !== !show) { row.hidden = !show; onShow(show); }
  }
  box.addEventListener('input', draw);
  return {
    // Your <kind> message has just gone in the box.
    used(kind, text) {
      used = { kind, text };
      row.querySelector('.save-msg-title').innerHTML = esc(`Save this as your ${messageWord(kind)} message`);
      draw();
    },
    shown: changed,
    wanted: () => changed() && tick.checked,
    kind: () => used && used.kind,
  };
}
