// Saving, and speaking up when the phone's storage is full.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addSave = function addSave(ed) {
  Object.assign(ed, { isStorageFullError, noteStorageFull, saveState });
  // ---------- Storage full ----------
  // When the phone's storage for the app runs out, saves fail: localStorage
  // throws QuotaExceededError and an IndexedDB write aborts with it. Those
  // used to fail silently, so a photo could look added and simply not be
  // there next time. Now they say so — at most once every few seconds,
  // since one full store tends to fail a whole burst of writes at once.
  // Declared up here, ahead of the first saveState(), so it's ready before
  // anything can save.
  const STORAGE_FULL_MESSAGE = "Couldn't save. Your phone's storage for the app may be full. Back up and free some space.";
  let storageFullNoticeAt = 0;

  // Older engines report a full store by code rather than name (22 in
  // WebKit/Chromium, 1014 in Firefox).
  function isStorageFullError(err) {
    if (!err) return false;
    return err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22 || err.code === 1014;
  }

  // The .catch on photo writes: speaks up when the store is full and stays
  // quiet about anything else, as before (a photo that couldn't be read is
  // not a storage problem).
  function noteStorageFull(err) {
    if (!isStorageFullError(err)) return;
    const now = Date.now();
    if (now - storageFullNoticeAt < 5000) return;
    storageFullNoticeAt = now;
    // Deferred: saveState can run while the app is still starting up,
    // before the toast code further down has been reached. Up longer than a
    // routine toast: it's more to read, and it matters. A notice, so it
    // waits for an Undo toast that's up (the removal it follows) rather
    // than wiping out its button.
    setTimeout(() => ed.showNoticeToast(STORAGE_FULL_MESSAGE, 6000), 0);
  }

  function saveState() {
    // Every save first brings multi-day projects in line: a change to a lead
    // day is mirrored onto the days following it, and a following day that
    // was changed by hand stops following (see syncProjectMirrors).
    ed.syncProjectMirrors();
    try {
      localStorage.setItem(ed.STORAGE_KEY, JSON.stringify(ed.state, ed.stripPhotos));
    } catch (err) {
      // Out of room: the change is still on screen but won't survive a
      // relaunch, so say so. Anything else is a bug and still throws.
      if (!isStorageFullError(err)) throw err;
      noteStorageFull(err);
    }
    ed.freezeShotBoardsSoon(); // a shoot just shot: its boards from Ref stop changing
  }
};
