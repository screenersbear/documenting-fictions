// Small helpers: ids, shuffling, sort keys, escaping, and what a shoot is called and still needs.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addHelpers = function addHelpers(ed) {
  Object.assign(ed, { uid, shuffleArray, dateSortKey, dateTimeSortKey, escapeHtml, hasText, isUpcoming, isToday, isUpcomingDeadline, moodboardPending, teamPending, shootPendingLabels, primaryTalentName, shootDisplayName });
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function dateSortKey(dateStr) {
    return dateStr || '9999-99-99';
  }

  function dateTimeSortKey(s) {
    return `${dateSortKey(s.date)}T${s.startTime || '00:00'}`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function hasText(v) {
    return !!(v && v.trim());
  }

  // Date-TBD shoots are deliberately left out of the Overview's Upcoming
  // list — with no date they can't be placed in this week/next week/later,
  // and they're still reachable from the Shoots tab regardless.
  function isUpcoming(s) {
    return !s.archived && !ed.POST_CAPTURE_STATUSES.includes(s.status) && s.status !== 'rescheduled' && s.status !== 'canceled' && !!s.date && s.date > ed.todayStr();
  }

  function isToday(s) {
    return !s.archived && !ed.POST_CAPTURE_STATUSES.includes(s.status) && s.status !== 'rescheduled' && s.status !== 'canceled' && s.date === ed.todayStr();
  }

  // A past-due deadline stays listed here (in red, via the .overdue class on
  // .shoot-row-due) rather than quietly disappearing — it's still owed, just
  // late. It only drops off once delivered or archived.
  function isUpcomingDeadline(s) {
    return !s.archived && !!s.deadline && s.status !== 'delivered';
  }

  // A mood board only realistically matters for a shoot that's actively
  // being planned — a prospect is still too early to know if there'll even
  // be one, and anything past "shoot ready" already happened, so there's
  // nothing left to prep. Scoped to exactly these two statuses rather than
  // "not yet post-capture", which used to let prospects slip through too.
  function moodboardPending(s) {
    return (s.status === 'planning' || s.status === 'waiting_to_shoot') && !s.moodboardComplete && !ed.refBoardShootIds.has(s.id);
  }

  // Same cut-off for an unfinalized team: once a shoot is past "shoot ready"
  // (captured onward, postponed or canceled) there's no team left to
  // assemble. Prospects keep it, as before — unlike a mood board, a team can
  // reasonably be lined up before the shoot is even confirmed.
  function teamPending(s) {
    const status = s.status || 'prospect';
    return (status === 'prospect' || status === 'planning' || status === 'waiting_to_shoot')
      && s.teamRequired === 'yes' && !s.teamFinalized;
  }

  function shootPendingLabels(s) {
    const labels = [];
    if (teamPending(s)) labels.push('Team');
    // The underlying value is left alone either way, so it's exactly right
    // again if the status ever moves back into range.
    if (moodboardPending(s)) labels.push(ed.isVideoShoot(s) ? 'Storyboard' : 'Moodboard');
    return labels;
  }

  // The first talent with a name, used wherever a shoot needs a single
  // "the talent" fallback (display name, PDF title/filename) despite
  // possibly having several talent cards.
  function primaryTalentName(s) {
    const t = (s.talents || []).find(t => hasText(t.name));
    return t ? t.name : '';
  }

  // Defaults to talent name first (falling back to the shoot title, then a
  // placeholder); the app-wide display setting (state.titleDisplayMode) flips
  // the priority for every shoot at once.
  function shootDisplayName(s) {
    const talentName = primaryTalentName(s);
    return ed.state.titleDisplayMode === 'title'
      ? (s.title || talentName || 'Untitled shoot')
      : (talentName || s.title || 'Untitled shoot');
  }
};
