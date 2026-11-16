// The selects reminder, from Options (round 2, selects/NOTES.md, 16 Nov):
// the message Remind <name> offers when you're waiting on selects, kept with
// The Eye's own data (state.selectsReminder; '' is the starter,
// components/selects-wait.js). [name] and [shoot] are filled in when it's
// offered. Save keeps it and comes back to Options; the ring comes back
// without saving.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addAppMenuSelectsReminder = function addAppMenuSelectsReminder(ed) {
  const overlay = document.getElementById('selectsReminderOverlay');
  const box = document.getElementById('selectsReminderText');
  const options = document.getElementById('appMenuOverlay');

  function back() {
    overlay.hidden = true;
    options.hidden = false;
  }

  document.getElementById('selectsReminderBtn').addEventListener('click', () => {
    box.value = ed.state.selectsReminder || ed.SELECTS_STARTER;
    options.hidden = true;
    overlay.hidden = false;
  });
  document.getElementById('selectsReminderSaveBtn').addEventListener('click', () => {
    const words = box.value.trim();
    ed.state.selectsReminder = words === ed.SELECTS_STARTER ? '' : words;
    ed.saveState();
    back();
  });
  document.getElementById('selectsReminderCloseBtn').addEventListener('click', back);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) back(); });
};
