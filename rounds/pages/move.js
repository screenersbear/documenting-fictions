// A move opened (02-move), from Today or a person's page: the move's tag,
// the person, their starter message filled in and editable, and one button
// that copies it and opens their Instagram (or email or website). DONE and
// LATER under it. Coming back from Instagram, it asks "Done?". When Claude
// drafted it in Gmail already, the button opens Gmail instead, so it's never
// written twice.
import { openSheet } from '../components/sheet.js';
import { tagHtml } from '../components/marks.js';
import { photoHtml, fillPhotos } from '../components/photo.js';
import { toast } from '../components/toast.js';
import { esc } from '../components/util.js';
import { ARROW } from '../components/icons.js';
import { KINDS } from '../data/kinds.js';
import { fill, fillValues } from '../data/fill.js';
import { contactFor, handleText, GMAIL_DRAFTS } from '../data/contact.js';
import { draftWaiting } from '../data/person.js';
import { getMessages } from '../data/db.js';
import { getMe } from '../data/moves.js';
import { dayOf } from '../data/dates.js';

async function copy(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const t = document.createElement('textarea');
    t.value = text;
    t.setAttribute('readonly', '');
    t.style.cssText = 'position: fixed; opacity: 0;';
    document.body.append(t);
    t.select();
    const ok = document.execCommand?.('copy');
    t.remove();
    return !!ok;
  }
}

// onDone and onLater run once the sheet has closed.
export async function openMove(person, { onDone, onLater }) {
  const kind = person.next.kind;
  const [messages, me] = await Promise.all([getMessages(), getMe()]);
  const text = fill(messages[kind] ?? KINDS[kind].starter, fillValues(person, me, dayOf()));
  const where = contactFor(person);
  const handle = handleText(person);
  const draft = draftWaiting(person);
  let away = false;
  const s = openSheet({
    title: KINDS[kind].name,
    className: 'move-sheet',
    onClose: () => document.removeEventListener('visibilitychange', back),
    body: `
      <div class="move-who">${photoHtml(person, 'small')}<span class="move-who-words"><span class="move-name">${esc(person.name)}</span>${handle ? `<span class="move-handle">${esc(handle)}</span>` : ''}</span></div>
      ${draft ? '<p class="move-draft">Draft waiting in Gmail, written by Claude.</p>' : `<label class="label" for="moveText">Your message</label>
      <textarea class="move-text" id="moveText" rows="6">${esc(text)}</textarea>`}
      <div class="move-actions"></div>`,
  });
  s.el.querySelector('.sheet-header h2').innerHTML = tagHtml(kind);
  fillPhotos(s.el, [person]);
  const actions = s.body.querySelector('.move-actions');
  const buttons = () => {
    // COPY AND OPEN goes out to Instagram (or email, or a website), and OPEN GMAIL to Gmail: the button clicker leaves them alone.
    actions.innerHTML = `
      ${draft ? `<button type="button" class="btn primary move-go" data-gmail data-test-skip>Open Gmail ${ARROW}</button>`
    : `<button type="button" class="btn primary move-go" data-go ${where ? 'data-test-skip' : ''}>${where ? `Copy and open ${esc(where.how)}` : 'Copy the message'} ${ARROW}</button>`}
      <div class="move-more"><button type="button" class="text-btn" data-done>Done</button><button type="button" class="text-btn" data-later>Later</button></div>`;
  };
  buttons();
  // Back from Instagram: was it sent?
  function back() {
    if (document.hidden || !away) return;
    away = false;
    actions.innerHTML = `<p class="move-ask">Done?</p>
      <div class="move-ask-btns"><button type="button" class="btn secondary" data-not-yet>Not yet</button><button type="button" class="btn primary" data-done>Done</button></div>`;
  }
  document.addEventListener('visibilitychange', back);
  actions.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.matches('[data-done]')) { s.close(); onDone(); }
    else if (b.matches('[data-later]')) { s.close(); onLater(); }
    else if (b.matches('[data-not-yet]')) buttons();
    else if (b.matches('[data-gmail]')) {
      away = true;
      window.open(GMAIL_DRAFTS, '_blank', 'noopener');
    }
    else if (b.matches('[data-go]')) {
      const words = s.body.querySelector('.move-text').value;
      const copied = await copy(words);
      const to = contactFor(person, words);
      if (!to) { toast(copied ? 'Copied.' : 'Select the message and copy it.'); return; }
      away = true;
      window.open(to.url, '_blank', 'noopener');
      if (!copied) toast('Select the message and copy it.');
    }
  });
  return s;
}
