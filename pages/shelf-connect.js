// How the notebooks connect, on the shelf (round 2, connect/01): HOW THEY
// CONNECT, from Options (the loop, then a switch per hand-off). The slips
// once tucked into the covers gave way to the floating ! (15 Nov,
// pages/shelf-waiting.js). The hand-offs themselves: shared/data/connect.js.
// (Loaded before app.js.)
window.ShelfParts = window.ShelfParts || {};
window.ShelfParts.addConnect = function addConnect(ed) {
  'use strict';
  Object.assign(ed, { openConnect });
  // The shared files load after the shelf's own (files.txt), so window.DFConnect is looked up when used.
  const C = () => window.DFConnect;
  const BACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';

  // ---------- The loop ----------
  // The four notebooks round one circle, clockwise from Ref at the top, what
  // passes written by each arc, and the dashed line from The Eye to Rounds.
  const label = (x, y, words, anchor = 'middle', halo = false) => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="10" font-weight="700" letter-spacing="1.3" fill="#313D45"${halo ? ' stroke="#FAFAF7" stroke-width="5" paint-order="stroke"' : ''}>${words}</text>`;
  const tick = (x, y, turn) => `<path d="M-6 -6 L0 0 L-6 6" transform="translate(${x} ${y}) rotate(${turn})" fill="none" stroke="#313D45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  const book = (app, x, y, name, below) => `<rect x="${x}" y="${y}" width="56" height="56" rx="6" fill="${C().NOTEBOOKS[app].bg}"/>${C().markSvg(app, 44).replace('<svg ', `<svg x="${x + 6}" y="${y + 6}" `)}${label(x + 28, below ? y + 72 : y - 8, name, 'middle', true)}`;
  function loopSvg() {
    return `<svg class="connect-loop" role="img" aria-label="Ref sends mood boards to The Eye, The Eye sends final images to Layouts and the shoot's people to Rounds, Layouts nudges the people in a new post through Rounds, Rounds sends new clients to Ref." viewBox="0 0 358 330">
      <circle cx="179" cy="160" r="100" fill="none" stroke="#313D45" stroke-width="1.5"/>
      ${tick(249.7, 89.3, 45)}${label(259.6, 81.4, 'MOOD BOARD', 'start')}
      ${tick(249.7, 230.7, 135)}${label(259.6, 250.6, 'FINAL IMAGES', 'start')}
      ${tick(108.3, 230.7, 225)}${label(98.4, 250.6, 'NEW POSTS', 'end')}
      ${tick(108.3, 89.3, 315)}${label(98.4, 81.4, 'NEW CLIENTS', 'end')}
      <line x1="245" y1="160" x2="117" y2="160" stroke="#313D45" stroke-width="1.5" stroke-dasharray="4 4"/>
      <path d="M6 -6 L0 0 L6 6" transform="translate(115 160)" fill="none" stroke="#313D45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      ${label(179, 151, 'THE SHOOT&#39;S PEOPLE')}
      ${book('ref', 151, 32, 'REF', false)}${book('the-eye', 251, 132, 'THE EYE', true)}${book('contact-sheet', 151, 232, 'LAYOUTS', true)}${book('rounds', 51, 132, 'ROUNDS', true)}
    </svg>`;
  }

  // ---------- HOW THEY CONNECT ----------
  function rowHtml(h) {
    const on = C().connectOn(h.key);
    return `<div class="connect-row">${C().pairHtml(h.from, h.to)}<span class="connect-words"><span class="connect-name">${h.name}</span><span class="connect-line">${h.line}</span></span>
      <button type="button" class="df-switch" role="switch" aria-checked="${on}" aria-label="${h.name}" data-switch="${h.key}"><span></span></button></div>`;
  }
  function openConnect() {
    const page = document.createElement('div');
    page.className = 'connect-page';
    page.setAttribute('role', 'dialog');
    page.setAttribute('aria-modal', 'true');
    page.setAttribute('aria-label', 'How they connect');
    page.innerHTML = `<div class="connect-head"><button type="button" class="ring-btn" data-back aria-label="Back"><span>${BACK}</span></button><h2>How they connect</h2></div>
      <div class="connect-scroll">${loopSvg()}
        <p class="connect-intro">Each notebook hands one thing to the next. It arrives once, at the top of the list, marked with where it came from.</p>
        <div class="connect-rows">${C().HANDOFFS.map(rowHtml).join('')}</div>
      </div>`;
    document.body.appendChild(page);
    requestAnimationFrame(() => page.classList.add('in'));
    page.addEventListener('click', (e) => {
      const sw = e.target.closest('[data-switch]');
      if (sw) {
        const on = sw.getAttribute('aria-checked') !== 'true';
        C().setConnect(sw.dataset.switch, on);
        sw.setAttribute('aria-checked', String(on));
      } else if (e.target.closest('[data-back]')) {
        page.classList.remove('in');
        setTimeout(() => page.remove(), 220);
      }
    });
    return page;
  }
};
