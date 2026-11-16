// A notebook drawn flat on a canvas, for Save as image (components/shelf-image.js):
// its cover as the shelf paints it (styles/cover.css: the colour with its
// faint grain, the spine's shade, the mark 40% wide and 30% down, the name 8%
// up from the foot in the partner colour), its stickers on it
// (components/sticker-image.js; past the cover's edge they're cut), the page
// edges and its tabs on the fore-edge (styles/shelf.css). (Loaded before app.js.)
window.ShelfParts = window.ShelfParts || {};
window.ShelfParts.addCoverImage = function addCoverImage(ed) {
  'use strict';
  const INK = '#313D45', PAPER = '#FAFAF7';
  const BOOK_WIDE = 1.1; // the cover and its widest tab, as a share of the cover's width
  Object.assign(ed, { drawBook, bookCanvas, BOOK_WIDE });
  const font = (weight, size) => `${weight} ${size}px Figtree, system-ui, sans-serif`;

  // The cover's outline: square at the spine, rounded at the fore-edge.
  function coverPath(x, W, H) {
    const r = 0.035 * W;
    x.beginPath();
    if (x.roundRect) x.roundRect(0, 0, W, H, [0, r, r, 0]); else x.rect(0, 0, W, H);
  }
  function spaced(x, text, cx, y, em, size) {
    const gap = em * size;
    if ('letterSpacing' in x) x.letterSpacing = `${gap}px`; else { x.fillText(text, cx, y); return; }
    x.fillText(text, cx + gap / 2, y); // the space after the last letter would push it left
    x.letterSpacing = '0px';
  }
  // The paper grain the covers have (styles/cover.css --grain), as a canvas:
  // Safari won't let a picture with a pattern made straight from an svg be saved.
  let grain;
  function grainImage() {
    if (!grain) {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--grain');
      const m = /url\(["']?(.*?)["']?\)\s*$/.exec(v.trim());
      grain = ed.loadImage(m ? m[1] : '').then((img) => {
        if (!img) return null;
        const c = document.createElement('canvas');
        c.width = 160; c.height = 160;
        c.getContext('2d').drawImage(img, 0, 0, 160, 160);
        return c;
      });
    }
    return grain;
  }
  const markSrc = (b, partner, stop) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="240" height="240">${
    b.mark.replace(/var\(--p\)/g, partner).replace(/var\(--s, #FFD100\)/g, stop)}</svg>`)}`;

  // The tabs on the fore-edge, and the page edges between them.
  function drawEdge(x, b, colors, W, H) {
    x.fillStyle = '#FFFFFF';
    x.fillRect(W * 0.97, H * 0.012, W * 0.045, H * 0.976);
    x.fillStyle = '#E6E6E1';
    for (let k = 1; k <= 3; k++) x.fillRect(W * (0.995 + k * 0.005), H * 0.012, Math.max(1, W * 0.0015), H * 0.976);
    for (const [label, top, h, w, , light] of b.tabs) {
      const tx = W * 0.975, ty = H * top / 100, tw = W * w, th = H * h / 100, r = W * 0.03;
      x.beginPath();
      if (x.roundRect) x.roundRect(tx, ty, tw, th, [0, r, r, 0]); else x.rect(tx, ty, tw, th);
      x.fillStyle = light ? colors.light : INK;
      x.fill();
      x.save();
      x.translate(tx + tw / 2 + W * 0.006, ty + th / 2);
      x.rotate(Math.PI / 2); // written top to bottom (writing-mode: vertical-rl)
      x.fillStyle = light ? INK : PAPER;
      x.font = font(600, W * 0.04);
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      spaced(x, label, 0, 0, 0.02, W * 0.04);
      x.restore();
    }
  }

  // Book i, its cover W wide, its top left at 0,0.
  async function drawBook(x, i, W) {
    const b = ed.BOOKS[i], c = ed.colorOf(b), colors = ed.COLORS[c];
    const partner = ed.partnerOf(b, c), stop = (b.inks && b.inks[c] && b.inks[c].s) || '#FFD100';
    const H = W * 1.36;
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const [mark, paper] = await Promise.all([ed.loadImage(markSrc(b, partner, stop)), grainImage()]);
    drawEdge(x, b, colors, W, H);
    // The cover: colour, grain (overlay), the spine's shade.
    x.save();
    coverPath(x, W, H);
    x.clip();
    x.fillStyle = colors.band;
    x.fillRect(0, 0, W, H);
    if (paper) {
      const p = x.createPattern(paper, 'repeat');
      if (p && p.setTransform && window.DOMMatrix) p.setTransform(new DOMMatrix().scale(W / ed.W));
      x.globalCompositeOperation = 'overlay';
      x.fillStyle = p;
      x.fillRect(0, 0, W, H);
      x.globalCompositeOperation = 'source-over';
    }
    x.fillStyle = 'rgba(0, 0, 0, .08)';
    x.fillRect(0, 0, W * 0.029, H);
    if (mark) x.drawImage(mark, W * 0.3, H * 0.3, W * 0.4, W * 0.4);
    x.fillStyle = partner;
    x.font = font(700, W * 0.044);
    x.textAlign = 'center';
    x.textBaseline = 'bottom';
    spaced(x, b.short.toUpperCase(), W / 2, H * 0.92, 0.18, W * 0.044);
    // Its stickers, oldest first, so the newest is on top.
    const St = window.DFStickers;
    for (const s of St ? St.list(b.id) : []) await ed.drawSticker(x, s, W, H);
    x.restore();
  }

  // Book i on its own canvas (its cover W wide, with the tabs: BOOK_WIDE * W).
  async function bookCanvas(i, W) {
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(W * BOOK_WIDE);
    cv.height = Math.ceil(W * 1.36);
    await drawBook(cv.getContext('2d'), i, W);
    return cv;
  }
};
