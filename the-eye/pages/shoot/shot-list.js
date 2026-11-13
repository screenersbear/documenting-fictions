// The shot list: its rows, stars and dragging.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootShotList = function addShootShotList(ed) {
  Object.assign(ed, { shotStarButtonHtml, toggleShotStar, renderShotList });
  // A shot's must-have star, between its text and its × on both shot lists
  // (the shoot page's and Shoot mode's): the × button's own circle, with a
  // navy star that fills yellow once the shot is a must-have. Stored as
  // `starred: true` on the item, and left off rather than false.
  function shotStarButtonHtml(item, idx) {
    return `<button type="button" class="star-shot${item.starred ? ' starred' : ''}" data-idx="${idx}" aria-label="Must-have shot" aria-pressed="${item.starred ? 'true' : 'false'}"><svg class="star-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 5.9 6.6 1-4.75 4.6 1.1 6.5L12 17.4l-5.85 3.1 1.1-6.5L2.5 9.4l6.6-1z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></button>`;
  }

  // Flips a shot's star in place (no re-render, so nothing jumps), and
  // returns whether it's starred now.
  function toggleShotStar(item, btn) {
    if (item.starred) delete item.starred;
    else item.starred = true;
    btn.classList.toggle('starred', !!item.starred);
    btn.setAttribute('aria-pressed', item.starred ? 'true' : 'false');
    return !!item.starred;
  }

  function renderShotList(focusIdx, refocusCheckIdx) {
    const container = document.getElementById('shotListItems');
    const scroller = ed.shootListScroller(container);
    const savedScrollTop = refocusCheckIdx === undefined || !scroller ? undefined : scroller.scrollTop;
    const indexed = ed.currentShotList.map((item, idx) => ({ ...item, idx }));
    const ordered = indexed.filter(i => !i.checked).concat(indexed.filter(i => i.checked));
    container.innerHTML = ordered.map(item => `
      <div class="shot-list-row${item.checked ? ' shot-checked' : ''}" data-idx="${item.idx}">
        <button type="button" class="shot-drag-handle" aria-label="Drag to reorder shot" tabindex="-1">&#8942;</button>
        <input type="checkbox" class="shot-check" data-idx="${item.idx}" ${item.checked ? 'checked' : ''} />
        <textarea class="shot-text" data-idx="${item.idx}" rows="1" placeholder="Describe the shot">${ed.escapeHtml(item.text || '')}</textarea>
        ${shotStarButtonHtml(item, item.idx)}
        <button type="button" class="delete-shot" data-idx="${item.idx}"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
      </div>
    `).join('');

    // A button fires none of the form's own autosave events, so it asks.
    container.querySelectorAll('.star-shot').forEach(btn => {
      btn.addEventListener('click', () => {
        toggleShotStar(ed.currentShotList[Number(btn.dataset.idx)], btn);
        ed.scheduleShootAutosave();
      });
    });
    container.querySelectorAll('.shot-check').forEach(cb => {
      cb.addEventListener('change', () => {
        const idx = Number(cb.dataset.idx);
        ed.currentShotList[idx].checked = cb.checked;
        renderShotList(undefined, idx);
        ed.scheduleShootAutosave();
      });
    });
    container.querySelectorAll('.shot-text').forEach(textarea => {
      ed.autoSizeTextarea(textarea);
      textarea.addEventListener('input', () => {
        ed.currentShotList[Number(textarea.dataset.idx)].text = textarea.value;
        ed.autoSizeTextarea(textarea);
        ed.scheduleShootAutosave();
      });
      textarea.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const idx = Number(textarea.dataset.idx);
        ed.currentShotList[idx].text = textarea.value;
        // If the row right after is already a blank one — e.g. it was just
        // created by an earlier Enter, and the user tapped back up to fix
        // something above it rather than typing into it — reuse that one
        // instead of stacking a second blank row on top of it.
        const next = ed.currentShotList[idx + 1];
        if (!next || ed.hasText(next.text)) {
          ed.currentShotList.splice(idx + 1, 0, { text: '', checked: false });
        }
        renderShotList(idx + 1);
        ed.scheduleShootAutosave();
      });
    });
    container.querySelectorAll('.delete-shot').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        const [removed] = ed.currentShotList.splice(idx, 1);
        renderShotList();
        ed.scheduleShootAutosave();
        // An empty row has nothing to take back, so no toast for it.
        if (removed && ed.hasText(removed.text)) {
          const shootId = ed.currentShootId;
          ed.showUndoToast('Shot removed', () => ed.restoreRemovedShootItem(shootId, 'shotList', idx, removed));
        }
      });
    });
    container.querySelectorAll('.shot-drag-handle').forEach(handle => {
      wireShotDragHandle(handle, container);
    });

    if (focusIdx !== undefined) {
      const focusInput = container.querySelector(`.shot-text[data-idx="${focusIdx}"]`);
      if (focusInput) {
        focusInput.focus();
        // A row added via Enter can land low enough in this scrolling form
        // to come up right against the sticky Save bar fixed below it (or
        // the iOS keyboard) — the browser's own scroll-into-view-on-focus
        // doesn't know either is there and won't leave them any clearance.
        // Centering it ourselves guarantees a clear look at what's being
        // typed instead of a sliver hidden behind either one. Same fix as
        // Shoot Mode's own shot list — see renderShootModeShots.
        focusInput.scrollIntoView({ block: 'center' });
        if (window.visualViewport) {
          window.visualViewport.addEventListener(
            'resize',
            () => focusInput.scrollIntoView({ block: 'center' }),
            { once: true }
          );
        }
      }
    }
    ed.restoreAfterListReorder(container, refocusCheckIdx, savedScrollTop);
  }

  // Press-and-hold reorder for shot rows. Dragging is restricted to rows
  // within the same checked/unchecked bucket, since renderShotList always
  // displays unchecked-first/checked-last — letting a drag cross that
  // boundary would just get silently undone by the next render.
  function wireShotDragHandle(handle, container) {
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      const row = handle.closest('.shot-list-row');
      if (!row) return;
      const pointerId = e.pointerId;
      const bucketSelector = row.classList.contains('shot-checked')
        ? '.shot-list-row.shot-checked'
        : '.shot-list-row:not(.shot-checked)';

      // The bucket's total span stays constant for the whole drag (reordering
      // same rows doesn't change how much vertical space they occupy), so
      // these bounds are captured once, before any transform, and used to
      // keep the dragged row from drifting past its own bucket — e.g. below
      // the last shot and on top of the "+ Add shot" button.
      const bucketRects = Array.from(container.querySelectorAll(bucketSelector)).map(r => r.getBoundingClientRect());
      const bucketTop = Math.min(...bucketRects.map(r => r.top));
      const bucketBottom = Math.max(...bucketRects.map(r => r.bottom));

      let baseClientY = e.clientY;
      let baseTranslateY = 0;
      let appliedTransform = 0;
      row.classList.add('shot-dragging');
      if (navigator.vibrate) navigator.vibrate(15);
      // iOS Safari has no Vibration API at all, so this pulse is the only
      // "felt" grab feedback that actually reaches an iPhone — a quick
      // scale/color flash on the handle itself, right under the finger.
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

        // A fast flick can carry the row's center past more than one
        // neighbor between two pointermove events — checking just the
        // immediate neighbor once per event let the dragged row's visual
        // position (driven directly by the finger, above) outrun its actual
        // slot in the list, landing on top of rows it hadn't swapped past
        // yet. Loop until neither neighbor qualifies, so the DOM order
        // always catches up to wherever the transform already put it.
        const before = row.getBoundingClientRect();
        let swapped = false;
        while (true) {
          const rows = Array.from(container.querySelectorAll(bucketSelector));
          const idx = rows.indexOf(row);
          const rowRect = row.getBoundingClientRect();
          const rowCenter = rowRect.top + rowRect.height / 2;
          const next = rows[idx + 1];
          const prev = rows[idx - 1];

          let neighbor = null;
          let insertBeforeRow = false;
          if (next) {
            const nextRect = next.getBoundingClientRect();
            // >= (not >): the bucket-bounds clamp above can cap the dragged
            // row's center at exactly the last slot's center, so a strict ">"
            // would make the final swap unreachable.
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
        const rows = Array.from(container.querySelectorAll('.shot-list-row'));
        ed.currentShotList = rows.map(r => ed.currentShotList[Number(r.dataset.idx)]);
        renderShotList();
        ed.scheduleShootAutosave();
      }

      // Listening on window (not the handle) means tracking survives even
      // if the row hits its bucket clamp and stops moving while the finger
      // keeps going — hit-testing on a now-stationary handle would miss
      // the finger and silently stop delivering events, leaving the row
      // stuck mid-drag with no pointerup ever arriving to release it.
      // setPointerCapture above is kept too, as a belt-and-suspenders
      // targeting hint, but window is what makes this actually reliable.
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onEnd);
      window.addEventListener('pointercancel', onEnd);
    });
  }

  document.getElementById('addShotBtn').addEventListener('click', () => {
    ed.currentShotList.push({ text: '', checked: false });
    renderShotList(ed.currentShotList.length - 1);
    ed.scheduleShootAutosave();
  });
};
