// A new sticker: placing it on the cover with a finger, and keeping it.
// (Loaded before app.js; the file it belongs to runs it.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addSunStickerPlace = function addSunStickerPlace(ed, sun) {
    const fingers = new Map();
    let grab = null;
    const bookSize = () => ({
      w: parseFloat(sun.book.style.getPropertyValue('--W')) || 1,
      h: parseFloat(sun.book.style.getPropertyValue('--H')) || 1,
    }); sun.bookSize = bookSize;

    // Where the fingers are now, as the starting point for what they do next.
    function takeHold() {
      if (!sun.placing || !fingers.size) { grab = null; return; }
      const points = [...fingers.values()].slice(0, 2);
      grab = {
        x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
        y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
        apart: points.length === 2 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0,
        stickerX: sun.placing.sticker.x,
        stickerY: sun.placing.sticker.y,
        size: sun.placing.sticker.size,
      };
    }

    function follow() {
      if (!sun.placing || !grab) return;
      const points = [...fingers.values()].slice(0, 2);
      const { w, h } = bookSize();
      const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
      const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
      const sticker = sun.placing.sticker;
      // At least a corner stays on the cover, so it can always be grabbed again.
      sticker.x = Math.max(0, Math.min(1, grab.stickerX + (x - grab.x) / w));
      sticker.y = Math.max(0, Math.min(1, grab.stickerY + (y - grab.y) / h));
      if (points.length === 2 && grab.apart > 0) {
        const apart = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        sticker.size = Math.max(sun.MIN_SIZE, Math.min(sun.MAX_SIZE, grab.size * (apart / grab.apart)));
      }
      sun.placeGroup(sun.placing.group);
    }

    sun.stage.addEventListener('pointerdown', (e) => {
      if (e.target.closest('#stickerOkBtn')) return;
      try { sun.stage.setPointerCapture(e.pointerId); } catch (err) { /* moves still arrive on the stage */ }
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      takeHold();
    });
    sun.stage.addEventListener('pointermove', (e) => {
      if (!fingers.has(e.pointerId)) return;
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      follow();
    });
    const letGo = (e) => {
      if (!fingers.delete(e.pointerId)) return;
      takeHold();
    };
    sun.stage.addEventListener('pointerup', letGo);
    sun.stage.addEventListener('pointercancel', letGo);
    // Safari's own pinch would zoom the page instead.
    sun.stage.addEventListener('gesturestart', e => e.preventDefault());

    function endPlacing() {
      sun.placing = null;
      fingers.clear();
      grab = null;
      sun.stage.hidden = true;
      sun.book.classList.remove('placing');
      sun.drawStickers();
    }

    let savingSticker = false;
    document.getElementById('stickerOkBtn').addEventListener('click', () => {
      if (!sun.placing || savingSticker) return;
      // A repeat tap on the crop's Okay lands here: it hasn't been placed yet.
      if (performance.now() - sun.placing.startedAt < 450) return;
      savingSticker = true;
      const { sticker, src } = sun.placing;
      ed.idbSetImages(ed.stickerKey(sticker.id), [{ src, caption: '' }]).then(() => {
        savingSticker = false;
        ed.state.presentation.stickers.push(sticker);
        ed.saveState();
        sun.photos.set(sticker.id, src);
        endPlacing();
      }, (err) => {
        savingSticker = false;
        // Off the stage either way: the backup a full phone needs is in the app.
        endPlacing();
        if (ed.isStorageFullError(err)) ed.noteStorageFull(err);
        else ed.showToast("Couldn't save that sticker");
      });
    });
};
