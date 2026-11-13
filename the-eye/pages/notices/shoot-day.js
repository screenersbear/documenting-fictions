// On the day: picking Shoot mode up again when the app opens mid-shoot.
// (Starting it, and asking about a shoot whose day has gone by, are on the
// Overview's Today card: pages/overview/today-card.js.)
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addNoticesShootDay = function addNoticesShootDay(ed) {
  Object.assign(ed, { resumeShootModeIfActive });
  function resumeShootModeIfActive() {
    const id = ed.getShootModeShootId();
    if (!id) return false;
    const shoot = ed.state.shoots.find(s => s.id === id);
    // Left on into a new day — closed the app mid-shoot and didn't come
    // back until later — shouldn't keep reopening yesterday's working view.
    // Once the shoot's own day has passed, close out of it automatically
    // so the app boots into the regular flow for today instead. Same 5am
    // day boundary as the rest of the once-a-day logic, so shooting late
    // into the night doesn't get kicked out mid-shoot at midnight.
    if (shoot && shoot.date && shoot.date < ed.effectiveReportDateStr()) {
      ed.setShootModeShootId(null);
      return false;
    }
    return ed.openShootMode(id);
  }
};
