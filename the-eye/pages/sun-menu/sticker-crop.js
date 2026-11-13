// A new sticker: fitting its photo in the shape.
// (Loaded before app.js; the file it belongs to runs it.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addSunStickerCrop = function addSunStickerCrop(ed, sun) {
  Object.assign(sun, { startCrop });
    // Putting one down: the book turns to face you so a finger moves the
    // sticker exactly, and whatever hangs off the cover is cropped by it.
    function startPlacing(shape, src, ratio) {
      const size = shape !== 'rect' ? 0.42 : ratio >= 1 ? 0.54 : 0.36;
      const sticker = { id: ed.uid(), shape, x: 0.5, y: 0.5, size };
      if (shape === 'rect') sticker.ratio = ratio;
      sun.placing = { sticker, src, group: sun.makeGroup(sticker, src, false), startedAt: performance.now() };
      sun.groups.push(sun.placing.group);
      sun.layer.appendChild(sun.placing.group.root);
      sun.placeGroup(sun.placing.group);
      sun.book.classList.add('placing');
      sun.stage.hidden = false;
    }

    // Before it goes on: moving and pinching the photo behind the shape.
    const cropStage = document.getElementById('stickerCrop');
    const cropPhoto = document.getElementById('stickerCropPhoto');
    const cropWindow = document.getElementById('stickerCropWindow');
    const CROP_MAX_ZOOM = 5;
    const CROP_OUT = 1000; // the saved sticker's longer side
    let crop = null;
    const cropFingers = new Map();
    let cropGrab = null;

    function drawCrop() {
      const maxX = Math.max(0, (crop.nw * crop.base * crop.zoom - crop.w) / 2);
      const maxY = Math.max(0, (crop.nh * crop.base * crop.zoom - crop.h) / 2);
      crop.x = Math.max(-maxX, Math.min(maxX, crop.x));
      crop.y = Math.max(-maxY, Math.min(maxY, crop.y));
      cropPhoto.style.transform = `translate(-50%, -50%) translate(${crop.x.toFixed(1)}px, ${crop.y.toFixed(1)}px) scale(${crop.zoom.toFixed(4)})`;
    }

    function startCrop(shape, src) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          sun.closeMenu();
          const nw = img.naturalWidth;
          const nh = img.naturalHeight;
          // A rectangle stands the way the photo stands.
          const ratio = shape !== 'rect' ? 1 : nw >= nh ? 3 / 2 : 2 / 3;
          cropStage.hidden = false;
          const room = cropStage.getBoundingClientRect();
          const w = Math.min(room.width * 0.84, room.height * 0.6 * ratio);
          const h = w / ratio;
          const base = Math.max(w / nw, h / nh);
          crop = { shape, src, img, nw, nh, ratio, w, h, base, zoom: 1, x: 0, y: 0 };
          cropWindow.className = `nb-crop-window is-${shape}`;
          cropWindow.style.width = `${w}px`;
          cropWindow.style.height = `${h}px`;
          cropPhoto.style.width = `${nw * base}px`;
          cropPhoto.style.height = `${nh * base}px`;
          cropPhoto.src = src;
          drawCrop();
          resolve();
        };
        img.src = src;
      });
    }

    function closeCrop() {
      crop = null;
      cropFingers.clear();
      cropGrab = null;
      cropStage.hidden = true;
      cropPhoto.removeAttribute('src');
    }

    function holdCrop() {
      if (!crop || !cropFingers.size) { cropGrab = null; return; }
      const points = [...cropFingers.values()].slice(0, 2);
      cropGrab = {
        x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
        y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
        apart: points.length === 2 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0,
        photoX: crop.x,
        photoY: crop.y,
        zoom: crop.zoom,
      };
    }

    function followCrop() {
      if (!crop || !cropGrab) return;
      const points = [...cropFingers.values()].slice(0, 2);
      const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
      const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
      let zoom = cropGrab.zoom;
      if (points.length === 2 && cropGrab.apart > 0) {
        const apart = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        zoom = Math.max(1, Math.min(CROP_MAX_ZOOM, cropGrab.zoom * (apart / cropGrab.apart)));
      }
      // Measured from the shape's centre, so the part under the fingers stays there.
      const room = cropStage.getBoundingClientRect();
      const cx = room.left + room.width / 2;
      const cy = room.top + room.height / 2;
      const k = zoom / cropGrab.zoom;
      crop.zoom = zoom;
      crop.x = (x - cx) - ((cropGrab.x - cx) - cropGrab.photoX) * k;
      crop.y = (y - cy) - ((cropGrab.y - cy) - cropGrab.photoY) * k;
      drawCrop();
    }

    cropStage.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      try { cropStage.setPointerCapture(e.pointerId); } catch (err) { /* moves still arrive on the stage */ }
      cropFingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      holdCrop();
    });
    cropStage.addEventListener('pointermove', (e) => {
      if (!cropFingers.has(e.pointerId)) return;
      cropFingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      followCrop();
    });
    const letGoOfCrop = (e) => {
      if (!cropFingers.delete(e.pointerId)) return;
      holdCrop();
    };
    cropStage.addEventListener('pointerup', letGoOfCrop);
    cropStage.addEventListener('pointercancel', letGoOfCrop);
    cropStage.addEventListener('gesturestart', e => e.preventDefault());

    document.getElementById('stickerCropBack').addEventListener('click', () => {
      closeCrop();
      sun.showPane('stickers');
      sun.overlay.hidden = false;
    });
    document.getElementById('stickerCropOk').addEventListener('click', () => {
      if (!crop) return;
      const { shape, img, nw, nh, ratio, w, h, base, zoom, x, y } = crop;
      const perPixel = base * zoom;
      const outW = ratio >= 1 ? CROP_OUT : Math.round(CROP_OUT * ratio);
      const outH = ratio >= 1 ? Math.round(CROP_OUT / ratio) : CROP_OUT;
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      canvas.getContext('2d').drawImage(img, nw / 2 - (w / 2 + x) / perPixel, nh / 2 - (h / 2 + y) / perPixel, w / perPixel, h / perPixel, 0, 0, outW, outH);
      const out = canvas.toDataURL('image/jpeg', 0.88);
      closeCrop();
      startPlacing(shape, out, ratio);
    });
};
