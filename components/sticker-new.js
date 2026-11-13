// A new sticker: a photo picked, cropped to its shape, and stuck on a cover;
// taking one off, and putting it back. (Loaded before components/stickers.js.)
window.StickerParts = window.StickerParts || {};
window.StickerParts.addNewSticker = function addNewSticker(ed) {
  'use strict';
  Object.assign(ed, { pick, crop, stick, remove, putBack });
  // ---------- A new one ----------
  // A photo from the library, straight from the tap (or iOS won't open it).
  function pick() {
    return new Promise((done) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      document.body.append(input);
      let settled = false;
      const end = (f) => { if (settled) return; settled = true; input.remove(); done(f || null); };
      input.addEventListener('change', () => end(input.files && input.files[0]));
      input.addEventListener('cancel', () => end(null));
      input.click();
    });
  }
  const twoFingers = (list) => (list.length > 1 ? Math.hypot(list[0][0] - list[1][0], list[0][1] - list[1][1]) : 0);
  const middle = (list) => [list.reduce((a, p) => a + p[0], 0) / list.length, list.reduce((a, p) => a + p[1], 0) / list.length];
  const foot = (no, yes) => `<div class="place-foot"><button type="button" class="sheet-btn" data-no>${no}</button><button type="button" class="sheet-btn primary" data-yes>${yes}</button></div>`;
  const loadImage = (url) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => no(new Error('Could not read that photo')); im.src = url; });
  const toBlob = (c, type, q) => new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error('Could not read that photo'))), type, q));

  // Fit the photo in the shape: drag and pinch it behind the window. Resolves
  // with the picture's bytes, or null if cancelled.
  async function crop(file, shape) {
    const ratio = ed.RATIO[shape], aspect = 1 / ratio;
    const url = URL.createObjectURL(file);
    let img;
    try { img = await loadImage(url); } finally { URL.revokeObjectURL(url); }
    const fit = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
    const pic = document.createElement('canvas');
    pic.width = Math.round(img.naturalWidth * fit);
    pic.height = Math.round(img.naturalHeight * fit);
    const pg = pic.getContext('2d');
    pg.imageSmoothingQuality = 'high';
    pg.drawImage(img, 0, 0, pic.width, pic.height);
    return new Promise((resolve) => {
      const layer = document.createElement('div');
      layer.className = 'crop-layer';
      layer.innerHTML = `<div class="crop-win ${shape}"></div>${foot('Cancel', 'Okay')}`;
      layer.prepend(pic);
      document.body.append(layer);
      const box = layer.getBoundingClientRect();
      const footTop = layer.querySelector('.place-foot').getBoundingClientRect().top - box.top;
      const ww = Math.min(box.width - 48, (footTop - 48) / aspect, 420), wh = ww * aspect;
      const wx = (box.width - ww) / 2, wy = (footTop - wh) / 2;
      Object.assign(layer.querySelector('.crop-win').style, { left: `${wx}px`, top: `${wy}px`, width: `${ww}px`, height: `${wh}px` });
      const least = Math.max(ww / pic.width, wh / pic.height);
      let k = least, tx = wx + (ww - pic.width * k) / 2, ty = wy + (wh - pic.height * k) / 2;
      const draw = () => {
        k = Math.min(least * 6, Math.max(least, k));
        tx = Math.min(wx, Math.max(wx + ww - pic.width * k, tx));
        ty = Math.min(wy, Math.max(wy + wh - pic.height * k, ty));
        pic.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;
      };
      draw();
      const pts = new Map();
      let grab = null;
      const start = () => {
        const list = [...pts.values()], [mx, my] = middle(list);
        grab = { k, px: (mx - tx) / k, py: (my - ty) / k, d: twoFingers(list) };
      };
      layer.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.place-foot')) return;
        try { layer.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
        pts.set(e.pointerId, [e.clientX, e.clientY]);
        start();
      });
      layer.addEventListener('pointermove', (e) => {
        if (!pts.has(e.pointerId)) return;
        pts.set(e.pointerId, [e.clientX, e.clientY]);
        const list = [...pts.values()], [mx, my] = middle(list);
        if (list.length > 1 && grab.d) k = grab.k * (twoFingers(list) / grab.d);
        tx = mx - grab.px * k; ty = my - grab.py * k;
        draw();
      });
      const up = (e) => { if (pts.delete(e.pointerId) && pts.size) start(); };
      layer.addEventListener('pointerup', up);
      layer.addEventListener('pointercancel', up);
      layer.addEventListener('wheel', (e) => { e.preventDefault(); k *= e.deltaY < 0 ? 1.05 : 0.95; draw(); }, { passive: false });
      const finish = (bytes) => { layer.remove(); pic.width = pic.height = 0; resolve(bytes); };
      layer.querySelector('[data-no]').addEventListener('click', () => finish(null));
      layer.querySelector('[data-yes]').addEventListener('click', async () => {
        const sw = ww / k, sh = wh / k, out = Math.min(1000, Math.round(sw));
        const c = document.createElement('canvas');
        c.width = out; c.height = Math.round(out * aspect);
        const g = c.getContext('2d');
        g.imageSmoothingQuality = 'high';
        g.drawImage(pic, (wx - tx) / k, (wy - ty) / k, sw, sh, 0, 0, c.width, c.height);
        try { finish(await (await toBlob(c, 'image/jpeg', 0.88)).arrayBuffer()); } catch (err) { finish(null); }
        c.width = c.height = 0;
      });
    });
  }

  // The new sticker on the cover, to drag and pinch until Okay or Cancel.
  // front/flap: that book's; laidOut(footTop): called once the buttons are
  // up, so the book can make room for them. Resolves true once it's saved.
  function stick(app, shape, bytes, front, flap, laidOut) {
    const draft = { id: ed.uid(), app, shape, ratio: ed.RATIO[shape], x: 0.5, y: 0.42, size: 0.44, seed: Math.floor(Math.random() * 2 ** 31), bytes, type: 'image/jpeg' };
    const url = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
    const layerOn = front.querySelector('.stickers');
    const el = ed.make(draft, url);
    const onFlap = ed.make(draft, url, true);
    layerOn.append(el);
    if (flap) flap.append(onFlap);
    const layer = document.createElement('div');
    layer.className = 'place-layer';
    layer.innerHTML = foot('Cancel', 'Okay');
    document.body.append(layer);
    if (laidOut) laidOut(layer.querySelector('.place-foot').getBoundingClientRect().top);
    const clampAll = () => {
      draft.size = Math.min(1.5, Math.max(0.12, draft.size));
      draft.x = Math.min(1.1, Math.max(-0.1, draft.x)); // past an edge it folds, but it's never lost
      draft.y = Math.min(1.1, Math.max(-0.1, draft.y));
      ed.seat(el, draft);
      ed.placeOnFlap(onFlap, draft);
    };
    const pts = new Map();
    let grab = null;
    const start = () => {
      const list = [...pts.values()], [mx, my] = middle(list), r = front.getBoundingClientRect();
      grab = { w: r.width, h: r.height, mx, my, x: draft.x, y: draft.y, size: draft.size, d: twoFingers(list) };
    };
    layer.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.place-foot')) return;
      try { layer.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      start();
    });
    layer.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      const list = [...pts.values()], [mx, my] = middle(list);
      draft.x = grab.x + (mx - grab.mx) / grab.w;
      draft.y = grab.y + (my - grab.my) / grab.h;
      if (list.length > 1 && grab.d) draft.size = grab.size * (twoFingers(list) / grab.d);
      clampAll();
    });
    const up = (e) => { if (pts.delete(e.pointerId) && pts.size) start(); };
    layer.addEventListener('pointerup', up);
    layer.addEventListener('pointercancel', up);
    layer.addEventListener('wheel', (e) => { e.preventDefault(); draft.size *= e.deltaY < 0 ? 1.05 : 0.95; clampAll(); }, { passive: false });
    return new Promise((resolve) => {
      const done = (saved) => { layer.remove(); el.remove(); onFlap.remove(); URL.revokeObjectURL(url); resolve(saved); };
      layer.querySelector('[data-no]').addEventListener('click', () => done(false));
      const yes = layer.querySelector('[data-yes]');
      yes.addEventListener('click', async () => {
        if (yes.disabled) return;
        yes.disabled = true;
        const s = Object.assign({}, draft, { createdAt: new Date().toISOString() });
        try {
          await ed.write((os) => os.put(s));
          ed.all.push(s);
          done(true);
        } catch (err) {
          console.error(err);
          yes.disabled = false;
          yes.textContent = 'Try again';
        }
      });
    });
  }

  async function remove(s) {
    await ed.write((os) => os.delete(s.id));
    ed.all = ed.all.filter((x) => x.id !== s.id);
  }
  async function putBack(s) {
    await ed.write((os) => os.put(s));
    if (!ed.all.some((x) => x.id === s.id)) ed.all.push(s);
  }
};
