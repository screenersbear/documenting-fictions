// One sheet for any move (Tightening Rounds, rounds/08, 16 Nov; it replaced
// the move sheet and the sheet that came after DONE). From a Today card
// (WRITE TO), a slip, their page, or REACH OUT: the person and today's date;
// WHAT KIND (Check in, Say thanks, Say hello, Ask, Pitch, Other: preset from
// the card or their next move); WHAT DID YOU SAY? (empty, "+ Use your <kind>
// message" under it, which puts the starter in the box to edit); HOW (picked
// for you once COPY AND OPEN has gone out); A NOTE FOR YOU (OPTIONAL). COPY
// AND OPEN copies it and opens their Instagram (or email, or website), or
// Gmail when Claude drafted their due move there already. DONE saves it all
// at once (data/one-move-store.js): no second sheet. A move that isn't
// their due one still counts as keeping in touch. Opened with a line (EDIT
// on What you said, or ADD WHAT YOU SAID after a swipe), it's that move
// filled in, its kind as it was. A year since shows one of the shoot's
// finals (pages/move-final.js). Your message used and then changed: SAVE
// THIS AS YOUR <KIND> MESSAGE under the box (pages/save-message.js).
// ANYTHING PROMISED? under the note (pages/one-promise.js, 21 Nov), kept
// with the move; from KEPT IT on a promise (keeps), the promise on top.
import { openSheet } from '../components/sheet.js';
import { photoHtml, fillPhotos } from '../components/photo.js';
import { toast } from '../components/toast.js';
import { copy } from '../components/copy.js';
import { esc } from '../components/util.js';
import { PLUS } from '../components/icons.js';
import { KINDS, messageWord } from '../data/kinds.js';
import { HOWS, howFromGo } from '../data/done-notes.js';
import { KIND_CHIPS, chipOf, startChip, doesDue, kindFor } from '../data/one-move.js';
import { fill, fillValues, unfill } from '../data/fill.js';
import { contactFor, GMAIL_DRAFTS } from '../data/contact.js';
import { draftWaiting } from '../data/person.js';
import { getMessages, saveMessage } from '../data/db.js';
import { getMe, saveHowNote } from '../data/moves.js';
import { saveOneMove, saveLinePromise } from '../data/one-move-store.js';
import { promiseFor } from '../data/move-promise.js';
import { undoChange } from '../data/promise-store.js';
import { dayOf, longDay } from '../data/dates.js';
import { finalHtml, showFinal } from './move-final.js';
import { saveMessageHtml, wireSaveMessage } from './save-message.js';
import { onePromiseHtml, wireOnePromise, keepsHtml } from './one-promise.js';

const chipHtml = (attr, k, label, on) => `<button type="button" class="pick-chip${on ? ' on' : ''}" ${attr}="${esc(k)}" aria-pressed="${on}">${esc(label)}</button>`;
const setOn = (root, attr, k) => root.querySelectorAll(`[${attr}]`).forEach((c) => {
  const on = c.getAttribute(attr) === k;
  c.classList.toggle('on', on);
  c.setAttribute('aria-pressed', String(on));
});

// chip: WHAT KIND to start on (else their next move's); line: a move
// logged already, to change; after(result) once it's saved: what Undo needs
// for a new one (data/one-move-store.js), the line for one changed. keeps:
// one of your promises this move keeps; keptOnly() marks it kept without one.
export async function openOneMove(person, { chip, line = null, after = () => {}, keeps = null, keptOnly = () => {} } = {}) {
  const today = dayOf();
  const [messages, me] = await Promise.all([getMessages(), getMe()]);
  let pick = line ? chipOf(line.kind) : chip || startChip(person);
  let how = line ? line.how || '' : '';
  const day = line ? line.day : today;
  const kinds = line ? KIND_CHIPS.filter(([k]) => k === pick) : KIND_CHIPS; // a logged move keeps its kind
  const had = line ? promiseFor(person, line.id) : null;
  const s = openSheet({
    title: person.name,
    className: 'one-sheet',
    body: `
      ${keeps ? keepsHtml(keeps) : ''}
      ${!line && person.next?.year ? finalHtml(person.next.year) : ''}
      <p class="label one-label">What kind</p>
      <div class="pick-chips">${kinds.map(([k, n]) => chipHtml('data-kind', k, n, k === pick)).join('')}</div>
      <p class="move-draft" hidden>Draft waiting in Gmail, written by Claude.</p>
      <label class="label one-label" for="oneSaid">What did you say?</label>
      <textarea class="move-text one-said" id="oneSaid" rows="3">${esc(line?.said || '')}</textarea>
      ${saveMessageHtml()}
      <button type="button" class="one-offer" data-offer>${PLUS}<span></span></button>
      <p class="label one-label">How</p>
      <div class="pick-chips">${Object.entries(HOWS).map(([k, n]) => chipHtml('data-how', k, n, k === how)).join('')}</div>
      <label class="label one-label" for="oneNote">A note for you (optional)</label>
      <textarea class="move-text one-note" id="oneNote" rows="1" maxlength="500" placeholder="Only you see this">${esc(line?.note || '')}</textarea>
      ${onePromiseHtml(person, today, had)}
      <div class="one-btns"></div>`,
  });
  s.el.querySelector('.sheet-header h2').innerHTML = `<span class="move-who">${photoHtml(person, 'small')}<span class="move-who-words"><span class="move-name">${esc(person.name)}</span><span class="move-handle">${esc(day === today ? `Today, ${longDay(day)}` : longDay(day))}</span></span></span>`;
  fillPhotos(s.el, [person]);
  if (!line && person.next?.year) showFinal(s.body.querySelector('.move-final'), person.next.year);
  const box = s.body.querySelector('.one-said');
  const note = s.body.querySelector('.one-note');
  const offer = s.body.querySelector('[data-offer]');
  const btns = s.body.querySelector('.one-btns');
  const kind = () => (line ? line.kind : kindFor(person, pick));
  const yours = (k) => messages[k] ?? KINDS[k].starter;
  const starter = () => (KINDS[kind()] ? fill(yours(kind()), values) : '');
  const drafted = () => !line && draftWaiting(person) && doesDue(person, pick);
  const where = contactFor(person);
  const values = fillValues(person, me, today);
  // Once your message is in the box and changed, the offer gives way to SAVE THIS AS YOUR <KIND> MESSAGE.
  const offerShown = () => { offer.hidden = !starter() || save.shown(); };
  const save = wireSaveMessage(s.body.querySelector('.save-msg'), box, offerShown);
  const useStarter = () => { box.value = starter(); save.used(kind(), box.value); };
  const promised = wireOnePromise(s.body, today, had);

  // What follows the kind: the message offered, a draft in Gmail, the button.
  function draw() {
    offerShown();
    offer.querySelector('span').textContent = `Use your ${messageWord(kind())} message`;
    s.body.querySelector('.move-draft').hidden = !drafted();
    // COPY AND OPEN goes out to Instagram (or email, or a website), and OPEN GMAIL to Gmail: the button clicker leaves them alone.
    const go = drafted() ? '<button type="button" class="btn secondary" data-gmail data-test-skip>Open Gmail</button>'
      : `<button type="button" class="btn secondary" data-go ${where ? 'data-test-skip' : ''}>${where ? 'Copy and open' : 'Copy'}</button>`;
    btns.innerHTML = `${go}<button type="button" class="btn primary" data-done>Done</button>`;
  }
  draw();
  const pickHow = (k) => { how = k; setOn(s.body, 'data-how', how); };

  s.body.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.kind !== undefined && !line) { pick = b.dataset.kind; setOn(s.body, 'data-kind', pick); draw(); }
    else if (b.dataset.how !== undefined) pickHow(how === b.dataset.how ? '' : b.dataset.how);
    else if (b.matches('[data-offer]')) { useStarter(); box.focus(); }
    else if (b.matches('[data-keep-only]')) { s.close(); keptOnly(); }
    else if (b.matches('[data-gmail]')) { pickHow('email'); window.open(GMAIL_DRAFTS, '_blank', 'noopener'); }
    else if (b.matches('[data-go]')) {
      if (!box.value.trim()) useStarter(); // nothing typed: your message goes
      const copied = box.value ? await copy(box.value) : false;
      const to = contactFor(person, box.value);
      if (!to) { toast(copied ? 'Copied.' : 'Nothing to copy yet.'); return; }
      pickHow(howFromGo(to.how) || how);
      window.open(to.url, '_blank', 'noopener');
      if (!copied && box.value) toast('Select the message and copy it.');
    } else if (b.matches('[data-done]')) {
      b.disabled = true;
      const fields = { said: box.value, how, note: note.value };
      if (save.wanted()) await saveMessage(save.kind(), unfill(box.value, values, yours(save.kind())));
      const result = line ? await saveHowNote(line, fields) : await saveOneMove(person, pick, fields, { promise: promised.read(), keeps });
      const changed = line ? await saveLinePromise(person, line, promised.read()) : null;
      s.close();
      await after(result);
      if (changed?.gone) toast('Promise taken off.', { action: { label: 'Undo', run: () => undoChange(changed.undo).then(() => after(result)) } });
    }
  });
  return s;
}
