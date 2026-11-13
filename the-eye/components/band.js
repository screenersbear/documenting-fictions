// The band on top of every section (pages/tabs.html .band): today's date in
// its label line, and the buttons every section's band repeats, which do
// what Overview's do: the notebooks button (#shutBookBtn) and Options
// (#appMenuBtn). (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addBand = function addBand(ed) {
  const dates = [...document.querySelectorAll('.band-date')];
  // FRI 13 NOV (the capitals are the band's): written again when the day changes.
  let shown = '';
  function writeDate() {
    const text = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');
    if (text === shown) return;
    shown = text;
    dates.forEach((d) => { d.textContent = text; });
  }
  writeDate();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) writeDate(); });
  setInterval(writeDate, 60 * 1000);
  const books = document.getElementById('shutBookBtn');
  const options = document.getElementById('appMenuBtn');
  document.querySelectorAll('.band-books:not(#shutBookBtn)').forEach((b) => b.addEventListener('click', () => books.click()));
  document.querySelectorAll('.band-options').forEach((b) => b.addEventListener('click', () => options.click()));
};
