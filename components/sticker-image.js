// A sticker drawn on a canvas, for Save as image (components/cover-image.js
// draws the cover under it): as it looks on the shelf (styles/cover-stickers.css,
// components/sticker-art.js). Its photo filling its shape from the middle,
// the white die-cut edge (1.2% of the cover) or a thin ink outline (1%), or
// none on a print; the lift shadow under it; the vinyl barely there (grain
// and wrinkles in soft light, the wrinkles only toward its edges, a faint
// sheen and fold, a soft gloss). A cut-out is its own shape, the shadow
// following it. (Loaded before app.js.)
window.ShelfParts = window.ShelfParts || {};
window.ShelfParts.addStickerImage = function addStickerImage(ed) {
  'use strict';
  Object.assign(ed, { drawSticker, loadImage });
  const INK = '#313D45';
  const St = () => window.DFStickers;

  // A picture from an address (null if it won't load).
  function loadImage(src) {
    return new Promise((ok) => {
      if (!src) { ok(null); return; }
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => ok(null);
      img.src = src;
    });
  }
  // The shape's outline, centred on 0,0, w by h, grown by out (or shrunk).
  function shape(x, s, w, h, round, out) {
    x.beginPath();
    if (s.shape === 'circle') { x.ellipse(0, 0, Math.max(0, w / 2 + out), Math.max(0, h / 2 + out), 0, 0, Math.PI * 2); return; }
    const r = Math.max(0, round + out), W = w + out * 2, H = h + out * 2;
    if (x.roundRect) x.roundRect(-W / 2, -H / 2, W, H, r); else x.rect(-W / 2, -H / 2, W, H);
  }
  // A picture filling w by h from its middle (object-fit: cover).
  function cover(x, img, left, top, w, h) {
    const k = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const sw = w / k, sh = h / k;
    x.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, left, top, w, h);
  }
  // The vinyl and gloss over the photo, in the box left, top, w, h (already clipped).
  async function vinyl(x, s, left, top, w, h) {
    const v = St().vinyl ? St().vinyl(s) : null;
    if (!v) return;
    const [grain, wrinkle, sheen, fold] = await Promise.all([v.grain, v.wrinkle, v.sheen, v.fold].map(loadImage));
    const lay = (img, mode, alpha) => {
      if (!img) return;
      x.globalCompositeOperation = mode;
      x.globalAlpha = alpha;
      x.drawImage(img, left, top, w, h);
    };
    lay(grain, 'soft-light', 0.2);
    if (wrinkle) { // only toward the edges: clear in the middle
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
      const cx = c.getContext('2d');
      cx.drawImage(wrinkle, 0, 0, c.width, c.height);
      const g = cx.createRadialGradient(c.width / 2, c.height / 2, 0, c.width / 2, c.height / 2, Math.min(c.width, c.height) / 2);
      g.addColorStop(0.3, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,1)');
      cx.globalCompositeOperation = 'destination-in';
      cx.fillStyle = g;
      cx.fillRect(0, 0, c.width, c.height);
      lay(c, 'soft-light', 0.15);
    }
    lay(sheen, 'screen', 0.05);
    lay(fold, 'source-over', 1);
    x.globalCompositeOperation = 'source-over';
    x.globalAlpha = 1;
    // The gloss: a soft diagonal band (118deg).
    const a = 118 * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a);
    const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2, mx = left + w / 2, my = top + h / 2;
    const g = x.createLinearGradient(mx - dx * half, my - dy * half, mx + dx * half, my + dy * half);
    g.addColorStop(0.26, 'rgba(255,255,255,0)');
    g.addColorStop(0.42, 'rgba(255,255,255,.1)');
    g.addColorStop(0.54, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(left, top, w, h);
  }

  // s: the sticker; W, H: the cover's size on the canvas (its top left at 0,0).
  async function drawSticker(x, s, W, H) {
    const photo = await loadImage(St().thumb(s));
    if (!photo) return;
    const w = s.size * W, h = w / St().ratioOf(s);
    const lift = () => { x.shadowColor = 'rgba(49, 61, 69, .35)'; x.shadowOffsetY = 0.006 * W; x.shadowBlur = 0.01 * W; };
    const still = () => { x.shadowColor = 'rgba(0,0,0,0)'; x.shadowOffsetY = 0; x.shadowBlur = 0; };
    x.save();
    x.translate(s.x * W, s.y * H);
    x.rotate((Number(s.turn) || 0) * Math.PI / 180);
    if (s.shape === 'cut') {
      // The picture cut to its shape (its edge already painted in), with its vinyl, then laid down with a shadow that follows it.
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
      const cx = c.getContext('2d');
      cover(cx, photo, 0, 0, c.width, c.height);
      await vinyl(cx, s, 0, 0, c.width, c.height);
      const mask = await loadImage(St().mask ? St().mask(s) : '');
      if (mask) { cx.globalCompositeOperation = 'destination-in'; cx.drawImage(mask, 0, 0, c.width, c.height); }
      x.shadowColor = 'rgba(49, 61, 69, .35)'; x.shadowOffsetY = 0.006 * W; x.shadowBlur = 0.006 * W;
      x.drawImage(c, -w / 2, -h / 2, w, h);
      x.restore();
      return;
    }
    const round = s.shape === 'circle' ? 0 : 0.012 * W;
    const outline = s.edge === 'outline';
    const pad = s.printed || outline ? 0 : 0.012 * W;
    // Its edge, with the lift shadow under it: white, an ink line round it, or (a print) the photo's own.
    lift();
    if (outline) { shape(x, s, w, h, round, Math.max(1, 0.01 * W)); x.fillStyle = INK; x.fill(); }
    else { shape(x, s, w, h, round, 0); x.fillStyle = '#FFFFFF'; x.fill(); }
    still();
    // The photo inside it, and the vinyl over the photo.
    shape(x, s, w, h, round + pad, -pad); // the photo keeps the sticker's corner (border-radius: inherit)
    x.clip();
    cover(x, photo, -w / 2 + pad, -h / 2 + pad, w - pad * 2, h - pad * 2);
    await vinyl(x, s, -w / 2 + pad, -h / 2 + pad, w - pad * 2, h - pad * 2);
    x.restore();
  }
};
