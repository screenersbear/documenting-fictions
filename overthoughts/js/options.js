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

const refresh = () => { if ((location.hash || '#/') !== '#/') window.dispatchEvent(new HashChangeEvent('hashchange')); }; // redraws the page that's open
