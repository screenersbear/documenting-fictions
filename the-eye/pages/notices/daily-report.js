// The daily report: what's in it.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addNoticesDailyReport = function addNoticesDailyReport(ed) {
  Object.assign(ed, { dailyReportEverything, setDailyReportEverything, shootWithinAWeek, parseShootDate, sevenDayReminderText, computeDailyReportItems });
  // ---------- Daily report (in-app "notifications" shown once per day on open) ----------
  // No backend exists to fire real background push, so this checks on open
  // instead: once per day (the first time the app is opened that day), it
  // looks for what the next shoots need and shows it in one popup. Tapping an
  // item jumps straight to that shoot.
  // What it brings up is a choice in App options (11-12). "Before a shoot",
  // the default: a shoot in the next 7 days still missing its team or mood
  // board, a reflection asked for once (3 days after the shoot), and the
  // monthly backup reminder. "Everything" brings back the rest: the
  // reflection asked again every 3 days, the weekly "How's editing going?",
  // delivered shoots missing final images, team and mood board nudges for
  // every shoot, and the stat of the day.
  const DAILY_REPORT_ALL_KEY = 'dailies_daily_report_everything_v1';
  function dailyReportEverything() {
    try { return localStorage.getItem(DAILY_REPORT_ALL_KEY) === '1'; } catch (e) { return false; }
  }
  function setDailyReportEverything(on) {
    try {
      if (on) localStorage.setItem(DAILY_REPORT_ALL_KEY, '1');
      else localStorage.removeItem(DAILY_REPORT_ALL_KEY);
      localStorage.removeItem(ed.DAILY_REPORT_CONTENT_KEY); // today's report is put together again the new way
    } catch (e) { /* storage unavailable */ }
  }
  // Not yet shot, not postponed or canceled, and on the calendar within the
  // next seven days (today counts).
  function shootWithinAWeek(s, today) {
    if (s.archived || !s.date || ed.POST_CAPTURE_STATUSES.includes(s.status) || s.status === 'rescheduled' || s.status === 'canceled') return false;
    const daysUntil = Math.round((parseShootDate(s.date) - today) / 86400000);
    return daysUntil >= 0 && daysUntil <= 7;
  }

  function parseShootDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  // "X's shoot is in N days — pending: Team, Moodboard", or null when it
  // doesn't apply (out of the 7-day window, or nothing's pending any more).
  // Shared by the one-time build in computeDailyReportItems and the
  // same-day refresh of the cached report, so both agree on what's pending.
  function sevenDayReminderText(s, today) {
    if (!s.date) return null;
    const daysUntil = Math.round((parseShootDate(s.date) - today) / 86400000);
    const pending = ed.shootPendingLabels(s);
    if (daysUntil < 0 || daysUntil > 7 || !pending.length) return null;
    const when = daysUntil === 0 ? 'today' : `in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`;
    return `${ed.shootDisplayName(s)}'s shoot is ${when}. Still to do: ${pending.join(', ')}`;
  }

  function computeDailyReportItems() {
    const everything = dailyReportEverything();
    const items = [];
    // Collected across the loop and emitted as a single line at the end —
    // four shoots owing reflections used to mean four near-identical rows,
    // which reads as a wall rather than one thing to go do.
    const reflectionMissing = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    ed.state.shoots.forEach(s => {
      if (s.archived) return;

      // 7 days out and still missing team/moodboard — one-time per shoot.
      if (s.date && !ed.POST_CAPTURE_STATUSES.includes(s.status) && !s.sevenDayReminderShown) {
        const text = sevenDayReminderText(s, today);
        if (text) {
          items.push({ shootId: s.id, kind: 'sevenDay', text });
          s.sevenDayReminderShown = true;
        }
      }

      // Post-shoot reflection still blank, 3 days on: asked once ("Everything":
      // again every 3 days until it's filled in).
      // Only while the shoot is Captured or later: stepped back a status, its
      // Reflection is hidden (capturedAt stays), so there's nothing to ask for.
      if (s.capturedAt && ed.isPostCaptureStatus(s.status) && !ed.hasText(s.whatWentRight) && !ed.hasText(s.couldBeBetter) && !ed.hasText(s.lessonsLearned)) {
        const daysSinceCaptured = Math.floor((Date.now() - new Date(s.capturedAt).getTime()) / 86400000);
        const daysSinceLastReminder = s.lastReflectionReminderAt
          ? Math.floor((Date.now() - new Date(s.lastReflectionReminderAt).getTime()) / 86400000)
          : Infinity;
        if (daysSinceCaptured >= 3 && (everything ? daysSinceLastReminder >= 3 : !s.lastReflectionReminderAt)) {
          reflectionMissing.push(s);
          s.lastReflectionReminderAt = new Date().toISOString();
        }
      }

      // Editing check-in ("Everything" only): weekly for as long as the shoot
      // stays in the edit (Editing, or a video's Rough cut/Client review/Revisions).
      if (everything && ed.isInTheEditStatus(s.status) && s.editingAt) {
        const daysSinceEditing = Math.floor((Date.now() - new Date(s.editingAt).getTime()) / 86400000);
        const daysSinceLastReminder = s.lastEditingReminderAt
          ? Math.floor((Date.now() - new Date(s.lastEditingReminderAt).getTime()) / 86400000)
          : daysSinceEditing;
        if (daysSinceEditing >= 7 && daysSinceLastReminder >= 7) {
          items.push({ shootId: s.id, text: `How's editing going for ${ed.shootDisplayName(s)}'s shoot?` });
          s.lastEditingReminderAt = new Date().toISOString();
        }
      }
    });

    // Only carries a shootId when there's exactly one to open — with several
    // named in the line there's no single sensible destination, so that row is
    // informational and renderDailyReportOverlay leaves it unclickable.
    if (reflectionMissing.length) {
      items.push({
        shootId: reflectionMissing.length === 1 ? reflectionMissing[0].id : null,
        text: 'Post-shoot reflection still missing for:',
        list: reflectionMissing.map(ed.shootDisplayName),
      });
    }

    return items;
  }
};
