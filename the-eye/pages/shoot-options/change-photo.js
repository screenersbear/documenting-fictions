// Changing a project's photo.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootOptionsChangePhoto = function addShootOptionsChangePhoto(ed) {
  // ---------- Change project photo (kebab menu slide-over) ----------
  document.getElementById('changeProjectPhotoOptionBtn').addEventListener('click', () => {
    const id = ed.optionsShootId;
    const grid = document.getElementById('projectPhotoPickerGrid');
    grid.innerHTML = '';
    ed.shootOptionsPaneTrack.classList.add('show-fourth');
    ed.syncPaneTrackHeight(ed.shootOptionsPaneTrack);
    if (!id) return;
    // Video has no final images (any left from before a switch to video
    // stay hidden), so only its storyboard is offered.
    const pickerShoot = ed.state.shoots.find(x => x.id === id);
    const finalImagesPromise = ed.isVideoShoot(pickerShoot) ? Promise.resolve([]) : ed.idbGetImages(ed.finalImagesKey(id));
    Promise.all([ed.idbGetImages(id), finalImagesPromise]).then(([moodboardImages, finalImages]) => {
      const allImages = moodboardImages.concat(finalImages);
      grid.innerHTML = allImages.length ? '' : '<p class="empty-hint">No photos yet.</p>';
      allImages.forEach(img => {
        const thumb = document.createElement('div');
        thumb.className = 'moodboard-thumb';
        thumb.innerHTML = `<img src="${img.src}" alt="" />`;
        thumb.querySelector('img').addEventListener('click', () => {
          ed.cropTargetShootId = id;
          ed.openProjectPhotoCrop(img.src);
        });
        grid.appendChild(thumb);
      });
      // The grid's own contents load async, and its height can change once
      // photos land (the grid scrolls internally past a cap, but "no photos
      // yet" vs a full row is still a real height difference).
      ed.syncPaneTrackHeight(ed.shootOptionsPaneTrack);
    }).catch(() => { grid.innerHTML = ''; });
  });

  document.getElementById('projectPhotoBackBtn').addEventListener('click', () => {
    ed.shootOptionsPaneTrack.classList.remove('show-fourth');
    ed.syncPaneTrackHeight(ed.shootOptionsPaneTrack);
  });

  document.getElementById('addProjectPhotoFromDeviceBtn').addEventListener('click', () => {
    document.getElementById('projectPhotoFileInput').click();
  });

  document.getElementById('projectPhotoFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const id = ed.optionsShootId;
    if (!id) return;
    ed.resizeImageFile(file, 1280, 0.72).then(dataUrl => {
      ed.cropTargetShootId = id;
      ed.openProjectPhotoCrop(dataUrl);
    }).catch(() => {});
  });
};
