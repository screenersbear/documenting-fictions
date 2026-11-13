// The sun menu's stickers on the cover: where one sits, and its creases.
// (Loaded before app.js; the file it belongs to runs it.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addSunStickerCreases = function addSunStickerCreases(ed, sun) {
  Object.assign(sun, { placeOnCover, creaseArt });
    function placeOnCover(el, sticker) {
      el.style.left = `${sticker.x * 100}%`;
      el.style.top = `${sticker.y * 100}%`;
      el.style.width = `${sticker.size * 100}%`;
      el.style.setProperty('--r', String(sun.stickerRatio(sticker)));
    }

    // Creases of its own, the same every time it's drawn: broad soft bands of
    // shade, deeper on one side of the fold, and a few dim patches on the paper.
    const creases = new Map(); sun.creases = creases;
    function creaseArt(sticker) {
      if (creases.has(sticker.id)) return creases.get(sticker.id);
      let seed = 2166136261;
      for (let i = 0; i < sticker.id.length; i++) seed = Math.imul(seed ^ sticker.id.charCodeAt(i), 16777619);
      const rnd = () => {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      const ratio = sun.stickerRatio(sticker);
      const w = ratio >= 1 ? 520 : Math.round(520 * ratio);
      const h = ratio >= 1 ? Math.round(520 / ratio) : 520;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const g = canvas.getContext('2d');
      if (!g) return '';
      const big = Math.max(w, h);
      // Smooth fall-offs sampled into many stops, so no gradient shows a kink.
      const ease = u => (u <= 0 ? 1 : u >= 1 ? 0 : 1 - u * u * (3 - 2 * u));
      const ink = a => `rgba(62, 44, 28, ${Math.max(0, a).toFixed(4)})`;
      // Gentle dim patches: the paper is not lying perfectly flat.
      const patches = 4 + Math.floor(rnd() * 3);
      for (let i = 0; i < patches; i++) {
        const x = rnd() * w;
        const y = rnd() * h;
        const r = big * (0.2 + rnd() * 0.3);
        const peak = 0.06 + rnd() * 0.07;
        const shade = g.createRadialGradient(x, y, 0, x, y, r);
        for (let s = 0; s <= 8; s++) shade.addColorStop(s / 8, ink(peak * ease(s / 8)));
        g.fillStyle = shade;
        g.fillRect(0, 0, w, h);
      }
      // Creases: broad bands of shade across a barely curved fold, deeper on
      // one side and easing off on the other, fading out along their length.
      const band = document.createElement('canvas');
      band.width = w;
      band.height = h;
      const b = band.getContext('2d');
      const free = () => { canvas.width = canvas.height = band.width = band.height = 0; };
      if (!b) { free(); return ''; }
      const round = sticker.shape === 'circle';
      const count = 2 + Math.floor(rnd() * 3);
      for (let i = 0; i < count; i++) {
        let x0;
        let y0;
        if (round) {
          const phi = rnd() * Math.PI * 2;
          x0 = w / 2 + Math.cos(phi) * w / 2;
          y0 = h / 2 + Math.sin(phi) * h / 2;
        } else {
          const side = Math.floor(rnd() * 4);
          const along = 0.1 + rnd() * 0.8;
          x0 = side === 0 ? 0 : side === 1 ? w : along * w;
          y0 = side === 2 ? 0 : side === 3 ? h : along * h;
        }
        const toward = Math.atan2(h / 2 - y0, w / 2 - x0) + (rnd() - 0.5) * 1.5;
        const dx = Math.cos(toward);
        const dy = Math.sin(toward);
        const length = big * (0.32 + rnd() * 0.36);
        const deep = big * (0.08 + rnd() * 0.06);   // the shaded facet
        const soft = deep * (0.62 + rnd() * 0.2);   // the side facing the light
        const peak = 0.13 + rnd() * 0.07;
        const bend = (rnd() < 0.5 ? -1 : 1) * big * (2.5 + rnd() * 4);
        const inner = rnd() < 0.5;
        // The fold follows a huge circle through the rim point, so it bends a little.
        const cx = x0 - dy * bend;
        const cy = y0 + dx * bend;
        const R = Math.abs(bend);
        const r0 = R - (inner ? deep : soft);
        const r1 = R + (inner ? soft : deep);
        const fold = b.createRadialGradient(cx, cy, r0, cx, cy, r1);
        const n = 20;
        for (let s = 0; s <= n; s++) {
          const r = r0 + ((r1 - r0) * s) / n;
          const off = r - R;
          const shadeSide = inner ? off < 0 : off > 0;
          const u = Math.abs(off) / (shadeSide ? deep : soft);
          fold.addColorStop(s / n, ink(peak * ease(u)));
        }
        b.setTransform(1, 0, 0, 1, 0, 0);
        b.globalCompositeOperation = 'source-over';
        b.clearRect(0, 0, w, h);
        b.fillStyle = fold;
        b.fillRect(0, 0, w, h);
        // Fade it along its length (and narrow it toward the tip).
        const across = (deep + soft) * 2.8;
        const back = length * 0.08;
        b.globalCompositeOperation = 'destination-in';
        b.setTransform(dx, dy, -dy * (across / length), dx * (across / length), x0 - dx * back, y0 - dy * back);
        const fade = b.createRadialGradient(0, 0, 0, 0, 0, length);
        for (let s = 0; s <= 12; s++) fade.addColorStop(s / 12, `rgba(0, 0, 0, ${ease((s / 12 - 0.05) / 0.95).toFixed(4)})`);
        b.fillStyle = fade;
        b.fillRect(-big * 4, (-big * 4 * length) / across, big * 8, (big * 8 * length) / across);
        b.setTransform(1, 0, 0, 1, 0, 0);
        b.globalCompositeOperation = 'source-over';
        g.drawImage(band, 0, 0);
      }
      const art = canvas.toDataURL('image/png');
      free(); // iOS has little canvas memory to spare
      creases.set(sticker.id, art);
      return art;
    }
};
