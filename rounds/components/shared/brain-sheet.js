// For the brain, in a notebook's Options: what the notebook writes down for
// shakusky's brain (Starky's own AI on his Mac) as he works, one row a kind
// with its On/Off switch, the newest lines, and Save for the brain, which hands
// over the file for the brain's inbox folder on his Mac. It rides on the Back
// up sheet's frame (backup-sheet.js) and its look (styles/shared/backup.css,
// with styles/shared/brain.css; the switch is the shared .df-switch). What's written: shared/data/brain-notes.js.
// This is the master copy: tools/sync.py shared copies it into each notebook.
(function () {
  'use strict';
  const D = window.DFData;
  const N = window.DFBrainNotes;
  const S = window.DFBackupSheet;
  if (!D || !N || !S || !S.frame) return;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // When a line was written: the time today, or the day and time before.
  function when(at, now = new Date()) {
    const then = new Date(at);
    if (Number.isNaN(then.getTime())) return '';
    const time = then.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return then.toDateString() === now.toDateString() ? time
      : `${then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${time}`;
  }

  const waitingWords = (n) => (n ? `${n} new line${n === 1 ? '' : 's'} since you last saved.` : 'Nothing new since you last saved.');

  function kindRow(kind) {
    return `<div class="dfbn-kind" data-kind="${esc(kind.id)}">
      <span class="dfb-words"><span class="dfb-title">${esc(kind.name)}</span><span class="dfb-line">${esc(kind.says)}</span>
      <span class="dfbn-said" aria-live="polite"></span></span>
      <button type="button" class="df-switch dfbn-switch" role="switch" aria-checked="${kind.on}" aria-label="Write down ${esc(kind.name)} for the brain"><span></span></button></div>`;
  }

  function recentList(app) {
    const rows = N.recent(app);
    if (!rows.length) return '<p class="dfb-note">Nothing yet. Each choice you make lands here as you work.</p>';
    return `<ul class="dfbn-recent">${rows.map((r) => `<li><span>${esc(`${r.action} ${r.item}`)}</span><span class="dfbn-when">${esc(when(r.at))}</span></li>`).join('')}</ul>`;
  }

  // Opens For the brain for a notebook (an app id).
  function open({ here }) {
    const book = N.BOOKS[here];
    if (!book) return null;
    const s = S.frame('For the brain', `<p class="dfb-text">${esc(book.name)} writes these down in this browser as you work, for your brain to learn from. Nothing leaves until you save the file for the brain.</p>
      <div class="dfb-rows">${N.kinds(here).map(kindRow).join('')}</div>
      <span class="dfbn-label">Newest lines</span><div class="dfbn-lines">${recentList(here)}</div>
      <p class="dfb-note" data-waiting>${waitingWords(N.waiting(here))}</p>
      <button type="button" class="dfb-btn" data-brain-save>Save for the brain</button>
      <p class="dfb-note">Put the file in the brain’s inbox folder on your Mac (connected, inbox).</p>`);
    const waitingNote = s.el.querySelector('[data-waiting]');

    s.el.addEventListener('click', async (e) => {
      const flipBtn = e.target.closest('.dfbn-switch');
      if (flipBtn) {
        const row = flipBtn.closest('.dfbn-kind');
        const on = flipBtn.getAttribute('aria-checked') !== 'true';
        const said = N.flip(here, row.dataset.kind, on);
        if (said.startsWith('Saved.')) flipBtn.setAttribute('aria-checked', String(on));
        row.querySelector('.dfbn-said').textContent = said;
        return;
      }
      if (!e.target.closest('[data-brain-save]')) return;
      const made = N.brainFile(here);
      if (!made) { waitingNote.textContent = 'Nothing new to save yet.'; return; }
      try {
        const how = await D.saveFile(new File([made.text], made.name, { type: 'application/json' }));
        if (how === 'cancelled') return;
        N.markSaved(here, made.upto);
        waitingNote.textContent = `Saved ${made.count} line${made.count === 1 ? '' : 's'} for the brain.`;
      } catch (err) {
        console.error(err);
        waitingNote.textContent = "The file wasn't saved. Try again.";
      }
    });
    return s;
  }

  window.DFBrainSheet = { open, when };
})();
