// Going from one section to the next (Starky, 14 Nov; DESIGN.md 9.4): a
// plain slide, no page turn. A picture of the page you were on and one of
// the page you're going to lie side by side over the real page, which is
// already the new one underneath, and slide across: under the finger while
// it's on the glass, then settling in 240ms (components/slide-steps.js has
// the sums). With Reduce Motion, the old page's picture fades out in 150ms.
// The pictures can't be touched, and go on a timer, not on the animation's
// end, so they can never be left covering anything.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addSectionSlide = function addSectionSlide(ed) {
  Object.assign(ed, { playSlide, clearSlide, startSlideDrag, moveSlideDrag, endSlideDrag });
  const timers = new WeakMap();
  let drag = null;

  function clearSlide(layer) {
    clearTimeout(timers.get(layer));
    layer.querySelectorAll('.nb-slide').forEach(el => el.remove());
  }

  // What's behind the pages there (Shoot mode's is dark), so the slide's
  // layer hides the real page under it in the same colour.
  function groundOf(el) {
    for (let at = el; at; at = at.parentElement) {
      const c = getComputedStyle(at).backgroundColor;
      if (c && c !== 'transparent' && !/^rgba\(.*,\s*0\)$/.test(c)) return c;
    }
    return '#fff';
  }

  // A page's picture (ed.pageCopy) in a pane the size of the layer, x along.
  function pane(layer, copy, x, ground) {
    const base = layer.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'nb-slide-pane';
    el.style.left = `${x}px`;
    el.style.background = ground;
    copy.holder.style.left = `${copy.left - base.left}px`;
    copy.holder.style.top = `${copy.top - base.top}px`;
    el.appendChild(copy.holder);
    return el;
  }

  function layerFor(layer, cls) {
    clearSlide(layer);
    const el = document.createElement('div');
    el.className = cls;
    el.setAttribute('aria-hidden', 'true');
    layer.appendChild(el);
    return el;
  }

  // The old page, and the new one beside it: on its right going on (dir 1),
  // on its left going back.
  function build(layer, dir, oldCopy, newCopy) {
    const ground = groundOf(layer);
    const el = layerFor(layer, 'nb-slide');
    const width = layer.clientWidth;
    const strip = document.createElement('div');
    strip.className = 'nb-slide-strip';
    strip.append(pane(layer, oldCopy, 0, ground), pane(layer, newCopy, dir * width, ground));
    el.appendChild(strip);
    return { strip, width };
  }

  function settle(layer, s, from, to, then) {
    s.strip.style.transform = `translate3d(${from}px, 0px, 0px)`;
    s.strip.animate([{ transform: `translate3d(${from}px, 0px, 0px)` }, { transform: `translate3d(${to}px, 0px, 0px)` }],
      { duration: ed.SLIDE.ms, easing: ed.SLIDE.ease, fill: 'forwards' });
    timers.set(layer, setTimeout(() => { if (then) then(); clearSlide(layer); }, ed.SLIDE.ms + 40));
  }

  function crossfade(layer, oldCopy) {
    const el = layerFor(layer, 'nb-slide nb-slide-fade');
    el.appendChild(pane(layer, oldCopy, 0, groundOf(layer)));
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ed.SLIDE.fadeMs, easing: 'linear', fill: 'forwards' });
    timers.set(layer, setTimeout(() => clearSlide(layer), ed.SLIDE.fadeMs + 40));
  }

  // Turned in one go (a tap on the section bar, its arrows, a page's last
  // page): the new page is already showing under the pictures.
  function playSlide(layer, dir, oldCopy, newCopy) {
    if (!ed.motionOk()) { crossfade(layer, oldCopy); return; }
    settle(layer, build(layer, dir, oldCopy, newCopy), 0, -dir * layer.clientWidth);
  }

  // ---------- Under the finger ----------
  const order = () => [...document.querySelectorAll('.tabbar .tab')].map(tab => tab.dataset.view);
  // The app's own jump: no slide of its own.
  function showView(view) {
    ed.turnNextTab = false;
    document.querySelector(`.tabbar .tab[data-view="${view}"]`).click();
  }

  // A finger going sideways on the page (dir 1: on). The section that way
  // goes under the pictures at once; false when there's none that way, the
  // page has pages of its own to turn first, or with Reduce Motion (the
  // swipe then turns when it's let go, as before).
  function startSlideDrag(dir) {
    if (drag || !ed.motionOk()) return false;
    const from = ed.currentScreen();
    const to = ed.slideTarget(order(), from, dir);
    if (!to || ed.screenPageCount(from) > 1) return false;
    const layer = document.querySelector('.nb-board');
    const y = window.scrollY;
    const oldCopy = ed.pageCopy(ed.views[from]);
    showView(to);
    drag = { layer, dir, from, y, x: 0, s: build(layer, dir, oldCopy, ed.pageCopy(ed.views[to])) };
    return true;
  }

  function moveSlideDrag(dx) {
    if (!drag) return;
    drag.x = ed.slideOffset(dx, drag.dir, drag.s.width);
    drag.s.strip.style.transform = `translate3d(${drag.x}px, 0px, 0px)`;
  }

  // Let go (speed in px/ms): on to the new section, or back to the one it
  // came from, where it was on that page.
  function endSlideDrag(dx, speed) {
    if (!drag) return;
    const d = drag;
    drag = null;
    const on = ed.slideCommits(dx, d.dir, d.s.width, speed);
    settle(d.layer, d.s, d.x, on ? -d.dir * d.s.width : 0, on ? null : () => { showView(d.from); ed.scrollPageTo(d.y); });
  }
};
