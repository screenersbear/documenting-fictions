// The sun on the shut notebook: how it looks, where it opens, its backups,
// and bringing in The Eye's Journal.
import { openSheet, confirmSheet, toast } from './ui.js';

const D = window.DFData;
const BOOK_KEY = 'overthoughts-book'; // also read in index.html, before the first paint
const START_KEY = 'overthoughts-start';
const LATER_KEY = 'overthoughts-journal-later';
const COLORS = [['leaf', 'Leaf'], ['orange', 'Orange'], ['mango', 'Mango'], ['berry', 'Berry'], ['fern', 'Fern'], ['ocean', 'Ocean'], ['ink', 'Black']];
const startsOpen = () => { try { return localStorage.getItem(START_KEY) === 'open'; } catch { return false; } };
export const startPage = () => (startsOpen() ? '#/entries' : '');

function useBook(name) {
  document.documentElement.dataset.book = name;
  try { localStorage.setItem(BOOK_KEY, name); } catch {}
}
const journalWaiting = () => D.inSuite() && !D.journalMoved() && D.somethingToMove();

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
      <span class="field-label opt-gap">From The Eye</span>
      ${D.inSuite()
        ? (journalWaiting() ? '<button type="button" class="btn secondary opt-wide" data-journal>Bring in The Eye\'s Journal</button>' : '<p class="small">The Eye\'s Journal and its shoots\' reflections are here.</p>')
        : '<button type="button" class="btn secondary opt-wide" data-eye-file>Bring in a file from The Eye</button>'}
      <span class="field-label opt-gap">Backup</span>
      <button type="button" class="btn secondary opt-wide" data-save>Save a backup</button>
      <button type="button" class="btn secondary opt-wide" data-restore>Restore a backup</button>`,
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
    if (e.target.closest('[data-journal]')) { s.close(); offerJournal(true); }
    if (e.target.closest('[data-eye-file]')) {
      const file = await D.pickFile(); // straight from the tap, or iOS won't open the picker
      if (!file) return;
      try {
        const done = await D.moveJournal(await D.readEyeFile(file));
        s.close();
        toast(done.entries || done.reflections ? `Brought in ${said(done)}` : 'Nothing new in that file');
        refresh();
      } catch (err) { toast(err.message || 'That file couldn\'t be read.'); }
    }
    if (e.target.closest('[data-save]')) {
      try {
        await D.overthoughts();
        const file = await D.exportDb('overthoughts', { app: 'overthoughts', filename: `overthoughts-backup-${D.todayStr()}.json`, extra: { book: document.documentElement.dataset.book || 'leaf' } });
        const how = await D.saveFile(file);
        if (how !== 'cancelled') toast('Backup saved');
      } catch (err) { toast(err.message || 'The backup wasn\'t saved.'); }
    }
    if (e.target.closest('[data-restore]')) {
      const file = await D.pickFile();
      if (!file) return;
      if (!(await confirmSheet({ title: 'Restore backup', message: 'Everything in Overthoughts now is swapped for what\'s in the file.', confirmLabel: 'Restore', danger: true }))) return;
      try {
        await D.overthoughts();
        const { extra } = await D.importDb(file, 'overthoughts', { app: 'overthoughts', replace: true });
        if (extra && extra.book) useBook(extra.book);
        s.close();
        toast('Backup restored');
        refresh();
      } catch (err) { toast(err.message || 'That backup couldn\'t be restored.'); }
    }
  });
}

const said = (d) => [d.entries ? `${d.entries} entr${d.entries === 1 ? 'y' : 'ies'}` : '', d.reflections ? `${d.reflections} reflection${d.reflections === 1 ? '' : 's'}` : ''].filter(Boolean).join(' and ');
const refresh = () => { if ((location.hash || '#/') !== '#/') window.dispatchEvent(new HashChangeEvent('hashchange')); }; // redraws the page that's open

// Once, inside the suite: The Eye's Journal (and its shoots' reflections) come
// over here. A backup of The Eye first, if you like; The Eye keeps its own
// copy either way, and nothing is called moved until every copy is checked.
export function offerJournal(asked = false) {
  if (!journalWaiting()) return;
  if (!asked) { try { if (sessionStorage.getItem(LATER_KEY)) return; } catch {} }
  if (document.querySelector('.sheet-overlay')) return;
  const s = openSheet({
    title: 'Your Journal',
    className: 'sheet-small',
    body: `
      <p class="sheet-message">The Journal and your shoots' reflections live in Overthoughts now. Bring them over from The Eye? The Eye keeps its own copy too.</p>
      <button type="button" class="btn secondary opt-wide" data-backup>First, save a backup of The Eye</button>
      <div class="sheet-actions">
        <button type="button" class="btn secondary" data-later>Not now</button>
        <button type="button" class="btn primary" data-move>Bring them over</button>
      </div>`,
  });
  s.body.addEventListener('click', async (e) => {
    if (e.target.closest('[data-backup]')) {
      try {
        const file = await D.eyeBackupFile();
        if (!file) { toast('The Eye has nothing to back up'); return; }
        const how = await D.saveFile(file);
        if (how === 'cancelled') return;
        const b = s.body.querySelector('[data-backup]');
        b.textContent = 'Backup saved';
        b.disabled = true;
      } catch (err) { toast(err.message || 'The backup wasn\'t saved.'); }
    }
    if (e.target.closest('[data-later]')) {
      try { sessionStorage.setItem(LATER_KEY, '1'); } catch {}
      s.close();
    }
    if (e.target.closest('[data-move]')) {
      const b = e.target.closest('[data-move]');
      b.disabled = true;
      b.textContent = 'Bringing them over';
      try {
        const done = await D.moveJournal();
        s.close();
        toast(done.entries || done.reflections ? `Brought over ${said(done)}` : 'All brought over');
        refresh();
      } catch (err) {
        b.disabled = false;
        b.textContent = 'Bring them over';
        toast(err.message || 'That didn\'t work. The Eye still has everything.', { ms: 6000 });
      }
    }
  });
}
