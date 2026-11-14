// Cut out (round 5): hands a new sticker's photo to the cut-out worker
// (data/cut-out-worker.js, the photo never leaves the phone) and passes on
// how far along it is. One worker while a sticker is being placed, put away
// once it's stuck on or left. (Loaded before components/stickers.js.)
window.StickerParts = window.StickerParts || {};
window.StickerParts.addCutting = function addCutting(ed) {
  'use strict';
  Object.assign(ed, { cutOut, stopCutting });
  let worker = null, nextId = 1, hear = null;
  const waiting = new Map();
  const failAll = (why) => { waiting.forEach((w) => w.no(new Error(why))); waiting.clear(); };

  // Resolves with the sticker's two editions ({ ratio, white, outline }, each
  // { bytes, mask }) or null when nothing clear stands out; onProgress(0..100)
  // as it goes.
  function cutOut(bytes, onProgress) {
    if (!worker) {
      worker = new Worker(new URL('data/cut-out-worker.js', document.baseURI), { type: 'module' });
      worker.onmessage = ({ data }) => {
        if (data.progress !== undefined) { if (hear) hear(data.progress); return; }
        const w = waiting.get(data.id);
        if (!w) return;
        waiting.delete(data.id);
        if (data.ok) w.ok(data.cut); else w.no(new Error(data.error));
      };
      worker.onerror = (e) => { console.error('Cut out failed:', e.message || e); stopCutting(); };
    }
    hear = onProgress;
    return new Promise((ok, no) => {
      const id = nextId++;
      waiting.set(id, { ok, no });
      worker.postMessage({ id, bytes: bytes.slice(0) });
    });
  }
  function stopCutting() {
    if (worker) worker.terminate();
    worker = null;
    hear = null;
    failAll('stopped');
  }
};
