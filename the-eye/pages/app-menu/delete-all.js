// Delete all shoot data (the Journal stays).
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addAppMenuDeleteAll = function addAppMenuDeleteAll(ed) {
  // "Delete all shoot data" keeps the Journal, so this can't simply clear
  // the store: it walks it and deletes every row except Journal photos
  // ('<entryId>__journal') — mood boards, final images, covers and talent
  // photos, including any left behind by shoots deleted before. Any new
  // kind of image that doesn't belong to a shoot has to be spared here too.
  function idbDeleteAllShootImages() {
    let deleted = [];
    return ed.idbTransaction('readwrite', store => {
      // Keys only — no need to read every photo just to delete it. Reset
      // here in case the transaction is retried (see idbTransaction).
      deleted = [];
      const req = store.getAllKeys();
      req.onsuccess = () => {
        req.result.forEach(key => {
          const kind = ed.categorizeStorageKey(String(key));
          if (kind === 'journal' || kind === 'sticker') return;
          store.delete(key);
          deleted.push(key);
        });
      };
    }).then(() => {
      // Key by key, not noteImagesWritten(null): the Journal list keeps the
      // photos it already has on hand instead of blinking empty and refilling.
      deleted.forEach(key => ed.noteImagesWritten(key));
    });
  }

  const deleteAllConfirmOverlay = document.getElementById('deleteAllConfirmOverlay');
  const deleteAllConfirmModal = document.getElementById('deleteAllConfirmModal');
  const deleteAllConfirmTitle = document.getElementById('deleteAllConfirmTitle');
  const deleteAllConfirmText = document.getElementById('deleteAllConfirmText');
  const deleteAllConfirmActions = document.getElementById('deleteAllConfirmActions');
  const deleteAllConfirmOkBtn = document.getElementById('deleteAllConfirmOkBtn');
  // Same words as the popup's default text in delete-all.html.
  const DELETE_ALL_WARNING = 'This permanently removes every shoot and its photos: mood boards, final images, cover and talent photos. Any journal entries you wrote and their photos are kept. This can\'t be undone.';

  // Straight to the app's own "are you SURE sure" popup — the browser
  // confirm() that used to come first only asked the same thing twice.
  document.getElementById('deleteAllShootDataBtn').addEventListener('click', () => {
    ed.closeAppMenu();
    deleteAllConfirmModal.classList.add('danger-state');
    deleteAllConfirmTitle.textContent = 'Are you SURE sure, my guy?';
    deleteAllConfirmText.textContent = DELETE_ALL_WARNING;
    deleteAllConfirmActions.hidden = false;
    deleteAllConfirmOkBtn.hidden = true;
    deleteAllConfirmOverlay.hidden = false;
  });

  document.getElementById('deleteAllConfirmCancelBtn').addEventListener('click', () => {
    deleteAllConfirmOverlay.hidden = true;
  });

  document.getElementById('deleteAllConfirmYesBtn').addEventListener('click', () => {
    ed.state.shoots = [];
    // Projects are only groups of shoots, so none outlive them.
    ed.state.projects = [];
    ed.saveState();
    idbDeleteAllShootImages().catch(() => {});
    ed.renderAll();
    deleteAllConfirmModal.classList.remove('danger-state');
    deleteAllConfirmTitle.textContent = 'All shoot data deleted.';
    deleteAllConfirmText.textContent = 'Good luck on your next shoots!';
    deleteAllConfirmActions.hidden = true;
    deleteAllConfirmOkBtn.hidden = false;
  });

  deleteAllConfirmOkBtn.addEventListener('click', () => {
    deleteAllConfirmOverlay.hidden = true;
  });
};
