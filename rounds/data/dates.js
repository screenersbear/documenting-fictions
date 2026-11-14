// Days, as plain 'YYYY-MM-DD' strings in the phone's own time: Rounds counts
// in days (a move is due on a day, never at an hour), and how they read.
const pad = (n) => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const dayOf = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// A day as a Date at noon, never near midnight, so a clock change can't move it a day.
export function dateOf(day) {
  const [y, m, d] = String(day).split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}
export const isDay = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && dayOf(dateOf(s)) === s;
export function addDays(day, n) {
  const d = dateOf(day);
  d.setDate(d.getDate() + n);
  return dayOf(d);
}
export const daysBetween = (a, b) => Math.round((dateOf(b) - dateOf(a)) / 86400000);
// The later of two days ('' for none).
export const later = (a, b) => (a > b ? a : b);
const short = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;

// A day gone by, in a sentence: today, yesterday, Tuesday (this past week), 3 Nov.
export function whenWords(day, today) {
  const n = daysBetween(day, today);
  if (n === 0) return 'today';
  if (n === 1) return 'yesterday';
  const d = dateOf(day);
  return n > 1 && n < 7 ? WEEKDAYS[d.getDay()] : short(d);
}

// When a move is due: Today, Tomorrow, Thursday (this coming week), 20 Nov.
export function dueWords(day, today) {
  const n = daysBetween(today, day);
  if (n <= 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  const d = dateOf(day);
  return n < 7 ? WEEKDAYS[d.getDay()] : short(d);
}

// How long ago: 3 weeks, 4 months ('' under two weeks, when it isn't worth saying).
export function sinceWords(day, today) {
  const n = daysBetween(day, today);
  if (n < 14) return '';
  return n < 60 ? `${Math.round(n / 7)} weeks` : `${Math.round(n / 30.44)} months`;
}
