// An entry open: writing it or reading it; opening, closing and deleting it.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addJournalEntryPage = function addJournalEntryPage(ed) {
  Object.assign(ed, { clearOpenJournalMarker, openJournalModal, closeJournalModal });
  const journalModalOverlay = document.getElementById('journalModalOverlay'); ed.journalModalOverlay = journalModalOverlay;
  const OPEN_JOURNAL_KEY = 'dailies_open_journal_entry'; ed.OPEN_JOURNAL_KEY = OPEN_JOURNAL_KEY;

  function setOpenJournalMarker(id) {
    try { localStorage.setItem(OPEN_JOURNAL_KEY, id); } catch (e) {}
  }

  function clearOpenJournalMarker() {
    try { localStorage.removeItem(OPEN_JOURNAL_KEY); } catch (e) {}
  }

  // The full typing setup (title/body/hashtags/photos) — reachable directly
  // for a brand-new entry, or via the Edit button on an existing standalone
  // one.
  function showJournalEditMode() {
    ed.journalMode = 'edit';
    document.getElementById('journalSubject').value = ed.currentJournalEntry.title;
    document.getElementById('journalBody').value = ed.currentJournalEntry.body;
    ed.currentJournalTags = [...ed.currentJournalEntry.tags];
    ed.renderJournalTagsChips();
    ed.renderJournalTagsSuggestions();
    ed.journalTagsInput.value = '';
    document.getElementById('deleteJournalBtn').hidden = ed.journalIsNew;
    ed.renderJournalImages();
    document.getElementById('journalViewMode').hidden = true;
    document.getElementById('journalForm').hidden = false;
  }

  // A read-only popup of the saved entry — no textboxes, no editing
  // mechanics — until the Edit button switches back to edit mode.
  function showJournalViewMode() {
    ed.journalMode = 'view';
    const e = ed.currentJournalEntry;
    document.getElementById('journalViewTitle').textContent = e.title || 'Untitled entry';
    document.getElementById('journalViewDate').textContent = ed.prettyDate(e.createdAt);
    const tagsEl = document.getElementById('journalViewTags');
    tagsEl.innerHTML = (e.tags || []).map(t => `<span class="beat-chip view-only">${ed.escapeHtml(t)}</span>`).join('');
    tagsEl.hidden = !(e.tags && e.tags.length);
    document.getElementById('journalViewBody').textContent = e.body || '';
    document.getElementById('journalViewLinkedHint').hidden = !e.sourceShootId;
    document.getElementById('deleteJournalViewBtn').hidden = ed.journalIsNew;
    document.getElementById('journalViewDoneBtn').textContent = ed.pickRandomSaveMessage();
    ed.renderJournalViewImages();
    document.getElementById('journalForm').hidden = true;
    document.getElementById('journalViewMode').hidden = false;
  }

  function openJournalModal(id, mode) {
    const existing = id ? ed.state.journalEntries.find(x => x.id === id) : null;
    ed.journalIsNew = !existing;
    ed.currentJournalEntry = existing || { id: ed.uid(), title: '', body: '', tags: [], createdAt: ed.todayStr() };
    setOpenJournalMarker(ed.currentJournalEntry.id);
    ed.journalHasImages = false;

    // A brand-new entry starts in edit mode (nothing to view yet), as does one
    // opened straight from the Reflections list, where the body is already read
    // inline. Everything else opens read-only. Auto-compiled shoot reflections
    // never get edit mode here at all — editing them routes back to the shoot —
    // so the sourceShootId guard holds even if a caller asks for it.
    if (ed.journalIsNew || (mode === 'edit' && !ed.currentJournalEntry.sourceShootId)) showJournalEditMode();
    else showJournalViewMode();

    journalModalOverlay.hidden = false;
  }

  // Auto-compiled entries never edit in place — "editing" always hands off
  // to the shoot's own reflection fields instead, so the two stay in sync.
  async function revisitLinkedJournalEntry() {
    const entry = ed.currentJournalEntry;
    const shootId = entry.sourceShootId;
    const ok = await ed.askConfirm({
      title: 'Revisit this shoot?',
      text: "This entry is written from the shoot's reflection, so that's where it's changed.",
      confirmLabel: 'Go to shoot',
      cancelLabel: 'Stay here',
    });
    // Still the entry that asked (the popup sits over it, so it should be).
    if (!ok || ed.currentJournalEntry !== entry) return;
    closeJournalModal();
    ed.openPostShootJournalPrompt(shootId);
  }

  document.getElementById('journalViewBody').addEventListener('click', () => {
    if (ed.currentJournalEntry && ed.currentJournalEntry.sourceShootId) revisitLinkedJournalEntry();
  });

  document.getElementById('editJournalBtn').addEventListener('click', () => {
    if (ed.currentJournalEntry && ed.currentJournalEntry.sourceShootId) revisitLinkedJournalEntry();
    else showJournalEditMode();
  });

  function closeJournalModal() {
    clearTimeout(ed.journalSaveTimer);
    ed.autosaveJournal();
    clearOpenJournalMarker();
    journalModalOverlay.hidden = true;
    ed.currentJournalEntry = null;
    ed.renderJournal();
  }

  document.getElementById('addJournalBtn').addEventListener('click', () => openJournalModal(null));

  // Saving no longer closes the modal — it drops back to the read-only view
  // of what was just written, right in the same popup. An entry that ends
  // up with no real content (autosave already deletes it) just closes.
  document.getElementById('saveJournalBtn').addEventListener('click', () => {
    clearTimeout(ed.journalSaveTimer);
    ed.autosaveJournal();
    const e = ed.currentJournalEntry;
    const hasContent = e && (ed.hasText(e.title) || ed.hasText(e.body) || e.tags.length > 0 || ed.journalHasImages);
    if (hasContent) showJournalViewMode();
    else closeJournalModal();
  });

  async function deleteCurrentJournalEntry() {
    const entry = ed.currentJournalEntry;
    if (!entry) return;
    if (!(await ed.askDeleteJournalEntry()) || ed.currentJournalEntry !== entry) return;
    // Linked entries share the shoot's own final-images store — only
    // standalone entries own a dedicated image key to clean up here.
    if (!ed.currentJournalEntry.sourceShootId) {
      ed.idbDeleteImages(ed.journalImagesKey(ed.currentJournalEntry.id)).catch(() => {});
    }
    ed.state.journalEntries = ed.state.journalEntries.filter(x => x.id !== ed.currentJournalEntry.id);
    ed.saveState();
    clearTimeout(ed.journalSaveTimer);
    clearOpenJournalMarker();
    journalModalOverlay.hidden = true;
    ed.currentJournalEntry = null;
    ed.renderJournal();
  }

  document.getElementById('deleteJournalBtn').addEventListener('click', deleteCurrentJournalEntry);
  document.getElementById('deleteJournalViewBtn').addEventListener('click', deleteCurrentJournalEntry);
  document.getElementById('journalViewDoneBtn').addEventListener('click', closeJournalModal);

  journalModalOverlay.addEventListener('click', (e) => {
    if (e.target === journalModalOverlay) closeJournalModal();
  });
};
