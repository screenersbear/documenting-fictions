// The notebook in front up close, with its options under it: its colour,
// stickers for its cover, and Back up all four. (Loaded before app.js.)
window.ShelfParts = window.ShelfParts || {};
window.ShelfParts.addOptions = function addOptions(ed) {
  'use strict';
  Object.assign(ed, { paintStickers, paint });
  // The film roll (user, 11-12): the notebook in front comes up close, on its
  // own, the way each notebook floated when it was its own app, with its
  // options under it: its colour (the book changes as you pick) and stickers
  // for its cover. Back up all four is there too.
  ed.logoBtn.setAttribute('aria-label', 'Options for the notebook in front');
  const NEAR_MS = 560;
  const nearSlot = () => ed.slots[ed.near];
  // As big as fits above `bottom` (px down the screen), in the middle of the
  // room there, no wider than the notebooks were on their own.
  function nearFit(bottom) {
    const vw = window.innerWidth;
    const top = (parseFloat(getComputedStyle(ed.shelf).paddingTop) || 0) + 20;
    const H = ed.W * 1.36;
    const k = Math.max(0.6, Math.min(Math.min(vw * 0.62, 300) / ed.W, (bottom - top - 30) / (H * 1.12)));
    const y0 = parseFloat(ed.stage.style.getPropertyValue('--y')) || window.innerHeight * 0.6;
    ed.nearAt = { y: top + (bottom - top) / 2 - y0, k };
  }
  function nearMove() {
    const s = nearSlot();
    s.classList.add('nearing');
    ed.place(ed.near);
    clearTimeout(nearMove.t);
    nearMove.t = setTimeout(() => s.classList.remove('nearing'), NEAR_MS + 40);
  }
  function openNear() {
    if (ed.busy || ed.near !== null || document.querySelector('.sheet-dim')) return;
    cancelAnimationFrame(ed.anim);
    clearTimeout(ed.go.t);
    ed.pos = ed.mod(Math.round(ed.pos));
    ed.render();
    ed.busy = true;
    ed.near = ed.pos;
    nearSlot().classList.add('near');
    ed.stage.classList.add('near');
    ed.shelf.classList.add('away');
    showOptions();
  }
  function leaveNear() {
    const s = nearSlot();
    ed.near = null;
    s.classList.add('nearing');
    ed.stage.classList.add('unnear');
    ed.stage.classList.remove('near');
    ed.shelf.classList.remove('away');
    ed.render();
    setTimeout(() => { s.classList.remove('nearing', 'near', 'still'); ed.stage.classList.remove('unnear'); ed.busy = false; }, NEAR_MS + 40);
  }
  function paintStickers(i) {
    if (window.DFStickers) window.DFStickers.paint(ed.slots[i].querySelector('.front'), ed.slots[i].querySelector('.sticker-flap'), ed.BOOKS[i].id);
  }

  function showOptions(view) {
    const i = ed.near, b = ed.BOOKS[i];
    const St = window.DFStickers;
    const dim = document.createElement('div');
    dim.className = 'sheet-dim near';
    dim.innerHTML = `<div class="sheet opts" role="dialog" aria-modal="true" aria-label="${b.short} options"></div>`;
    const sheet = dim.firstElementChild;
    let shown = 'main';
    const drawMain = () => {
      shown = 'main';
      const now = ed.colorOf(b);
      const mine = St ? St.list(b.id) : [];
      sheet.innerHTML = `
        <span class="opt-label">App color</span>
        <div class="opt-colors" style="--n:${b.colors.length}">${b.colors.map(([k, name]) => `<button type="button" class="opt-color" data-color="${k}" aria-pressed="${k === now}"><span class="opt-book" style="background-image:url('${b.cover(k)}')"></span><span>${name}</span></button>`).join('')}</div>
        ${St ? `<span class="opt-label">Stickers</span>
        <div class="sticker-kinds">
          <button type="button" class="sticker-kind" data-shape="circle"><span class="shape circle"></span><span>Circle</span></button>
          <button type="button" class="sticker-kind" data-shape="square"><span class="shape square"></span><span>Square</span></button>
          <button type="button" class="sticker-kind" data-shape="rect"><span class="shape rect"></span><span>Rectangle</span></button>
        </div>
        ${mine.length ? '<button type="button" class="sheet-btn" data-remove>Remove a sticker</button>' : ''}` : ''}
        <div class="opt-foot"><button type="button" class="sheet-btn" data-backup>Back up all four</button><button type="button" class="sheet-btn primary" data-close>Done</button></div>`;
    };
    const drawRemove = () => {
      shown = 'remove';
      const mine = St.list(b.id);
      if (!mine.length) { drawMain(); return; }
      sheet.innerHTML = `
        <span class="opt-label opt-hint">Tap one to take it off</span>
        <div class="sticker-list">${[...mine].reverse().map((s) => `<button type="button" class="sticker-pick ${s.shape}" style="--r:${St.ratioOf(s)}" data-id="${s.id}" aria-label="Remove this sticker"><img src="${St.thumb(s)}" alt="" /></button>`).join('')}</div>
        <div class="opt-foot one"><button type="button" class="sheet-btn primary" data-back>Done</button></div>`;
    };
    (view === 'remove' ? drawRemove : drawMain)();
    document.body.appendChild(dim);
    // The book comes up into the room over the sheet.
    nearFit(sheet.offsetTop);
    nearMove();
    requestAnimationFrame(() => dim.classList.add('in'));
    const hide = () => new Promise((done) => { dim.classList.remove('in'); setTimeout(() => { dim.remove(); done(); }, 220); });
    const close = () => { hide(); leaveNear(); };
    dim.addEventListener('click', async (e) => {
      if (e.target === dim || e.target.closest('[data-close]')) { close(); return; }
      if (e.target.closest('[data-backup]')) {
        await hide();
        leaveNear();
        if (window.DFBackup) window.DFBackup.open();
        return;
      }
      const c = e.target.closest('[data-color]');
      if (c) {
        setColor(i, c.dataset.color);
        sheet.querySelectorAll('[data-color]').forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
        return;
      }
      if (e.target.closest('[data-remove]')) { drawRemove(); nearFit(sheet.offsetTop); nearMove(); return; }
      if (e.target.closest('[data-back]')) { drawMain(); nearFit(sheet.offsetTop); nearMove(); return; }
      const gone = e.target.closest('.sticker-pick');
      if (gone) {
        const s = St.list(b.id).find((x) => x.id === gone.dataset.id);
        if (!s) return;
        try { await St.remove(s); } catch (err) { console.error(err); return; }
        paintStickers(i);
        drawRemove();
        nearFit(sheet.offsetTop);
        nearMove();
        ed.toast('Sticker removed', 'Undo', async () => {
          await St.putBack(s);
          paintStickers(i);
          if (dim.isConnected) { (shown === 'remove' ? drawRemove : drawMain)(); nearFit(sheet.offsetTop); nearMove(); }
        });
        return;
      }
      const k = e.target.closest('[data-shape]');
      if (k && St) {
        const file = await St.pick(); // straight from the tap, or iOS won't open the picker
        if (!file) return;
        await hide();
        let bytes = null;
        try { bytes = await St.crop(file, k.dataset.shape); } catch (err) { console.error(err); ed.toast('Could not read that photo'); }
        if (bytes) {
          const s = nearSlot();
          s.classList.add('still');
          const saved = await St.place(b.id, k.dataset.shape, bytes, s.querySelector('.front'), s.querySelector('.sticker-flap'), (footTop) => { nearFit(footTop); nearMove(); });
          s.classList.remove('still');
          if (saved) paintStickers(i);
        }
        showOptions();
      }
    });
  }
  ed.logoBtn.addEventListener('click', openNear);

  // A notebook's colour, picked on the shelf: kept where that notebook reads
  // it, and its book here repainted. The Eye keeps its colour with the rest of
  // its things (df-app-color is only its copy for the first paint), so it's
  // changed there too; on its very first launch it takes df-app-color.
  function setColor(i, c) {
    const b = ed.BOOKS[i];
    ed.store.set(b.key, c);
    if (b.id === 'the-eye') {
      try {
        const raw = localStorage.getItem('dailies_state_v1');
        const st = raw && JSON.parse(raw);
        if (st && typeof st === 'object') {
          st.presentation = Object.assign({}, st.presentation, { color: c });
          localStorage.setItem('dailies_state_v1', JSON.stringify(st));
        }
      } catch (e) { /* it keeps its own colour */ }
    }
    paint(i);
  }
  function paint(i) {
    const b = ed.BOOKS[i], c = ed.colorOf(b);
    ed.slots[i].style.setProperty('--c', ed.COLORS[c]);
    ed.slots[i].style.setProperty('--cover', ed.artUrl(b.cover(c)));
    ed.slots[i].style.setProperty('--block', ed.artUrl(b.block(c)));
  }
};
