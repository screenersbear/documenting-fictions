// The check-in the day after a shoot.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addNoticesDayAfter = function addNoticesDayAfter(ed) {
  Object.assign(ed, { effectiveReportDateStr, joinWithAnd });
  // ---------- Day-after shoot check-in ----------
  const DAY_AFTER_PROMPT_KEY = 'dailies_day_after_prompt_shown_v1'; ed.DAY_AFTER_PROMPT_KEY = DAY_AFTER_PROMPT_KEY;

  // The once-per-day popups (day-after check-in, daily report) treat the
  // "day" as not rolling over until 5am, not midnight — a user still awake
  // at 1am is still mentally in the previous day, and shouldn't get a new
  // day's check-in (or have last night's shoot already counted as
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
