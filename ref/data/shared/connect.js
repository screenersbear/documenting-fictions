// How the notebooks connect (round 2, connect/NOTES.md): each notebook hands
// one thing to the next and the work goes round: Ref to The Eye (a mood
// board), The Eye to Layouts (the finals) and to Rounds (the shoot's people),
// Layouts to Rounds (the people in a post), Rounds to Ref (a new client).
// Every hand-off is a link in df-links (links.js), so no notebook writes
// into another's database. One that arrives shows once, as a slip at the top
// of the receiving list, until it's opened or tucked away (NOT NOW); while
// it waits, the notebook has a slip on its cover on the shelf. Each hand-off
// has a switch (the shelf's Options, HOW THEY CONNECT), all on unless turned
// off; off, it simply doesn't happen. window.DFConnect.
(function () {
  'use strict';
  const parts = window.DFDataParts;
  const { linksWhere, saveLink, nowIso } = parts;

  // The hand-offs in the loop's order. type: the link's type in df-links;
  // waiting: what a slip on the shelf says is there.
  const HANDOFFS = [
    { key: 'moodboards', from: 'ref', to: 'the-eye', type: 'moodboard', name: 'Mood boards', line: "A board sent to a shoot stays live until it's shot." },
    { key: 'finals', from: 'the-eye', to: 'contact-sheet', type: 'finals', name: 'Final images', line: 'Delivered finals arrive, with two posts made.', waiting: 'finals from The Eye' },
    { key: 'people', from: 'the-eye', to: 'rounds', type: 'people', name: "The shoot's people", line: 'Talent and team come in with a thank-you ready.' },
    { key: 'posts', from: 'contact-sheet', to: 'rounds', type: 'post-people', name: 'New posts', line: 'When a post goes up, a nudge for the people in it.', waiting: 'a new post from Layouts' },
    { key: 'clients', from: 'rounds', to: 'ref', type: 'new-client', name: 'New clients', line: 'A yes, or someone asking to shoot, starts a board.', waiting: 'a new client from Rounds' },
  ];
  const handoff = (type) => HANDOFFS.find((h) => h.type === type) || null;

  // Each notebook's own pair of colours and its small mark (24 x 24), as the
  // slips and the HOW THEY CONNECT rows show them.
  const NOTEBOOKS = {
    ref: { name: 'Ref', bg: '#0A4FD6', fg: '#FFAFAB' },
    'the-eye': { name: 'The Eye', bg: '#FFD100', fg: '#313D45' },
    'contact-sheet': { name: 'Layouts', bg: '#CC2E8A', fg: '#E2E600' },
    rounds: { name: 'Rounds', bg: '#313D45', fg: '#FFD100' },
  };
  const MARKS = {
    ref: '<g transform="translate(12 12) rotate(45) translate(-6 -6)"><rect width="6" height="6" fill="#FFAFAB"/><rect x="6" width="6" height="6" fill="#FFFFFF"/><rect y="6" width="6" height="6" fill="#FFFFFF"/><rect x="6" y="6" width="6" height="6" fill="#FFAFAB"/></g>',
    'the-eye': '<circle cx="12" cy="12" r="6.5" fill="none" stroke="#313D45" stroke-width="3"/>',
    'contact-sheet': '<rect x="5" y="6" width="3.6" height="12" fill="#E2E600"/><rect x="10.2" y="8.4" width="3.6" height="9.6" fill="#FFFFFF"/><rect x="15.4" y="10.3" width="3.6" height="7.7" fill="#E2E600"/>',
    rounds: '<path d="M5 17 A7 7 0 0 1 19 17" fill="none" stroke="#FFD100" stroke-width="2.2"/><circle cx="6" cy="13.2" r="2" fill="#14BFA0"/><circle cx="12" cy="10" r="1.6" fill="#FFFFFF"/><circle cx="18" cy="13.2" r="1.3" fill="#14BFA0"/>',
  };
  const markSvg = (app, size = 20) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${MARKS[app] || ''}</svg>`;
  // A notebook's mark on its colour, 20 px square.
  const miniHtml = (app) => `<span class="df-mini" style="background:${(NOTEBOOKS[app] || {}).bg || '#E1E1DC'}" aria-hidden="true">${markSvg(app)}</span>`;
  // From one notebook to another: the two minis with an arrow between.
  const ARROW = '<svg class="df-arrow" viewBox="0 0 16 10" width="16" height="10" aria-hidden="true"><path d="M1 5h12M9 1.5 13 5 9 8.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const pairHtml = (from, to) => `<span class="df-pair">${miniHtml(from)}${ARROW}${miniHtml(to)}</span>`;

  // ---------- The switches ----------
  // Kept on this phone for every notebook in the suite (they share its storage).
  const SWITCHES = 'df-connect';
  function switches() {
    try {
      const v = JSON.parse(localStorage.getItem(SWITCHES));
      return v && typeof v === 'object' ? v : {};
    } catch (e) { return {}; }
  }
  const connectOn = (key) => switches()[key] !== false;
  function setConnect(key, on) {
    try { localStorage.setItem(SWITCHES, JSON.stringify({ ...switches(), [key]: !!on })); } catch (e) { /* storage blocked: stays as it was */ }
  }

  // ---------- Slips ----------
  const isWaiting = (l) => !!handoff(l.type) && !!handoff(l.type).waiting && !l.openedAt && !l.tuckedAt;
  // The hand-offs waiting in a notebook, newest first.
  const slipsFor = async (app) => (await linksWhere({ toApp: app })).filter(isWaiting).reverse();
  // Its main button pressed (openedAt) or NOT NOW (tuckedAt): it doesn't show again.
  const openSlip = (l) => saveLink({ ...l, openedAt: nowIso() });
  const tuckSlip = (l) => saveLink({ ...l, tuckedAt: nowIso() });
  // For the shelf: what's waiting in each notebook, { app: [what, ...] }.
  async function waitingByApp() {
    const out = {};
    for (const l of (await linksWhere()).filter(isWaiting)) (out[l.toApp] = out[l.toApp] || []).push(handoff(l.type).waiting);
    return out;
  }

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // TODAY, or the day it came ('14 Nov'), as the slip's corner says it.
  function whenWords(iso, now = new Date()) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const same = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    return same ? 'Today' : `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  }

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // A slip, the same in every notebook: FROM <NOTEBOOK> in the sender's
  // colours, the day, a title, one dim line, what it brought (body, markup),
  // then one main button in the receiving notebook's colour and NOT NOW.
  function slipHtml({ link, title, line, body = '', main, mainClass = '' }) {
    const from = NOTEBOOKS[link.fromApp] || { name: link.fromApp, bg: '#E1E1DC', fg: '#313D45' };
    return `<section class="df-slip" data-slip="${esc(link.id)}" aria-label="From ${esc(from.name)}">
      <div class="df-slip-head"><span class="df-slip-tag" style="background:${from.bg};color:${from.fg}">${markSvg(link.fromApp, 18)}From ${esc(from.name)}</span><span class="df-slip-when">${esc(whenWords(link.createdAt))}</span></div>
      <p class="df-slip-title">${esc(title)}</p>
      ${line ? `<p class="df-slip-line">${esc(line)}</p>` : ''}${body}
      <div class="df-slip-actions"><button type="button" class="df-slip-main ${mainClass}" data-slip-open>${esc(main)}</button><button type="button" class="df-slip-later" data-slip-later>Not now</button></div>
    </section>`;
  }

  window.DFConnect = {
    HANDOFFS, NOTEBOOKS, handoff, connectOn, setConnect, slipsFor, openSlip, tuckSlip, waitingByApp,
    whenWords, slipHtml, markSvg, miniHtml, pairHtml,
  };
})();
