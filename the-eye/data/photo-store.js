// Project and talent photos, kept in IndexedDB too.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addPhotoStore = function addPhotoStore(ed) {
  Object.assign(ed, { projectPhotoKey, talentPhotoKey, photoFromEntries, savePhotoToIdb, shootPhotoKeys });
  // ---------- Photo storage (project + talent photos live in IndexedDB) ----------
  // These two used to sit inline on the shoot object as base64 data URLs, which
  // meant every autosave re-serialized all of them into the localStorage blob
  // just to record a title edit. They're stored as a single-entry
  // [{src, caption}] array so they use the exact same store shape as every
  // other image collection here — which also means export/import carries them
  // with no change to the payload format.
  function projectPhotoKey(shootId) {
    return shootId + '__cover';
  }

  function talentPhotoKey(shootId, talentId) {
    return shootId + '__talent_' + talentId;
  }

  function photoFromEntries(entries) {
    return (entries && entries[0] && entries[0].src) || '';
  }

  function savePhotoToIdb(key, dataUrl) {
    return ed.idbSetImages(key, dataUrl ? [{ src: dataUrl, caption: '' }] : []);
  }

  // Every IDB key a shoot owns, so deleting one doesn't orphan rows.
  function shootPhotoKeys(shoot) {
    return [projectPhotoKey(shoot.id)].concat((shoot.talents || []).filter(t => t.id).map(t => talentPhotoKey(shoot.id, t.id)));
  }
};
