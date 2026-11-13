// The words on a shoot's row, the Next shoot card and the Today card: a date
// as "Sat 28 Nov", how far away a day is, a deadline gone by, and the line
// under a shoot's name. Plain words only (no page, no saved data), so they're
// unit tested (tests/unit/the-eye/row-words.test.mjs). The rows write them in
// capitals with CSS, so a screen reader still reads them as words.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addRowWords = function addRowWords(ed) {
  Object.assign(ed, { daysBetween, rowDate, rowDateRange, daysAwayTag, setForWords, dueWords, overdueWords, pastDeadlineWords, metaLine });
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // "2026-11-28" as a local midnight.
  function day(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  // Whole days from one date to another: 1 for tomorrow, -1 for yesterday.
  // Rounded, so a clock change in between doesn't make it 0.96 of a day.
  function daysBetween(from, to) {
    return Math.round((day(to) - day(from)) / 86400000);
  }

  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  // "Sat 28 Nov" with the weekday, "28 Nov" without; the year is added
  // ("14 Aug 2025") when it isn't today's year.
  function rowDate(dateStr, today, withWeekday) {
    const d = day(dateStr);
    const year = dateStr.slice(0, 4) === today.slice(0, 4) ? '' : ` ${d.getFullYear()}`;
    return `${withWeekday ? `${WEEKDAYS[d.getDay()]} ` : ''}${d.getDate()} ${MONTHS[d.getMonth()]}${year}`;
  }

  // The days a project spans: "9 to 11 Dec", "28 Nov to 2 Dec", and both
  // years spelled out when they differ. One day is just that day.
  function rowDateRange(start, end, today) {
    if (start === end) return rowDate(start, today, false);
    const a = day(start);
    // Each end against the other: the years differ, so each gets its own.
    if (start.slice(0, 4) !== end.slice(0, 4)) return `${rowDate(start, end, false)} to ${rowDate(end, start, false)}`;
    const startWords = start.slice(5, 7) === end.slice(5, 7) ? `${a.getDate()}` : rowDate(start, end, false);
    return `${startWords} to ${rowDate(end, today, false)}`;
  }

  // The tag on the Next shoot card: "Today", "Tomorrow", "In 8 days".
  // Nothing for a day already gone.
  function daysAwayTag(dateStr, today) {
    const n = daysBetween(today, dateStr);
    if (n < 0) return '';
    if (n === 0) return 'Today';
    if (n === 1) return 'Tomorrow';
    return `In ${n} days`;
  }

  // When a shoot was set for, from the Today card's "It was set for …":
  // "yesterday", a weekday within the last week, else its date.
  function setForWords(dateStr, today) {
    const n = daysBetween(dateStr, today);
    if (n === 1) return 'yesterday';
    if (n >= 2 && n <= 6) return WEEKDAY_NAMES[day(dateStr).getDay()];
    return rowDate(dateStr, today, false);
  }

  // A deadline still ahead: "Due today", "Due Fri 20 Nov" within the week,
  // "Due 4 Dec" further off.
  function dueWords(deadline, today) {
    const n = daysBetween(today, deadline);
    if (n === 0) return 'Due today';
    return `Due ${rowDate(deadline, today, n >= 1 && n <= 7)}`;
  }

  // A deadline gone by, on a row: "Overdue by 3 days".
  function overdueWords(deadline, today) {
    return `Overdue by ${plural(daysBetween(deadline, today), 'day')}`;
  }

  // The same on the Today card: "3 days past" (its deadline).
  function pastDeadlineWords(deadline, today) {
    return `${plural(daysBetween(deadline, today), 'day')} past`;
  }

  // The line under a name: its parts that have something, with commas.
  function metaLine(parts) {
    return parts.filter(Boolean).join(', ');
  }
};
