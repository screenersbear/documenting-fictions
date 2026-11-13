// Opening a notebook from the shelf, and shutting it back onto the shelf:
// the cover swings, the page grows to fill the screen. (Loaded before app.js.)
window.ShelfParts = window.ShelfParts || {};
window.ShelfParts.addOpening = function addOpening(ed) {
  'use strict';
  Object.assign(ed, { openBook, shutBook, reset });
  // ---------- Opening and shutting ----------
  const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches; ed.still = still;
  const wait = (ms) => new Promise((done) => setTimeout(done, ms)); ed.wait = wait;
  function leave(url) {
    ed.busy = true;
    location.href = url;
    // Back here with the browser's back button, the shelf is usable again (see pageshow).
  }

  // The zoom that makes book i's page fill the screen: the page's white, as it
  // is drawn now (book facing you, cover open), grown past every edge by OVER.
  function zoomFor(i) {
    // Measured where everything ends up, wherever a turn has got to.
    const keep = ed.stage.style.transform;
    ed.stage.classList.add('measuring');
    ed.stage.style.transform = '';
    const r = ed.slots[i].querySelector('.page').getBoundingClientRect();
    ed.stage.style.transform = keep;
    void ed.stage.offsetWidth;
    ed.stage.classList.remove('measuring');
    // The page art is white inside a thin rim of the cover: about 2.6% at the
    // outer edge and 2% top and bottom (The Eye's is the widest of the three).
    const wl = r.left, wr = r.right - r.width * 0.026, wt = r.top + r.height * 0.02, wb = r.bottom - r.height * 0.02;
    const vw = window.innerWidth, vh = window.innerHeight;
    const sx = (vw + 2 * ed.OVER) / (wr - wl), sy = (vh + 2 * ed.OVER) / (wb - wt);
    return `translate(${-ed.OVER - wl * sx}px, ${-ed.OVER - wt * sy}px) scale(${sx}, ${sy})`;
  }

  async function openBook(i, at) {
    if (ed.busy) return;
    ed.busy = true;
    const b = ed.BOOKS[i];
    const url = `${b.id}/${at ? `?at=${encodeURIComponent(at)}` : ''}`;
    ed.store.set(ed.FRONT_KEY, String(i));
    if (still()) { leave(url); return; }
    ed.shelf.classList.add('away');
    const s = ed.slots[i];
    ed.facing = i;
    s.classList.add('still', 'turning', 'opening');
    ed.render();
    s.classList.add('open');
    await wait(ed.OPEN_MS);
    s.classList.remove('turning');
    ed.stage.classList.remove('zooming');
    ed.stage.style.setProperty('--zoom-ms', `${ed.ZOOM_MS}ms`);
    const zoom = zoomFor(i);
    ed.stage.classList.add('zooming');
    ed.stage.style.transform = zoom;
    await wait(ed.ZOOM_MS);
    leave(url);
  }

  // Back from a notebook: the page is still filling the screen, and shrinks
  // back down into the book, which shuts.
  async function shutBook(i) {
    ed.busy = true;
    ed.store.set(ed.FRONT_KEY, String(i));
    const s = ed.slots[i];
    ed.facing = i;
    s.classList.add('still', 'open');
    ed.shelf.classList.add('away');
    ed.render();
    void ed.stage.offsetWidth;
    ed.stage.style.transform = zoomFor(i);
    void ed.stage.offsetWidth;
    await wait(60);
    ed.stage.style.setProperty('--zoom-ms', `${ed.ZOOM_MS}ms`);
    ed.stage.classList.add('zooming');
    ed.stage.style.transform = '';
    await wait(ed.ZOOM_MS);
    ed.stage.classList.remove('zooming');
    s.classList.add('opening', 'turning');
    s.classList.remove('open');
    ed.shelf.classList.remove('away');
    await wait(ed.OPEN_MS * 0.7);
    ed.facing = null;
    ed.render();
    await wait(ed.TURN_MS);
    s.classList.remove('opening', 'turning', 'still');
    ed.busy = false;
  }

  function reset() {
    ed.busy = false;
    ed.facing = null;
    ed.stage.classList.remove('zooming');
    ed.stage.style.transform = '';
    ed.shelf.classList.remove('away');
    ed.slots.forEach((s) => s.classList.remove('still', 'open', 'opening', 'turning'));
    ed.render();
  }
};
