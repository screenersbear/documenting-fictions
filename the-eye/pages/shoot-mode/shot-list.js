// Shoot mode: the shot list, ticked off and dragged.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootModeShotList = function addShootModeShotList(ed) {
  Object.assign(ed, { getShootModeShootId, setShootModeShootId, renderShootModeShots });
  // ---------- Shoot mode ----------
  // A stripped-back working view for the day of: just the shot list to tick off
  // and the mood board to glance at, with none of the planner around it. It's a
  // mode rather than a screen — once switched on it survives closing the app and
  // comes straight back on the next launch, until it's explicitly ended.
  const SHOOT_MODE_KEY = 'dailies_shoot_mode_shoot_v1';
  const shootModeOverlay = document.getElementById('shootModeOverlay'); ed.shootModeOverlay = shootModeOverlay;

  function getShootModeShootId() {
    try { return localStorage.getItem(SHOOT_MODE_KEY); } catch (e) { return null; }
  }

  function setShootModeShootId(id) {
    try {
      if (id) localStorage.setItem(SHOOT_MODE_KEY, id);
      else localStorage.removeItem(SHOOT_MODE_KEY);
    } catch (e) { /* ignore */ }
  }

  // Ticking, editing, or reordering a shot here writes straight to state
  // rather than through the edit form's working copy — shoot mode is the
  // only thing open, and the point is that any change survives whatever
  // happens to the phone next. Same row shape as the edit form's shot list
  // (drag handle, checkbox, auto-sized textarea, delete) so shoot mode isn't
  // a different interaction to relearn mid-shoot — just without the
  // checked-to-bottom sort, since watching the active list you're working
  // through reshuffle itself would be more disorienting than helpful here.
  // "1 of 4" beside the list's name: how many are shot so far.
  function renderShootModeShotCount(shoot) {
    const shots = (shoot.shotList || []).filter(item => item && ed.hasText(item.text));
    document.getElementById('shootModeShotCount').textContent = shots.length ? `${shots.filter(item => item.checked).length} of ${shots.length}` : '';
  }

  function renderShootModeShots(shoot, focusIdx) {
    const list = document.getElementById('shootModeShotList');
    const shots = shoot.shotList || [];
    list.innerHTML = shots.map((item, idx) => `
      <div class="shoot-mode-shot-row${item.checked ? ' shot-checked' : ''}" data-idx="${idx}">
        <button type="button" class="shot-drag-handle" aria-label="Drag to reorder shot" tabindex="-1">&#8942;</button>
        <input type="checkbox" class="shoot-mode-shot-check" data-idx="${idx}" ${item.checked ? 'checked' : ''} />
        <textarea class="shot-text" data-idx="${idx}" rows="1" placeholder="Describe the shot">${ed.escapeHtml(item.text || '')}</textarea>
        ${ed.shotStarButtonHtml(item, idx)}
        <button type="button" class="delete-shot" data-idx="${idx}"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
      </div>
    `).join('');
    document.getElementById('shootModeShotsEmpty').hidden = shots.length !== 0;
    renderShootModeShotCount(shoot);

    list.querySelectorAll('.star-shot').forEach(btn => {
      btn.addEventListener('click', () => {
        ed.toggleShotStar(shoot.shotList[Number(btn.dataset.idx)], btn);
        ed.saveState();
        ed.renderShootModeClock();
      });
    });
    // The must-haves still to get (see renderShootModeClock) can change
    // with any re-render: a shot deleted, or put back.
    ed.renderShootModeClock();

    list.querySelectorAll('.shoot-mode-shot-check').forEach(cb => {
      cb.addEventListener('change', () => {
        const idx = Number(cb.dataset.idx);
        shoot.shotList[idx].checked = cb.checked;
        ed.saveState();
        cb.closest('.shoot-mode-shot-row').classList.toggle('shot-checked', cb.checked);
        renderShootModeShotCount(shoot);
        ed.renderAll();
        ed.renderShootModeClock();
      });
    });
    list.querySelectorAll('.shot-text').forEach(textarea => {
      ed.autoSizeTextarea(textarea);
      textarea.addEventListener('input', () => {
        shoot.shotList[Number(textarea.dataset.idx)].text = textarea.value;
        ed.autoSizeTextarea(textarea);
        ed.saveState();
        renderShootModeShotCount(shoot);
      });
      textarea.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const idx = Number(textarea.dataset.idx);
        shoot.shotList[idx].text = textarea.value;
        // If the row right after is already a blank one — e.g. it was just
        // created by an earlier Enter, and the user tapped back up to fix
        // something above it rather than typing into it — reuse that one
        // instead of stacking a second blank row on top of it.
        const next = shoot.shotList[idx + 1];
        if (!next || ed.hasText(next.text)) {
          shoot.shotList.splice(idx + 1, 0, { text: '', checked: false });
        }
        ed.saveState();
        renderShootModeShots(shoot, idx + 1);
        ed.renderAll();
      });
    });
    list.querySelectorAll('.delete-shot').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        const [removed] = shoot.shotList.splice(idx, 1);
        ed.saveState();
        renderShootModeShots(shoot);
        ed.renderAll();
        // Same Undo as the shoot page's shot list (restoreRemovedShootItem
        // puts it back into the saved shoot, since that's what this edits).
        if (removed && ed.hasText(removed.text)) {
          ed.showUndoToast('Shot removed', () => ed.restoreRemovedShootItem(shoot.id, 'shotList', idx, removed));
        }
      });
    });
    list.querySelectorAll('.shot-drag-handle').forEach(handle => {
      wireShootModeShotDragHandle(handle, list, shoot);
    });

    // The pages are cut again, on whichever page the new row landed (a row
    // added at the foot of a page starts the next one).
    const focusInput = focusIdx !== undefined ? list.querySelector(`.shot-text[data-idx="${focusIdx}"]`) : null;
    ed.breakShootModePages({ show: focusInput ? focusInput.closest('.shoot-mode-shot-row') : null, force: true });
    if (focusInput) focusInput.focus();
  }

  // Same press-and-hold reorder as the edit form's shot list
  // (wireShotDragHandle), minus the checked/unchecked bucket split — shoot
  // mode doesn't sort checked shots to the bottom, so the whole list is one
  // bucket and a drag can land anywhere in it.
  function wireShootModeShotDragHandle(handle, container, shoot) {
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      const row = handle.closest('.shoot-mode-shot-row');
      if (!row) return;
      const pointerId = e.pointerId;

      // Only this page's rows: the rest are on other pages and measure nothing.
      const rowRects = Array.from(container.querySelectorAll('.shoot-mode-shot-row')).filter(r => r.getClientRects().length).map(r => r.getBoundingClientRect());
      const bucketTop = Math.min(...rowRects.map(r => r.top));
      const bucketBottom = Math.max(...rowRects.map(r => r.bottom));

      let baseClientY = e.clientY;
      let baseTranslateY = 0;
      let appliedTransform = 0;
      row.classList.add('shot-dragging');
      if (navigator.vibrate) navigator.vibrate(15);
      handle.classList.add('shot-drag-pulse');
      handle.addEventListener('animationend', () => {
        handle.classList.remove('shot-drag-pulse');
      }, { once: true });
      try { handle.setPointerCapture(e.pointerId); } catch (err) { /* capture is a nice-to-have, not required */ }

      function onMove(ev) {
        if (ev.pointerId !== pointerId) return;
        const rawRect = row.getBoundingClientRect();
        const layoutTop = rawRect.top - appliedTransform;
        const rowHeight = rawRect.height;
        const minDy = bucketTop - layoutTop;
        const maxDy = (bucketBottom - rowHeight) - layoutTop;
        const proposedDy = baseTranslateY + (ev.clientY - baseClientY);
        const dy = Math.min(maxDy, Math.max(minDy, proposedDy));

        row.style.transform = `translateY(${dy}px)`;
        appliedTransform = dy;

        // See wireShotDragHandle: a fast flick can cross more than one
        // neighbor between events, so this loops until the DOM order
        // catches up with wherever the transform already moved the row.
        const before = row.getBoundingClientRect();
        let swapped = false;
        while (true) {
          const rows = Array.from(container.querySelectorAll('.shoot-mode-shot-row')).filter(r => r.getClientRects().length);
          const idx = rows.indexOf(row);
          const rowRect = row.getBoundingClientRect();
          const rowCenter = rowRect.top + rowRect.height / 2;
          const next = rows[idx + 1];
          const prev = rows[idx - 1];

          let neighbor = null;
          let insertBeforeRow = false;
          if (next) {
            const nextRect = next.getBoundingClientRect();
            if (rowCenter >= nextRect.top + nextRect.height / 2) neighbor = next;
          }
          if (!neighbor && prev) {
            const prevRect = prev.getBoundingClientRect();
            if (rowCenter <= prevRect.top + prevRect.height / 2) { neighbor = prev; insertBeforeRow = true; }
          }
          if (!neighbor) break;

          if (insertBeforeRow) container.insertBefore(row, neighbor);
          else container.insertBefore(neighbor, row);
          swapped = true;
        }
        if (!swapped) return;

        row.style.transform = 'none';
        const after = row.getBoundingClientRect();
        baseTranslateY = before.top - after.top;
        baseClientY = ev.clientY;
        row.style.transform = `translateY(${baseTranslateY}px)`;
        appliedTransform = baseTranslateY;
      }

      function onEnd(ev) {
        if (ev && ev.pointerId !== undefined && ev.pointerId !== pointerId) return;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onEnd);
        window.removeEventListener('pointercancel', onEnd);
        row.classList.remove('shot-dragging');
        row.style.transform = '';
        const rows = Array.from(container.querySelectorAll('.shoot-mode-shot-row'));
        shoot.shotList = rows.map(r => shoot.shotList[Number(r.dataset.idx)]);
        ed.saveState();
        renderShootModeShots(shoot);
        ed.renderAll();
      }

      // See wireShotDragHandle for why this listens on window rather than
      // the handle itself.
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onEnd);
      window.addEventListener('pointercancel', onEnd);
    });
  }
};
