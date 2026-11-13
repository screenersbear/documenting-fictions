// Opening a shoot: the shoot page filled in from what's saved.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootOpen = function addShootOpen(ed) {
  Object.assign(ed, { updateShootModalTitleFromScroll, openShootModal });
  // iOS scrolls a focused field into view before the keyboard has finished
  // shrinking the visible area (and the card with it, see
  // syncShootWizardViewport), which can leave it under the keyboard — so
  // once more after that resize. Same pattern as renderShotList's.
  document.getElementById('shootWizardBody').addEventListener('focusin', (e) => {
    const field = e.target;
    if (!window.visualViewport) return;
    if (!field.matches('textarea, input:not([type="checkbox"]):not([type="radio"]):not([type="file"])')) return;
    window.visualViewport.addEventListener('resize', () => {
      if (ed.shootWizardActive && document.activeElement === field) field.scrollIntoView({ block: 'nearest' });
    }, { once: true });
  });

  // Updates the sticky title to name whichever section has scrolled past
  // the header, so it always reads as "where am I" rather than a static
  // label — falls back to the original Edit/Log-a-Shoot title at the very
  // top, before any section has passed underneath the header yet.
  function updateShootModalTitleFromScroll() {
    const modalEl = ed.shootModalOverlay.querySelector('.modal');
    const containerRect = modalEl.getBoundingClientRect();
    const header = document.querySelector('.shoot-modal-header');
    const headerOffset = header ? header.getBoundingClientRect().bottom - containerRect.top : 0;
    let active = null;
    ed.SHOOT_MODAL_SECTIONS.forEach(sec => {
      const el = document.getElementById(sec.id);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      if (rect.top - containerRect.top <= headerOffset + 2) active = sec;
    });
    document.getElementById('shootModalTitle').textContent = active ? active.label : ed.shootModalBaseTitle;
  }

  ed.shootModalOverlay.querySelector('.modal').addEventListener('scroll', updateShootModalTitleFromScroll, { passive: true });

  function openShootModal(id) {
    // Hands back any fields a wizard still has borrowed — only possible after
    // a path that hid the overlay without closeShootModal (Delete, Complete,
    // Unarchive) — before anything below repopulates or measures them.
    ed.endShootWizard({ closing: true });
    ed.closeStatsDetail();
    ed.editingShootId = id;
    const s = id ? ed.state.shoots.find(x => x.id === id) : null;
    ed.currentShootId = id || ed.uid();
    ed.pendingProjectPhoto = s ? (s.projectPhoto || null) : null;
    // s.projectPhoto is only set once hydratePhotos()'s IndexedDB reads
    // resolve, which happens once at boot — opening a shoot before its own
    // read lands here leaves this seeded empty even though it has a saved
    // photo. Double-checked directly (bypassing the boot-time hydration
    // race entirely) so a talent added in the same session doesn't get
    // auto-claimed as the cover over an existing one it just hasn't seen
    // yet. Guarded against a since-closed/reopened modal.
    if (s && !s.projectPhoto) {
      const shootId = s.id;
      ed.idbGetImages(ed.projectPhotoKey(shootId)).then(entries => {
        const src = ed.photoFromEntries(entries);
        if (!src || ed.currentShootId !== shootId) return;
        // By id, not the captured `s` — an autosave since opening replaces
        // the shoot object, which would leave `s` an orphan.
        const live = ed.state.shoots.find(x => x.id === shootId);
        if (live && !live.projectPhoto) live.projectPhoto = src;
        ed.pendingProjectPhoto = src;
      }).catch(() => {});
    }
    ed.shootHasImages = false;

    ed.shootModalBaseTitle = s ? 'Edit Shoot' : ed.randomNewShootTitle();
    document.getElementById('shootModalTitle').textContent = ed.shootModalBaseTitle;
    ed.closeShootModalJumpMenu();
    document.getElementById('deleteShootBtn').hidden = !s;
    document.getElementById('shareShootBtn').hidden = !s;
    const isArchived = s ? !!s.archived : false;
    document.getElementById('saveShootBtn').hidden = isArchived;
    document.getElementById('saveShootBtn').textContent = ed.pickRandomSaveMessage();
    document.getElementById('unarchiveShootBtn').hidden = !isArchived;
    ed.shootModalOverlay.dataset.section = isArchived ? 'archive' : 'shoots';
    document.getElementById('completeShootBtn').hidden = !s || isArchived || s.status !== 'delivered';

    document.getElementById('shootTitle').value = s ? (s.title || '') : '';
    // Options depend on category (video swaps in its own edit steps), and the
    // category select isn't populated until further down, so the category is
    // read straight off the shoot here.
    ed.renderShootStatusSelectOptions(s ? (s.category || '') : '', s ? (s.status || 'prospect') : 'prospect');
    ed.previousStatusValue = document.getElementById('shootStatus').value;
    ed.currentOffScheduleDate = s ? s.offScheduleDate : undefined;
    ed.categoryRemap = null;
    ed.updateStatusSwatchDisplay();
    ed.updateEnterShootModeBtnVisibility();
    document.getElementById('shootDate').value = s ? (s.date || '') : '';
    document.getElementById('shootDeadline').value = s ? (s.deadline || '') : '';
    document.getElementById('shootStartTime').value = s ? (s.startTime || '') : '';
    document.getElementById('shootEndTime').value = s ? (s.endTime || '') : '';
    document.getElementById('shootCrewCallTime').value = s ? (s.crewCallTime || '') : '';
    document.getElementById('shootTalentCallTime').value = s ? (s.talentCallTime || '') : '';
    // Built from saved project membership (never from form data), so it has
    // to come after currentShootId is set above; a brand-new draft just gets
    // a fresh unticked row with Last day hidden.
    ed.updateMultiDayRow();
    ed.currentShootLocation = s ? ed.normalizeLocation(s.location) : { name: '', street: '', city: '', state: '', zip: '', country: ed.state.defaultCountry || '' };
    ed.updateLocationBtnDisplay();
    // Talents saved before they had ids get one assigned on load — needed as
    // a stable IndexedDB key for their photo (see talentPhotoKey).
    ed.currentTalents = s && Array.isArray(s.talents)
      ? s.talents.map(t => ({ id: t.id || ed.uid(), name: t.name || '', socialHandles: (t.socialHandles || []).map(sh => ({ ...sh })), photo: t.photo || '' }))
      : [];
    // Same safety net as the cover above: a talent whose photo hasn't reached
    // memory yet would show a blank card here and then have that blank saved
    // back over the in-memory talent on the next autosave. Only talents that
    // already had a saved id can have a stored photo to find.
    if (s) {
      const shootId = s.id;
      const savedTalentIds = new Set((s.talents || []).filter(t => t.id).map(t => t.id));
      ed.currentTalents.forEach(ct => {
        if (ct.photo || !savedTalentIds.has(ct.id)) return;
        ed.idbGetImages(ed.talentPhotoKey(shootId, ct.id)).then(entries => {
          const src = ed.photoFromEntries(entries);
          if (!src || ed.currentShootId !== shootId) return;
          const cur = ed.currentTalents.find(x => x.id === ct.id);
          if (cur && !cur.photo) { cur.photo = src; ed.renderTalents(); }
        }).catch(() => {});
      });
    }
    ed.renderTalents();
    document.getElementById('shootCategory').value = s ? (s.category || '') : '';
    ed.updateCategoryTierUI();
    document.getElementById('shootPremise').value = s ? (s.premise || '') : '';
    document.getElementById('shootCharacter').value = s ? (s.character || '') : '';
    document.getElementById('shootWorldNotes').value = s ? (s.worldNotes || '') : '';
    document.getElementById('shootGoals').value = s ? (s.shootGoals || '') : '';
    document.getElementById('shootElevatorPitch').value = s ? (s.elevatorPitch || '') : '';
    document.getElementById('shootDeliverables').value = s ? (s.deliverables || '') : '';
    document.getElementById('shootDeliverableDestinations').value = s ? (s.deliverableDestinations || '') : '';
    const savedAspectRatios = s ? ed.normalizeAspectRatios(s.aspectRatios) : [];
    document.querySelectorAll('#shootAspectRatios input[type="checkbox"]').forEach(cb => {
      cb.checked = savedAspectRatios.includes(cb.value);
    });
    document.getElementById('shootMoodboardComplete').checked = s ? !!s.moodboardComplete : false;
    // Also sets the Mood board/Storyboard wording (incl. the complete
    // checkbox label) and hides Final images for video.
    ed.updateVideoCategoryUI();
    ed.updateMoodboardCompleteVisibility();
    ed.currentReferences = s && Array.isArray(s.references) ? [...s.references] : [];
    ed.renderReferences();
    document.getElementById('shootWentRight').value = s ? (s.whatWentRight || '') : '';
    document.getElementById('shootCouldBeBetter').value = s ? (s.couldBeBetter || '') : '';
    document.getElementById('shootLessonsLearned').value = s ? (s.lessonsLearned || '') : '';
    document.getElementById('shootTalentDirections').value = s ? (s.talentDirections || '') : '';
    document.getElementById('shootTeamDirections').value = s ? (s.teamDirections || '') : '';
    document.getElementById('shootShootingNotes').value = s ? (s.shootingNotes || '') : '';
    document.getElementById('shootLocationDirections').value = s ? (s.locationDirections || '') : '';
    ed.currentShotList = s && Array.isArray(s.shotList) ? s.shotList.map(item => ({ ...item })) : [];
    ed.renderShotList();
    // Old-shaped setups (a single free-text checklist row, pre-redesign) map
    // their text into the new description field rather than losing it — name
    // and characteristics start blank since neither existed before.
    ed.currentLightingSetups = s && Array.isArray(s.lightingSetups)
      ? s.lightingSetups.map(item => ({
          id: item.id || ed.uid(),
          name: item.name || '',
          characteristics: item.characteristics || '',
          description: item.description !== undefined ? item.description : (item.text || ''),
        }))
      : [];
    ed.renderLightingSetups();

    // Also shows/hides the team list and Directions for team to match.
    ed.setTeamRequiredChoice(s ? (s.teamRequired || '') : '');
    document.getElementById('shootTeamFinalized').checked = s ? !!s.teamFinalized : false;
    ed.currentTeamMembers = s && s.teamMembers ? s.teamMembers.map(tm => ({ ...tm })) : [];
    ed.renderTeamMembers();

    ed.renderShootFrameworkTags(s);
    ed.renderShootNotes(s ? s.id : null);

    document.getElementById('postShootContent').hidden = !ed.isPostCaptureStatus(ed.previousStatusValue);
    document.getElementById('postShootPromptOverlay').hidden = true;
    ed.updateShootModalJumpMenuVisibility();

    const shootPhotosIn = Promise.all([ed.renderMoodboard(), ed.renderFinalImages(), ed.renderRefBoards()]);
    // Everything above is populated by now — a saved field should read as
    // written the instant the modal opens, not only after it's touched again.
    ed.syncAllShootFormFields();
    // Without this, a swipe that starts anywhere in the modal that isn't
    // itself a scrollable element (e.g. the header, or blank space around a
    // short pane) can fall through and scroll the page underneath, which is
    // still there and still scrollable behind the fixed overlay.
    if (ed.shootModalOverlay.hidden) ed.lockBodyScroll();
    ed.shootModalOverlay.hidden = false;
    // Only a brand-new shoot (the "+ New Shoot" buttons pass null) gets the
    // planning wizard. Its first slide covers the status button, so it takes
    // over from the one-time status intro there; an id that no longer
    // resolves to a shoot keeps the intro, as before.
    // Turned off (first slide's "Don't show again", or the app menu), a new
    // shoot opens straight to the page, with the status intro as before.
    if (!id && ed.isNewShootGuideOn()) ed.queueShootWizard();
    else if (!s) ed.maybeShowStatusSwatchIntro();

    // Back to the page this shoot was last open on, at its top.
    const remembered = ed.shootPageMemory[ed.currentShootId] || { id: 'basicInfoHeading', sub: 0 };
    ed.shootFlows = null;
    ed.shootSub = 0;
    ed.shootBreakChanged = [];
    ed.shootForm.querySelectorAll('.pg-off, .pg-first').forEach(el => el.classList.remove('pg-off', 'pg-first'));
    ed.showShootPage(remembered.id, { orFirst: true });
    // A later page may only exist once the photos have loaded.
    if (ed.shootPageId === remembered.id && remembered.sub > 0) {
      ed.shootWanted = { id: remembered.id, sub: remembered.sub };
      ed.shootSub = remembered.sub;
      if (ed.currentShootId) ed.shootPageMemory[ed.currentShootId] = remembered;
    }
    const opening = {};
    ed.shootOpening = opening;
    shootPhotosIn.catch(() => {}).then(() => {
      if (ed.shootOpening !== opening) return; // another shoot has opened since
      ed.shootOpening = null;
      if (ed.shootBreakWatch) ed.shootBreakWatch.takeRecords();
      if (ed.shootModalOverlay.hidden) ed.shootWanted = null; // closed already: its page stays remembered
      else ed.breakShootPages();
    });
    ed.breakShootPages();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // renderShotList() ran further up, while the overlay was still hidden,
        // so every row measured zero and kept its one-line default — a saved
        // multi-line shot would open clipped. This is the first frame where the
        // rows actually have layout, so it's the first chance to size them.
        ed.autoSizeAllListTextareas();
        // syncAllShootFormFields() ran earlier too, for the exact same reason
        // — every readonly notes field (Location directions, Character,
        // reflection fields, etc.) that had real content measured zero height
        // and was left at its bare rows="N" size, silently clipping whatever
        // didn't fit. autoSizeTextarea itself is idempotent, so re-running the
        // whole sync here is cheap and catches every field at once rather
        // than needing a bespoke re-measure per field.
        ed.syncAllShootFormFields();
        ed.breakShootPages();
      });
    });
  }
};
