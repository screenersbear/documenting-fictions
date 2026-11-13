// Options, the app menu (round 2, 08-options): opening and closing it, the
// notebook colour and start choices on it (look-choices.js), and how much
// room the app takes, under Storage usage.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addAppMenu = function addAppMenu(ed) {
  Object.assign(ed, { closeAppMenu });
  // ---------- App menu (hamburger) ----------
  // One sheet, laid out like ref's Options (user, 11-11): every setting is
  // on it at once, each choice marked where it stands, so nothing slides in.
  const appMenuOverlay = document.getElementById('appMenuOverlay');
  const colorChoices = document.getElementById('appColorChoices');
  const startChoices = document.getElementById('appStartChoices');

  function drawLookChoices() {
    colorChoices.innerHTML = ed.colorChoicesHtml();
    startChoices.innerHTML = ed.startChoicesHtml();
  }

  // The storage used, under its row; left empty where the browser can't say.
  function showStorageUsed() {
    const hint = document.getElementById('storageUsageHint');
    if (!(navigator.storage && navigator.storage.estimate)) return;
    navigator.storage.estimate().then((est) => {
      if (est && est.usage != null) hint.textContent = ed.formatStorageBytes(est.usage);
    }).catch(() => {});
  }

  function closeAppMenu() {
    appMenuOverlay.hidden = true;
  }

  document.getElementById('appMenuBtn').addEventListener('click', () => {
    ed.updateDisplayChoiceHighlight();
    ed.updateNewShootGuideChoice();
    ed.updateDailyReportChoice();
    ed.updateLookTagsChoice();
    drawLookChoices();
    showStorageUsed();
    appMenuOverlay.hidden = false;
    appMenuOverlay.querySelector('.opt-sheet-body').scrollTop = 0;
  });

  document.getElementById('notificationBellBtn').addEventListener('click', () => {
    ed.openNotificationsBell();
  });

  document.getElementById('appMenuCancelBtn').addEventListener('click', closeAppMenu);

  appMenuOverlay.addEventListener('click', (e) => {
    if (e.target === appMenuOverlay) { closeAppMenu(); return; }
    const choice = e.target.closest('#appColorChoices button, #appStartChoices button');
    if (choice) ed.pickLookChoice(choice, drawLookChoices);
  });
};
