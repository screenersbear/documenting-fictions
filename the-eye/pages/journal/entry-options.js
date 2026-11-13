// An entry's options (its menu on the list card), its tags, and saving as you write.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addJournalEntryOptions = function addJournalEntryOptions(ed) {
  Object.assign(ed, { openJournalOptions, closeJournalOptions, askDeleteJournalEntry, openPostShootJournalPrompt, renderJournalTagsChips, renderJournalTagsSuggestions, autosaveJournal, scheduleJournalAutosave, saveJournalNow });
  // ---------- Journal entry options (kebab menu on the list card) ----------
  ed.optionsJournalEntryId = null;

  function openJournalOptions(id) {
    ed.optionsJournalEntryId = id;
    document.getElementById('journalOptionsOverlay').hidden = false;
  }

  function closeJournalOptions() {
    document.getElementById('journalOptionsOverlay').hidden = true;
    ed.optionsJournalEntryId = null;
  }

  document.getElementById('journalOptionsCancelBtn').addEventListener('click', closeJournalOptions);

  document.getElementById('journalOptionsOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeJournalOptions();
  });

  // Both ways of deleting an entry (its ⋮ here, or Delete inside the entry)
  // ask the same thing.
  function askDeleteJournalEntry() {
    return ed.askConfirm({ title: 'Delete this journal entry?', text: "This can't be undone.", confirmLabel: 'Delete entry', cancelLabel: 'Keep it', danger: true });
  }

  document.getElementById('deleteJournalOptionBtn').addEventListener('click', async () => {
    const id = ed.optionsJournalEntryId;
    closeJournalOptions();
    if (!id) return;
    if (!(await askDeleteJournalEntry())) return;
    const entry = ed.state.journalEntries.find(e => e.id === id);
    if (entry && !entry.sourceShootId) {
      ed.idbDeleteImages(ed.journalImagesKey(entry.id)).catch(() => {});
    }
    ed.state.journalEntries = ed.state.journalEntries.filter(e => e.id !== id);
    ed.saveState();
    ed.renderJournal();
  });

  // Auto-generated post-shoot journal entries aren't edited in place —
  // editing always routes back through the shoot's own reflection fields
  // so the two stay in sync.
  function openPostShootJournalPrompt(shootId) {
    const s = ed.state.shoots.find(x => x.id === shootId);
    if (!s) { ed.showToast("This shoot no longer exists."); return; }
    document.querySelector(`.tab[data-view="${s.archived ? 'archive' : 'shoots'}"]`).click();
    ed.openShootModal(shootId);
    ed.showShootPage('postShootHeading');
  }

  function renderJournalTagsChips() {
    const container = document.getElementById('journalTagsChips');
    container.innerHTML = ed.currentJournalTags.map((t, idx) => `
      <span class="beat-chip">${ed.escapeHtml(t)}<button type="button" class="journal-tag-remove" data-idx="${idx}">&times;</button></span>
    `).join('');
    container.querySelectorAll('.journal-tag-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        ed.currentJournalTags.splice(Number(btn.dataset.idx), 1);
        renderJournalTagsChips();
        renderJournalTagsSuggestions();
        scheduleJournalAutosave();
      });
    });
  }

  function renderJournalTagsSuggestions() {
    const container = document.getElementById('journalTagsSuggestions');
    const suggestions = ed.getAllUsedJournalTags().filter(t => !ed.currentJournalTags.includes(t));
    container.innerHTML = suggestions.map(t => `<button type="button" class="beat-suggestion" data-tag="${ed.escapeHtml(t)}">+ ${ed.escapeHtml(t)}</button>`).join('');
    container.querySelectorAll('.beat-suggestion').forEach(btn => {
      btn.addEventListener('click', () => addJournalTag(btn.dataset.tag));
    });
  }

  function addJournalTag(text) {
    const trimmed = text.trim().replace(/^#/, '');
    if (!trimmed || ed.currentJournalTags.includes(trimmed)) return;
    ed.currentJournalTags.push(trimmed);
    renderJournalTagsChips();
    renderJournalTagsSuggestions();
    scheduleJournalAutosave();
  }

  const journalTagsInput = document.getElementById('journalTagsInput'); ed.journalTagsInput = journalTagsInput;
  journalTagsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addJournalTag(journalTagsInput.value);
      journalTagsInput.value = '';
    }
  });

  function autosaveJournal() {
    if (!ed.currentJournalEntry) return;
    // View mode has no editable fields, so there's nothing on the entry to
    // re-derive from the form — skip straight to the content check below
    // (the edit-mode form fields may still hold a previous entry's draft).
    if (ed.journalMode === 'edit') {
      ed.currentJournalEntry.title = document.getElementById('journalSubject').value;
      ed.currentJournalEntry.body = document.getElementById('journalBody').value;
      ed.currentJournalEntry.tags = [...ed.currentJournalTags];
    }

    const hasContent = ed.hasText(ed.currentJournalEntry.title) || ed.hasText(ed.currentJournalEntry.body) || ed.currentJournalEntry.tags.length > 0 || ed.journalHasImages;
    const idx = ed.state.journalEntries.findIndex(x => x.id === ed.currentJournalEntry.id);

    if (hasContent) {
      if (idx === -1) {
        ed.state.journalEntries.push(ed.currentJournalEntry);
        ed.journalIsNew = false;
        document.getElementById('deleteJournalBtn').hidden = false;
      } else {
        ed.state.journalEntries[idx] = ed.currentJournalEntry;
      }
      ed.saveState();
    } else if (idx !== -1) {
      ed.state.journalEntries.splice(idx, 1);
      ed.saveState();
    }
  }

  function scheduleJournalAutosave() {
    clearTimeout(ed.journalSaveTimer);
    // Unlike the shoot form's notes fields (which are readonly and edited in
    // the expand modal), the journal body is typed straight into, so this is
    // the app's one genuinely long typing session. Same reasoning as
    // scheduleShootAutosave: a backstop, with blur and backgrounding both
    // saving immediately.
    ed.journalSaveTimer = setTimeout(autosaveJournal, 2000);
  }

  function saveJournalNow() {
    if (!ed.currentJournalEntry) return;
    clearTimeout(ed.journalSaveTimer);
    autosaveJournal();
  }

  document.getElementById('journalSubject').addEventListener('input', scheduleJournalAutosave);
  document.getElementById('journalBody').addEventListener('input', scheduleJournalAutosave);
  document.getElementById('journalSubject').addEventListener('blur', saveJournalNow);
  document.getElementById('journalBody').addEventListener('blur', saveJournalNow);
};
