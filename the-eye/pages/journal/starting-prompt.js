// Picking a starting prompt for an entry.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addJournalStartingPrompt = function addJournalStartingPrompt(ed) {
  // ---------- Journal starting-prompt picker ----------
  // Offers a random prompt from JOURNAL_PROMPTS; accepting inserts it in
  // brackets at the top of the entry body for the user to write underneath.
  function pickRandomJournalPrompt(excludeText) {
    if (ed.JOURNAL_PROMPTS.length <= 1) return ed.JOURNAL_PROMPTS[0];
    let p;
    do { p = ed.JOURNAL_PROMPTS[Math.floor(Math.random() * ed.JOURNAL_PROMPTS.length)]; } while (p === excludeText);
    return p;
  }

  function showRandomJournalPrompt() {
    ed.journalPromptOffered = pickRandomJournalPrompt(ed.journalPromptOffered);
    document.getElementById('journalPromptText').textContent = ed.journalPromptOffered;
    document.getElementById('journalPromptOverlay').hidden = false;
  }

  document.getElementById('journalPromptBtn').addEventListener('click', showRandomJournalPrompt);
  document.getElementById('journalPromptAnotherBtn').addEventListener('click', showRandomJournalPrompt);

  document.getElementById('journalPromptAcceptBtn').addEventListener('click', () => {
    document.getElementById('journalPromptOverlay').hidden = true;
    if (!ed.journalPromptOffered) return;
    const body = document.getElementById('journalBody');
    const prefix = `[${ed.journalPromptOffered}]\n\n`;
    body.value = prefix + body.value;
    body.focus();
    body.setSelectionRange(prefix.length, prefix.length);
    ed.scheduleJournalAutosave();
  });

  document.getElementById('journalPromptOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.hidden = true;
  });
};
