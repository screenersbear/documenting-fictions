// Cropping a person's photo before it's kept (20 Nov), as The Eye crops a
// talent photo: a 4:5 box, drag to move, two fingers or the slider to zoom.
// USE THIS PHOTO keeps that part (data/crop.js does the sums). Resolves
// with the cropped photo as a JPEG Blob, null if the sheet was closed, or
// false if the photo couldn't be opened.
import { openSheet } from './sheet.js';
import { canvasToBlob, loadImage } from './util.js';
import { coverScale, centred, moveBy, zoomAt, sourceRect, outSize, MOST_ZOOM } from '../data/crop.js';

export function openCrop(file) {
  return new Promise((done) => {
    const url = URL.createObjectURL(file);
    let result = null;
    const s = openSheet({
      title: 'Crop the photo',
      className: 'sheet-small crop-sheet',
      body: `<div class="crop-box" data-crop-box><img alt="" draggable="false" data-crop-img /></div>
        <p class="crop-hint">Drag to move it, pinch or slide to zoom.</p>
        <label class="crop-zoom"><span aria-hidden="true">&minus;</span><input type="range" min="1" max="${MOST_ZOOM}" step="0.01" value="1" aria-label="Zoom" data-crop-zoom /><span aria-hidden="true">+</span></label>
        <button type="button" class="btn primary crop-use" data-crop-use disabled>Use this photo</button>`,
      onClose: () => { URL.revokeObjectURL(url); done(result); },
    });
    const box = s.body.querySelector('[data-crop-box]');
    const imgEl = s.body.querySelector('[data-crop-img]');
    const slider = s.body.querySelector('[data-crop-zoom]');
    const use = s.body.querySelector('[data-crop-use]');
    let img = { w: 0, h: 0 };
    let size = { w: 0, h: 0 };
    let view = { zoom: 1, x: 0, y: 0 };
    let photo = null;
    const draw = () => {
      const k = coverScale(img, size) * view.zoom;
      imgEl.style.width = `${img.w * k}px`;
      imgEl.style.height = `${img.h * k}px`;
      imgEl.style.transform = `translate(${view.x}px, ${view.y}px)`;
      slider.value = String(view.zoom);
    };
    loadImage(url).then((el) => {
      if (!s.overlay.isConnected) return;
      photo = el;
      img = { w: el.naturalWidth, h: el.naturalHeight };
      const r = box.getBoundingClientRect();
      size = { w: r.width, h: r.height };
      view = centred(img, size);
      imgEl.src = url;
      draw();
      use.disabled = false;
    }).catch(() => { result = false; s.close(); });

    slider.addEventListener('input', () => {
      view = zoomAt(view, Number(slider.value), size.w / 2, size.h / 2, img, size);
      draw();
    });
    // One finger moves it; a second pinches, about the point between them.
    const fingers = new Map();
    let last = null;
    let apart = 0;
    const spread = () => { const [a, b] = [...fingers.values()]; return Math.hypot(b.x - a.x, b.y - a.y); };
    box.addEventListener('pointerdown', (e) => {
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { box.setPointerCapture(e.pointerId); } catch { /* not everywhere */ }
      last = { x: e.clientX, y: e.clientY };
      apart = fingers.size === 2 ? spread() : 0;
    });
    box.addEventListener('pointermove', (e) => {
      if (!fingers.has(e.pointerId) || !photo) return;
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (fingers.size >= 2) {
        const now = spread();
        const [a, b] = [...fingers.values()];
        const r = box.getBoundingClientRect();
        if (apart > 0) view = zoomAt(view, view.zoom * (now / apart), (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, img, size);
        apart = now;
      } else if (last) {
        view = moveBy(view, e.clientX - last.x, e.clientY - last.y, img, size);
        last = { x: e.clientX, y: e.clientY };
      }
      draw();
    });
    const up = (e) => {
      fingers.delete(e.pointerId);
      const [left] = [...fingers.values()];
      last = left || null;
      apart = 0;
    };
    box.addEventListener('pointerup', up);
    box.addEventListener('pointercancel', up);
    use.addEventListener('click', async () => {
      if (!photo) return;
      const r = sourceRect(view, img, size);
      const out = outSize(r);
      const c = document.createElement('canvas');
      c.width = out.w;
      c.height = out.h;
      c.getContext('2d').drawImage(photo, r.sx, r.sy, r.sw, r.sh, 0, 0, out.w, out.h);
      result = await canvasToBlob(c, 'image/jpeg', 0.86);
      s.close();
    });
  });
}
