// The Today card at the top of Overview: only what needs you now, in place of
// the pop-ups that used to open on launch (the list: components/today-items.js).
// The two most urgent, how many things there are in all, and under them
// "N MORE IN TODAY'S REPORT", which opens the daily report (round 5). Hidden
// when there's nothing.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addOverviewTodayCard = function addOverviewTodayCard(ed) {
  Object.assign(ed, { renderTodayCard });
  const SHOWN = 2;
  const card = document.getElementById('todayCard');
  const items = document.getElementById('todayCardItems');
  const count = document.getElementById('todayCount');
  const more = document.getElementById('todayMoreBtn');
  const moreWords = document.getElementById('todayMoreWords');
  const moreDots = document.getElementById('todayMoreDots');

  function renderTodayCard() {
    const list = ed.todayItems();
    const left = list.length - SHOWN;
    items.innerHTML = list.slice(0, SHOWN).map(ed.todayItemHtml).join('');
    count.textContent = ed.todayCountWords(list.length);
    more.hidden = left < 1;
    moreWords.textContent = ed.todayMoreWords(Math.max(left, 0));
    // A dot for each of them (up to eight).
    moreDots.innerHTML = '<i></i>'.repeat(Math.min(Math.max(left, 0), 8));
    card.hidden = !list.length;
  }

  items.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (el) ed.runTodayAct(el.dataset.act, el.dataset.id);
  });
  more.addEventListener('click', () => ed.openNotificationsBell());
};
