// The App menu.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addAppMenu = function addAppMenu(ed) {
  Object.assign(ed, { closeAppMenu });
  // ---------- App menu (hamburger) ----------
  // One sheet, laid out like ref's Options (user, 11-11): every setting is
  // on it at once, each choice marked where it stands, so nothing slides in.
  const appMenuOverlay = document.getElementById('appMenuOverlay');

  function closeAppMenu() {
    appMenuOverlay.hidden = true;
  }

  document.getElementById('appMenuBtn').addEventListener('click', () => {
    ed.updateDisplayChoiceHighlight();
    ed.updateNewShootGuideChoice();
    ed.updateDailyReportChoice();
    ed.updateLookTagsChoice();
    appMenuOverlay.hidden = false;
    appMenuOverlay.querySelector('.opt-sheet-body').scrollTop = 0;
  });

  document.getElementById('notificationBellBtn').addEventListener('click', () => {
    ed.openNotificationsBell();
  });

  document.getElementById('appMenuCancelBtn').addEventListener('click', closeAppMenu);

  appMenuOverlay.addEventListener('click', (e) => {
    if (e.target === appMenuOverlay) closeAppMenu();
  });
};
