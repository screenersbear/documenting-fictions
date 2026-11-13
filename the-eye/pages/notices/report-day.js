// When the app's day starts (5am, not midnight), and "a, b and c" from a list
// of names: for the Today card, the daily report and the Monday brief.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addNoticesReportDay = function addNoticesReportDay(ed) {
  Object.assign(ed, { effectiveReportDateStr, joinWithAnd });
  // The app's day (the Today card, the daily report, Shoot mode left on)
  // doesn't roll over until 5am, not midnight — a user still awake
  // at 1am is still mentally in the previous day, and shouldn't be asked
  // about a new day's shoots (or have last night's shoot already counted as
  // "yesterday") just because the clock ticked past 12.
  function effectiveReportDateStr() {
    const d = new Date();
    if (d.getHours() < 5) d.setDate(d.getDate() - 1);
    return ed.formatDate(d);
  }

  function joinWithAnd(names) {
    if (names.length === 1) return names[0];
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  }
};
