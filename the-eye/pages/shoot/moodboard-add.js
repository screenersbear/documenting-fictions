// The mood board's ADD (round 7, the-eye/16-mood-board-pdf): photos or a
// PDF. Photos are made smaller, as before. Each page of a PDF becomes one
// photo of the board, drawn on the phone (components/pdf-photos.js) and kept
// with the file's name, so the board shows them together under it
// (components/board-groups.js). The guide's mood board step is this same
// section, so it takes PDFs too.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addMoodboardAdd = function addMoodboardAdd(ed) {
  document.getElementById('addMoodboardPhotos').addEventListener('click', () => {
    document.getElementById('moodboardFileInput').click();
  });

  // The picked files as the board's photos, in the order picked: { src,
  // caption } for a photo, and one { src, caption, pdf } for each page of a
  // PDF. A PDF that can't be read is left out (said in `fails`).
  async function boardPhotos(files, fails) {
    const photos = await Promise.all(files.map(f => (ed.isPdfFile(f) ? null : ed.resizeImageFile(f, 1280, 0.72))));
    const out = [];
    for (const [i, f] of files.entries()) {
      if (photos[i] !== null) { out.push({ src: photos[i], caption: '' }); continue; }
      try {
        const pages = await ed.pdfToPhotos(f, (n, of) => ed.showToast(`Getting page ${n} of ${of} ready`, 60000));
        pages.forEach(src => out.push({ src, caption: '', pdf: f.name || 'PDF' }));
      } catch (err) {
        fails.push(f.name || 'PDF');
      }
    }
    return out;
  }

  document.getElementById('moodboardFileInput').addEventListener('change', (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length) return;
    // The photos belong to the shoot they were picked on, even if resizing
    // takes long enough for that shoot to be closed and another opened.
    const uploadShootId = ed.currentShootId;
    const stillOpen = () => ed.currentShootId === uploadShootId && !ed.shootModalOverlay.hidden;
    let coverSet = false;
    const fails = [];
    let added = [];
    boardPhotos(files, fails)
      .then(newImages => {
        added = newImages;
        // A never-saved draft that was closed in the meantime is gone (its
        // rows were cleared on close) — don't leave orphaned photos behind.
        if (!newImages.length || (!stillOpen() && !ed.state.shoots.some(x => x.id === uploadShootId))) return null;
        return ed.idbGetImages(uploadShootId).then(existing => {
          const savedShoot = ed.state.shoots.find(x => x.id === uploadShootId);
          const hasCover = stillOpen() ? !!ed.pendingProjectPhoto : !!(savedShoot && savedShoot.projectPhoto);
          const shouldAutoSetProjectPhoto = existing.length === 0 && !hasCover;
          return ed.idbSetImages(uploadShootId, existing.concat(newImages)).then(() => {
            if (shouldAutoSetProjectPhoto) {
              return ed.resizeDataUrlThumb(newImages[0].src, 200, 0.6).then(thumb => {
                coverSet = true;
                if (stillOpen()) ed.pendingProjectPhoto = thumb;
                else {
                  const live = ed.state.shoots.find(x => x.id === uploadShootId);
                  if (live) live.projectPhoto = thumb;
                }
                return ed.savePhotoToIdb(ed.projectPhotoKey(uploadShootId), thumb);
              });
            }
          }).then(() => true);
        });
      })
      .then((uploaded) => {
        sayHowItWent(added, fails, uploaded);
        if (!uploaded) return;
        if (stillOpen()) {
          ed.shootHasImages = true;
          ed.scheduleShootAutosave();
          ed.renderMoodboard();
        } else {
          ed.renderAll();
        }
        ed.onShootImagesChanged(uploadShootId, { board: true, cover: coverSet });
      })
      .catch(ed.noteStorageFull);
  });

  // A PDF's pages in, or a PDF that couldn't be read. (Nothing to say when
  // nothing was saved: the page counting up goes.)
  function sayHowItWent(added, fails, uploaded) {
    const runs = ed.pdfRuns(added);
    if (fails.length) ed.showToast(`${fails[0]} couldn't be opened. Is it a PDF without a password?`);
    else if (uploaded && runs.length) ed.showToast(ed.pdfAddedWords(runs));
    else if (runs.length) ed.hideToast();
  }
};
