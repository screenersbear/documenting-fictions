// Storage usage, in the App menu: what's taking up room.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addAppMenuStorageUsage = function addAppMenuStorageUsage(ed) {
  Object.assign(ed, { categorizeStorageKey, hydratePhotos, carryPhotosOver, migrateInlinePhotos, formatStorageBytes });
  // ---------- Storage usage (App menu) ----------
  // Every image key in the store matches exactly one of these suffix
  // patterns except mood board images, which were the original, un-suffixed
  // shape this store started with — so "none of the above" is what's left
  // for that bucket, not a dedicated pattern of its own.
  function categorizeStorageKey(key) {
    if (key.endsWith('__cover')) return 'cover';
    if (key.endsWith('__final')) return 'final';
    if (key.endsWith('__journal')) return 'journal';
    if (key.endsWith('__sticker')) return 'sticker';
    if (key.includes('__talent_')) return 'talent';
    return 'moodboard';
  }

  // Estimated from the data URL's own encoded length rather than decoding
  // it — base64 inflates the true byte count by ~4/3, so this runs a hair
  // high, but consistently so across every category, which is what matters
  // for comparing them against each other rather than for a byte-exact figure.
  function estimateDataUrlBytes(src) {
    if (!src) return 0;
    const commaIdx = src.indexOf(',');
    const payload = commaIdx === -1 ? src : src.slice(commaIdx + 1);
    return Math.round(payload.length * 0.75);
  }

  function computeIdbStorageBreakdown() {
    return ed.idbTransaction('readonly', store => {
      const totals = { moodboard: 0, cover: 0, talent: 0, final: 0, journal: 0, sticker: 0 };
      const counts = { moodboard: 0, cover: 0, talent: 0, final: 0, journal: 0, sticker: 0 };
      const req = store.openCursor();
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (!cursor) return;
        const category = categorizeStorageKey(String(cursor.key));
        ed.normalizeMoodboardImages(cursor.value).forEach(img => {
          totals[category] += estimateDataUrlBytes(img.src);
          counts[category] += 1;
        });
        cursor.continue();
      };
      return () => ({ totals, counts });
    });
  }

  function formatStorageBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  const STORAGE_CATEGORY_LABELS = [
    ['moodboard', 'Mood board photos'],
    ['final', 'Final images'],
    ['cover', 'Cover photos'],
    ['talent', 'Talent photos'],
    ['journal', 'Journal photos'],
    ['sticker', 'Stickers'],
  ];

  async function openStorageUsageModal() {
    const overlay = document.getElementById('storageUsageOverlay');
    const body = document.getElementById('storageUsageBody');
    overlay.hidden = false;
    body.innerHTML = '<p class="field-hint">Calculating…</p>';

    const [estimate, breakdown] = await Promise.all([
      (navigator.storage && navigator.storage.estimate)
        ? navigator.storage.estimate().catch(() => null)
        : Promise.resolve(null),
      computeIdbStorageBreakdown().catch(() => null),
    ]);
    // The popup may have been closed while these were in flight.
    if (overlay.hidden) return;

    const rows = [];
    if (estimate && estimate.usage != null) {
      rows.push(`
        <div class="storage-usage-total">
          <p class="storage-usage-total-label">Total on this device</p>
          <p class="storage-usage-total-value">${formatStorageBytes(estimate.usage)}</p>
        </div>
      `);
    }

    if (breakdown) {
      STORAGE_CATEGORY_LABELS.forEach(([key, label]) => {
        if (!breakdown.counts[key]) return;
        rows.push(`
          <div class="storage-usage-row">
            <p class="storage-usage-row-label">${label}</p>
            <p class="storage-usage-row-value">${formatStorageBytes(breakdown.totals[key])} <span class="storage-usage-row-count">(${breakdown.counts[key]})</span></p>
          </div>
        `);
      });
    }

    let appDataBytes = 0;
    try { appDataBytes = new Blob([localStorage.getItem(ed.STORAGE_KEY) || '']).size; } catch (e) {}
    rows.push(`
      <div class="storage-usage-row">
        <p class="storage-usage-row-label">Shoots, journal &amp; settings (text only)</p>
        <p class="storage-usage-row-value">${formatStorageBytes(appDataBytes)}</p>
      </div>
    `);

    rows.push(`
      <div class="storage-usage-row">
        <p class="storage-usage-row-label">Shoots logged</p>
        <p class="storage-usage-row-value">${ed.state.shoots.length}</p>
      </div>
    `);

    body.innerHTML = rows.join('');
  }

  document.getElementById('storageUsageBtn').addEventListener('click', () => {
    ed.closeAppMenu();
    openStorageUsageModal();
  });
  document.getElementById('storageUsageCloseBtn').addEventListener('click', () => {
    document.getElementById('storageUsageOverlay').hidden = true;
  });
  document.getElementById('storageUsageOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('storageUsageOverlay')) document.getElementById('storageUsageOverlay').hidden = true;
  });

  // Reads every shoot's photos back onto the in-memory state so that all the
  // render code can keep reading shoot.projectPhoto / talent.photo
  // synchronously, exactly as it did when they were stored inline.
  //
  // All in one transaction — at launch this is what the first paint waits
  // on (see the boot code), so it has to be quick. Each result is written
  // onto whatever shoot/talent currently has that id in `state` (looked up
  // when the read lands, not captured up front) — `state` gets swapped by a
  // pull-to-refresh and shoot objects get replaced by copies on every
  // autosave, so a captured reference can already be an orphan by then. It
  // only fills a photo that's missing, so a late read can never put an older
  // copy over one that was just added. If the batch read fails, it falls
  // back to one read per photo, so one bad row can't cost all the others.
  // Resolves to how many photos it filled in, so a caller can skip a repaint
  // when nothing changed.
  function hydratePhotos() {
    const keys = [];
    ed.state.shoots.forEach(shoot => {
      keys.push(ed.projectPhotoKey(shoot.id));
      (shoot.talents || []).forEach(talent => {
        if (talent.id) keys.push(ed.talentPhotoKey(shoot.id, talent.id));
      });
    });
    if (!keys.length) return Promise.resolve(0);
    const readAll = ed.idbGetManyImages(keys).catch(() => Promise.all(keys.map(key => ed.idbGetImages(key)
      .then(entries => [key, entries], () => [key, []])))
      .then(pairs => new Map(pairs)));
    return readAll.then(rows => {
      let filled = 0;
      ed.state.shoots.forEach(shoot => {
        const cover = ed.photoFromEntries(rows.get(ed.projectPhotoKey(shoot.id)));
        if (cover && !shoot.projectPhoto) { shoot.projectPhoto = cover; filled++; }
        (shoot.talents || []).forEach(talent => {
          const src = talent.id ? ed.photoFromEntries(rows.get(ed.talentPhotoKey(shoot.id, talent.id))) : '';
          if (src && !talent.photo) { talent.photo = src; filled++; }
        });
      });
      return filled;
    });
  }

  // Re-attaches the photos already held in memory onto a freshly rebuilt state
  // (matched by id), so reloading `state` from storage — which never has
  // photos, see stripPhotos — can't cause even a single frame of empty
  // thumbnails while IndexedDB is re-read.
  function carryPhotosOver(from, to) {
    const previous = new Map((from.shoots || []).map(s => [s.id, s]));
    (to.shoots || []).forEach(s => {
      const old = previous.get(s.id);
      if (!old) return;
      if (old.projectPhoto && !s.projectPhoto) s.projectPhoto = old.projectPhoto;
      const oldTalents = new Map((old.talents || []).filter(t => t.id).map(t => [t.id, t]));
      (s.talents || []).forEach(t => {
        const o = t.id && oldTalents.get(t.id);
        if (o && o.photo && !t.photo) t.photo = o.photo;
      });
    });
  }

  // One-time move for data saved before photos lived in IDB: anything still
  // inline gets written out to its own key, then dropped from the blob by the
  // next saveState(). Safe to run on every boot — after the first pass there's
  // nothing inline left to find.
  function migrateInlinePhotos() {
    const jobs = [];
    ed.state.shoots.forEach(shoot => {
      if (shoot.projectPhoto) jobs.push(ed.savePhotoToIdb(ed.projectPhotoKey(shoot.id), shoot.projectPhoto));
      (shoot.talents || []).forEach(talent => {
        if (talent.id && talent.photo) jobs.push(ed.savePhotoToIdb(ed.talentPhotoKey(shoot.id, talent.id), talent.photo));
      });
    });
    if (!jobs.length) return Promise.resolve();
    return Promise.all(jobs).then(() => ed.saveState()).catch(() => {});
  }
};
