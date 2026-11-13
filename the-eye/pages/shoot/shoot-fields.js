// The shoot page's fields: growing text boxes, filled fields, and putting back what was removed.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootFields = function addShootFields(ed) {
  Object.assign(ed, { autoSizeTextarea, autoSizeAllListTextareas, isBoxSheddingField, syncFieldFilledState, syncAllShootFormFields, shootListScroller, restoreAfterListReorder, restoreRemovedShootItem, followingAtRemoval });
  // ---------- Shot list (checklist inside Shoot-day notes) ----------
  // Checked items stay in the underlying array in their original order —
  // renderShotList() just displays unchecked-first, checked-last, so
  // unchecking an item returns it to its original spot automatically.
  ed.currentShotList = [];

  // Shots and lighting setups read as lines of writing rather than boxes, so
  // each row is sized to exactly the text in it instead of a fixed slab of
  // empty field.
  //
  // scrollHeight is content + padding but NOT border, while `* { box-sizing:
  // border-box }` makes an assigned height cover content + padding + border.
  // Assigning scrollHeight straight across therefore lands the box short by the
  // border width and shaves the last line — so the borders get added back.
  //
  // scrollHeight is also 0 while the row is hidden (no layout), and assigning
  // that would flatten it to nothing; a zero measurement is skipped so the row
  // keeps its one-line default until something visible re-runs this.
  function autoSizeTextarea(el) {
    el.style.height = 'auto';
    if (!el.scrollHeight) return;
    const cs = getComputedStyle(el);
    const borders = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    el.style.height = (el.scrollHeight + borders) + 'px';
  }

  // #shootModeShotList included here too — openShootMode's own re-measure
  // pass calls this function expecting it to cover Shoot Mode's shot rows
  // as well as the main form's; it silently didn't, since this selector
  // never named that list, leaving a shot with wrapped text visibly
  // clipped to one line the moment you entered Shoot Mode (correcting
  // itself only once you typed in it, which re-triggers sizing via the
  // row's own input listener).
  function autoSizeAllListTextareas() {
    document.querySelectorAll('#shotListItems .shot-text, #lightingSetupsItems .lighting-setup-description, #shootModeShotList .shot-text, #shootModeShootingNotes')
      .forEach(autoSizeTextarea);
  }

  // A field with something in it should read as what you wrote, not as an input
  // still waiting for you — the same treatment the shot list got. An EMPTY field
  // keeps its box, because the box is the thing that says "put something here";
  // a filled one keeps a rule underneath, which is what says "tap to change it".
  //
  // Only free-text fields qualify. Date, time and select are pickers: stripping
  // their frame would read as broken rather than as written-in, and there's no
  // typing to reveal. The shot rows are skipped too — they already carry this
  // look permanently via .shot-text, and their own renderer sizes them. The
  // lighting fields (no .shot-text) do qualify, which is why their renderer
  // re-syncs them itself after rebuilding.
  function isBoxSheddingField(el) {
    if (el.classList.contains('shot-text')) return false;
    if (el.tagName === 'TEXTAREA') return true;
    return el.tagName === 'INPUT' && (!el.type || el.type === 'text');
  }

  function syncFieldFilledState(el) {
    if (!el || !el.tagName || !isBoxSheddingField(el)) return;
    const filled = !!el.value.trim();
    el.classList.toggle('is-filled', filled);
    if (el.tagName !== 'TEXTAREA') return;
    // Filled: shrink to the text, so losing the box doesn't leave a tall band of
    // empty ruled space. Empty: hand the height back to the rows attribute.
    if (filled) autoSizeTextarea(el);
    else el.style.height = '';
  }

  function syncAllShootFormFields() {
    document.querySelectorAll('#shootForm input, #shootForm textarea').forEach(syncFieldFilledState);
  }

  // What a list inside the shoot form actually scrolls in: the new-shoot
  // wizard's card body while the list is borrowed onto one of its slides
  // (see SHOOT_WIZARD_STEPS), the shoot modal itself the rest of the time.
  // Saving/restoring the modal's scroll for a list that's in the card would
  // leave the card free to lurch on every re-render.
  function shootListScroller(container) {
    return (container && container.closest('#shootWizardBody')) || ed.shootModalOverlay.querySelector('.modal');
  }

  // Ticking a checkbox re-renders its whole list, because checked items sort to
  // the bottom — which destroys the very node that was tapped. Left alone the
  // browser drops focus and the modal lurches hundreds of pixels: measured at
  // 3399 -> 2621 on a shoot with a couple of setups.
  //
  // Restoring inside the change handler isn't enough on its own — the click's
  // own default processing runs after the handler and undoes it — so the same
  // restore is repeated on the next frame, which is the first moment nothing
  // else is still touching scroll or focus. preventScroll keeps the view still
  // while focus follows the item down to its new position.
  function restoreAfterListReorder(container, checkIdx, savedScrollTop) {
    const apply = () => {
      const scroller = shootListScroller(container);
      if (scroller && savedScrollTop !== undefined) scroller.scrollTop = savedScrollTop;
      if (checkIdx === undefined) return;
      const cb = container.querySelector(`.shot-check[data-idx="${checkIdx}"]`);
      if (cb) cb.focus({ preventScroll: true });
    };
    apply();
    requestAnimationFrame(apply);
  }

  // Undo (showUndoToast) for the quick removals that don't ask first — a
  // shot, a lighting setup, a team member: the item goes back where it was.
  // While that shoot's page is open, into the page's own working list,
  // re-rendered and saved the same way the × was; otherwise (Shoot mode, or
  // the page closed within the toast's few seconds) straight into the saved
  // shoot, the way Shoot mode's own edits are, so Undo never quietly does
  // nothing. A spot past the end (the list got shorter since) is the end.
  //
  // `following` (from followingAtRemoval, for a team member or lighting
  // setup) says the shoot was a day following its project's lead when the
  // item was taken out. Those lists are mirrored, so the removal made the
  // day its own (syncProjectMirrors); taking it back puts the day back to
  // following, if it now matches the lead again (reattachDayIfMatchingLead).
  function restoreRemovedShootItem(shootId, listKey, idx, item, following) {
    if (!ed.shootModalOverlay.hidden && ed.currentShootId === shootId) {
      const [list, render] = {
        shotList: [ed.currentShotList, ed.renderShotList],
        lightingSetups: [ed.currentLightingSetups, ed.renderLightingSetups],
        teamMembers: [ed.currentTeamMembers, ed.renderTeamMembers],
      }[listKey];
      list.splice(Math.min(idx, list.length), 0, item);
      render();
      ed.scheduleShootAutosave();
      if (following) {
        // Saved straight away rather than in a moment, so the check below
        // compares the day as it now is.
        ed.saveShootNow();
        reattachDayIfMatchingLead(shootId, following);
      }
      return;
    }
    // Another shoot's page is open: it's committed first, so its own
    // pending edits count against it (and make it its own, if they do)
    // before anything below is mirrored onto it.
    const openOtherId = !ed.shootModalOverlay.hidden && ed.currentShootId ? ed.currentShootId : null;
    if (openOtherId) ed.saveShootNow();
    const shoot = ed.state.shoots.find(s => s.id === shootId);
    if (!shoot) return;
    if (!Array.isArray(shoot[listKey])) shoot[listKey] = [];
    shoot[listKey].splice(Math.min(idx, shoot[listKey].length), 0, item);
    ed.saveState();
    if (following) reattachDayIfMatchingLead(shootId, following);
    // The open page is a day following this one: the save above mirrored
    // the item back onto its saved copy, so it goes back into the page's
    // own list too, at the same spot — or the page, still showing the list
    // without it, would save that over the mirror and make the day its own.
    // Spliced in rather than the whole list reloaded, so the rest of the
    // page (folded setups, a team member popup that's open) stays as it is.
    const openDay = openOtherId && (listKey === 'lightingSetups' || listKey === 'teamMembers')
      ? ed.state.shoots.find(s => s.id === openOtherId) : null;
    const openLead = openDay && openDay.followsLead ? ed.projectLeadOf(ed.findProject(openDay.projectId)) : null;
    if (openLead && openLead.id === shootId) {
      const isSetups = listKey === 'lightingSetups';
      const working = isSetups ? ed.currentLightingSetups : ed.currentTeamMembers;
      // A copy (a setup with an id of its own, as the mirror gives it), so
      // the two days never share one object.
      working.splice(Math.min(idx, working.length), 0, isSetups ? { ...item, id: ed.uid() } : { ...item });
      // Shouldn't differ (the day matched its lead), but if it somehow
      // does, the saved list as it now stands is the one to show.
      if (ed.mirrorSignature({ ...openDay, [listKey]: working }) !== ed.mirrorSignature(openDay)) {
        working.splice(0, working.length, ...(openDay[listKey] || []).map(x => ({ ...x })));
      }
      if (isSetups) ed.renderLightingSetups(); else ed.renderTeamMembers();
      ed.scheduleShootAutosave();
    }
    if (listKey === 'shotList' && !ed.shootModeOverlay.hidden && ed.getShootModeShootId() === shootId) ed.renderShootModeShots(shoot);
    ed.renderAll();
  }

  // Taken at the moment of a quick removal, for restoreRemovedShootItem: for
  // a day of a multi-day project that's following its lead, which project
  // and when — null for anything else.
  function followingAtRemoval(shootId) {
    const s = ed.state.shoots.find(x => x.id === shootId);
    return s && s.followsLead && s.projectId ? { projectId: s.projectId, at: Date.now() } : null;
  }

  // After an Undo on a day that was following its lead when the item was
  // removed (`following`, from followingAtRemoval): if the removal made it
  // its own and it now matches the lead again, it follows again, as if the
  // removal never happened. Left as it is when it's following already, has
  // moved project, or its own or the lead's photos were changed by hand
  // since (shootImagesChangedAt) — those aren't in the signature, and the
  // day's would be replaced by the lead's next change.
  function reattachDayIfMatchingLead(shootId, following) {
    const day = ed.state.shoots.find(s => s.id === shootId);
    if (!day || day.followsLead || day.projectId !== following.projectId) return;
    const lead = ed.projectLeadOf(ed.findProject(following.projectId));
    if (!lead || lead.id === day.id) return;
    if ([day.id, lead.id].some(id => (ed.shootImagesChangedAt.get(id) || 0) >= following.at)) return;
    const sig = ed.mirrorSignature(day);
    if (sig !== ed.mirrorSignature(lead)) return;
    day.followsLead = true;
    day.mirrorSig = sig;
    ed.saveState();
    if (!ed.shootModalOverlay.hidden && ed.currentShootId === day.id) ed.updateMultiDayRow();
  }
};
