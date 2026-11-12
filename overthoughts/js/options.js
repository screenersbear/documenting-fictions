// The sun on the shut notebook (inside Documenting Fictions, the menu at the
// top of Entries): how it looks, where it opens, its backups, the tour.
import { openSheet, confirmSheet, toast } from './ui.js';
import { openIntro } from './intro.js';

const D = window.DFData;
const BOOK_KEY = 'overthoughts-book'; // also read in index.html, before the first paint
const START_KEY = 'overthoughts-start';
const COLORS = [['leaf', 'Leaf'], ['orange', 'Orange'], ['mango', 'Mango'], ['berry', 'Berry'], ['fern', 'Fern'], ['ocean', 'Ocean'], ['ink', 'Black']];
const startsOpen = () => { try { return localStorage.getItem(START_KEY) === 'open'; } catch { return false; } };
export const startPage = () => (startsOpen() ? '#/entries' : '');

function useBook(name) {
  document.documentElement.dataset.book = name;
  try { localStorage.setItem(BOOK_KEY, name); } catch {}
}

export function openOptions() {
  const now = document.documentElement.dataset.book || 'leaf';
  const s = openSheet({
    title: 'Options',
    body: `
      <span class="field-label">App color</span>
      <div class="opt-colors">
        ${COLORS.map(([key, name]) => `
          <button type="button" class="opt-color" data-color="${key}" aria-pressed="${key === now}">
            <span class="opt-book" style="background-image:url(art/${key}-cover.webp)"></span>
            <span>${name}</span>
          </button>`).join('')}
      </div>
      ${D.inSuite() ? '' : `<span class="field-label opt-gap">Always start</span>
      <div class="seg opt-seg">
        <button type="button" data-start="shut"${startsOpen() ? '' : ' class="on"'}>In the notebook</button>
        <button type="button" data-start="open"${startsOpen() ? ' class="on"' : ''}>On the first page</button>
      </div>`}
      <span class="field-label opt-gap">Backup</span>
      <button type="button" class="btn secondary opt-wide" data-save>Save a backup</button>
      <button type="button" class="btn secondary opt-wide" data-restore>Restore a backup</button>
      <button type="button" class="btn secondary opt-wide opt-gap" data-intro>How it works</button>`,
  });
  s.body.addEventListener('click', async (e) => {
    const c = e.target.closest('[data-color]');
    if (c) {
      useBook(c.dataset.color);
      s.body.querySelectorAll('[data-color]').forEach((b) => b.setAttribute('aria-pressed', String(b === c)));
    }
    const st = e.target.closest('[data-start]');
    if (st) {
      try { localStorage.setItem(START_KEY, st.dataset.start); } catch {}
      s.body.querySelectorAll('[data-start]').forEach((b) => b.classList.toggle('on', b === st));
    }
    if (e.target.closest('[data-intro]')) { s.close(); openIntro(); return; }
    if (e.target.closest('[data-save]')) saveBackup();
    if (e.target.closest('[data-restore]')) restoreBackup(s);
  });
}

// Everything in the notebook as one file, and back: the notebooks' zip
// (df-data.js), put together from what's stored so the phone never has to
// hold the notebook in memory. Made first, then saved from a tap of its
// own, as an iPhone only shares a file straight from a tap. Backups made
// the first way (one .json) still go back in, and so does this notebook's
// part of a backup of all four from the shelf.
function saveBackup() {
  let open = true;
  let made = null;
  const s = openSheet({
    title: 'Save a backup',
    className: 'sheet-small',
    body: '<p class="sheet-message" data-msg>Putting it together</p>',
    onClose: () => { open = false; if (made) made.done(); },
  });
  const msg = s.body.querySelector('[data-msg]');
  D.overthoughts().then(() => D.zipBackup({
    app: 'overthoughts',
    databases: ['overthoughts'],
    extra: { book: document.documentElement.dataset.book || 'leaf' },
    filename: `overthoughts-backup-${D.todayStr()}.zip`,
    onProgress: (f) => { if (open) msg.textContent = `Putting it together, ${Math.floor(f * 100)}%`; },
  })).then((m) => {
    made = m;
    if (!open) { if (m) m.done(); return; }
    if (!m) { msg.textContent = 'There is nothing to back up yet.'; return; }
    const steps = D.backupSteps(m); // one file, or a few on a phone: a tap each
    msg.textContent = steps.note;
    msg.insertAdjacentHTML('afterend', `<button type="button" class="btn secondary opt-wide" data-save>${steps.label}</button>`);
    const btn = s.body.querySelector('[data-save]');
    btn.addEventListener('click', async () => {
      try {
        if (!(await steps.tap())) { btn.textContent = steps.label; return; }
        s.close();
        toast('Backup saved');
      } catch (err) {
        console.error(err);
        toast(err.message || 'The backup wasn\'t saved.');
      }
    });
  }).catch((err) => {
    console.error(err);
    if (open) msg.textContent = err.message || 'The backup couldn\'t be made.';
  });
}
async function restoreBackup(options) {
  const files = await D.pickFiles('.zip,application/zip,.json,application/json'); // straight from the tap, or iOS won't open the picker
  if (!files.length) return;
  if (!(await confirmSheet({ title: 'Restore backup', message: 'Everything in Overthoughts now is swapped for what\'s in the file.', confirmLabel: 'Restore', danger: true }))) return;
  toast('Restoring the backup', { ms: 600000 });
  try {
    await D.overthoughts();
    const r = (await D.isZipFile(files[0]))
      ? await D.restoreZip(files, { databases: ['overthoughts'] }) // a backup saved as a few files comes back as all of them
      : await D.importDb(files[0], 'overthoughts', { app: 'overthoughts', replace: true });
    const book = (r.extra && r.extra.book) || (r.local ? await r.local(BOOK_KEY) : null);
    if (book) useBook(book);
    options.close();
    toast('Backup restored');
    refresh();
  } catch (err) {
    console.error(err);
    toast(err.message || 'That backup couldn\'t be restored.');
  }
}

const refresh = () => { if ((location.hash || '#/') !== '#/') window.dispatchEvent(new HashChangeEvent('hashchange')); }; // redraws the page that's open
