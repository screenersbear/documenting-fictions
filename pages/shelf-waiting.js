// The floating ! on the shelf (round 2, connect/16 and 17). A notebook with
// something waiting (a hand-off from another notebook, or its own items for
// today) has a ! just above its top edge, built from the kit: an ink bar, a
// gap, a mango dot, a soft floor shadow under it, bobbing slowly like the
// books (still with Reduce Motion). The same size over every book, so it's
// drawn flat over the turning books, not in them. Tapping it opens a preview
// of what's waiting, each row opening it there, then OPEN <NOTEBOOK>. It goes
// once everything in it is opened or tucked away. What's waiting:
// shared/data/waiting.js. (Loaded before app.js.)
window.ShelfParts = window.ShelfParts || {};
window.ShelfParts.addWaiting = function addWaiting(ed) {
  'use strict';
  Object.assign(ed, { paintWaiting, placeWaiting, openWaiting });
  // The shared files load after the shelf's own (files.txt), so they're looked up when used.
  const W = () => window.DFWaiting;
  const C = () => window.DFConnect;
  const CLOSE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>';
  const CHEV = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg>';
  // The !: a bar 12 x 34 units, a gap, a dot 16 across, on the 24-unit grid.
  const BANG = '<svg class="bang" viewBox="0 0 24 56" aria-hidden="true"><rect x="6" y="0" width="12" height="34" fill="#313D45"/><circle cx="12" cy="47" r="8" fill="#FFD100"/></svg><span class="bang-floor" aria-hidden="true"></span>';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const layer = document.createElement('div');
  layer.className = 'waiting-marks';
  ed.shelf.append(layer);
  const marks = ed.BOOKS.map((b, i) => {
    const m = document.createElement('button');
    m.type = 'button';
    m.className = 'waiting-mark';
    m.hidden = true;
    m.dataset.i = i;
    m.style.setProperty('--d', `${-0.8 * i}s`);
    m.innerHTML = BANG;
    layer.append(m);
    return m;
  });
  let waiting = {};

  // What's waiting in each notebook, read again whenever the shelf shows.
  async function paintWaiting() {
    try { waiting = await W().waitingAll(ed.BOOKS.map((b) => b.id)); } catch (e) { return; }
    ed.BOOKS.forEach((b, i) => {
      const n = (waiting[b.id] || []).length;
      marks[i].hidden = !n;
      if (n) marks[i].setAttribute('aria-label', W().waitingLabel(b.short, n));
    });
    placeWaiting();
  }

  // Each ! just above its book's top edge, wherever the turning has put it
  // (pages/shelf-turntable.js calls this after every move). None while a
  // book is opening or up close for its options, or while the books glide
  // to a new arrangement (each comes back where its book lands).
  const gliding = () => ed.slots.some((s) => s.classList.contains('reshaping') || s.classList.contains('turning'));
  function placeWaiting() {
    const away = ed.facing !== null || ed.near !== null || ed.closeT > 0 || ed.shelf.classList.contains('away') || gliding();
    layer.classList.toggle('off', away);
    if (away) return;
    marks.forEach((m, i) => {
      if (m.hidden) return;
      const r = ed.slots[i].querySelector('.front').getBoundingClientRect();
      m.style.transform = `translate(${((r.left + r.right) / 2 - 22).toFixed(1)}px, ${(r.top - 70).toFixed(1)}px)`;
    });
  }

  // ---------- The preview ----------
  // One row per waiting thing: a hand-off shows the two minis with an
  // arrow, the notebook's own items its mini. OPEN <NOTEBOOK> at the foot.
  function rowHtml(r, k) {
    const icon = r.kind === 'handoff' ? C().pairHtml(r.from, r.to) : C().miniHtml(r.from);
    return `<button type="button" class="waiting-row" data-row="${k}">${icon}<span class="waiting-words"><span class="waiting-title">${esc(r.title)}</span>${r.line ? `<span class="waiting-line">${esc(r.line)}</span>` : ''}</span><span class="waiting-chev">${CHEV}</span></button>`;
  }
  function openWaiting(i) {
    const b = ed.BOOKS[i];
    const rows = waiting[b.id] || [];
    const nb = C().NOTEBOOKS[b.id];
    const dim = document.createElement('div');
    dim.className = 'sheet-dim';
    dim.innerHTML = `<div class="sheet waiting-sheet" role="dialog" aria-modal="true" aria-label="Waiting in ${esc(b.short)}">
      <div class="sheet-head"><span class="waiting-mini">${C().markSvg(b.id, 24)}</span><h2>Waiting in ${esc(b.short)}</h2><button type="button" class="ring-btn" data-close aria-label="Close"><span>${CLOSE}</span></button></div>
      <div class="waiting-rows">${rows.map(rowHtml).join('')}</div>
      <button type="button" class="sheet-btn primary waiting-open" data-open>Open ${esc(b.short)}</button>
    </div>`;
    const sheet = dim.firstElementChild;
    sheet.querySelector('.waiting-mini').style.background = nb.bg;
    sheet.querySelector('.waiting-open').style.background = nb.bg;
    sheet.querySelector('.waiting-open').style.setProperty('--on', nb.bg === '#FFD100' ? '#313D45' : '#FFFFFF'); // ink on mango
    document.body.appendChild(dim);
    requestAnimationFrame(() => dim.classList.add('in'));
    const close = () => { dim.classList.remove('in'); setTimeout(() => dim.remove(), 220); };
    const go = (params) => { dim.remove(); ed.openBook(i, params); };
    dim.addEventListener('click', (e) => {
      const row = e.target.closest('[data-row]');
      if (row) go(rows[Number(row.dataset.row)].params);
      else if (e.target.closest('[data-open]')) go(null);
      else if (e.target === dim || e.target.closest('[data-close]')) close();
    });
    return dim;
  }
  layer.addEventListener('click', (e) => {
    const m = e.target.closest('.waiting-mark');
    if (m && !ed.busy) openWaiting(Number(m.dataset.i));
  });

  window.addEventListener('load', paintWaiting);
  window.addEventListener('resize', placeWaiting);
  window.addEventListener('pageshow', (e) => { if (e.persisted) paintWaiting(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) paintWaiting(); });
};
