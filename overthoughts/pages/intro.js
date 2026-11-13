// The tour: a few cards on how Overthoughts works. Options > How it works
// shows them, and inside Documenting Fictions they're offered the first time
// the notebook is opened (welcome.js).
import { openSheet } from '../components/sheet.js';

const D = window.DFData;
const cards = () => [
  ['Write it down', 'Tap + on Entries to write what’s on your mind. Stuck for a start? Pick a prompt. Add photos if they help.'],
  D.inSuite()
    ? ['About a shoot', 'An entry can be about one of your shoots in The Eye, with a link to open it there. Give it a takeaway too: the one thing to keep from it.']
    : ['A takeaway', 'Give an entry a takeaway: the one thing to keep from it.'],
  ['Reviews', 'The takeaways from your entries gather in Reviews, month by month, so you can look back on what changed.'],
  ['Keep a copy', 'Your entries are saved inside the app, on this phone. Now and then, save a backup in Options.'],
];

export function openIntro() {
  const CARDS = cards();
  let at = 0;
  const s = openSheet({ title: CARDS[0][0], className: 'sheet-small intro' });
  const draw = () => {
    const last = at === CARDS.length - 1;
    s.setTitle(CARDS[at][0]);
    s.body.innerHTML = `
      <p class="sheet-message">${CARDS[at][1]}</p>
      <span class="wz-dots intro-dots" aria-hidden="true">${CARDS.map((_, i) => `<i class="${i === at ? 'on' : ''}"></i>`).join('')}</span>
      <div class="sheet-actions${at ? '' : ' one'}">
        ${at ? '<button type="button" class="btn secondary" data-back>Back</button>' : ''}
        <button type="button" class="btn primary" data-next>${last ? 'Got it' : 'Next'}</button>
      </div>`;
  };
  s.body.addEventListener('click', (e) => {
    if (e.target.closest('[data-back]')) { at--; draw(); }
    else if (e.target.closest('[data-next]')) { if (at === CARDS.length - 1) s.close(); else { at++; draw(); } }
  });
  draw();
  return s;
}
