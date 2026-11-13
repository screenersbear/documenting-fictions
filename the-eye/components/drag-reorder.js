// Dragging to reorder lists whose rows differ in height.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addDragReorder = function addDragReorder(ed) {
  Object.assign(ed, { wireRowDragReorder });
  // ---------- Drag-to-reorder for lists of rows that differ in height ----------
  // Same press-and-drag feel as the shot list, but built for rows of very
  // different heights (a collapsed lighting setup is ~46px, an open one a few
  // hundred), which the shot list's version isn't:
  //   - 'edge' crossing: the dragged row's leading edge against the
  //     neighbour's midline. Comparing centres can't reach the end slots once
  //     the clamp stops a tall row's centre short of a short neighbour's.
  //   - the scroller auto-scrolls near its visible edge, and any scroll is
  //     folded into the drag so the row stays under the finger.
  //   - the transform is re-derived right after every swap, so moving past
  //     several neighbours in one go can't over-swap.
  //   - the neighbour hops over the dragged row, so the dragged node is never
  //     detached (it keeps its pointer capture).
  //   - a drop that changes nothing commits nothing: no re-render, no save.
  const DRAG_SWAP_BIAS = 6;         // px past a neighbour's midline before a swap (stops flip-flopping at the boundary)
  const DRAG_EDGE_ZONE = 56;        // px inside the scroller's visible edge where auto-scroll starts
  const DRAG_MAX_SCROLL_STEP = 14;  // px per 16ms tick at the very edge
  const DRAG_EDGE_INTENT = 12;      // px a grab inside an edge zone must move toward that edge before it scrolls

  // opts: { container, rowSelector, draggingClass, scroll?: { el, bounds() -> {top, bottom} },
  //         onStart?(row), onCommit(rowsInNewDomOrder) }. Rows must be direct children of container.
  function wireRowDragReorder(handle, opts) {
    const { container, rowSelector, draggingClass, scroll, onStart, onCommit } = opts;
    // Android's long-press would otherwise raise a context menu and cancel the pointer mid-grab.
    handle.addEventListener('contextmenu', (e) => e.preventDefault());
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      const row = handle.closest(rowSelector);
      if (!row || container.querySelector('.' + draggingClass)) return; // one drag at a time
      const pointerId = e.pointerId;
      if (onStart) onStart(row); // before any measuring: it may blur a field / close a dropdown

      const startRows = Array.from(container.querySelectorAll(rowSelector));
      const startRects = startRows.map(r => r.getBoundingClientRect());
      const limitTop0 = Math.min(...startRects.map(r => r.top));
      const limitBottom0 = Math.max(...startRects.map(r => r.bottom));

      const scrollEl = scroll ? scroll.el : null;
      const scrollStart = scrollEl ? scrollEl.scrollTop : 0;
      let lastScrollTop = scrollStart;
      // Chrome's scroll anchoring can nudge scrollTop when two rows of different heights swap.
      const prevOverflowAnchor = scrollEl ? scrollEl.style.overflowAnchor : '';
      if (scrollEl) scrollEl.style.overflowAnchor = 'none';

      const startClientY = e.clientY;
      let lastClientY = e.clientY;
      let baseClientY = e.clientY;
      let baseTranslateY = 0;
      let appliedTransform = 0;
      let armed = false; // auto-scroll only once the finger has actually moved a few px
      // Each edge arms separately. A card grabbed while it's already inside an
      // edge zone (common: the first card sits right under the sticky header)
      // must not start scrolling toward that edge just because the finger
      // drifted — it arms once the finger has been clear of the zone, or has
      // deliberately moved toward the edge from where it grabbed.
      let topArmed = true;
      let bottomArmed = true;
      if (scroll) {
        const b0 = scroll.bounds();
        topArmed = e.clientY >= b0.top + DRAG_EDGE_ZONE;
        bottomArmed = e.clientY <= b0.bottom - DRAG_EDGE_ZONE;
      }

      row.classList.add(draggingClass);
      if (navigator.vibrate) navigator.vibrate(15);
      handle.classList.add('shot-drag-pulse');
      handle.addEventListener('animationend', () => handle.classList.remove('shot-drag-pulse'), { once: true });
      try { handle.setPointerCapture(pointerId); } catch (err) { /* capture is a nice-to-have, not required */ }

      function update(clientY) {
        // Anything that scrolled the scroller since the last pass (our
        // auto-scroll, a wheel, the browser) moved the row's layout slot
        // under a stationary finger: fold it into the baseline.
        if (scrollEl && scrollEl.scrollTop !== lastScrollTop) {
          baseTranslateY += scrollEl.scrollTop - lastScrollTop;
          lastScrollTop = scrollEl.scrollTop;
        }
        const scrolled = scrollEl ? scrollEl.scrollTop - scrollStart : 0;
        const raw = row.getBoundingClientRect();
        const layoutTop = raw.top - appliedTransform;
        const minDy = (limitTop0 - scrolled) - layoutTop;
        const maxDy = (limitBottom0 - scrolled - raw.height) - layoutTop;
        const dy = Math.min(maxDy, Math.max(minDy, baseTranslateY + (clientY - baseClientY)));
        row.style.transform = `translateY(${dy}px)`;
        appliedTransform = dy;

        for (let guard = 0; guard < 100; guard++) {
          const rows = Array.from(container.querySelectorAll(rowSelector));
          const i = rows.indexOf(row);
          const r = row.getBoundingClientRect();
          const next = rows[i + 1];
          const prev = rows[i - 1];
          let neighbor = null;
          let neighborIsPrev = false;
          if (next) {
            const n = next.getBoundingClientRect();
            // >= (not >): the clamp can park the leading edge exactly on the last slot's midline.
            if (r.bottom - DRAG_SWAP_BIAS >= n.top + n.height / 2) neighbor = next;
          }
          if (!neighbor && prev) {
            const pr = prev.getBoundingClientRect();
            if (r.top + DRAG_SWAP_BIAS <= pr.top + pr.height / 2) { neighbor = prev; neighborIsPrev = true; }
          }
          if (!neighbor) break;

          const visualTop = r.top;
          // Move the NEIGHBOUR over the dragged row, never the dragged row itself.
          if (neighborIsPrev) container.insertBefore(neighbor, row.nextSibling);
          else container.insertBefore(neighbor, row);
          // The swap shifted the row's layout slot; re-derive the transform
          // now so the next pass sees the row exactly where the finger left it.
          row.style.transform = 'none';
          baseTranslateY = visualTop - row.getBoundingClientRect().top;
          baseClientY = clientY;
          row.style.transform = `translateY(${baseTranslateY}px)`;
          appliedTransform = baseTranslateY;
        }
      }

      function onMove(ev) {
        if (ev.pointerId !== pointerId) return;
        lastClientY = ev.clientY;
        if (!armed && Math.abs(ev.clientY - startClientY) > 4) armed = true;
        update(ev.clientY);
      }

      // setInterval, not rAF: rAF doesn't fire in a backgrounded test tab.
      let scrollTimer = null;
      if (scrollEl) {
        scrollTimer = setInterval(() => {
          const { top, bottom } = scroll.bounds();
          if (!topArmed && (lastClientY >= top + DRAG_EDGE_ZONE || startClientY - lastClientY >= DRAG_EDGE_INTENT)) topArmed = true;
          if (!bottomArmed && (lastClientY <= bottom - DRAG_EDGE_ZONE || lastClientY - startClientY >= DRAG_EDGE_INTENT)) bottomArmed = true;
          let step = 0;
          if (armed) {
            if (topArmed && lastClientY < top + DRAG_EDGE_ZONE) {
              step = -DRAG_MAX_SCROLL_STEP * Math.min(1, (top + DRAG_EDGE_ZONE - lastClientY) / DRAG_EDGE_ZONE);
            } else if (bottomArmed && lastClientY > bottom - DRAG_EDGE_ZONE) {
              step = DRAG_MAX_SCROLL_STEP * Math.min(1, (lastClientY - (bottom - DRAG_EDGE_ZONE)) / DRAG_EDGE_ZONE);
            }
          }
          if (step) scrollEl.scrollTop += Math.sign(step) * Math.max(1, Math.round(Math.abs(step)));
          if (scrollEl.scrollTop !== lastScrollTop) update(lastClientY);
        }, 16);
      }

      function onEnd(ev) {
        if (ev && ev.pointerId !== undefined && ev.pointerId !== pointerId) return;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onEnd);
        window.removeEventListener('pointercancel', onEnd);
        clearInterval(scrollTimer);
        row.classList.remove(draggingClass);
        row.style.transform = '';
        const endRows = Array.from(container.querySelectorAll(rowSelector));
        const changed = endRows.some((r, i) => r !== startRows[i]);
        try {
          if (changed) onCommit(endRows);
        } finally {
          if (scrollEl) scrollEl.style.overflowAnchor = prevOverflowAnchor;
        }
      }

      // window, not the handle: once the row hits its clamp it stops being
      // under the finger, and hit-testing a stationary handle would miss it.
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onEnd);
      window.addEventListener('pointercancel', onEnd);
    });
  }
};
