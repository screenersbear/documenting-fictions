// An entry being written, kept across restarts.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addJournalRestoreDraft = function addJournalRestoreDraft(ed) {
  // ---------- restore an in-progress journal entry across restarts ----------
  function restoreOpenJournalEntry() {
    let id;
    try { id = localStorage.getItem(ed.OPEN_JOURNAL_KEY); } catch (e) { return; }
    if (!id) return;
    if (!ed.state.journalEntries.some(x => x.id === id) || !document.querySelector('.tab[data-view="journal"]')) { ed.clearOpenJournalMarker(); return; }
    document.querySelector('.tab[data-view="journal"]').click();
    // Edit mode: the marker only exists because the app went away mid-write, so
    // this puts you back where you were. It also has to match the list, which
    // now opens straight into the editor — an entry restored read-only would be
    // a view you can no longer reach any other way.
    ed.openJournalModal(id, 'edit');
  }
  restoreOpenJournalEntry();
};
