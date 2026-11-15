// The year page as a picture, for its SHARE (pages/shelf-year.js): the same
// year, numbers and rows on paper, as the page lays them out, drawn three
// times over (390 wide, so 1170 px) and handed back as a PNG file.
// (Loaded before app.js.)
window.ShelfParts = window.ShelfParts || {};
window.ShelfParts.addYearImage = function addYearImage(ed) {
  'use strict';
  Object.assign(ed, { yearImage });
  const C = () => window.DFConnect;
  const W = 390, K = 3, PAD = 16, TEXT_W = W - PAD * 2;
  const PAPER = '#FAFAF7', INK = '#313D45', DIM = '#5C666D', RULE = '#E1E1DC';
  const font = (weight, size) => `${weight} ${size}px Figtree, system-ui, sans-serif`;

  // An svg string as an image to draw (null if it won't load).
  const svgImage = (svg) => new Promise((ok) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => ok(null);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(String(svg).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '))}`;
  });
  // Words broken into lines no wider than w, in the font set.
  function wrap(x, text, w) {
    const lines = [];
    let now = '';
    for (const word of String(text).split(/\s+/).filter(Boolean)) {
      const next = now ? `${now} ${word}` : word;
      if (now && x.measureText(next).width > w) { lines.push(now); now = word; } else now = next;
    }
    return now ? [...lines, now] : lines;
  }
  function tile(x, left, top, size, r, bg) {
    x.fillStyle = bg;
    x.beginPath();
    if (x.roundRect) x.roundRect(left, top, size, size, r); else x.rect(left, top, size, size);
    x.fill();
  }
  const rule = (x, y, color, h = 1) => { x.fillStyle = color; x.fillRect(PAD, y, TEXT_W, h); };
  function spaced(x, text, left, y, em) {
    if ('letterSpacing' in x) x.letterSpacing = `${em}em`;
    x.fillText(text, left, y);
    if ('letterSpacing' in x) x.letterSpacing = '0px';
  }

  // v: the year as DFYear.yearView gives it; intro and none: the page's words.
  async function yearImage(v, intro, none) {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const [marks, minis] = await Promise.all([
      Promise.all(v.rows.map((r) => svgImage(C().markSvg(r.app, 28)))),
      Promise.all(v.led.map((r) => svgImage(r.icon))),
    ]);
    const cv = document.createElement('canvas');
    const x = cv.getContext('2d');
    // Lay out first (what wraps decides the height), then draw.
    x.font = font(400, 15);
    const introLines = wrap(x, intro, TEXT_W);
    const led = v.led.map((r) => {
      x.font = font(400, 17);
      const title = wrap(x, r.title, TEXT_W - 28);
      x.font = font(400, 14);
      return { title, line: r.line ? wrap(x, r.line, TEXT_W - 28) : [] };
    });
    x.font = font(400, 15);
    const noneLines = v.led.length ? [] : wrap(x, none, TEXT_W);
    const ledH = led.reduce((h, r) => h + 24 + r.title.length * 22 + (r.line.length ? 2 + r.line.length * 19 : 0), 0) || 12 + noneLines.length * 21;
    const H = 36 + 30 + 40 + 6 + introLines.length * 21 + 18 + v.rows.length * 77 + 28 + 14 + 8 + ledH + 36;
    cv.width = W * K;
    cv.height = H * K;
    x.scale(K, K);
    x.fillStyle = PAPER;
    x.fillRect(0, 0, W, H);
    x.textBaseline = 'alphabetic';

    let y = 36;
    x.fillStyle = INK; x.font = font(700, 13);
    spaced(x, 'YOUR YEAR', PAD, y + 12, 0.16);
    y += 30;
    x.font = font(300, 34);
    spaced(x, v.year, PAD, y + 31, 0.04);
    y += 46;
    x.fillStyle = DIM; x.font = font(400, 15);
    for (const l of introLines) { x.fillText(l, PAD, y + 15); y += 21; }
    y += 18;
    rule(x, y, INK);
    v.rows.forEach((r, i) => {
      const mid = y + 1 + 38;
      tile(x, PAD, mid - 14, 28, 6, C().NOTEBOOKS[r.app].bg);
      if (marks[i]) x.drawImage(marks[i], PAD, mid - 14, 28, 28);
      x.fillStyle = INK; x.font = font(300, 44);
      x.fillText(String(r.n), PAD + 42, mid + 15);
      x.font = font(400, 17);
      x.fillText(r.words, PAD + 148, mid + 6);
      y += 77;
      rule(x, y, RULE);
    });
    y += 28;
    x.fillStyle = DIM; x.font = font(500, 11);
    spaced(x, 'WHAT LED TO WORK', PAD, y + 11, 0.12);
    y += 14 + 8;
    rule(x, y, INK);
    y += 1;
    if (!v.led.length) {
      y += 12;
      x.fillStyle = DIM; x.font = font(400, 15);
      for (const l of noneLines) { x.fillText(l, PAD, y + 15); y += 21; }
    }
    led.forEach((r, i) => {
      const top = y + 12;
      const h = r.title.length * 22 + (r.line.length ? 2 + r.line.length * 19 : 0);
      tile(x, PAD, top + h / 2 - 8, 16, 3, v.led[i].bg || RULE);
      if (minis[i]) x.drawImage(minis[i], PAD + 3, top + h / 2 - 5, 10, 10);
      let ty = top;
      x.fillStyle = INK; x.font = font(400, 17);
      for (const l of r.title) { x.fillText(l, PAD + 28, ty + 16); ty += 22; }
      ty += 2;
      x.fillStyle = DIM; x.font = font(400, 14);
      for (const l of r.line) { x.fillText(l, PAD + 28, ty + 14); ty += 19; }
      y = top + h + 12;
      rule(x, y - 1, RULE);
    });
    const blob = await new Promise((ok) => cv.toBlob(ok, 'image/png'));
    if (!blob) throw new Error('No picture');
    return new File([blob], `Your year ${v.year}.png`, { type: 'image/png' });
  }
};
