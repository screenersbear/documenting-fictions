// The Archive tab: its slideshow of final images (with the shoot each is
// from under it) and its category filter. The list is archive-list.js.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addArchive = function addArchive(ed) {
  Object.assign(ed, { startArchiveSlideshow, stopArchiveSlideshow, loadArchiveSlideshow, renderArchiveSlideshow });
  // ---------- Archive view ----------
  ed.archiveFilter = 'all';
  let archiveSlideshowTimer = null;
  // null until the first read lands, so even "no photos" gets drawn once
  // (it shows the empty-state line).
  let archiveSlideshowSignature = null;
  // The slideshow's photos are the app's biggest, so they're not read at
  // launch: loadArchiveSlideshow runs a moment after the first paint (or
  // straight away if Archive is opened first). After that it only reads
  // again when final images change (noteImagesWritten) or the set of shoots
  // does — not on every renderAll, which runs on every tab switch.
  ed.archiveSlideshowLoaded = false;
  ed.archiveSlideshowStale = true;
  let archiveSlideshowShootsKey = '';
  // One read at a time: a burst of writes (deleting or importing many
  // shoots) folds into the read already running plus one catch-up, rather
  // than a full read of every final image per write.
  let archiveSlideshowReading = false;

  // The rotation is deliberately split out from the DOM build below. Each tick
  // cross-fades and scales a full-size photo over 4.2s on a 4.2s interval, so
  // something is always animating — left running it would keep compositing
  // large bitmaps while you're on a completely different tab. It's started
  // only while Archive is actually on screen (see stopArchiveSlideshow's
  // callers: tab switches and the app going to the background).
  function startArchiveSlideshow() {
    stopArchiveSlideshow();
    const container = document.getElementById('archiveSlideshow');
    if (!container || ed.views.archive.hidden || document.hidden) return;
    const imgs = container.querySelectorAll('img');
    if (imgs.length < 2) return;
    let idx = Array.prototype.findIndex.call(imgs, im => im.classList.contains('active'));
    if (idx < 0) idx = 0;
    archiveSlideshowTimer = setInterval(() => {
      const current = container.querySelectorAll('img');
      if (!current.length) return;
      current[idx].classList.remove('active');
      idx = (idx + 1) % current.length;
      current[idx].classList.add('active');
      showCaption(current[idx]);
    }, 4200);
  }

  // Under the photo: which shoot it's from, and when ("Final image, Nov").
  function showCaption(img) {
    const caption = document.getElementById('archiveCaption');
    const shoot = img && ed.state.shoots.find(s => s.id === img.dataset.shootId);
    caption.hidden = !shoot;
    if (!shoot) return;
    const month = shoot.date ? ed.rowDate(shoot.date, ed.todayStr(), false).replace(/^\d+ /, '') : '';
    document.getElementById('archiveCaptionLabel').textContent = ed.metaLine(['Final image', month]);
    document.getElementById('archiveCaptionName').textContent = ed.shootDisplayName(shoot);
  }

  function stopArchiveSlideshow() {
    clearInterval(archiveSlideshowTimer);
    archiveSlideshowTimer = null;
  }

  function loadArchiveSlideshow() {
    ed.archiveSlideshowLoaded = true;
    renderArchiveSlideshow();
  }

  // Pulls final images across every non-video shoot (any status) and cycles
  // through them; skips a rebuild if the image set hasn't actually changed so
  // the animation doesn't restart every time renderAll() runs. Video shoots
  // have no final images (any left from before a switch to video are hidden).
  function renderArchiveSlideshow() {
    // Not loaded yet (see archiveSlideshowLoaded) — unless Archive's the
    // screen being shown.
    if (!ed.archiveSlideshowLoaded) {
      if (ed.views.archive.hidden) return;
      ed.archiveSlideshowLoaded = true;
    }
    const shoots = ed.state.shoots.filter(s => !ed.isVideoShoot(s));
    const shootsKey = shoots.map(s => s.id).join('|');
    // Nothing's changed since the last read — the path taken when you
    // navigate back to Archive, where the DOM is already built but the
    // rotation is stopped.
    if (!ed.archiveSlideshowStale && shootsKey === archiveSlideshowShootsKey) {
      startArchiveSlideshow();
      return;
    }
    if (archiveSlideshowReading) {
      ed.archiveSlideshowStale = true;
      return;
    }
    archiveSlideshowReading = true;
    ed.archiveSlideshowStale = false;
    archiveSlideshowShootsKey = shootsKey;
    ed.idbGetManyImages(shoots.map(s => ed.finalImagesKey(s.id))).then(rows => {
      archiveSlideshowReading = false;
      // Something changed while this was reading: skip this result and read
      // once more.
      const currentKey = ed.state.shoots.filter(s => !ed.isVideoShoot(s)).map(s => s.id).join('|');
      if (ed.archiveSlideshowStale || currentKey !== archiveSlideshowShootsKey) {
        ed.archiveSlideshowStale = true;
        renderArchiveSlideshow();
        return;
      }
      const images = [];
      shoots.forEach(shoot => {
        (rows.get(ed.finalImagesKey(shoot.id)) || []).forEach(img => { if (img.src) images.push({ src: img.src, shootId: shoot.id }); });
      });
      const signature = images.map(img => img.src).join('|');
      // Unchanged image set (a write that didn't change what's shown): leave
      // the existing <img>s alone, but still re-evaluate the timer.
      if (signature === archiveSlideshowSignature) {
        startArchiveSlideshow();
        return;
      }
      archiveSlideshowSignature = signature;
      ed.shuffleArray(images);

      stopArchiveSlideshow();
      const container = document.getElementById('archiveSlideshow');
      // The photo on screen stays until the new first one has faded in over
      // it — no cut to an empty box when the set changes while you watch.
      const showing = images.length ? container.querySelector('img.active') : null;
      container.querySelectorAll('img').forEach(img => { if (img !== showing) img.remove(); });
      document.getElementById('archiveSlideshowEmpty').hidden = images.length > 0;
      if (!images.length) { showCaption(null); return; }

      let first = null;
      images.forEach(entry => {
        const img = document.createElement('img');
        img.src = entry.src;
        img.dataset.shootId = entry.shootId;
        container.appendChild(img);
        if (!first) first = img;
      });
      // The first photo fades in with the slideshow's own cross-fade rather
      // than popping in, when Archive's on screen as it loads (built while
      // Archive's hidden, it's simply there when you get to it).
      void first.offsetWidth;
      first.classList.add('active');
      showCaption(first);
      if (showing) {
        showing.classList.remove('active');
        // The rotation starts once the old photo's gone, so it counts from
        // the new set only.
        setTimeout(() => {
          showing.remove();
          startArchiveSlideshow();
        }, 1250);
      } else {
        startArchiveSlideshow();
      }
    }).catch(() => {
      archiveSlideshowReading = false;
      ed.archiveSlideshowStale = true;
    });
  }

  document.getElementById('archiveSlideshow').addEventListener('click', (e) => {
    // The photo on screen, not whatever the tap hit: every photo is stacked
    // in the same spot (the hidden ones only faded out), so the last one in
    // the list would take every tap.
    const img = e.currentTarget.querySelector('img.active') || e.target.closest('img');
    if (!img) return;
    const shoot = ed.state.shoots.find(s => s.id === img.dataset.shootId);
    if (!shoot) return;
    // An archived shoot's photo opens its page here, same as its row in the
    // list below. The slideshow also shows final images from shoots that
    // aren't archived yet, and those open on the Shoots tab.
    if (!shoot.archived) document.querySelector('.tab[data-view="shoots"]').click();
    ed.openShootModal(shoot.id);
  });

  // The category chips are always out (round 2): All, each category, and
  // Edit (which categories show).
  document.getElementById('archiveFilters').addEventListener('click', (e) => {
    if (e.target.closest('.chip-manage')) {
      ed.openCategoryVisibilityModal();
      return;
    }
    const chip = e.target.closest('.chip');
    if (!chip || !chip.dataset.filter) return;
    ed.archiveFilter = chip.dataset.filter;
    ed.renderArchive();
  });
};
