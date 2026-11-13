// The Journal tab: the entry that's open, its photos and its tags.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addJournal = function addJournal(ed) {
  Object.assign(ed, { askDeletePhoto, renderJournalImages, renderJournalViewImages, getAllUsedJournalTags, renderJournalListImages });
  // ---------- Journal ----------
  ed.currentJournalEntry = null;
  ed.journalIsNew = false;
  ed.journalMode = 'view';
  ed.currentJournalTags = [];
  ed.journalSaveTimer = null;
  ed.journalHasImages = false;
  ed.journalPromptOffered = null;

  // 300 photography-specific reflection prompts (craft, personal growth,
  // business growth) offered via the "Need a starting prompt?" button.
  const JOURNAL_PROMPTS = window.EyeWords.journalPrompts; ed.JOURNAL_PROMPTS = JOURNAL_PROMPTS;

  // The journal list can run long — offers a quick way back to the top
  // without hunting for it. Only relevant while the Journal is the active
  // tab; hidden the instant it isn't.
  const journalScrollTopBtn = document.getElementById('journalScrollTopBtn');
  function updateJournalScrollTopBtn() {
    journalScrollTopBtn.hidden = ed.views.journal.hidden || window.scrollY < 400;
  }
  window.addEventListener('scroll', updateJournalScrollTopBtn, { passive: true });
  journalScrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Linked entries (auto-compiled from a shoot's post-shoot reflection)
  // share the shoot's own final-images store instead of getting a separate
  // copy — same files, no duplicated storage. Standalone entries get their
  // own dedicated key.
  function currentJournalImagesKey() {
    if (!ed.currentJournalEntry) return null;
    return ed.currentJournalEntry.sourceShootId
      ? ed.finalImagesKey(ed.currentJournalEntry.sourceShootId)
      : ed.journalImagesKey(ed.currentJournalEntry.id);
  }

  // The one question behind every photo's × (journal, mood board, final
  // images) and the image viewer's Delete, so they all read the same.
  function askDeletePhoto() {
    return ed.askConfirm({ title: 'Delete this photo?', text: "This can't be undone.", confirmLabel: 'Delete photo', cancelLabel: 'Keep it', danger: true });
  }

  // Shared renderer for both the edit-mode grid (add/delete affordances) and
  // the view-mode grid (read-only gallery) — same images, same image viewer,
  // just with the mutating controls left out when editable is false.
  function renderImagesGrid(grid, key, editable, onChanged) {
    grid.innerHTML = '';
    if (!key) { ed.journalHasImages = false; return; }
    ed.idbGetImages(key).then(images => {
      // journalHasImages feeds autosaveJournal()'s "does this entry have any
      // content" check, so it has to stay accurate in view mode too — not
      // just while the edit-mode grid (with its add/delete controls) is up.
      ed.journalHasImages = images.length > 0;
      grid.innerHTML = images.length ? '' : (editable ? '<p class="empty-hint">No photos yet.</p>' : '');
      images.forEach((img, idx) => {
        const thumb = document.createElement('div');
        thumb.className = 'moodboard-thumb';
        thumb.innerHTML = `<img src="${img.src}" alt="" data-idx="${idx}" />` +
          (editable ? `<button type="button" class="final-thumb-delete" data-idx="${idx}"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>` : '');
        grid.appendChild(thumb);
      });
      if (editable) {
        grid.querySelectorAll('.final-thumb-delete').forEach(btn => {
          btn.addEventListener('click', async () => {
            if (!(await askDeletePhoto())) return;
            ed.idbGetImages(key).then(imgs => {
              imgs.splice(Number(btn.dataset.idx), 1);
              return ed.idbSetImages(key, imgs);
            }).then(() => {
              onChanged();
              ed.scheduleJournalAutosave();
            });
          });
        });
      }
      grid.querySelectorAll('.moodboard-thumb img').forEach(imgEl => {
        imgEl.addEventListener('click', () => {
          ed.openImageViewer(images, Number(imgEl.dataset.idx), key, onChanged, false);
        });
      });
    }).catch(() => { grid.innerHTML = ''; });
  }

  function renderJournalImages() {
    renderImagesGrid(document.getElementById('journalImagesGrid'), currentJournalImagesKey(), true, renderJournalImages);
  }

  function renderJournalViewImages() {
    renderImagesGrid(document.getElementById('journalViewImagesGrid'), currentJournalImagesKey(), false, renderJournalViewImages);
  }

  document.getElementById('addJournalPhotos').addEventListener('click', () => {
    document.getElementById('journalImagesFileInput').click();
  });

  document.getElementById('journalImagesFileInput').addEventListener('change', (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length) return;
    const key = currentJournalImagesKey();
    if (!key) return;
    Promise.all(files.map(f => ed.resizeImageFile(f, 1280, 0.72)))
      .then(newImages => ed.idbGetImages(key).then(existing => {
        const combined = existing.concat(newImages.map(src => ({ src, caption: '' })));
        return ed.idbSetImages(key, combined);
      }))
      .then(() => {
        renderJournalImages();
        ed.scheduleJournalAutosave();
      })
      .catch(ed.noteStorageFull);
  });

  function getAllUsedJournalTags() {
    const set = new Set();
    ed.state.journalEntries.forEach(e => (e.tags || []).forEach(t => set.add(t)));
    return [...set].sort();
  }

  // Read-only photo strip for an entry rendered inline in the list.
  //
  // Deliberately NOT renderImagesGrid(): that one maintains journalHasImages
  // for the open editor's autosave "does this entry have any content" check,
  // and the list redraws while an entry can still be open — sharing it would
  // let a background list render overwrite the editor's flag with some other
  // entry's answer.
  function renderJournalListImages(grid, key) {
    // Already read once: drawn straight away (see journalListImageCache).
    const cached = ed.journalListImageCache.get(key);
    if (cached) {
      drawJournalListImages(grid, key, cached);
      return Promise.resolve();
    }
    return ed.idbGetImages(key).then(images => {
      ed.journalListImageCache.set(key, images);
      drawJournalListImages(grid, key, images);
    }).catch(() => { grid.hidden = true; });
  }

  function drawJournalListImages(grid, key, images) {
    grid.hidden = !images.length;
    grid.innerHTML = '';
    images.forEach((img, idx) => {
      const thumb = document.createElement('div');
      thumb.className = 'moodboard-thumb';
      thumb.innerHTML = `<img src="${img.src}" alt="" />`;
      thumb.querySelector('img').addEventListener('click', (ev) => {
        // The whole sheet of paper is tappable, so a photo tap has to stop
        // here or it also fires the edit / jump-to-shoot handler underneath.
        ev.stopPropagation();
        ed.openImageViewer(images, idx, key, () => ed.renderJournal(), false);
      });
      grid.appendChild(thumb);
    });
  }
};
