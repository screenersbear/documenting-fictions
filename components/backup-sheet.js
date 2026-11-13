// Documenting Fictions: the "Back up all four" sheet on the shelf. What it
// saves and restores is in data/suite-backup.js.
(function () {
  'use strict';
  const D = window.DFData;
  const B = window.DFSuiteBackup;
  if (!D || !B) return;
  const { makeBackup, restoreZip, restoreJson, EYE_LAST_BACKUP } = B;
  const ls = { set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } } };

  // ---------- The sheet ----------
  function sheet(html, onClose) {
    const dim = document.createElement('div');
    dim.className = 'sheet-dim';
    dim.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(dim);
    requestAnimationFrame(() => dim.classList.add('in'));
    const close = () => { dim.classList.remove('in'); setTimeout(() => dim.remove(), 220); if (onClose) onClose(); };
    dim.addEventListener('click', (e) => { if (e.target === dim || e.target.closest('[data-close]')) close(); });
    return { el: dim.firstElementChild, close };
  }
  const say = (s, text) => { const p = s.el.querySelector('.sheet-note'); p.textContent = text; p.hidden = !text; };

  // Opened from the film roll's panel on the shelf (pages/shelf-options.js).
  window.DFBackup = { open() {
    // The backup's made on the first tap and handed over on a second one, as
    // an iPhone only shares a file straight from a tap.
    let open = true;
    let made = null;
    let steps = null;
    const s = sheet(`
      <h2>Back up all four</h2>
      <p>One file with Ref, The Eye, Contact Sheet and Overthoughts, photos and all. Keep it somewhere safe, like Files or iCloud Drive.</p>
      <button type="button" class="sheet-btn primary" data-save>Save a backup</button>
      <button type="button" class="sheet-btn" data-restore>Restore from a backup</button>
      <p class="sheet-note" hidden></p>
      <button type="button" class="sheet-btn plain" data-close>Close</button>`, () => { open = false; if (made) made.done(); });
    s.el.addEventListener('click', async (e) => {
      const save = e.target.closest('[data-save]');
      if (save && made) {
        try {
          if (await steps.tap()) { ls.set(EYE_LAST_BACKUP, String(Date.now())); say(s, 'Backup saved.'); save.disabled = true; }
          save.textContent = steps.label;
        } catch (err) {
          say(s, err.message || "The backup wasn't saved.");
        }
        return;
      }
      if (save) {
        save.disabled = true;
        save.textContent = 'Putting it together';
        try {
          const m = await makeBackup((f) => { save.textContent = `Putting it together, ${Math.floor(f * 100)}%`; });
          if (!open) { if (m) m.done(); return; }
          if (!m) { say(s, 'There is nothing to back up yet.'); save.textContent = 'Save a backup'; return; }
          made = m;
          steps = D.backupSteps(m); // one file, or a few on a phone: a tap each
          save.textContent = steps.label;
          say(s, steps.note);
        } catch (err) {
          console.error(err);
          save.textContent = 'Save a backup';
          say(s, err.message || "The backup wasn't saved.");
        } finally {
          save.disabled = false;
        }
        return;
      }
      if (e.target.closest('[data-restore]')) {
        const files = await D.pickFiles('.zip,application/zip,.json,application/json'); // straight from the tap, or iOS won't open the picker
        if (!files.length) return;
        const c = sheet(`
          <h2>Restore all four?</h2>
          <p>Everything in Ref, The Eye, Contact Sheet and Overthoughts on this device is swapped for what's in the file. This can't be undone, so save a backup first if you might want today's back.</p>
          <button type="button" class="sheet-btn primary danger" data-yes>Restore</button>
          <button type="button" class="sheet-btn plain" data-close>Cancel</button>
          <p class="sheet-note" hidden></p>`);
        c.el.querySelector('[data-yes]').addEventListener('click', async (ev) => {
          const yes = ev.currentTarget;
          yes.disabled = true;
          yes.textContent = 'Restoring';
          try {
            if (await D.isZipFile(files[0])) await restoreZip(files, (f) => { yes.textContent = `Restoring, ${Math.floor(f * 100)}%`; });
            else await restoreJson(files[0]);
            yes.textContent = 'Restored';
            say(c, 'All four are back as they were in the file.');
            setTimeout(() => location.reload(), 900);
          } catch (err) {
            yes.disabled = false;
            yes.textContent = 'Restore';
            say(c, err.message || "That backup couldn't be restored.");
          }
        });
      }
    });
  } };
})();
