// Messages (05-messages): one starter message per kind of move, each with its
// tiny mark, written once in the user's words; [name] and the others fill in
// for each person. Under them, the user's own fill-ins: their offer and city.
import { bandHtml } from '../components/band.js';
import { miniHtml } from '../components/marks.js';
import { promptSheet } from '../components/dialogs.js';
import { esc } from '../components/util.js';
import { CHEV } from '../components/icons.js';
import { KINDS, MESSAGE_ORDER } from '../data/kinds.js';
import { getMessages, setSetting } from '../data/db.js';
import { getMe } from '../data/moves.js';
import { openMessage } from './message-edit.js';

const MINE = [
  { key: 'offer', name: 'Your offer', fill: '[offer]', ask: 'What do you offer past clients?', hint: 'a free mini session' },
  { key: 'city', name: 'Your city', fill: '[city]', ask: 'Where are you based?', hint: 'Hoboken' },
];

const row = (attr, mark, name, text) => `<button type="button" class="msg-row" ${attr}>${mark}<span class="msg-words"><span class="msg-kind">${esc(name)}</span><span class="msg-text">${esc(text)}</span></span>${CHEV}</button>`;

export async function messagesScreen(view, { beside = false } = {}) {
  const [messages, me] = await Promise.all([getMessages(), getMe()]);
  view.innerHTML = `<div class="screen"><div class="scroll">
    ${bandHtml({ title: 'Messages', place: 'Rounds' })}
    <p class="note">Write each one once, in your words. [name] and the others fill in for each person.</p>
    <div class="msg-list">${MESSAGE_ORDER.map((k) => row(`data-kind="${k}"`, miniHtml(k), KINDS[k].name, messages[k] ?? KINDS[k].starter)).join('')}</div>
    <div class="msg-fills">
      <div class="list-head"><h2>Your fill-ins</h2></div>
      <div class="msg-list">${MINE.map((m) => row(`data-mine="${m.key}"`, '', `${m.name} ${m.fill}`, me[m.key] || 'Not set yet')).join('')}</div>
    </div>
  </div></div>`;
  if (beside) return;
  const redraw = () => messagesScreen(view).then(() => view.querySelector('.screen')?.classList.add('still'));
  view.querySelector('.scroll').addEventListener('click', async (e) => {
    const b = e.target.closest('.msg-row');
    if (!b) return;
    if (b.dataset.kind) { openMessage(b.dataset.kind, messages[b.dataset.kind], redraw); return; }
    const m = MINE.find((x) => x.key === b.dataset.mine);
    const value = await promptSheet({ title: m.name, label: m.ask, value: me[m.key], placeholder: m.hint, allowEmpty: true });
    if (value === null) return;
    await setSetting(m.key, value);
    redraw();
  });
}
