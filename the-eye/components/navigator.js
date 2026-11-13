// The section bar: tapping, swiping and holding it.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addNavigator = function addNavigator(ed) {
  // ---------- the section bar ----------
  // A mark and a name for each section (pages/tabs.html .tabbar). Tap one,
  // or swipe along the bar, and the notebook turns to it with a page turn;
  // swiping right on the first section shuts the notebook. Tapping the
  // section you're on goes back to the top of its page.
  (function setupNavigator() {
    const bar = document.querySelector('.tabbar');
    const tabs = [...bar.querySelectorAll('.tab')].map(el => ({
      el,
      view: el.dataset.view,
      name: el.textContent.trim(),
      icon: el.querySelector('.tab-icon').innerHTML,
    }));
    let idx = 0;
    let arrivedAt = 0;
    let drag = null;
    let draggedAt = 0;

    function sync() {
      const found = tabs.findIndex(t => t.el.classList.contains('active'));
      if (found >= 0 && found !== idx) arrivedAt = performance.now();
      if (found >= 0) idx = found;
      tabs.forEach((t, i) => { if (i === idx) t.el.setAttribute('aria-current', 'page'); else t.el.removeAttribute('aria-current'); });
    }
    function go(by) {
      // Before the first section there's the shut book.
      if (idx + by < 0) {
        // A repeat of the swipe that just got here isn't asking to shut the book.
        if (performance.now() - arrivedAt >= 700) document.getElementById('shutBookBtn').click();
        return;
      }
      const t = tabs[idx + by];
      if (t) ed.turnToView(t.view);
    }
    // A tap on a mark (the finger's own: the app's jumps click the buttons
    // themselves) turns the page to it, as a swipe does.
    bar.addEventListener('click', (e) => {
      const tab = e.target.closest('.tab');
      if (!tab || !e.isTrusted) return;
      e.preventDefault();
      e.stopPropagation();
      if (performance.now() - draggedAt < 350) return; // a swipe that ends on a mark isn't a tap on it
      if (!tab.classList.contains('active')) { ed.turnToView(tab.dataset.view); return; }
      if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: ed.motionOk() ? 'smooth' : 'auto' });
    }, true);

    // A finger the width of a third of the screen (120px at most), or a
    // quick flick, turns one section along.
    const span = () => (window.innerWidth || 1) / 3;
    bar.addEventListener('pointerdown', (e) => {
      if (e.button || !e.isPrimary) return;
      drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false, dx: 0, v: 0, t: performance.now(), lx: e.clientX };
    });
    bar.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x0;
      const dy = e.clientY - drag.y0;
      if (!drag.moved) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
        drag.moved = true;
        try { bar.setPointerCapture(e.pointerId); } catch (err) { /* capture is a nice-to-have */ }
      }
      const t = performance.now();
      drag.v = (e.clientX - drag.lx) / Math.max(1, t - drag.t);
      drag.lx = e.clientX;
      drag.t = t;
      drag.dx = dx;
    });
    const end = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const { moved, dx, v } = drag;
      drag = null;
      if (!moved) return;
      draggedAt = performance.now();
      const by = dx < 0 ? 1 : -1;
      const flick = Math.abs(v) > 0.45 && Math.sign(v) === Math.sign(dx) && Math.abs(dx) > 24;
      if (e.type === 'pointerup' && (by < 0 || tabs[idx + by]) && (Math.abs(dx) > Math.min(span() * 0.6, 120) || flick)) go(by);
    };
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', end);

    // Held still for a moment, the bar swells into a row of every section,
    // the way the Mac's Dock grows under the pointer (user, 11-11). Slide
    // along it and let go on one to turn there; let go without sliding and
    // nothing changes.
    const DOCK_SLOT = 46; // px from one icon to the next
    const DOCK_PAD = 10;  // the card's padding and border, each side
    const dock = document.createElement('div');
    dock.className = 'nav-dock';
    dock.setAttribute('aria-hidden', 'true');
    dock.innerHTML = tabs.map(t => `<span class="nav-dock-slot"><span class="nav-dock-icon">${t.icon}</span></span>`).join('')
      + '<span class="nav-dock-label"></span>';
    bar.appendChild(dock);
    const dockSlots = [...dock.querySelectorAll('.nav-dock-slot')];
    const dockIcons = [...dock.querySelectorAll('.nav-dock-icon')];
    const dockLabel = dock.querySelector('.nav-dock-label');
    let hold = null;
    let docked = null;
    // Biggest under the finger, its neighbours a little, the rest as they are.
    function dockShow(x) {
      const fx = x === null ? docked.centers[idx] : x;
      let near = idx;
      if (x !== null) {
        let best = Infinity;
        docked.centers.forEach((c, i) => { if (Math.abs(fx - c) < best) { best = Math.abs(fx - c); near = i; } });
      }
      docked.at = near;
      dockIcons.forEach((icon, i) => {
        const grow = Math.max(0, 1 - Math.abs(fx - docked.centers[i]) / (DOCK_SLOT * 1.8));
        icon.style.transform = `scale(${(1 + 0.55 * grow).toFixed(3)})`;
      });
      dockSlots.forEach((slot, i) => slot.classList.toggle('is-on', i === near));
      dockLabel.textContent = tabs[near].name;
      dockLabel.style.left = `${(docked.centers[near] - docked.left - 2).toFixed(1)}px`;
    }
    function openDock(h) {
      hold = null;
      drag = null; // the slide along the bar stands down
      const r = bar.getBoundingClientRect();
      const w = tabs.length * DOCK_SLOT + DOCK_PAD * 2;
      const vw = window.innerWidth;
      // The section you're on sits right over the finger, as far as the screen allows.
      const left = Math.max(8, Math.min(vw - 8 - w, h.x - DOCK_PAD - (idx + 0.5) * DOCK_SLOT));
      docked = { id: h.id, x0: h.x, y0: h.y, moved: false, at: idx, left, centers: tabs.map((t, i) => left + DOCK_PAD + (i + 0.5) * DOCK_SLOT) };
      dock.style.left = `${(left - r.left).toFixed(1)}px`;
      dock.style.transformOrigin = `${(h.x - left).toFixed(1)}px 100%`;
      dockSlots.forEach((slot, i) => slot.classList.toggle('is-here', i === idx));
      dockShow(null);
      dock.classList.add('is-open');
      try { bar.setPointerCapture(h.id); } catch (err) { /* capture is a nice-to-have */ }
    }
    bar.addEventListener('pointerdown', (e) => {
      if (e.button || !e.isPrimary) return;
      if (hold) clearTimeout(hold.timer);
      const h = { id: e.pointerId, x: e.clientX, y: e.clientY };
      h.timer = setTimeout(() => { if (hold === h) openDock(h); }, 380);
      hold = h;
    });
    bar.addEventListener('contextmenu', e => e.preventDefault());
    bar.addEventListener('pointermove', (e) => {
      if (hold && e.pointerId === hold.id && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) >= 8) { clearTimeout(hold.timer); hold = null; }
      if (!docked || e.pointerId !== docked.id) return;
      if (!docked.moved && Math.hypot(e.clientX - docked.x0, e.clientY - docked.y0) < 10) return;
      docked.moved = true;
      dockShow(e.clientX);
    });
    const dockEnd = (e) => {
      if (hold && e.pointerId === hold.id) { clearTimeout(hold.timer); hold = null; }
      if (!docked || e.pointerId !== docked.id) return;
      const { moved, at } = docked;
      docked = null;
      dock.classList.remove('is-open');
      draggedAt = performance.now(); // the mark's own tap stands down
      if (e.type === 'pointerup' && moved && at !== idx) ed.turnToView(tabs[at].view);
    };
    bar.addEventListener('pointerup', dockEnd);
    bar.addEventListener('pointercancel', dockEnd);

    new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['data-view'] });
    sync();

    // The tabs poking out of the page's edge, one for each screen. From
    // inside a shoot, a tab closes it first (saving, the same as Back).
    document.querySelector('.nb-screen-tabs:not(.nb-screen-tabs-shoot)').addEventListener('click', (e) => {
      const tab = e.target.closest('[data-view]');
      if (tab) ed.turnToView(tab.dataset.view);
    });
    document.querySelectorAll('.nb-screen-tabs-shoot').forEach(tabs => tabs.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-view]');
      if (!tab) return;
      ed.shootModalOverlay.querySelector('[data-close="shoot"]').click();
      // Whatever the shoot was opened from goes too: it belongs to the old section.
      if (ed.activeStatBoxKey) ed.closeStatBoxDetail();
      ed.closeProjectPopup();
      ed.turnToView(tab.dataset.view);
    }));
  })();
};
