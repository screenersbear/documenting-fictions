// Lighting setups: past setups suggested as you type.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootLightingSuggestions = function addShootLightingSuggestions(ed) {
  Object.assign(ed, { getPastLightingSetups, updateLightingSetupSuggestions, hasOtherShootLightingSetups, setLightingBrowseExpanded, toggleLightingBrowse, hideLightingSuggestionBox });
  // ---------- Lighting setups (nested bubble cards, in Visuals) ----------
  // Collapsible outlined card per setup (same visual pattern Talent used to
  // use before its own popup redesign) instead of the old single-field
  // checklist — each setup gets a name (the card's heading), plus
  // characteristics and a longer description.
  ed.currentLightingSetups = [];

  // Grouped by name across every shoot's lightingSetups, most-recent shoot's
  // version winning ties — same "most recent wins" shape as
  // getAllPastTalents/getLastLocationDirections, just without lead-count
  // tiering since setups aren't ranked, only deduped. `excludeId` leaves one
  // setup out BEFORE the grouping (a card's own, see
  // updateLightingSetupSuggestions), so a same-named setup from another shoot
  // still gets listed instead of losing to the card's own newer copy.
  function getPastLightingSetups(excludeId) {
    const sampleDates = {};
    const samples = {};
    const dismissed = new Set(ed.state.dismissedLightingSetupKeys);
    ed.state.shoots.forEach(s => {
      (s.lightingSetups || []).forEach(item => {
        if (!ed.hasText(item.name)) return;
        if (excludeId && item.id === excludeId) return;
        const key = item.name.trim().toLowerCase();
        if (dismissed.has(key)) return;
        const d = s.date || '';
        if (!(key in sampleDates) || d > sampleDates[key]) {
          sampleDates[key] = d;
          samples[key] = item;
        }
      });
    });
    return Object.keys(samples)
      .sort((a, b) => samples[a].name.localeCompare(samples[b].name))
      .map(key => samples[key]);
  }

  // Typing (or just tapping into) a setup's name shows past setups sharing
  // this shoot's Visuals-section styling as a dropdown under the field —
  // picking one COPIES its name/characteristics/description in, a one-time
  // fill rather than the Talent popup's ongoing cross-shoot sync. Lighting
  // setups are far more likely than a person's identity to legitimately
  // vary shoot to shoot under the same name (a different room, different
  // gear), so silently keeping every past "Rembrandt lighting" in sync
  // would rewrite descriptions the user never touched. Returns whether the
  // dropdown ended up open (there was something to show). `browseAll` lists
  // every saved setup whatever the name says (the guide's chevron).
  function updateLightingSetupSuggestions(idx, input, browseAll = false) {
    const wrap = input.closest('.lighting-setup-name-wrap');
    const box = wrap.querySelector('.lighting-setup-suggestions');
    const card = input.closest('.lighting-setup-card');
    const query = browseAll ? '' : input.value.trim().toLowerCase();
    // Its own id left out: autosave can land mid-typing, which briefly puts
    // THIS setup's own in-progress name into state.shoots — it would then
    // suggest itself back to whoever's still typing it.
    const matches = getPastLightingSetups(ed.currentLightingSetups[idx].id)
      .filter(item => !query || item.name.toLowerCase().includes(query));
    if (!matches.length) {
      box.hidden = true;
      card.classList.remove('lighting-setup-suggestions-open');
      setLightingBrowseExpanded(card, false);
      return false;
    }
    // Manage leads the list, and every match is listed (the box scrolls past
    // its max-height) rather than a capped handful with Manage buried last.
    box.innerHTML = '<button type="button" class="lighting-setup-suggestion lighting-setup-suggestion-manage">Manage saved…</button>'
      + matches.map((item, i) => `
      <button type="button" class="lighting-setup-suggestion" data-idx="${idx}" data-match="${i}">${ed.escapeHtml(item.name)}</button>
    `).join('');
    box.querySelectorAll('.lighting-setup-suggestion:not(.lighting-setup-suggestion-manage)').forEach((btn, i) => {
      // mousedown (not click) fires before the field's blur, so the copy
      // lands before blur's own handler hides this dropdown out from
      // under it — preventDefault keeps focus on the field throughout.
      const pick = () => {
        const picked = matches[i];
        ed.currentLightingSetups[idx].name = picked.name || '';
        ed.currentLightingSetups[idx].characteristics = picked.characteristics || '';
        ed.currentLightingSetups[idx].description = picked.description || '';
        ed.renderLightingSetups();
        ed.scheduleShootAutosave();
      };
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        pick();
      });
      // Enter/Space on a row reached with Tab — the guide's keyboard-free
      // list stays open without its field focused — is a click with
      // detail 0. Taps and mouse clicks already picked on mousedown.
      btn.addEventListener('click', (e) => { if (e.detail === 0) pick(); });
    });
    const manageBtn = box.querySelector('.lighting-setup-suggestion-manage');
    const openManage = () => {
      // From a list with nobody typing in its name (the guide's keyboard-
      // free one), the list comes back when Manage closes (see below).
      manageLightingReturn = document.activeElement === input ? null : input;
      ed.openManageLightingSetupsModal();
    };
    manageBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      openManage();
    });
    manageBtn.addEventListener('click', (e) => { if (e.detail === 0) openManage(); });
    box.hidden = false;
    card.classList.add('lighting-setup-suggestions-open');
    setLightingBrowseExpanded(card, true);
    return true;
  }

  // Setups saved on OTHER shoots: what the guide's keyboard-free list is
  // for. This shoot's own cards land in state.shoots too once autosave runs,
  // and on a multi-day shoot the days following it get copies of them (see
  // syncProjectMirrors), so counting either would flip + Add's behavior a
  // couple of seconds into typing the first setup.
  function hasOtherShootLightingSetups() {
    const mine = new Set([ed.currentShootId]);
    const me = ed.state.shoots.find(s => s.id === ed.currentShootId);
    const project = (me && me.projectId && ed.findProject(me.projectId))
      || (ed.state.projects || []).find(p => p.leadShootId === ed.currentShootId);
    const lead = ed.projectLeadOf(project);
    if (lead && (lead.id === ed.currentShootId || (me && me.followsLead))) {
      mine.add(lead.id);
      ed.projectFollowers(project, lead).forEach(day => mine.add(day.id));
    }
    const dismissed = new Set(ed.state.dismissedLightingSetupKeys);
    return ed.state.shoots.some(s => !mine.has(s.id) && (s.lightingSetups || [])
      .some(item => ed.hasText(item.name) && !dismissed.has(item.name.trim().toLowerCase())));
  }

  function setLightingBrowseExpanded(card, open) {
    const toggle = card && card.querySelector('.lighting-setup-browse-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  // On the guide each card's bar has a chevron (where the page has its fold
  // arrow) that shows the saved list without the keyboard: after a stray
  // tap closed it, or to swap a picked setup for another. Tapped while any
  // field is being typed in, it puts the keyboard away (iOS doesn't blur a
  // field when a button's tapped; the blur also closes another card's list)
  // and lists them all.
  function toggleLightingBrowse(btn) {
    const card = btn.closest('.lighting-setup-card');
    const input = card.querySelector('.lighting-setup-name');
    const box = card.querySelector('.lighting-setup-suggestions');
    if (!box.hidden && document.activeElement !== input) {
      hideLightingSuggestionBox(box);
      return;
    }
    const active = document.activeElement;
    if (active && active.matches('input, textarea, select')) active.blur();
    updateLightingSetupSuggestions(Number(input.dataset.idx), input, true);
  }

  function syncLightingBrowseToggles() {
    const show = hasOtherShootLightingSetups();
    document.querySelectorAll('#lightingSetupsItems .lighting-setup-browse-toggle').forEach(btn => { btn.hidden = !show; });
  }

  // On the new-shoot guide the saved list opens without its name field
  // being focused (the + Add handler, the chevron), so there's no blur to
  // close it: a tap anywhere outside that card's bar and its list does.
  // Only a real tap: a drag that scrolls the slide leaves it open (touch
  // scrolling sends pointercancel; a mouse drag moves too far), and so does
  // a touch that just stops a flick's glide (iOS sends no pointercancel for
  // that, but the slide was still scrolling a moment before). Taps in the
  // Manage popup opened from the list don't count either. A list whose own
  // field has focus is left to that field's blur, as before.
  let lightingTapOutside = null;
  ed.lastScrollAt = 0;
  document.addEventListener('scroll', () => { ed.lastScrollAt = performance.now(); }, { capture: true, passive: true });
  function unfocusedLightingSuggestions() {
    return [...document.querySelectorAll('#lightingSetupsItems .lighting-setup-suggestions:not([hidden])')]
      .filter(box => document.activeElement !== box.closest('.lighting-setup-name-wrap').querySelector('.lighting-setup-name'));
  }
  function hideLightingSuggestionBox(box) {
    box.hidden = true;
    const card = box.closest('.lighting-setup-card');
    if (card) {
      card.classList.remove('lighting-setup-suggestions-open');
      setLightingBrowseExpanded(card, false);
    }
  }
  document.addEventListener('pointerdown', (e) => {
    lightingTapOutside = null;
    if (!(e.target instanceof Element) || performance.now() - ed.lastScrollAt < 150 || e.target.closest('#manageLightingSetupsOverlay')) return;
    const boxes = unfocusedLightingSuggestions().filter(box => !box.closest('.lighting-setup-card-bar').contains(e.target));
    if (boxes.length) lightingTapOutside = { boxes, x: e.clientX, y: e.clientY };
  }, true);
  document.addEventListener('pointercancel', () => { lightingTapOutside = null; }, true);
  document.addEventListener('pointerup', (e) => {
    const tap = lightingTapOutside;
    lightingTapOutside = null;
    if (tap && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 10) tap.boxes.forEach(hideLightingSuggestionBox);
  }, true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') unfocusedLightingSuggestions().forEach(hideLightingSuggestionBox);
  });

  // The name field of the keyboard-free list Manage was opened from (set by
  // its "Manage saved…" row). Every way of closing Manage just hides it, so
  // that's watched: the list comes back, freshly built, unless the card's
  // gone or a field is being typed in by then. The chevrons are re-checked
  // too, in case every saved setup was just removed.
  let manageLightingReturn = null;
  new MutationObserver(() => {
    if (!document.getElementById('manageLightingSetupsOverlay').hidden) return;
    const input = manageLightingReturn;
    manageLightingReturn = null;
    syncLightingBrowseToggles();
    const active = document.activeElement;
    if (input && input.isConnected && !(active && active.matches('input, textarea, select'))) {
      updateLightingSetupSuggestions(Number(input.dataset.idx), input, true);
    }
  }).observe(document.getElementById('manageLightingSetupsOverlay'), { attributes: true, attributeFilter: ['hidden'] });
};
