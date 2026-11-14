// Where a sticker bends over its cover's edges: which edges it passes, and
// where the shading goes on it (components/sticker-art.js draws it).
// (Loaded before components/stickers.js.)
window.StickerParts = window.StickerParts || {};
window.StickerParts.addStickerBends = function addStickerBends(ed) {
  'use strict';
  Object.assign(ed, { bendsOf });
  const BEND = 0.075; // how far in the bend's shading reaches, of the cover's width

  // s: { x, y, size } (its middle as shares of the cover's width and height,
  // its width as a share of the cover's width) and its shape. For each edge,
  // r, l, t, b: null, or where the shading sits, in % of the sticker.
  function bendsOf(s) {
    // Its width and height as shares of the cover's: the cover's width is
    // COVER of its height, so a sticker size wide is size x COVER / ratio tall.
    const w = s.size, h = (s.size / ed.ratioOf(s)) * ed.COVER;
    const left = s.x - w / 2, top = s.y - h / 2;
    const across = (BEND / w) * 100, down = ((BEND * ed.COVER) / h) * 100;
    return {
      r: left + w > 1 ? { left: ((1 - left) / w) * 100 - across, width: across } : null,
      l: left < 0 ? { left: (-left / w) * 100, width: across } : null,
      t: top < 0 ? { top: (-top / h) * 100, height: down } : null,
      b: top + h > 1 ? { top: ((1 - top) / h) * 100 - down, height: down } : null,
    };
  }
};
