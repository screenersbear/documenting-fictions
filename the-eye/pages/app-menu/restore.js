// Restore: reading a backup and taking it in.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addAppMenuRestore = function addAppMenuRestore(ed) {
  // Restore a backup: the zip (or all the files it was saved as, picked
  // together), a backup of all four from the shelf (The Eye's part of it),
  // or an old .json.
  const NOT_A_BACKUP = "That file isn't a backup from this app. Nothing was changed.";
  document.getElementById('importDataBtn').addEventListener('click', () => {
    ed.closeAppMenu();
    // Straight from the tap, or iOS won't open the picker.
    window.DFData.pickFiles('.zip,application/zip,.json,application/json').then(async (files) => {
      if (!files.length) return;
      if (await window.DFData.isZipFile(files[0])) {
        pendingImportFiles = files;
        importConfirmOverlay.hidden = false;
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const payload = JSON.parse(reader.result);
          if (!payload || !payload.state || !Array.isArray(payload.state.shoots)) throw new Error('bad shape');
          pendingImportPayload = payload;
          importConfirmOverlay.hidden = false;
        } catch (err) {
          ed.showToast(NOT_A_BACKUP);
        }
      };
      reader.onerror = () => ed.showToast(NOT_A_BACKUP);
      reader.readAsText(files[0]);
    }).catch(() => ed.showToast(NOT_A_BACKUP));
  });

  let pendingImportPayload = null;
  let pendingImportFiles = null;
  const importConfirmOverlay = document.getElementById('importConfirmOverlay');

  // Runs the backup with the restore popup left open behind it, so Restore
  // is right there once it's done.
  document.getElementById('importBackupFirstBtn').addEventListener('click', ed.exportAllData);

  document.getElementById('cancelImportBtn').addEventListener('click', () => {
    pendingImportPayload = null;
    pendingImportFiles = null;
    importConfirmOverlay.hidden = true;
  });

  // The shoots, journal and the rest from a backup, in place of what's here.
  function adoptBackupState(saved) {
    const importedShoots = Array.isArray(saved.shoots) ? saved.shoots : [];
    // Import bypasses loadState's migrations, so the status-level fixes run
    // here too. Otherwise an old backup's video shoot in "Editing" (or a
    // retired idea_phase) sits in a status its category doesn't offer until
    // the next reload.
    ed.migrateIdeaPhaseStatus(importedShoots);
    ed.normalizeShootStatuses(importedShoots);
    // Same project clean-up as loadState. A backup from before projects
    // existed has neither records nor projectIds, so this is just [].
    const importedProjects = ed.normalizeProjects(saved.projects, importedShoots);
    ed.state = {
      shoots: importedShoots,
      projects: importedProjects,
      frameworks: (Array.isArray(saved.frameworks) && saved.frameworks.length) ? saved.frameworks : ed.seedFrameworks(),
      journalEntries: Array.isArray(saved.journalEntries) ? saved.journalEntries : [],
      titleDisplayMode: saved.titleDisplayMode === 'title' ? 'title' : 'talent',
      // A backup from before the sun menu leaves the notebook as it is.
      presentation: ed.normalizePresentation(saved.presentation || ed.state.presentation),
      defaultCountry: typeof saved.defaultCountry === 'string' ? saved.defaultCountry : '',
      dismissedLocationKeys: Array.isArray(saved.dismissedLocationKeys) ? saved.dismissedLocationKeys : [],
      dismissedTeamMemberKeys: Array.isArray(saved.dismissedTeamMemberKeys) ? saved.dismissedTeamMemberKeys : [],
      dismissedTalentKeys: Array.isArray(saved.dismissedTalentKeys) ? saved.dismissedTalentKeys : [],
      dismissedLightingSetupKeys: Array.isArray(saved.dismissedLightingSetupKeys) ? saved.dismissedLightingSetupKeys : [],
      photographer: ed.normalizePhotographer(saved.photographer),
    };
    ed.saveState();
    ed.applyAppColor(ed.state.presentation.color);
    ed.refreshStickers();
    ed.renderAll();
    ed.showToast('Backup restored');
    // Backups made before photos moved to IDB still carry them inline on the
    // shoots, so run the same migration boot does; then pull every photo back
    // onto the in-memory state so thumbnails appear without a reload.
    ed.migrateInlinePhotos()
      .then(ed.hydratePhotos)
      .then(() => ed.renderAll())
      .catch(() => {});
  }

  document.getElementById('confirmImportBtn').addEventListener('click', () => {
    const payload = pendingImportPayload;
    const files = pendingImportFiles;
    importConfirmOverlay.hidden = true;
    pendingImportPayload = null;
    pendingImportFiles = null;
    if (files) { restoreZipBackup(files); return; }
    if (!payload) return;
    const imageWrites = Object.entries(payload.images || {}).map(([key, imgs]) => ed.idbSetImages(key, imgs));
    imageWrites.push(ed.restoreRefBoards(payload.refBoards).catch(() => {}));
    // Busy until the restored shoots are saved too, so an update can't land
    // between the photos going in and the rest (see busyTasks).
    ed.busyTasks++;
    Promise.all(imageWrites).then(() => {
      adoptBackupState(payload.state);
    }, err => {
      // The photos go in first and everything else only once they all
      // have, so when a photo write fails the app's shoots and journal are
      // left as they were (only photos already written may have changed).
      console.error('Restore failed', err);
      if (ed.isStorageFullError(err)) ed.noteStorageFull(err);
      else ed.showToast("Couldn't restore that backup");
    }).finally(() => { ed.busyTasks--; });
  });

  // A zip backup: checked before anything changes (the shoots have to be in
  // it), then the photos and boards go in, then the shoots.
  function restoreZipBackup(files) {
    let saved = null;
    ed.busyTasks++;
    ed.showToast('Restoring the backup', 600000);
    window.DFData.restoreZip(files, {
      databases: ed.BACKUP_DBS,
      check: async (local) => {
        try { saved = JSON.parse(await local(ed.STORAGE_KEY)); } catch (e) { saved = null; }
        if (!saved || !Array.isArray(saved.shoots)) throw new Error(NOT_A_BACKUP);
      },
    }).then(() => (ed.refApi ? ed.loadRefBoardShoots().catch(() => {}) : null))
      .then(() => adoptBackupState(saved))
      .catch((err) => {
        console.error('Restore failed', err);
        ed.showToast(err.message || "Couldn't restore that backup");
      })
      .finally(() => { ed.busyTasks--; });
  }
};
