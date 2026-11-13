// Final images on the shoot page.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootFinalImages = function addShootFinalImages(ed) {
  Object.assign(ed, { renderFinalImages });
  function renderFinalImages() {
    const grid = document.getElementById('finalImagesGrid');
    grid.innerHTML = '';
    return ed.idbGetImages(ed.finalImagesKey(ed.currentShootId)).then(images => {
      grid.innerHTML = images.length ? '' : '<p class="empty-hint">No final images yet.</p>';
      images.forEach((img, idx) => {
        const thumb = document.createElement('div');
        thumb.className = 'moodboard-thumb';
        thumb.innerHTML = `<img src="${img.src}" alt="" data-idx="${idx}" /><button type="button" class="final-thumb-delete" data-idx="${idx}"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>`;
        grid.appendChild(thumb);
      });
      grid.querySelectorAll('.final-thumb-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          // Taken before asking: the photo belongs to the shoot it was tapped on.
          const key = ed.finalImagesKey(ed.currentShootId);
          if (!(await ed.askDeletePhoto())) return;
          ed.idbGetImages(key).then(imgs => {
            imgs.splice(Number(btn.dataset.idx), 1);
            return ed.idbSetImages(key, imgs);
          }).then(renderFinalImages);
        });
      });
      grid.querySelectorAll('.moodboard-thumb img').forEach(imgEl => {
        imgEl.addEventListener('click', () => {
          ed.openImageViewer(images, Number(imgEl.dataset.idx), ed.finalImagesKey(ed.currentShootId), renderFinalImages);
        });
      });
    }).catch(() => { grid.innerHTML = ''; });
  }

  document.getElementById('addFinalPhotos').addEventListener('click', () => {
    document.getElementById('finalImagesFileInput').click();
  });

  document.getElementById('finalImagesFileInput').addEventListener('change', (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length) return;
    // Belt-and-braces: the section is hidden for video, but a picker opened
    // just before a category flip could still land here.
    if (ed.isVideoCategory(document.getElementById('shootCategory').value)) return;
    Promise.all(files.map(f => ed.resizeImageFile(f, 1280, 0.72)))
      .then(newImages => ed.idbGetImages(ed.finalImagesKey(ed.currentShootId)).then(existing => {
        const shouldSetCover = existing.length === 0 && newImages.length > 0;
        const combined = existing.concat(newImages.map(src => ({ src, caption: '' })));
        return ed.idbSetImages(ed.finalImagesKey(ed.currentShootId), combined).then(() => {
          if (shouldSetCover) {
            return ed.resizeDataUrlThumb(newImages[0], 200, 0.6).then(thumb => {
              ed.pendingProjectPhoto = thumb;
              return ed.savePhotoToIdb(ed.projectPhotoKey(ed.currentShootId), thumb);
            });
          }
        });
      }))
      .then(() => {
        ed.shootHasImages = true;
        ed.scheduleShootAutosave();
        renderFinalImages();
      })
      .catch(ed.noteStorageFull);
  });
};
