// The year (round 2, connect/15): how the circle went, from the shelf's
// Options, shown from December on (shared/data/year.js yearShown: this year
// in December, last year's after). The year's numbers, big, in the loop's
// order, each beside its notebook's mark (people pitched, said yes, boards
// made, shoots, posts), then WHAT LED TO WORK: the kinds of moves that turned
// into yeses and shoots booked again, from Rounds' history. Each notebook
// leaves its numbers as it opens and saves, so one not opened lately shows
// what it last left. SHARE saves the page as a picture
// (components/year-image.js). (Loaded before app.js.)
window.ShelfParts = window.ShelfParts || {};
window.ShelfParts.addYear = function addYear(ed) {
  'use strict';
  // The shared files load after the shelf's own (files.txt): looked up when used.
  const C = () => window.DFConnect;
  const Y = () => window.DFYear;
  const glyph = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const BACK = glyph('<path d="M15 5l-7 7 7 7"/>');
  const SHARE = glyph('<path d="M12 3v12"/><polyline points="7 8 12 3 17 8"/><path d="M5 13v7h14v-7"/>');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const INTRO = 'How the circle went, from the first pitch to the posts.';
  const NONE = 'Nothing yet. The moves that lead to a yes, or to a shoot booked again, show here.';

  // The year Options offers today (null before the first December).
  const yearShownNow = () => (Y() ? Y().yearShown(window.DFDataParts.todayStr()) : null);
  Object.assign(ed, { openYear, yearShownNow }); // after the const above

  const mark = (app) => `<span class="year-mark" style="background:${C().NOTEBOOKS[app].bg}" aria-hidden="true">${C().markSvg(app, 28)}</span>`;
  const rowHtml = (r) => `<div class="year-row">${mark(r.app)}<span class="year-n">${r.n}</span><span class="year-words">${r.words}</span></div>`;
  const ledHtml = (r) => `<div class="year-led"><span class="year-led-mark" style="background:${esc(r.bg)}" aria-hidden="true">${r.icon}</span>
    <span class="year-led-words"><span class="year-led-title">${esc(r.title)}</span>${r.line ? `<span class="year-led-line">${esc(r.line)}</span>` : ''}</span></div>`;

  function openYear(year = yearShownNow()) {
    const v = Y().yearView(year);
    const page = document.createElement('div');
    page.className = 'connect-page year-page';
    page.setAttribute('role', 'dialog');
    page.setAttribute('aria-modal', 'true');
    page.setAttribute('aria-label', `Your year, ${v.year}`);
    // SHARE hands the picture to the phone's share sheet (a download on a computer): the button clicker leaves it alone.
    page.innerHTML = `<div class="connect-head"><button type="button" class="ring-btn" data-back aria-label="Back"><span>${BACK}</span></button><h2>Your year</h2>
        <button type="button" class="ring-btn year-share" data-share data-test-skip aria-label="Share"><span>${SHARE}</span></button></div>
      <div class="connect-scroll">
        <h1 class="year-title">${esc(v.year)}</h1>
        <p class="year-intro">${INTRO}</p>
        <div class="year-rows">${v.rows.map(rowHtml).join('')}</div>
        <p class="year-label">What led to work</p>
        <div class="year-leds">${v.led.length ? v.led.map(ledHtml).join('') : `<p class="year-none">${NONE}</p>`}</div>
      </div>`;
    document.body.appendChild(page);
    requestAnimationFrame(() => page.classList.add('in'));
    page.addEventListener('click', async (e) => {
      if (e.target.closest('[data-back]')) {
        page.classList.remove('in');
        setTimeout(() => page.remove(), 220);
      } else if (e.target.closest('[data-share]')) {
        try {
          const file = await ed.yearImage(v, INTRO, NONE);
          if (await window.DFData.saveFile(file) === 'downloaded') ed.toast('Your year is in your downloads');
        } catch (err) {
          console.error(err);
          ed.toast("Your year couldn't be saved as a picture");
        }
      }
    });
    return page;
  }
};
