// What The Eye tells the shelf is waiting in it (round 2, connect/16 and 17),
// so the shelf's floating ! shows over The Eye before it's opened: the Today
// card's items (components/today-items.js), then each ready-to-shoot shoot of
// the next two weeks, on its day. A shoot day and Monday's look back are for
// their day; the rest stay until they're dealt with (The Eye tells the shelf
// again on every save, and whenever the Today card is drawn). Each opens The
// Eye, which starts on Overview. Written with shared/data/waiting.js, only on
// this phone.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShelfItems = function addShelfItems(ed) {
  Object.assign(ed, { shelfItems, tellShelf });
  const byDate = (a, b) => ed.dateTimeSortKey(a).localeCompare(ed.dateTimeSortKey(b));
  const LINES = { 'shoot-day': 'Shooting today', happened: 'Did it happen?', late: 'Past its deadline' };
  const pad = n => String(n).padStart(2, '0');
  function plusDays(day, n) {
    const [y, m, d] = day.split('-').map(Number);
    const t = new Date(y, m - 1, d + n, 12);
    return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
  }
  // The Eye's day starts at 5am (effectiveReportDateStr), the shelf's at
  // midnight: an item for The Eye's day lasts on the shelf until that day is
  // over for both, so a late shoot still shows at 1am.
  function shelfItems(list = ed.todayItems()) {
    const day = ed.effectiveReportDateStr();
    const until = [day, ed.todayStr()].sort()[1];
    const items = list.map(x => (x.kind === 'brief'
      ? { title: 'Last week', line: 'Your shoots and what you took from them', from: day, until }
      : { title: x.name, line: LINES[x.kind], from: day, ...(x.kind === 'shoot-day' ? { until } : {}) }));
    const last = plusDays(day, 14);
    ed.state.shoots.filter(s => !s.archived && s.status === 'waiting_to_shoot' && s.date > day && s.date <= last).sort(byDate)
      .forEach(s => items.push({ title: ed.shootDisplayName(s), line: LINES['shoot-day'], from: s.date, until: s.date }));
    return items;
  }
  // The suite's shared files give DFWaiting; a copy of The Eye on its own has a shelf only if they're there.
  function tellShelf(list) {
    if (window.DFWaiting) window.DFWaiting.publishWaiting('the-eye', shelfItems(list));
  }
};
