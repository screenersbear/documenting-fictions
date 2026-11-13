// Lighting setups: Manage, dragging, and the cards themselves.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootLighting = function addShootLighting(ed) {
  Object.assign(ed, { openManageLightingSetupsModal, renderLightingSetups });
  // Same non-destructive "dismiss" pattern as Manage Locations — deleting
  // here only hides a name from future suggestions (dismissedLightingSetup-
  // Keys), it never touches any shoot's own lightingSetups array.
  function renderManageLightingSetupsList() {
    const samples = ed.getPastLightingSetups();
    const container = document.getElementById('manageLightingSetupsList');
    if (!samples.length) {
      container.innerHTML = '<p class="empty-hint">No saved lighting setups yet.</p>';
      return;
    }
    container.innerHTML = samples.map((item, idx) => `
      <div class="manage-location-row">
        <span>${ed.escapeHtml(item.name)}</span>
        <button type="button" class="delete-manage-location" data-idx="${idx}"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
      </div>
    `).join('');
    container.querySelectorAll('.delete-manage-location').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = samples[Number(btn.dataset.idx)];
        if (!item) return;
        const key = item.name.trim().toLowerCase();
        if (!ed.state.dismissedLightingSetupKeys.includes(key)) ed.state.dismissedLightingSetupKeys.push(key);
        ed.saveState();
        renderManageLightingSetupsList();
        // Unlike the other three "manage saved" lists, this one opens from a
        // dropdown rather than a persistent select still sitting open behind
        // it — and that dropdown is still showing whatever it last rendered,
        // dismissed entry and all (a typeahead's field never lost focus, see
        // updateLightingSetupSuggestions' preventDefault; the guide's
        // keyboard-free list has no field focused at all). Hiding it here
        // avoids a stale delete offer; it rebuilds on the field's next
        // input/focus, or when Manage closes for the keyboard-free one.
        document.querySelectorAll('#lightingSetupsItems .lighting-setup-suggestions').forEach(ed.hideLightingSuggestionBox);
      });
    });
  }

  function openManageLightingSetupsModal() {
    renderManageLightingSetupsList();
    document.getElementById('manageLightingSetupsOverlay').hidden = false;
  }

  function closeLightingSuggestions() {
    document.querySelectorAll('#lightingSetupsItems .lighting-setup-suggestions').forEach(box => { box.hidden = true; });
    document.querySelectorAll('#lightingSetupsItems .lighting-setup-suggestions-open')
      .forEach(card => card.classList.remove('lighting-setup-suggestions-open'));
    document.querySelectorAll('#lightingSetupsItems .lighting-setup-card').forEach(card => ed.setLightingBrowseExpanded(card, false));
  }

  // The part of the modal a dragged card can actually be seen in: below the
  // sticky header, above the sticky Save bar, and above the iOS keyboard.
  function lightingDragScrollBounds(modalEl) {
    const m = modalEl.getBoundingClientRect();
    const header = modalEl.querySelector('.shoot-modal-header');
    const actions = modalEl.querySelector('.modal-actions');
    const vv = window.visualViewport;
    return {
      top: Math.max(m.top, header ? header.getBoundingClientRect().bottom : m.top),
      bottom: Math.min(m.bottom, actions && actions.offsetParent ? actions.getBoundingClientRect().top : m.bottom, vv ? vv.offsetTop + vv.height : m.bottom),
    };
  }

  // The same, for a lighting list borrowed onto a new-shoot wizard slide:
  // the card body's own visible box, still capped above the iOS keyboard.
  function wizardBodyDragBounds(body) {
    const r = body.getBoundingClientRect();
    const vv = window.visualViewport;
    return {
      top: r.top,
      bottom: Math.min(r.bottom, vv ? vv.offsetTop + vv.height : r.bottom),
    };
  }

  function commitLightingReorder(cards) {
    // The modal was closed mid-drag: closeShootModal already saved the old order.
    if (ed.shootModalOverlay.hidden) return;
    const container = document.getElementById('lightingSetupsItems');
    const scroller = ed.shootListScroller(container);
    const savedScrollTop = scroller ? scroller.scrollTop : undefined;
    // Each card's data-idx is its PRE-drag index (renderLightingSetups stamps
    // it), so DOM order maps straight back onto the array. The SAME setup
    // objects are reused, so every id (and the collapsed state keyed by it)
    // follows its card.
    const reordered = cards.map(c => ed.currentLightingSetups[Number(c.dataset.idx)]);
    if (reordered.length === ed.currentLightingSetups.length && reordered.every(Boolean)) {
      ed.currentLightingSetups = reordered;
      // Reordering fires no input event, so nothing else would save it.
      ed.scheduleShootAutosave();
    }
    // Renumbers data-idx and the "Setup N" placeholders, and re-binds the
    // handlers that captured their index at render time.
    renderLightingSetups();
    ed.restoreAfterListReorder(container, undefined, savedScrollTop);
  }

  function wireLightingDragHandle(handle) {
    const container = document.getElementById('lightingSetupsItems');
    const modalEl = ed.shootModalOverlay.querySelector('.modal');
    ed.wireRowDragReorder(handle, {
      container,
      rowSelector: '.lighting-setup-card',
      draggingClass: 'lighting-dragging',
      // Getters rather than fixed values: the list may be on the page
      // (scrolling in the modal, between its sticky header and Save bar) or
      // borrowed onto a new-shoot wizard slide (scrolling in the card), and
      // wireRowDragReorder reads `el` on every grab and bounds() every tick.
      // Left pointing at the modal, a drag in the card would auto-scroll the
      // covered page behind it and fold that scroll into the dragged row.
      scroll: {
        get el() { return ed.shootListScroller(container); },
        bounds: () => {
          const wizardBody = container.closest('#shootWizardBody');
          return wizardBody ? wizardBodyDragBounds(wizardBody) : lightingDragScrollBounds(modalEl);
        },
      },
      onStart: () => {
        // On iOS tapping a button never blurs a focused field, and a swap
        // would move that field mid-drag (dropping the keyboard at a random
        // moment) — so blur it now, which also hides its open suggestions.
        const active = document.activeElement;
        if (active && active !== document.body && container.contains(active)) active.blur();
        closeLightingSuggestions();
      },
      onCommit: commitLightingReorder,
    });
  }

  function renderLightingSetups() {
    const container = document.getElementById('lightingSetupsItems');
    const inWizard = !!container.closest('#shootWizard');
    // On the wizard's Lighting setups slide each card's bar has the saved-list
    // chevron (see toggleLightingBrowse), shown only when other shoots have
    // setups saved.
    const browseSaved = inWizard && ed.hasOtherShootLightingSetups();
    container.innerHTML = ed.currentLightingSetups.map((item, idx) => {
      return `
      <div class="team-member-card lighting-setup-card" data-idx="${idx}">
        <div class="lighting-setup-card-bar">
          <button type="button" class="shot-drag-handle lighting-drag-handle" aria-label="Drag to reorder lighting setup" tabindex="-1">&#8942;</button>
          <div class="lighting-setup-name-wrap">
            <input type="text" class="lighting-setup-name" data-idx="${idx}" placeholder="Setup ${idx + 1}" aria-label="Lighting setup ${idx + 1} name" value="${ed.escapeHtml(item.name || '')}" autocomplete="off" />
            <div class="lighting-setup-suggestions" hidden></div>
          </div>
          ${inWizard ? `<button type="button" class="lighting-setup-collapse-toggle lighting-setup-browse-toggle" data-idx="${idx}" aria-label="Show saved lighting setups" aria-expanded="false"${browseSaved ? '' : ' hidden'}>
            ${ed.COLLAPSE_ARROW_SVG}
          </button>` : ''}
          <button type="button" class="delete-lighting-setup" data-idx="${idx}"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
        </div>
        <div class="lighting-setup-card-body">
          <input type="text" class="lighting-setup-characteristics" data-idx="${idx}" placeholder="mood, quality, style, etc." aria-label="Characteristics" value="${ed.escapeHtml(item.characteristics || '')}" />
          <textarea class="lighting-setup-description" data-idx="${idx}" rows="2" placeholder="Describe the setup." aria-label="Description">${ed.escapeHtml(item.description || '')}</textarea>
        </div>
      </div>
    `;
    }).join('');

    container.querySelectorAll('.lighting-setup-description').forEach(ed.autoSizeTextarea);

    container.querySelectorAll('.lighting-setup-browse-toggle').forEach(btn => {
      btn.addEventListener('click', () => ed.toggleLightingBrowse(btn));
    });
    container.querySelectorAll('.delete-lighting-setup').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        const [removed] = ed.currentLightingSetups.splice(idx, 1);
        renderLightingSetups();
        ed.scheduleShootAutosave();
        // Same as a shot: a never-filled-in card has nothing to take back.
        if (removed && (ed.hasText(removed.name) || ed.hasText(removed.characteristics) || ed.hasText(removed.description))) {
          const shootId = ed.currentShootId;
          const following = ed.followingAtRemoval(shootId);
          ed.showUndoToast('Lighting setup removed', () => ed.restoreRemovedShootItem(shootId, 'lightingSetups', idx, removed, following));
        }
      });
    });
    container.querySelectorAll('.lighting-setup-name').forEach(input => {
      const idx = Number(input.dataset.idx);
      input.addEventListener('input', () => {
        ed.currentLightingSetups[idx].name = input.value;
        ed.updateLightingSetupSuggestions(idx, input);
      });
      // Focusing an empty field browses every past setup, same as tapping
      // open the Returning talent/team-member select — you shouldn't have
      // to already remember a name to find it.
      input.addEventListener('focus', () => ed.updateLightingSetupSuggestions(idx, input));
      input.addEventListener('blur', () => {
        input.closest('.lighting-setup-name-wrap').querySelector('.lighting-setup-suggestions').hidden = true;
        input.closest('.lighting-setup-card').classList.remove('lighting-setup-suggestions-open');
        ed.setLightingBrowseExpanded(input.closest('.lighting-setup-card'), false);
      });
      input.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        input.blur();
      });
    });
    container.querySelectorAll('.lighting-setup-characteristics').forEach(input => {
      input.addEventListener('input', () => {
        ed.currentLightingSetups[Number(input.dataset.idx)].characteristics = input.value;
      });
    });
    container.querySelectorAll('.lighting-setup-description').forEach(textarea => {
      textarea.addEventListener('input', () => {
        ed.currentLightingSetups[Number(textarea.dataset.idx)].description = textarea.value;
        ed.autoSizeTextarea(textarea);
      });
    });
    container.querySelectorAll('.lighting-drag-handle').forEach(wireLightingDragHandle);
    // The fields were just rebuilt, so they have no .is-filled class until
    // something re-syncs them (renderReferences does the same) — otherwise
    // every re-render, a reorder included, made filled fields look empty.
    // Only these fields: re-measuring every textarea in the form would briefly
    // shrink the long note boxes and could clamp the modal's scroll position.
    container.querySelectorAll('input, textarea').forEach(ed.syncFieldFilledState);
  }

  document.getElementById('addLightingSetupBtn').addEventListener('click', () => {
    ed.currentLightingSetups.push({ id: ed.uid(), name: '', characteristics: '', description: '' });
    renderLightingSetups();
    // Same reasoning as +Add talent — focus the new card's name field so the
    // keyboard opens on the right box and the browser scrolls it into view.
    const cards = document.querySelectorAll('#lightingSetupsItems .lighting-setup-card');
    const newField = cards.length ? cards[cards.length - 1].querySelector('.lighting-setup-name') : null;
    if (newField && newField.closest('#shootWizard') && ed.hasOtherShootLightingSetups() && ed.updateLightingSetupSuggestions(cards.length - 1, newField)) {
      // Except on the new-shoot guide when other shoots have setups saved:
      // there the new card opens on that list with its name left unfocused,
      // so no keyboard comes up over it — picking an old setup never needs
      // one (the user's call, 2026-11-10). Tapping the name still types a
      // new one; the bar's chevron brings the list back without the
      // keyboard. The list closes on a tap outside it.
      const active = document.activeElement;
      if (active && active.matches('input, textarea, select')) active.blur();
      newField.closest('.lighting-setup-name-wrap').querySelector('.lighting-setup-suggestions')
        .scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else if (newField) {
      newField.scrollIntoView({ block: 'center', behavior: 'smooth' });
      newField.focus();
    }
    ed.scheduleShootAutosave();
  });
};
