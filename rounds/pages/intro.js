// A few cards on how Rounds works: on the first launch (on its own), or
// from Options > How it works.
import { openSheet } from '../components/sheet.js';

const SEEN = 'rounds-intro-seen';
const CARDS = [
  ['A few people a day', 'Today picks three people to write to: a thank you, a hello, a check-in. Write, tap Done, and that is it. No streaks, and nothing overdue.'],
  ['Groups set the pace', 'Regulars, New people, Clients, Prospects and Event guests each get their own moves, at their own pace. A person\'s group is in their Edit.'],
  ['Your words', 'Messages has one starter for each kind of move, in your words. Their name and the rest fill in for each person, and you can change it before sending.'],
];

export const introSeen = () => { try { return localStorage.getItem(SEEN) === '1'; } catch { return true; } };

export function openIntro() {
  let at = 0;
  const s = openSheet({ title: CARDS[0][0], className: 'sheet-small intro', onClose: () => { try { localStorage.setItem(SEEN, '1'); } catch {} } });
  const draw = () => {
    const last = at === CARDS.length - 1;
    s.setTitle(CARDS[at][0]);
    s.body.innerHTML = `
      <p class="sheet-message">${CARDS[at][1]}</p>
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
