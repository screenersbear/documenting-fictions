// Dates and times: today, the week buckets, month names, dates and times written out.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addDates = function addDates(ed) {
  Object.assign(ed, { todayStr, isOffScheduleShoot, isOriginalPlanDate, scheduledShootDate, shootDateLabel, formatDate, daysIntoWeek, weekBucket, monthLabel, formatDateDots, renderBucketedShoots, prettyDate, prettyDateShort, prettyTime });
  // ---------- helpers ----------
  function todayStr() {
    return formatDate(new Date());
  }

  // Postponed (key: rescheduled) and Canceled shoots keep the date they were
  // planned for (and its times) instead of having it wiped, so nothing's lost
  // if the shoot goes ahead after all — but it's no longer a day anything is
  // happening. Lists show it as "Originally: …", and whatever schedules,
  // counts or groups shoots by their day reads it through scheduledShootDate,
  // which leaves it out, the same as when these shoots had no date at all.
  // The status alone says the shoot's off the schedule (Upcoming, today,
  // a project's live days); isOriginalPlanDate says whether its date is
  // that original plan.
  function isOffScheduleShoot(s) {
    return s.status === 'rescheduled' || s.status === 'canceled';
  }

  // Going Postponed/Canceled notes the date the shoot had right then as
  // offScheduleDate (applyStatusChange, and the page's status button), and
  // any other status drops it. Only that exact date is the original plan: a
  // new date given since — with the status left on Postponed, say — is the
  // new plan, and reads, sorts, counts and gets its check-in like any other.
  // A shoot saved before the note existed has none, so its date is taken
  // as the plan, the way it showed back then.
  function isOriginalPlanDate(s) {
    return isOffScheduleShoot(s) && !!s.date && s.offScheduleDate === s.date;
  }

  function scheduledShootDate(s) {
    return isOriginalPlanDate(s) ? '' : (s.date || '');
  }

  // Mirrors the "Due:" label on the deadline — "Shoots:" while the date is
  // still ahead (or today), "Shot:" once it's in the past, so a glance at
  // either label tells you whether that half of the bubble is done or not.
  // A postponed or canceled shoot's kept date reads as the original plan.
  function shootDateLabel(s, formatter) {
    if (!s.date) return 'Date TBD';
    if (isOriginalPlanDate(s)) return `Originally: ${formatter(s.date)}`;
    const prefix = s.date >= todayStr() ? 'Shoots' : 'Shot';
    return `${prefix}: ${formatter(s.date)}`;
  }

  function formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // Weeks run Monday to Sunday everywhere in the app (Upcoming's This week /
  // Next week, the shoot-date sort, the Journal's weekly log, the Monday
  // brief): how many days `date` is past its week's Monday, 0-6.
  function daysIntoWeek(date) {
    return (date.getDay() + 6) % 7;
  }

  // Buckets a future date string into this week / next week / later, for
  // the Overview's Upcoming subheadings.
  function weekBucket(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfThisWeek = new Date(today);
    endOfThisWeek.setDate(today.getDate() + (6 - daysIntoWeek(today)));
    const endOfNextWeek = new Date(endOfThisWeek);
    endOfNextWeek.setDate(endOfThisWeek.getDate() + 7);
    if (date <= endOfThisWeek) return 'this_week';
    if (date <= endOfNextWeek) return 'next_week';
    return 'later';
  }

  const WEEK_BUCKET_LABELS = { this_week: 'This week', next_week: 'Next week', later: 'Later' };

  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']; ed.MONTH_NAMES = MONTH_NAMES;

  function monthLabel(monthNum) {
    return monthNum === '00' ? 'Undated' : (MONTH_NAMES[Number(monthNum) - 1] || monthNum);
  }

  // 'YYYY-MM-DD' -> 'MM.DD.YY', for the call sheet / archive PDF naming
  // format — distinct from prettyDate's "Jan 5, 2026" used on-page.
  function formatDateDots(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${m}.${d}.${y.slice(2)}`;
  }

  // Each week's subheading (This week / Next week / Later) over its rows.
  // Takes collapseProjects() items rather than bare shoots, so a project's
  // box is drawn once and lands in the bucket of its own date for this list
  // (see listItemDate).
  function renderBucketedShoots(container, items, buckets, dateField, rowOpts) {
    buckets.forEach(bucketKey => {
      const bucketItems = items.filter(item => weekBucket(ed.listItemDate(item, dateField)) === bucketKey);
      if (!bucketItems.length) return;

      const heading = document.createElement('p');
      heading.className = 'upcoming-subheading';
      heading.textContent = WEEK_BUCKET_LABELS[bucketKey];
      container.appendChild(heading);

      const rowsWrap = document.createElement('div');
      rowsWrap.className = 'upcoming-subheading-rows';
      bucketItems.forEach(item => ed.renderListItem(rowsWrap, item, rowOpts));
      container.appendChild(rowsWrap);
    });
  }

  function prettyDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Numeral date with dot separators, e.g. "7.10.26" — field order follows
  // the device's locale (M/D/Y, D/M/Y, Y/M/D, ...) via Intl.
  function prettyDateShort(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const parts = new Intl.DateTimeFormat(undefined, { year: '2-digit', month: 'numeric', day: 'numeric' }).formatToParts(dt);
    return parts.filter(p => p.type !== 'literal').map(p => p.value).join('.');
  }

  function prettyTime(timeStr) {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    let h = Number(hStr);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${mStr} ${ampm}`;
  }
};
