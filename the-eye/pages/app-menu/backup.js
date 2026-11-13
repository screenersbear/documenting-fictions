// Back up: when the last one was, making one, and the reminder.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addAppMenuBackup = function addAppMenuBackup(ed) {
  Object.assign(ed, { exportAllData, withBackupReminder });
  // ---------- Back up / Restore ----------
  // When the last backup that's known to have gone somewhere was made (ms),
  // for "Last backup: …" in App options and the Daily report's reminder.
  const LAST_BACKUP_KEY = 'dailies_last_backup_v1';

  function loadLastBackupTime() {
    try {
      const t = Number(localStorage.getItem(LAST_BACKUP_KEY));
      return t > 0 ? t : null;
    } catch (e) {
      return null;
    }
  }

  // Whole calendar days since the last backup (0 = today), or null for never.
  function daysSinceLastBackup() {
    const t = loadLastBackupTime();
    if (!t) return null;
    const then = new Date(t);
    then.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((today - then) / 86400000));
  }

  function lastBackupLabel() {
    const days = daysSinceLastBackup();
    if (days === null) return 'never';
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    return `${days} days ago`;
  }

  function renderLastBackupHint() {
    document.getElementById('lastBackupHint').textContent = `Last backup: ${lastBackupLabel()}`;
  }

  renderLastBackupHint();
  // Re-read on every open, so "today" turns into "yesterday" without a
  // relaunch. Runs after the menu's own open handler, in the same tap, so
  // there's nothing to see change.
  document.getElementById('appMenuBtn').addEventListener('click', renderLastBackupHint);

  function rememberBackup() {
    try { localStorage.setItem(LAST_BACKUP_KEY, String(Date.now())); } catch (e) { /* storage unavailable — nothing to remember it in */ }
    renderLastBackupHint();
    ed.showToast('Backup saved');
  }

  // Save a backup: the notebooks' shared zip (df-data.js's zipBackup), the
  // same as Ref's, Contact Sheet's and Overthoughts': the shoots (as they're
  // kept, in localStorage), every photo row, and df-links, the Ref boards on
  // the shoots (the only links there are). It's put together from the stored
  // photos, so the phone never holds them all in memory; on a phone a big
  // one is handed over as a few files, a tap each (backupSteps). Only a
  // backup that's gone somewhere counts as the last one: a cancelled share
  // doesn't.
  const BACKUP_DBS = ['starky-moodboards', 'df-links']; ed.BACKUP_DBS = BACKUP_DBS;
  const backupOverlay = document.getElementById('backupOverlay');
  const backupText = document.getElementById('backupText');
  const backupSaveBtn = document.getElementById('backupSaveBtn');
  let closeBackupCard = null;

  async function exportAllData() {
    if (closeBackupCard) return;
    const D = window.DFData;
    let open = true;
    let made = null;
    let steps = null;
    ed.busyTasks++; // an update now would lose the files still to be saved
    closeBackupCard = () => {
      open = false;
      closeBackupCard = null;
      backupOverlay.hidden = true;
      backupSaveBtn.onclick = null;
      if (made) made.done();
      ed.busyTasks--;
    };
    backupText.textContent = 'Putting it together';
    backupSaveBtn.hidden = true;
    backupOverlay.hidden = false;
    try {
      ed.saveState(); // what's on screen is what goes in
      const m = await D.zipBackup({
        app: 'the-eye',
        databases: BACKUP_DBS,
        local: [ed.STORAGE_KEY],
        filename: `the-eye-backup-${ed.todayStr()}.zip`,
        onProgress: (f) => { if (open) backupText.textContent = `Putting it together, ${Math.floor(f * 100)}%`; },
      });
      made = m;
      if (!open) { if (m) m.done(); return; }
      if (!m) { backupText.textContent = 'There is nothing to back up yet.'; return; }
      steps = D.backupSteps(m); // one file, or a few on a phone: a tap each
      backupText.textContent = steps.note;
      backupSaveBtn.textContent = steps.label;
      backupSaveBtn.hidden = false;
      ed.fitButtonPair(document.getElementById('backupActions'));
      backupSaveBtn.onclick = async () => {
        try {
          if (!(await steps.tap())) {
            backupSaveBtn.textContent = steps.label;
            ed.fitButtonPair(document.getElementById('backupActions'));
            return;
          }
          if (closeBackupCard) closeBackupCard();
          rememberBackup();
        } catch (err) {
          console.error('Backup failed', err);
          ed.showToast(err.message || "The backup wasn't saved.");
        }
      };
    } catch (err) {
      console.error('Backup failed', err);
      if (open) backupText.textContent = err.message || "The backup couldn't be made.";
    }
  }
  document.getElementById('backupCancelBtn').addEventListener('click', () => { if (closeBackupCard) closeBackupCard(); });

  document.getElementById('exportDataBtn').addEventListener('click', () => {
    ed.closeAppMenu();
    exportAllData();
  });

  // The Daily report's backup reminder — not part of the day's cached
  // content (see getTodaysDailyReportContent), so it's read fresh each time
  // and gone the moment a backup is made. Once the last one is over a
  // month old, or there's never been one and there's something to lose.
  const BACKUP_REMINDER_DAYS = 30;

  function backupReminderItem() {
    const days = daysSinceLastBackup();
    if (days === null) {
      if (!ed.state.shoots.length && !ed.state.journalEntries.length) return null;
      return { action: 'backup', text: 'No backup yet. Tap to back up your shoots, journal and photos.' };
    }
    if (days <= BACKUP_REMINDER_DAYS) return null;
    return { action: 'backup', text: `Your last backup was ${days} days ago. Tap to back up now.` };
  }

  function withBackupReminder(content) {
    const item = backupReminderItem();
    return item ? { ...content, items: content.items.concat(item) } : content;
  }

  // Asked once per launch, without a word either way: storage marked
  // persistent isn't cleared by the browser when the phone runs low on
  // space, the way an ordinary site's can be — photos and all.
  if (navigator.storage && navigator.storage.persist && navigator.storage.persisted) {
    navigator.storage.persisted()
      .then(already => (already ? null : navigator.storage.persist()))
      .catch(() => {});
  }
};
