// The sun menu's stickers on the cover: drawing them, folded over the edges.
// (Loaded before app.js; the file it belongs to runs it.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addSunCoverStickers = function addSunCoverStickers(ed, sun) {
  Object.assign(sun, { makeGroup, placeGroup, drawStickers });
    function stickerEl(sticker, src, creased) {
      const el = document.createElement('div');
      el.className = `nb-sticker is-${sticker.shape}`;
      const face = document.createElement('div');
      face.className = 'nb-sticker-face';
      const img = document.createElement('img');
      img.alt = '';
      img.draggable = false;
      img.src = src;
      face.appendChild(img);
      if (creased) {
        const art = sun.creaseArt(sticker);
        if (art) {
          const lines = document.createElement('img');
          lines.className = 'nb-sticker-creases';
          lines.alt = '';
          lines.draggable = false;
          lines.src = art;
          face.appendChild(lines);
        }
      }
      el.appendChild(face);
      sun.placeOnCover(el, sticker);
      return el;
    }

    // One sticker: what lies flat on the cover, the last of it curving over
    // each edge it reaches, and the part that carries on round that edge.
    function makeGroup(sticker, src, creased) {
      const root = document.createElement('div');
      root.className = 'nb-sticker-set';
      const body = document.createElement('div');
      body.className = 'nb-sticker-body';
      const main = stickerEl(sticker, src, creased);
      body.appendChild(main);
      root.appendChild(body);
      return { sticker, src, creased, root, body, main, bends: {}, wraps: {} };
    }

    function makeBend(group, edge) {
      const bend = document.createElement('div');
      bend.className = `nb-bend is-${edge}`;
      const inner = document.createElement('div');
      inner.className = 'nb-cover-copy';
      const copy = stickerEl(group.sticker, group.src, group.creased);
      const shade = document.createElement('i');
      shade.className = `nb-bend-shade is-${edge}`;
      copy.firstChild.appendChild(shade);
      inner.appendChild(copy);
      bend.appendChild(inner);
      group.root.appendChild(bend);
      return group.bends[edge] = { bend, inner, copy, shade };
    }

    function makeWrap(group, edge) {
      const inner = document.createElement('div');
      inner.className = 'nb-cover-copy';
      const copy = stickerEl(group.sticker, group.src, group.creased);
      inner.appendChild(copy);
      wrapStrip(edge).appendChild(inner);
      return group.wraps[edge] = { inner, copy };
    }

    const wrapsEl = document.getElementById('bookWraps');
    wrapsEl.innerHTML = sun.EDGES.map(edge => `<div class="nb-wrap is-${edge}"><div class="nb-wrap-in"></div></div>`).join('');
    const wrapStrip = edge => wrapsEl.querySelector(`.nb-wrap.is-${edge} .nb-wrap-in`);

    function placeGroup(group) {
      const s = group.sticker;
      const { w, h } = sun.bookSize();
      if (w < 2 || h < 2) return;
      const halfW = (s.size * w) / 2 + sun.RING * w;
      const halfH = (s.size * w) / sun.stickerRatio(s) / 2 + sun.RING * w;
      const over = {
        left: halfW - s.x * w,
        right: s.x * w + halfW - w,
        top: halfH - s.y * h,
        bottom: s.y * h + halfH - h,
      };
      const band = sun.BEND * w;
      sun.placeOnCover(group.main, s);
      group.body.style.clipPath = `inset(${over.top > 0 ? band : 0}px ${over.right > 0 ? band : 0}px ${over.bottom > 0 ? band : 0}px ${over.left > 0 ? band : 0}px)`;
      sun.EDGES.forEach((edge) => {
        const reached = over[edge] > 0;
        if (!reached) {
          if (group.bends[edge]) group.bends[edge].bend.hidden = true;
          if (group.wraps[edge]) group.wraps[edge].inner.hidden = true;
          return;
        }
        const part = group.bends[edge] || makeBend(group, edge);
        const wrap = group.wraps[edge] || makeWrap(group, edge);
        part.bend.hidden = false;
        wrap.inner.hidden = false;
        sun.placeOnCover(part.copy, s);
        sun.placeOnCover(wrap.copy, s);
        // Round the edge it foreshortens: what's past the edge squeezes into
        // the last sliver, and what's left of it carries on round the side.
        const squeezed = Math.min(over[edge], band * 0.9);
        const scale = band / (band + squeezed);
        const line = edge === 'left' ? band : edge === 'right' ? w - band : edge === 'top' ? band : h - band;
        part.inner.style.transformOrigin = sun.isSideways(edge) ? `${line}px 0` : `0 ${line}px`;
        part.inner.style.transform = sun.isSideways(edge) ? `scaleX(${scale.toFixed(4)})` : `scaleY(${scale.toFixed(4)})`;
        const away = edge === 'left' || edge === 'top' ? squeezed : -squeezed;
        wrap.inner.style.transform = sun.isSideways(edge) ? `translateX(${away.toFixed(1)}px)` : `translateY(${away.toFixed(1)}px)`;
        // The shading covers just that stretch, measured on the sticker.
        const faceLeft = s.x * w - halfW;
        const faceTop = s.y * h - halfH;
        const span = band + squeezed;
        const st = part.shade.style;
        st.opacity = Math.min(1, over[edge] / (band * 0.9)).toFixed(3);
        st.width = sun.isSideways(edge) ? `${span}px` : '100%';
        st.height = sun.isSideways(edge) ? '100%' : `${span}px`;
        st.left = edge === 'left' ? `${band - span - faceLeft}px` : edge === 'right' ? `${w - band - faceLeft}px` : '0';
        st.top = edge === 'top' ? `${band - span - faceTop}px` : edge === 'bottom' ? `${h - band - faceTop}px` : '0';
      });
    }

    // In the order they went on, so a newer one always lies over an older.
    function drawStickers() {
      wrapsEl.querySelectorAll('.nb-wrap-in').forEach(el => el.replaceChildren());
      sun.groups = ed.state.presentation.stickers.filter(s => sun.photos.has(s.id)).map(s => makeGroup(s, sun.photos.get(s.id), true));
      if (sun.placing) {
        sun.placing.group = makeGroup(sun.placing.sticker, sun.placing.src, false);
        sun.groups.push(sun.placing.group);
      }
      sun.layer.replaceChildren(...sun.groups.map(group => group.root));
      sun.groups.forEach(placeGroup);
    }
    ed.relayStickers = () => sun.groups.forEach(placeGroup);

    ed.refreshStickers = () => {
      const stickers = ed.state.presentation.stickers;
      return ed.idbGetManyImages(stickers.map(s => ed.stickerKey(s.id))).then((found) => {
        sun.photos.clear();
        stickers.forEach((s) => {
          const images = found.get(ed.stickerKey(s.id));
          if (images && images[0]) sun.photos.set(s.id, images[0].src);
        });
        drawStickers();
      }).catch(() => {});
    };
};
